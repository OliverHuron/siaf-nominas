const db = require('../config/database');

// Obtener todos los conceptos de nómina
const getConceptosNomina = async (req, res) => {
  try {
    const { activo } = req.query;
    
    let query = 'SELECT * FROM conceptos_nomina WHERE 1=1';
    const params = [];
    
    if (activo !== undefined) {
      query += ' AND activo = $1';
      params.push(activo === 'true');
    }
    
    query += ' ORDER BY nombre';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getConceptosNomina:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener conceptos de nómina'
    });
  }
};

// Obtener estatus de firmas (vista consolidada)
const getEstatusFirmas = async (req, res) => {
  try {
    const { 
      unidad_responsable, 
      tipo, 
      subtipo_administrativo, 
      periodo_aplicacion,
      firmado,
      search
    } = req.query;
    
    let query = `
      SELECT 
        e.id as empleado_id,
        e.nombre,
        e.apellido_paterno,
        e.apellido_materno,
        e.rfc,
        e.tipo,
        e.subtipo_administrativo,
        e.unidad_responsable,
        e.dependencia_id,
        d.nombre as dependencia_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'concepto_id', cn.id,
              'concepto_nombre', cn.nombre,
              'activo', ecn.activo,
              'firmado', ecn.firmado,
              'fecha_firma', ecn.fecha_firma,
              'periodo_aplicacion', ecn.periodo_aplicacion,
              'observaciones', ecn.observaciones
            ) ORDER BY cn.nombre
          ) FILTER (WHERE cn.id IS NOT NULL),
          '[]'::json
        ) as conceptos
      FROM empleados e
      LEFT JOIN dependencias d ON e.dependencia_id = d.id
      LEFT JOIN empleado_concepto_nomina ecn ON e.id = ecn.empleado_id
      LEFT JOIN conceptos_nomina cn ON ecn.concepto_nomina_id = cn.id
      WHERE e.activo = true
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (search) {
      query += ` AND (
        LOWER(e.nombre || ' ' || e.apellido_paterno || ' ' || COALESCE(e.apellido_materno, '')) LIKE LOWER($${paramCount})
        OR LOWER(e.rfc) LIKE LOWER($${paramCount})
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    if (unidad_responsable) {
      query += ` AND e.unidad_responsable = $${paramCount}`;
      params.push(unidad_responsable);
      paramCount++;
    }
    
    if (tipo) {
      query += ` AND e.tipo = $${paramCount}`;
      params.push(tipo);
      paramCount++;
    }
    
    if (subtipo_administrativo) {
      query += ` AND e.subtipo_administrativo = $${paramCount}`;
      params.push(subtipo_administrativo);
      paramCount++;
    }
    
    if (periodo_aplicacion) {
      query += ` AND ecn.periodo_aplicacion = $${paramCount}`;
      params.push(periodo_aplicacion);
      paramCount++;
    }
    
    if (firmado !== undefined) {
      query += ` AND ecn.firmado = $${paramCount}`;
      params.push(firmado === 'true');
      paramCount++;
    }
    
    query += ` 
      GROUP BY e.id, e.nombre, e.apellido_paterno, e.apellido_materno, e.rfc, 
               e.tipo, e.subtipo_administrativo, e.unidad_responsable, 
               e.dependencia_id, d.nombre
      ORDER BY e.apellido_paterno, e.apellido_materno, e.nombre
    `;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getEstatusFirmas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estatus de firmas'
    });
  }
};

// Asignar concepto de nómina a un empleado
const asignarConceptoNomina = async (req, res) => {
  try {
    const { empleado_id, concepto_nomina_id, periodo_aplicacion, observaciones } = req.body;
    
    // Validar que el empleado existe
    const empleado = await db.query('SELECT id FROM empleados WHERE id = $1', [empleado_id]);
    if (empleado.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }
    
    // Validar que el concepto existe
    const concepto = await db.query('SELECT id FROM conceptos_nomina WHERE id = $1', [concepto_nomina_id]);
    if (concepto.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Concepto de nómina no encontrado'
      });
    }
    
    // Verificar si ya existe la asignación
    const existente = await db.query(
      'SELECT id FROM empleado_concepto_nomina WHERE empleado_id = $1 AND concepto_nomina_id = $2 AND periodo_aplicacion = $3',
      [empleado_id, concepto_nomina_id, periodo_aplicacion]
    );
    
    if (existente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El concepto ya está asignado al empleado para este periodo'
      });
    }
    
    const result = await db.query(
      `INSERT INTO empleado_concepto_nomina 
       (empleado_id, concepto_nomina_id, periodo_aplicacion, observaciones)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [empleado_id, concepto_nomina_id, periodo_aplicacion, observaciones]
    );
    
    res.status(201).json({
      success: true,
      message: 'Concepto de nómina asignado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en asignarConceptoNomina:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar concepto de nómina'
    });
  }
};

// Registrar firma de concepto
const registrarFirma = async (req, res) => {
  try {
    const { id } = req.params;
    const { firmado, observaciones } = req.body;
    
    const fecha_firma = firmado ? new Date() : null;
    
    const result = await db.query(
      `UPDATE empleado_concepto_nomina 
       SET firmado = $1, fecha_firma = $2, observaciones = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [firmado, fecha_firma, observaciones, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registro no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Firma registrada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en registrarFirma:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar firma'
    });
  }
};

// Desactivar concepto de nómina de un empleado
const desactivarConceptoNomina = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `UPDATE empleado_concepto_nomina 
       SET activo = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registro no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Concepto de nómina desactivado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en desactivarConceptoNomina:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar concepto de nómina'
    });
  }
};

// Obtener resumen de firmas pendientes
const getResumenFirmasPendientes = async (req, res) => {
  try {
    const { periodo_aplicacion } = req.query;
    
    let query = `
      SELECT 
        cn.nombre as concepto_nombre,
        COUNT(*) as total,
        COUNT(CASE WHEN ecn.firmado = true THEN 1 END) as firmados,
        COUNT(CASE WHEN ecn.firmado = false THEN 1 END) as pendientes
      FROM empleado_concepto_nomina ecn
      JOIN conceptos_nomina cn ON ecn.concepto_nomina_id = cn.id
      JOIN empleados e ON ecn.empleado_id = e.id
      WHERE ecn.activo = true AND e.activo = true
    `;
    
    const params = [];
    
    if (periodo_aplicacion) {
      query += ' AND ecn.periodo_aplicacion = $1';
      params.push(periodo_aplicacion);
    }
    
    query += ' GROUP BY cn.nombre ORDER BY cn.nombre';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getResumenFirmasPendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de firmas pendientes'
    });
  }
};

module.exports = {
  getConceptosNomina,
  getEstatusFirmas,
  asignarConceptoNomina,
  registrarFirma,
  desactivarConceptoNomina,
  getResumenFirmasPendientes
};
