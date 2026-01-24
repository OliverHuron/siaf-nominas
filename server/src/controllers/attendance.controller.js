const db = require('../config/database');

// Registrar entrada (Check-in)
const checkIn = async (req, res) => {
  try {
    const { empleado_id } = req.body;
    const fecha = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Verificar que el empleado existe y está activo
    const empleado = await db.query(
      'SELECT id, nombre, apellido_paterno, activo FROM empleados WHERE id = $1',
      [empleado_id]
    );

    if (empleado.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    if (!empleado.rows[0].activo) {
      return res.status(400).json({
        success: false,
        message: 'El empleado no está activo'
      });
    }

    // Verificar si ya tiene registro de entrada hoy
    const existingAttendance = await db.query(
      'SELECT * FROM asistencias WHERE empleado_id = $1 AND fecha = $2',
      [empleado_id, fecha]
    );

    if (existingAttendance.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un registro de entrada para hoy',
        data: existingAttendance.rows[0]
      });
    }

    // Registrar entrada
    const result = await db.query(
      `INSERT INTO asistencias (empleado_id, fecha, hora_entrada, estado)
       VALUES ($1, $2, CURRENT_TIME, 'presente')
       RETURNING *`,
      [empleado_id, fecha]
    );

    // Obtener datos completos del empleado
    const attendance = await db.query(
      `SELECT a.*, e.nombre, e.apellido_paterno, e.apellido_materno, e.puesto, d.nombre as dependencia_nombre
       FROM asistencias a
       JOIN empleados e ON e.id = a.empleado_id
       LEFT JOIN dependencias d ON d.id = e.dependencia_id
       WHERE a.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      message: 'Entrada registrada exitosamente',
      data: attendance.rows[0]
    });
  } catch (error) {
    console.error('Error en checkIn:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar entrada'
    });
  }
};

// Registrar salida (Check-out)
const checkOut = async (req, res) => {
  try {
    const { empleado_id } = req.body;
    const fecha = new Date().toISOString().split('T')[0];

    // Buscar registro de entrada de hoy
    const attendance = await db.query(
      'SELECT * FROM asistencias WHERE empleado_id = $1 AND fecha = $2',
      [empleado_id, fecha]
    );

    if (attendance.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay registro de entrada para hoy'
      });
    }

    if (attendance.rows[0].hora_salida) {
      return res.status(400).json({
        success: false,
        message: 'Ya se registró la salida para hoy',
        data: attendance.rows[0]
      });
    }

    // Registrar salida
    const result = await db.query(
      `UPDATE asistencias 
       SET hora_salida = CURRENT_TIME, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [attendance.rows[0].id]
    );

    // Obtener datos completos
    const updatedAttendance = await db.query(
      `SELECT a.*, e.nombre, e.apellido_paterno, e.apellido_materno, e.puesto, d.nombre as dependencia_nombre
       FROM asistencias a
       JOIN empleados e ON e.id = a.empleado_id
       LEFT JOIN dependencias d ON d.id = e.dependencia_id
       WHERE a.id = $1`,
      [result.rows[0].id]
    );

    res.json({
      success: true,
      message: 'Salida registrada exitosamente',
      data: updatedAttendance.rows[0]
    });
  } catch (error) {
    console.error('Error en checkOut:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar salida'
    });
  }
};

// Obtener asistencias de hoy
const getAttendanceToday = async (req, res) => {
  try {
    const fecha = new Date().toISOString().split('T')[0];
    
    const result = await db.query(
      `SELECT a.*, 
              e.nombre, e.apellido_paterno, e.apellido_materno, 
              e.puesto, e.tipo_empleado,
              d.nombre as dependencia_nombre
       FROM asistencias a
       JOIN empleados e ON e.id = a.empleado_id
       LEFT JOIN dependencias d ON d.id = e.dependencia_id
       WHERE a.fecha = $1
       ORDER BY a.hora_entrada DESC`,
      [fecha]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getAttendanceToday:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener asistencias'
    });
  }
};

// Obtener todas las asistencias con filtros
const getAllAttendances = async (req, res) => {
  try {
    const { empleado_id, fecha_inicio, fecha_fin, estado } = req.query;
    
    let query = `
      SELECT a.*, 
             e.nombre, e.apellido_paterno, e.apellido_materno, 
             e.puesto, e.tipo_empleado,
             d.nombre as dependencia_nombre
      FROM asistencias a
      JOIN empleados e ON e.id = a.empleado_id
      LEFT JOIN dependencias d ON d.id = e.dependencia_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (empleado_id) {
      query += ` AND a.empleado_id = $${paramCount}`;
      params.push(empleado_id);
      paramCount++;
    }

    if (fecha_inicio) {
      query += ` AND a.fecha >= $${paramCount}`;
      params.push(fecha_inicio);
      paramCount++;
    }

    if (fecha_fin) {
      query += ` AND a.fecha <= $${paramCount}`;
      params.push(fecha_fin);
      paramCount++;
    }

    if (estado) {
      query += ` AND a.estado = $${paramCount}`;
      params.push(estado);
      paramCount++;
    }

    query += ' ORDER BY a.fecha DESC, a.hora_entrada DESC';

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getAllAttendances:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener asistencias'
    });
  }
};

// Obtener historial de asistencias de un empleado
const getAttendanceByEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin, limit = 30 } = req.query;

    let query = `
      SELECT a.*, 
             e.nombre, e.apellido_paterno, e.apellido_materno, 
             e.puesto, e.tipo_empleado,
             d.nombre as dependencia_nombre
      FROM asistencias a
      JOIN empleados e ON e.id = a.empleado_id
      LEFT JOIN dependencias d ON d.id = e.dependencia_id
      WHERE a.empleado_id = $1
    `;
    const params = [id];
    let paramCount = 2;

    if (fecha_inicio) {
      query += ` AND a.fecha >= $${paramCount}`;
      params.push(fecha_inicio);
      paramCount++;
    }

    if (fecha_fin) {
      query += ` AND a.fecha <= $${paramCount}`;
      params.push(fecha_fin);
      paramCount++;
    }

    query += ` ORDER BY a.fecha DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getAttendanceByEmployee:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial'
    });
  }
};

