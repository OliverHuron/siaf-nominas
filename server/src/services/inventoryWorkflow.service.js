const pool = require('../config/database');

/**
 * WORKFLOW DE INVENTARIO - "LA PAPA CALIENTE"
 * 
 * Este servicio maneja el flujo de trabajo donde:
 * - Secretaría Administrativa crea registros con datos FISCALES
 * - Coordinadores reciben y completan datos FÍSICOS
 */

// =====================================================
// FUNCIONES DE SERVICIO (para usar en rutas)
// =====================================================

/**
 * Obtener items por recibir para un usuario
 */
const getItemsPorRecibir = async (userId, userRole) => {
  // Obtener coordinación del usuario
  const userQuery = await pool.query(
    'SELECT coordinacion_id FROM usuarios WHERE id = $1',
    [userId]
  );

  if (userQuery.rows.length === 0) {
    throw new Error('Usuario no encontrado');
  }

  const { coordinacion_id } = userQuery.rows[0];

  // Coordinadores solo ven sus equipos en tránsito
  let query = `
    SELECT 
      i.*,
      c.nombre as coordinacion_nombre,
      u.nombre || ' ' || u.apellido_paterno as enviado_por_nombre
    FROM inventario i
    LEFT JOIN coordinaciones c ON i.coordinacion_id = c.id
    LEFT JOIN usuarios u ON i.enviado_por = u.id
    WHERE i.stage = 'EN_TRANSITO'
  `;

  const params = [];
  if (userRole === 'coordinador' && coordinacion_id) {
    query += ` AND i.coordinacion_id = $1`;
    params.push(coordinacion_id);
  }

  query += ` ORDER BY i.fecha_envio DESC`;

  const result = await pool.query(query, params);

  return {
    success: true,
    data: result.rows,
    count: result.rows.length
  };
};

/**
 * Obtener items pendientes de completar datos fiscales
 */
const getItemsPendientesFiscal = async (userId) => {
  const query = `
    SELECT 
      i.*,
      c.nombre as coordinacion_nombre
    FROM inventario i
    LEFT JOIN coordinaciones c ON i.coordinacion_id = c.id
    WHERE i.stage = 'PENDIENTE_FISCAL'
    ORDER BY i.created_at DESC
  `;

  const result = await pool.query(query);

  return {
    success: true,
    data: result.rows,
    count: result.rows.length
  };
};

// NO exportar aquí, se exporta al final del archivo

// =====================================================
// 1. CREAR REGISTRO FISCAL (Secretaría Administrativa)
// =====================================================
exports.crearRegistroFiscal = async (req, res) => {
  try {
    const {
      // Datos fiscales (obligatorios para admin)
      proveedor,
      costo,
      uuid_fiscal,
      numero_factura,
      cog,
      fondo,
      fecha_compra,
      coordinacion_destino,
      // Datos básicos
      marca,
      modelo,
      descripcion
    } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    // Validar que solo admin puede crear registros fiscales
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo Secretaría Administrativa puede crear registros fiscales'
      });
    }

    // Validar datos fiscales obligatorios
    if (!proveedor || !costo || !coordinacion_destino) {
      return res.status(400).json({
        success: false,
        message: 'Proveedor, costo y coordinación destino son obligatorios'
      });
    }

    const query = `
      INSERT INTO inventario (
        proveedor, costo, uuid_fiscal, numero_factura, cog, fondo, fecha_compra,
        coordinacion_destino, enviado_por, fecha_envio,
        marca, modelo, descripcion,
        stage, estado, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, NOW(),
        $10, $11, $12,
        'EN_TRANSITO', 'buena', NOW()
      )
      RETURNING *
    `;

    const result = await pool.query(query, [
      proveedor, costo, uuid_fiscal, numero_factura, cog, fondo, fecha_compra,
      coordinacion_destino, userId,
      marca, modelo, descripcion
    ]);

    res.status(201).json({
      success: true,
      message: `Equipo registrado y enviado a coordinación. Esperando recepción.`,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al crear registro fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear registro fiscal',
      error: error.message
    });
  }
};

