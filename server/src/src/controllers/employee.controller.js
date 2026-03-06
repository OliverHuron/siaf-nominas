const db = require('../config/database');
const { broadcast } = require('../config/sse');
const { parseEmployeesFromExcel, generateEmployeeTemplate } = require('../services/employee.service');

// Background processing function with batch inserts
async function processImportInBackground(employees, job) {
  const BATCH_SIZE = 1000; // Process 1000 records at a time
  let totalImported = 0;
  let totalFailed = 0;
  const allErrors = [];

  console.log(`[BACKGROUND_IMPORT] Starting batch processing for ${employees.length} employees`);

  for (let i = 0; i < employees.length; i += BATCH_SIZE) {
    const batch = employees.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(employees.length / BATCH_SIZE);

    console.log(`[BACKGROUND_IMPORT] Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)`);

    try {
      // Build bulk insert query
      const values = [];
      const params = [];
      let paramIndex = 1;

      batch.forEach((emp) => {
        const rowPlaceholders = [];
        for (let j = 0; j < 10; j++) {
          rowPlaceholders.push(`$${paramIndex++}`);
        }
        values.push(`(${rowPlaceholders.join(', ')})`);

        params.push(
          emp.nombre, emp.apellido_paterno, emp.apellido_materno,
          emp.email, emp.telefono, emp.tipo, emp.dependencia_id, emp.activo,
          emp.unidad_responsable, emp.subtipo_administrativo
        );
      });

      const query = `
        INSERT INTO empleados 
        (nombre, apellido_paterno, apellido_materno, email, telefono, 
         tipo, dependencia_id, activo, unidad_responsable, subtipo_administrativo)
        VALUES ${values.join(', ')}
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `;

      const result = await db.query(query, params);
      const imported = result.rowCount;
      const failed = batch.length - imported;

      totalImported += imported;
      totalFailed += failed;

      // Update job progress
      job.updateProgress(i + batch.length, totalImported, totalFailed);

      console.log(`[BACKGROUND_IMPORT] Batch ${batchNumber} complete: ${imported} imported, ${failed} failed`);
    } catch (error) {
      console.error(`[BACKGROUND_IMPORT] Batch ${batchNumber} error:`, error.message);
      totalFailed += batch.length;
      allErrors.push(`Batch ${batchNumber}: ${error.message}`);
      job.updateProgress(i + batch.length, totalImported, totalFailed, [error.message]);
    }
  }

  job.complete();
  console.log(`[BACKGROUND_IMPORT] Import complete: ${totalImported} imported, ${totalFailed} failed`);
}


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
      SELECT e.*
      FROM empleados e
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
        OR LOWER(COALESCE(e.email, '')) LIKE LOWER($${paramCount})
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
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 1;

    // Aplicar los mismos filtros al countQuery
    if (search) {
      countQuery += ` AND (
        LOWER(e.nombre || ' ' || e.apellido_paterno || ' ' || COALESCE(e.apellido_materno, '')) LIKE LOWER($${countParamCount})
        OR LOWER(COALESCE(e.email, '')) LIKE LOWER($${countParamCount})
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
      `SELECT e.*
       FROM empleados e
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
      email,
      telefono,
      tipo,
      dependencia_id,
      activo = true,
      unidad_responsable,
      subtipo_administrativo
    } = req.body;

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
       (nombre, apellido_paterno, apellido_materno, email, telefono, 
        tipo, dependencia_id, activo, unidad_responsable, subtipo_administrativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [nombre, apellido_paterno, apellido_materno, email, telefono,
        tipo, dependencia_id, activo, unidad_responsable, subtipo_administrativo]
    );

    broadcast('employee_created', { id: result.rows[0].id });
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
      email,
      telefono,
      tipo,
      dependencia_id,
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

    console.log('[UPDATE_EMPLOYEE] Employee exists, validating email...');

    // Validar email único (excepto el mismo empleado)
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
           email = $4, telefono = $5, tipo = $6,
           dependencia_id = $7, activo = $8,
           unidad_responsable = $9, subtipo_administrativo = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [nombre, apellido_paterno, apellido_materno, email, telefono,
        tipo, dependencia_id, activo, unidad_responsable, subtipo_administrativo, id]
    );

    console.log('[UPDATE_EMPLOYEE] Update successful:', result.rows[0]);

    broadcast('employee_updated', { id: result.rows[0].id });
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

    broadcast('employee_updated', { id: parseInt(id) });
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