// Obtener estadísticas de asistencias
const getAttendanceStats = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fecha = new Date().toISOString().split('T')[0];

    // Estadísticas de hoy
    const todayStats = await db.query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(CASE WHEN estado = 'presente' THEN 1 END) as presentes,
        COUNT(CASE WHEN estado = 'ausente' THEN 1 END) as ausentes,
        COUNT(CASE WHEN estado = 'justificado' THEN 1 END) as justificados,
        COUNT(CASE WHEN hora_salida IS NOT NULL THEN 1 END) as con_salida,
        COUNT(CASE WHEN hora_salida IS NULL THEN 1 END) as sin_salida
      FROM asistencias
      WHERE fecha = $1
    `, [fecha]);

    // Total de empleados activos
    const totalEmpleados = await db.query(
      'SELECT COUNT(*) as total FROM empleados WHERE activo = true'
    );

    // Estadísticas del período si se especifica
    let periodStats = null;
    if (fecha_inicio && fecha_fin) {
      periodStats = await db.query(`
        SELECT 
          COUNT(DISTINCT empleado_id) as empleados_asistieron,
          COUNT(*) as total_asistencias,
          ROUND(AVG(CASE 
            WHEN hora_entrada IS NOT NULL AND hora_salida IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (hora_salida - hora_entrada))/3600 
          END), 2) as horas_promedio
        FROM asistencias
        WHERE fecha >= $1 AND fecha <= $2
      `, [fecha_inicio, fecha_fin]);
    }

    res.json({
      success: true,
      data: {
        hoy: {
          ...todayStats.rows[0],
          total_empleados: parseInt(totalEmpleados.rows[0].total),
          porcentaje_asistencia: totalEmpleados.rows[0].total > 0 
            ? Math.round((todayStats.rows[0].presentes / totalEmpleados.rows[0].total) * 100)
            : 0
        },
        periodo: periodStats ? periodStats.rows[0] : null
      }
    });
  } catch (error) {
    console.error('Error en getAttendanceStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

// Actualizar estado de asistencia (para justificaciones, etc.)
const updateAttendanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observaciones } = req.body;

    const result = await db.query(
      `UPDATE asistencias 
       SET estado = $1, observaciones = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [estado, observaciones, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registro de asistencia no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en updateAttendanceStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado'
    });
  }
};

// Generar reporte de asistencias
const generateReport = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, empleado_id, formato = 'json' } = req.query;

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren fecha_inicio y fecha_fin'
      });
    }

    let query = `
      SELECT 
        e.id as empleado_id,
        e.nombre || ' ' || e.apellido_paterno || ' ' || COALESCE(e.apellido_materno, '') as nombre_completo,
        e.puesto,
        e.tipo_empleado,
        d.nombre as dependencia,
        COUNT(*) as dias_asistidos,
        COUNT(CASE WHEN a.estado = 'presente' THEN 1 END) as dias_presentes,
        COUNT(CASE WHEN a.estado = 'ausente' THEN 1 END) as dias_ausentes,
        COUNT(CASE WHEN a.estado = 'justificado' THEN 1 END) as dias_justificados,
        ROUND(AVG(CASE 
          WHEN a.hora_entrada IS NOT NULL AND a.hora_salida IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (a.hora_salida - a.hora_entrada))/3600 
        END), 2) as horas_promedio
      FROM empleados e
      LEFT JOIN dependencias d ON d.id = e.dependencia_id
      LEFT JOIN asistencias a ON a.empleado_id = e.id AND a.fecha >= $1 AND a.fecha <= $2
    `;
    const params = [fecha_inicio, fecha_fin];

    if (empleado_id) {
      query += ' WHERE e.id = $3';
      params.push(empleado_id);
    }

    query += ' GROUP BY e.id, e.nombre, e.apellido_paterno, e.apellido_materno, e.puesto, e.tipo_empleado, d.nombre';
    query += ' ORDER BY e.apellido_paterno, e.apellido_materno, e.nombre';

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: {
        periodo: {
          fecha_inicio,
          fecha_fin
        },
        empleados: result.rows
      }
    });
  } catch (error) {
    console.error('Error en generateReport:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar reporte'
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getAttendanceToday,
  getAllAttendances,
  getAttendanceByEmployee,
  getAttendanceStats,
  updateAttendanceStatus,
  generateReport
};