// =====================================================
// 2. LISTAR EQUIPOS POR RECIBIR (Coordinador)
// =====================================================
exports.listarPorRecibir = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Obtener coordinación del usuario
    const userQuery = await pool.query(
      'SELECT coordinacion_id FROM usuarios WHERE id = $1',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const { coordinacion_id } = userQuery.rows[0];

    // Coordinadores solo ven sus equipos en tránsito
    let query = `
      SELECT 
        i.*,
        c.nombre as coordinacion_nombre,
        u.nombre || ' ' || u.apellido_paterno as enviado_por_nombre
      FROM inventario i
      LEFT JOIN coordinaciones c ON i.coordinacion_id = c.id
      LEFT JOIN usuarios u ON i.enviado_por = u.id
      WHERE i.stage = 'EN_TRANSITO'
    `;

    const params = [];
    if (userRole === 'coordinador' && coordinacion_id) {
      query += ` AND i.coordinacion_id = $1`;
      params.push(coordinacion_id);
    }

    query += ` ORDER BY i.fecha_envio DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error al listar por recibir:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar equipos por recibir'
    });
  }
};

// =====================================================
// 3. RECIBIR Y COMPLETAR DATOS FÍSICOS (Coordinador)
// =====================================================
exports.recibirEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      numero_serie,
      numero_patrimonio,
      ubicacion,
      estado_uso,
      folio
    } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    // Validar que el equipo existe y está en tránsito
    const checkQuery = await pool.query(
      'SELECT * FROM inventario WHERE id = $1 AND stage = $2',
      [id, 'EN_TRANSITO']
    );

    if (checkQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Equipo no encontrado o ya fue recibido'
      });
    }

    const equipo = checkQuery.rows[0];

    // Validar que el coordinador pertenece a la coordinación destino
    if (userRole === 'coordinador') {
      const userQuery = await pool.query(
        'SELECT coordinacion_id FROM usuarios WHERE id = $1',
        [userId]
      );

      if (userQuery.rows[0].coordinacion_id !== equipo.coordinacion_id) {
        return res.status(403).json({
          success: false,
          message: 'Este equipo no está destinado a tu coordinación'
        });
      }
    }

    // Validar datos físicos obligatorios
    if (!numero_serie) {
      return res.status(400).json({
        success: false,
        message: 'El número de serie es obligatorio'
      });
    }

    // Actualizar con datos físicos y cambiar coordinación
    const updateQuery = `
      UPDATE inventario
      SET 
        numero_serie = $1,
        numero_patrimonio = $2,
        ubicacion = $3,
        estado_uso = $4,
        folio = $5,
        recibido_por = $6,
        fecha_recepcion = NOW(),
        stage = 'COMPLETO',
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      numero_serie,
      numero_patrimonio,
      ubicacion,
      estado_uso,
      folio,
      userId,
      id
    ]);

    res.json({
      success: true,
      message: 'Equipo recibido y registrado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al recibir equipo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al recibir equipo',
      error: error.message
    });
  }
};