// Importar empleados desde Excel (Streaming & Background)
const importEmployeesFromExcel = async (req, res) => {
  try {
    console.log('[IMPORT_EMPLOYEES] Starting import...');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo Excel'
      });
    }

    console.log('[IMPORT_EMPLOYEES] File saved to disk:', req.file.path);

    // Generate unique job ID
    const { v4: uuidv4 } = require('uuid');
    const jobId = uuidv4();

    const { importJobs, ImportJob } = require('../services/importJob.service');
    // Initialize job with unknown total rows initially
    const job = new ImportJob(jobId, 0);
    importJobs.set(jobId, job);

    res.json({
      success: true,
      message: 'Importación iniciada en segundo plano',
      jobId: jobId,
      async: true
    });

    // Process in background using Stream
    processExcelStream(req.file.path, job).catch(error => {
      console.error('[IMPORT_EMPLOYEES] Background stream error:', error);
      job.fail(error.message);
      // Clean up file if error
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    });

  } catch (error) {
    console.error('Error en importEmployeesFromExcel:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al iniciar importación'
    });
  }
};

// Streaming Processor using ExcelJS
async function processExcelStream(filePath, job) {
  const ExcelJS = require('exceljs');
  const fs = require('fs');

  console.log('[STREAM] Starting Excel stream processing:', filePath);

  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    worksheets: 'emit',
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    styles: 'ignore'
  });

  let totalRows = 0;
  let batch = [];
  const BATCH_SIZE = 1000;
  let headers = null;

  try {
    for await (const worksheetReader of workbook) {
      console.log('[STREAM] Reading worksheet:', worksheetReader.name);

      for await (const row of worksheetReader) {
        // Skip empty rows
        if (!row.values || row.values.length === 0) continue;

        // Extract values (ExcelJS rows are 1-based, values array has empty 0 index)
        const rowValues = row.values.slice(1); // Remove first empty element if present

        if (!headers) {
          headers = rowValues;
          console.log('[STREAM] Headers found:', headers);
          continue;
        }

        // Map row to object
        const employee = mapRowToEmployee(rowValues, headers);

        if (employee && employee.nombre) {
          batch.push(employee);
          totalRows++;

          // Update job total dynamically as we find rows
          job.totalRows = totalRows;
        }

        // Process batch
        if (batch.length >= BATCH_SIZE) {
          await processBatch(batch, job);
          batch = [];
        }
      }
    }

    // Process final batch
    if (batch.length > 0) {
      await processBatch(batch, job);
    }

    job.complete();
    console.log('[STREAM] Import complete successfully');

  } catch (error) {
    console.error('[STREAM] Error processing stream:', error);
    job.fail(error.message);
  } finally {
    // Delete temp file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[STREAM] Temp file deleted');
    }
  }
}

function mapRowToEmployee(rowValues, headers) {
  // Simple mapping based on index or header name matching
  // Assuming standard template order or finding index
  // For robustness, let's map by header name if possible, or fallback to index

  const getVal = (headerName, defaultVal = null) => {
    const idx = headers.findIndex(h => h && h.toString().toLowerCase().includes(headerName.toLowerCase()));
    if (idx !== -1 && rowValues[idx] !== undefined) return rowValues[idx];
    return defaultVal;
  };

  const nombre = getVal('nombre');
  if (!nombre) return null;

  return {
    nombre: String(nombre).trim(),
    apellido_paterno: getVal('paterno', '') || getVal('apellido paterno', ''),
    apellido_materno: getVal('materno', '') || getVal('apellido materno', ''),
    email: getVal('email', null),
    telefono: getVal('tel', null) || getVal('teléfono', null),
    tipo: getVal('tipo', 'docente').toLowerCase(),
    unidad_responsable: getVal('unidad', null),
    subtipo_administrativo: getVal('subtipo', null),
    activo: true,
    dependencia_id: null
  };
}

async function processBatch(batch, job) {
  // Reuse the exact same bulk insert logic
  // ... (Insert logic here, simplified for brevity but robust)
  try {
    const values = [];
    const params = [];
    let paramIndex = 1;

    batch.forEach((emp) => {
      const rowPlaceholders = [];
      for (let j = 0; j < 10; j++) {
        rowPlaceholders.push(`$${paramIndex++}`);
      }
      values.push(`(${rowPlaceholders.join(', ')})`);

      params.push(
        emp.nombre, emp.apellido_paterno, emp.apellido_materno,
        emp.email, emp.telefono, emp.tipo, emp.dependencia_id, emp.activo,
        emp.unidad_responsable, emp.subtipo_administrativo
      );
    });

    // Insert and capture inserted IDs
    const query = `
        INSERT INTO empleados 
        (nombre, apellido_paterno, apellido_materno, email, telefono, 
         tipo, dependencia_id, activo, unidad_responsable, subtipo_administrativo)
        VALUES ${values.join(', ')}
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `;

    const result = await db.query(query, params);
    const imported = result.rowCount;
    const failed = batch.length - imported; // Actually "duplicates skipped"

    job.updateProgress(job.processedRows + batch.length, job.importedRows + imported, job.failedRows + failed);
  } catch (err) {
    console.error('Batch insert error:', err);
    job.updateProgress(job.processedRows + batch.length, job.importedRows, job.failedRows + batch.length, [err.message]);
  }
}

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
