const db = require('../config/database');
const { parseEmployeesFromExcel, generateEmployeeTemplate } = require('../services/employee.service');

// Obtener todos los empleados con paginación por cursor
const getAllEmployees = async (req, res) => {
  try {
    console.log('[EMPLOYEES] Fetching employees with cursor pagination...');
    const {
      cursor,           // ID del último empleado visto
      limit = 100,      // Registros por página (default 100)
      search,
      dependencia_id,
      tipo,
      unidad_responsable,
      subtipo_administrativo,
      activo
    } = req.query;

    let query = `
      SELECT e.*, d.nombre as dependencia_nombre
      FROM empleados e
      LEFT JOIN dependencias d ON e.dependencia_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Cursor: Solo traer registros DESPUÉS del último ID visto
    if (cursor) {
      query += ` AND e.id > $${paramCount}`;
      params.push(parseInt(cursor));
      paramCount++;
    }

    if (search) {
      query += ` AND (
        LOWER(e.nombre || ' ' || e.apellido_paterno || ' ' || COALESCE(e.apellido_materno, '')) LIKE LOWER($${paramCount})
        OR LOWER(e.email) LIKE LOWER($${paramCount})
        OR LOWER(e.rfc) LIKE LOWER($${paramCount})
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (dependencia_id) {
      query += ` AND e.dependencia_id = $${paramCount}`;
      params.push(dependencia_id);
      paramCount++;
    }

    if (tipo) {
      query += ` AND e.tipo = $${paramCount}`;
      params.push(tipo);
      paramCount++;
    }

    if (unidad_responsable) {
      query += ` AND e.unidad_responsable = $${paramCount}`;
      params.push(unidad_responsable);
      paramCount++;
    }

    if (subtipo_administrativo) {
      query += ` AND e.subtipo_administrativo = $${paramCount}`;
      params.push(subtipo_administrativo);
      paramCount++;
    }

    if (activo !== undefined && activo !== '') {
      query += ` AND e.activo = $${paramCount}`;
      params.push(activo === 'true');
      paramCount++;
    }

    // ---------------------------------------------------------
    // 1. QUERY DE CONTEO (Total con filtros, sin paginación)
    // ---------------------------------------------------------
    let countQuery = `
      SELECT COUNT(*) 
      FROM empleados e
      LEFT JOIN dependencias d ON e.dependencia_id = d.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 1;

    // Aplicar los mismos filtros al countQuery
    if (search) {
      countQuery += ` AND (
        LOWER(e.nombre || ' ' || e.apellido_paterno || ' ' || COALESCE(e.apellido_materno, '')) LIKE LOWER($${countParamCount})
        OR LOWER(e.email) LIKE LOWER($${countParamCount})
        OR LOWER(e.rfc) LIKE LOWER($${countParamCount})
      )`;
      countParams.push(`%${search}%`);
      countParamCount++;
    }

    if (dependencia_id) {
      countQuery += ` AND e.dependencia_id = $${countParamCount}`;
      countParams.push(dependencia_id);
      countParamCount++;
    }

    if (tipo) {
      countQuery += ` AND e.tipo = $${countParamCount}`;
      countParams.push(tipo);
      countParamCount++;
    }

    if (unidad_responsable) {
      countQuery += ` AND e.unidad_responsable = $${countParamCount}`;
      countParams.push(unidad_responsable);
      countParamCount++;
    }

    if (subtipo_administrativo) {
      countQuery += ` AND e.subtipo_administrativo = $${countParamCount}`;
      countParams.push(subtipo_administrativo);
      countParamCount++;
    }

    if (activo !== undefined && activo !== '') {
      countQuery += ` AND e.activo = $${countParamCount}`;
      countParams.push(activo === 'true');
      countParamCount++;
    }

    // Ejecutar conteo
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // ---------------------------------------------------------
    // 2. QUERY DE DATOS (Con paginación)
    // ---------------------------------------------------------

    // Ordenar por ID para cursor consistente
    query += ` ORDER BY e.id ASC`;

    // Si hay limit, usar paginación. Si no hay limit (búsqueda), traer todos
    if (limit) {
      query += ` LIMIT $${paramCount}`;
      const numericLimit = parseInt(limit);
      params.push(numericLimit + 1); // +1 para detectar si hay más registros

      const result = await db.query(query, params);

      // Detectar si hay más registros
      const hasMore = result.rows.length > numericLimit;
      const data = hasMore ? result.rows.slice(0, numericLimit) : result.rows;
      const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

      res.json({
        success: true,
        data,
        pagination: {
          nextCursor,
          hasMore,
          limit: numericLimit,
          count: data.length, // Registros en esta página
          total: totalCount   // Total global con filtros
        }
      });
    } else {
      // Sin limit... aunque ahora siempre usamos limit=100 por defecto
      const result = await db.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          nextCursor: null,
          hasMore: false,
          limit: null,
          count: result.rows.length,
          total: totalCount
        }
      });
    }
  } catch (error) {
    console.error('Error en getAllEmployees:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener empleados'
    });
  }
};


// Obtener un empleado por ID
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT e.*, d.nombre as dependencia_nombre
       FROM empleados e
       LEFT JOIN dependencias d ON e.dependencia_id = d.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en getEmployeeById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener empleado'
    });
  }
};

// Crear nuevo empleado
const createEmployee = async (req, res) => {
  try {
    console.log('[CREATE_EMPLOYEE] Request received');
    console.log('[CREATE_EMPLOYEE] Request body:', req.body);

    // Validar errores de express-validator
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[CREATE_EMPLOYEE] Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      rfc,
      email,
      telefono,
      tipo,
      dependencia_id,
      puesto,
      fecha_ingreso,
      activo = true,
      unidad_responsable,
      subtipo_administrativo
    } = req.body;

    // Validar RFC único
    const existingRFC = await db.query(
      'SELECT id FROM empleados WHERE rfc = $1',
      [rfc]
    );

    if (existingRFC.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El RFC ya está registrado'
      });
    }

    // Validar email único si se proporciona
    if (email) {
      const existingEmail = await db.query(
        'SELECT id FROM empleados WHERE email = $1',
        [email]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }
    }

    const result = await db.query(
      `INSERT INTO empleados 
       (nombre, apellido_paterno, apellido_materno, rfc, email, telefono, 
        tipo, dependencia_id, activo, unidad_responsable, subtipo_administrativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [nombre, apellido_paterno, apellido_materno, rfc, email, telefono,
        tipo, dependencia_id, activo, unidad_responsable, subtipo_administrativo]
    );

    res.status(201).json({
      success: true,
      message: 'Empleado creado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en createEmployee:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear empleado'
    });
  }
};

// Actualizar empleado
const updateEmployee = async (req, res) => {
  try {
    console.log('[UPDATE_EMPLOYEE] Request received for ID:', req.params.id);
    console.log('[UPDATE_EMPLOYEE] Request body:', req.body);

    // Validar errores de express-validator
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[UPDATE_EMPLOYEE] Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      rfc,
      email,
      telefono,
      tipo,
      dependencia_id,
      puesto,
      activo,
      unidad_responsable,
      subtipo_administrativo
    } = req.body;

    // Verificar que el empleado existe
    const existing = await db.query('SELECT id FROM empleados WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      console.log('[UPDATE_EMPLOYEE] Employee not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    console.log('[UPDATE_EMPLOYEE] Employee exists, validating RFC...');

    // Validar RFC único (excepto el mismo empleado)
    const existingRFC = await db.query(
      'SELECT id FROM empleados WHERE rfc = $1 AND id != $2',
      [rfc, id]
    );

    if (existingRFC.rows.length > 0) {
      console.log('[UPDATE_EMPLOYEE] RFC already exists:', rfc);
      return res.status(400).json({
        success: false,
        message: 'El RFC ya está registrado'
      });
    }

    // Validar email único si se proporciona
    if (email) {
      const existingEmail = await db.query(
        'SELECT id FROM empleados WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (existingEmail.rows.length > 0) {
        console.log('[UPDATE_EMPLOYEE] Email already exists:', email);
        return res.status(400).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }
    }

    console.log('[UPDATE_EMPLOYEE] Updating employee...');

    const result = await db.query(
      `UPDATE empleados 
       SET nombre = $1, apellido_paterno = $2, apellido_materno = $3,
           rfc = $4, email = $5, telefono = $6, tipo = $7,
           dependencia_id = $8, activo = $9,
           unidad_responsable = $10, subtipo_administrativo = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [nombre, apellido_paterno, apellido_materno, rfc, email, telefono,
        tipo, dependencia_id, activo, unidad_responsable, subtipo_administrativo, id]
    );

    console.log('[UPDATE_EMPLOYEE] Update successful:', result.rows[0]);

    res.json({
      success: true,
      message: 'Empleado actualizado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en updateEmployee:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar empleado'
    });
  }
};

// Eliminar empleado (soft delete)
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE empleados SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Empleado desactivado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en deleteEmployee:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar empleado'
    });
  }
};

// Obtener estadísticas de empleados
const getEmployeeStats = async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN activo = true THEN 1 END) as activos,
        COUNT(CASE WHEN activo = false THEN 1 END) as inactivos,
        COUNT(CASE WHEN tipo = 'docente' THEN 1 END) as docentes,
        COUNT(CASE WHEN tipo = 'administrativo' THEN 1 END) as administrativos
      FROM empleados
    `);

    res.json({
      success: true,
      data: stats.rows[0]
    });
  } catch (error) {
    console.error('Error en getEmployeeStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

// Importar empleados desde Excel
const importEmployeesFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo Excel'
      });
    }

    console.log('[IMPORT_EMPLOYEES] Processing Excel file:', req.file.originalname);

    // Parse Excel file
    const parseResult = parseEmployeesFromExcel(req.file.buffer);

    if (!parseResult.success || parseResult.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Error al procesar el archivo Excel',
        errors: parseResult.errors,
        imported: 0,
        failed: parseResult.errors.length
      });
    }

    console.log('[IMPORT_EMPLOYEES] Valid employees found:', parseResult.data.length);

    // Check for duplicate RFCs in DB
    const rfcs = parseResult.data.map(emp => emp.rfc);
    const duplicateCheck = await db.query(
      'SELECT rfc FROM empleados WHERE rfc = ANY($1)',
      [rfcs]
    );

    const existingRFCs = duplicateCheck.rows.map(row => row.rfc);
    const duplicateErrors = [];

    // Filter out duplicates
    const employeesToImport = parseResult.data.filter(emp => {
      if (existingRFCs.includes(emp.rfc)) {
        duplicateErrors.push(`RFC ${emp.rfc} ya existe en la base de datos`);
        return false;
      }
      return true;
    });

    if (employeesToImport.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Todos los empleados ya existen en la base de datos',
        errors: [...parseResult.errors, ...duplicateErrors],
        imported: 0,
        failed: parseResult.data.length
      });
    }

    // Bulk insert
    const insertPromises = employeesToImport.map(emp => {
      return db.query(
        `INSERT INTO empleados 
         (nombre, apellido_paterno, apellido_materno, rfc, email, telefono, 
          tipo, dependencia_id, activo, unidad_responsable, subtipo_administrativo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, rfc`,
        [emp.nombre, emp.apellido_paterno, emp.apellido_materno, emp.rfc,
        emp.email, emp.telefono, emp.tipo, emp.dependencia_id, emp.activo,
        emp.unidad_responsable, emp.subtipo_administrativo]
      );
    });

    const results = await Promise.allSettled(insertPromises);

    const imported = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const insertErrors = results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason.message);

    console.log('[IMPORT_EMPLOYEES] Import complete:', { imported, failed });

    res.json({
      success: true,
      message: `Importación completada: ${imported} empleados importados`,
      imported: imported,
      failed: failed + duplicateErrors.length,
      errors: [...parseResult.errors, ...duplicateErrors, ...insertErrors]
    });
  } catch (error) {
    console.error('Error en importEmployeesFromExcel:', error);
    res.status(500).json({
      success: false,
      message: 'Error al importar empleados',
      error: error.message
    });
  }
};

// Descargar plantilla Excel
const downloadTemplate = (req, res) => {
  try {
    const templateBuffer = generateEmployeeTemplate();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_empleados.xlsx');
    res.send(templateBuffer);
  } catch (error) {
    console.error('Error en downloadTemplate:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar plantilla'
    });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
  importEmployeesFromExcel,
  downloadTemplate
};