// =====================================================
// 4. CREAR REGISTRO FÍSICO (Coordinador - Inventario Existente)
// =====================================================
exports.crearRegistroFisico = async (req, res) => {
  try {
    const {
      marca,
      modelo,
      numero_serie,
      numero_patrimonio,
      ubicacion,
      estado,
      estado_uso,
      descripcion,
      folio
    } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    // Obtener coordinación del usuario
    const userQuery = await pool.query(
      'SELECT coordinacion_id FROM usuarios WHERE id = $1',
      [userId]
    );

    if (userQuery.rows.length === 0 || !userQuery.rows[0].coordinacion_id) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no tiene coordinación asignada'
      });
    }

    const { coordinacion_id } = userQuery.rows[0];

    // Validar datos físicos obligatorios
    if (!marca || !modelo || !numero_serie) {
      return res.status(400).json({
        success: false,
        message: 'Marca, modelo y número de serie son obligatorios'
      });
    }

    const query = `
      INSERT INTO inventario (
        marca, modelo, numero_serie, numero_patrimonio, ubicacion, 
        estado, estado_uso, descripcion, folio,
        coordinacion_id,
        stage, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10,
        'PENDIENTE_FISCAL', NOW()
      )
      RETURNING *
    `;

    const result = await pool.query(query, [
      marca, modelo, numero_serie, numero_patrimonio, ubicacion,
      estado || 'buena', estado_uso, descripcion, folio,
      coordinacion_id
    ]);

    res.status(201).json({
      success: true,
      message: 'Equipo registrado. Pendiente de completar datos fiscales.',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al crear registro físico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear registro físico',
      error: error.message
    });
  }
};

// =====================================================
// 5. LISTAR PENDIENTES DE FISCAL (Admin)
// =====================================================
exports.listarPendientesFiscal = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden ver esta lista'
      });
    }

    const query = `
      SELECT 
        i.*,
        c.nombre as coordinacion_nombre
      FROM inventario i
      LEFT JOIN coordinaciones c ON i.coordinacion_id = c.id
      WHERE i.stage = 'PENDIENTE_FISCAL'
      ORDER BY i.created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error al listar pendientes fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar pendientes fiscal'
    });
  }
};

// =====================================================
// 6. COMPLETAR DATOS FISCALES (Admin)
// =====================================================
exports.completarDatosFiscales = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      proveedor,
      costo,
      uuid_fiscal,
      numero_factura,
      cog,
      fondo,
      fecha_compra
    } = req.body;

    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden completar datos fiscales'
      });
    }

    // Validar que el equipo existe y está pendiente fiscal
    const checkQuery = await pool.query(
      'SELECT * FROM inventario WHERE id = $1',
      [id]
    );

    if (checkQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Equipo no encontrado'
      });
    }

    const updateQuery = `
      UPDATE inventario
      SET 
        proveedor = $1,
        costo = $2,
        uuid_fiscal = $3,
        numero_factura = $4,
        cog = $5,
        fondo = $6,
        fecha_compra = $7,
        stage = 'COMPLETO',
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      proveedor,
      costo,
      uuid_fiscal,
      numero_factura,
      cog,
      fondo,
      fecha_compra,
      id
    ]);

    res.json({
      success: true,
      message: 'Datos fiscales completados exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al completar datos fiscales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al completar datos fiscales',
      error: error.message
    });
  }
};

// =====================================================
// 7. OBTENER ESTADÍSTICAS DE WORKFLOW
// =====================================================
exports.obtenerEstadisticasWorkflow = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereClause = '';
    const params = [];

    // Coordinadores solo ven sus estadísticas
    if (userRole === 'coordinador') {
      const userQuery = await pool.query(
        'SELECT coordinacion_id FROM usuarios WHERE id = $1',
        [userId]
      );

      if (userQuery.rows.length > 0 && userQuery.rows[0].coordinacion_id) {
        whereClause = 'WHERE coordinacion_id = $1';
        params.push(userQuery.rows[0].coordinacion_id);
      }
    }

    const query = `
      SELECT 
        stage,
        COUNT(*) as cantidad
      FROM inventario
      ${whereClause}
      GROUP BY stage
    `;

    const result = await pool.query(query, params);

    const stats = {
      en_transito: 0,
      pendiente_fiscal: 0,
      completo: 0,
      total: 0
    };

    result.rows.forEach(row => {
      stats[row.stage.toLowerCase()] = parseInt(row.cantidad);
      stats.total += parseInt(row.cantidad);
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

// Exportar todas las funciones (servicios puros + controllers)
module.exports = {
  getItemsPorRecibir,
  getItemsPendientesFiscal,
  ...exports  // Incluir todas las funciones exports.xxx
};
