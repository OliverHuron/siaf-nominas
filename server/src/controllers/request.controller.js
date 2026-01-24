const pool = require('../config/database');

// Obtener solicitudes según el rol del usuario
exports.getAllRequests = async (req, res) => {
  try {
    let query = `
      SELECT 
        s.id,
        s.asunto,
        s.descripcion,
        s.tipo_solicitud as tipo,
        s.estado,
        s.prioridad,
        s.created_at,
        s.updated_at as fecha_actualizacion,
        u.nombre,
        u.apellido_paterno,
        u.apellido_materno,
        u.email,
        d.nombre as dependencia_nombre
      FROM solicitudes s
      JOIN usuarios u ON s.usuario_id = u.id
      LEFT JOIN dependencias d ON u.dependencia_id = d.id
    `;
    
    const params = [];
    
    // Si es usuario normal, solo ve sus solicitudes
    if (req.user.role === 'usuario') {
      query += ' WHERE s.usuario_id = $1';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY s.created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes'
    });
  }
};

// Crear nueva solicitud (solo usuarios)
exports.createRequest = async (req, res) => {
  try {
    console.log('[CREATE_REQUEST] User:', req.user);
    console.log('[CREATE_REQUEST] Request body:', req.body);
    
    const { asunto, descripcion, tipo } = req.body;
    
    if (!asunto || !descripcion || !tipo) {
      console.log('[CREATE_REQUEST] Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Asunto, descripción y tipo son requeridos'
      });
    }
    
    // Validar tipo
    const tiposValidos = ['mantenimiento', 'reparacion', 'asistencia', 'transfer'];
    if (!tiposValidos.includes(tipo)) {
      console.log('[CREATE_REQUEST] Invalid tipo:', tipo);
      return res.status(400).json({
        success: false,
        message: 'Tipo de solicitud inválido'
      });
    }
    
    console.log('[CREATE_REQUEST] Creating request...');
    
    const result = await pool.query(`
      INSERT INTO solicitudes (
        usuario_id, 
        asunto, 
        descripcion, 
        tipo_solicitud, 
        estado, 
        prioridad
      )
      VALUES ($1, $2, $3, $4, 'pendiente', 'media')
      RETURNING *
    `, [req.user.id, asunto, descripcion, tipo]);
    
    console.log('[CREATE_REQUEST] Request created successfully:', result.rows[0]);
    
    res.status(201).json({
      success: true,
      message: 'Solicitud creada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear solicitud'
    });
  }
};

// Actualizar estado de solicitud (solo admin/coordinador)
exports.updateRequestStatus = async (req, res) => {
  try {
    console.log('[UPDATE_REQUEST_STATUS] User:', req.user);
    console.log('[UPDATE_REQUEST_STATUS] Request body:', req.body);
    console.log('[UPDATE_REQUEST_STATUS] Request ID:', req.params.id);
    
    const { id } = req.params;
    const { estado, prioridad, observaciones } = req.body;
    
    // Validar estado si se proporciona
    if (estado) {
      const estadosValidos = ['pendiente', 'aceptada', 'rechazada', 'en_proceso', 'completada', 'no_resuelta'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido'
        });
      }
    }
    
    // Validar prioridad si se proporciona
    if (prioridad) {
      const prioridadesValidas = ['urgente', 'alta', 'media', 'baja'];
      if (!prioridadesValidas.includes(prioridad)) {
        return res.status(400).json({
          success: false,
          message: 'Prioridad inválida'
        });
      }
    }
    
    // Construir query dinámicamente
    let updates = [];
    let params = [];
    let paramCount = 0;
    
    if (estado) {
      paramCount++;
      updates.push(`estado = $${paramCount}`);
      params.push(estado);
    }
    
    if (prioridad) {
      paramCount++;
      updates.push(`prioridad = $${paramCount}`);
      params.push(prioridad);
    }
    
    if (observaciones) {
      paramCount++;
      updates.push(`observaciones = $${paramCount}`);
      params.push(observaciones);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }
    
    // Agregar fecha de actualización
    paramCount++;
    updates.push(`updated_at = $${paramCount}`);
    params.push(new Date());
    
    // Agregar ID al final
    paramCount++;
    params.push(id);
    
    const query = `
      UPDATE solicitudes 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} 
      RETURNING *
    `;
    
    console.log('[UPDATE_REQUEST_STATUS] Query:', query);
    console.log('[UPDATE_REQUEST_STATUS] Params:', params);
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }
    
    console.log('[UPDATE_REQUEST_STATUS] Updated successfully:', result.rows[0]);
    
    res.json({
      success: true,
      message: 'Solicitud actualizada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar solicitud'
    });
  }
};

// Obtener estadísticas de solicitudes (solo admin/coordinador)
exports.getRequestStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'aceptada' THEN 1 END) as aceptadas,
        COUNT(CASE WHEN estado = 'rechazada' THEN 1 END) as rechazadas,
        COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) as en_proceso,
        COUNT(CASE WHEN estado = 'completada' THEN 1 END) as completadas,
        COUNT(CASE WHEN estado = 'no_resuelta' THEN 1 END) as no_resueltas,
        COUNT(CASE WHEN prioridad = 'urgente' THEN 1 END) as urgentes,
        COUNT(CASE WHEN prioridad = 'alta' THEN 1 END) as alta_prioridad
      FROM solicitudes
    `);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

// Obtener solicitud por ID
exports.getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = `
      SELECT 
        s.*,
        u.nombre,
        u.apellido_paterno,
        u.apellido_materno,
        u.email,
        u.cargo,
        d.nombre as dependencia_nombre
      FROM solicitudes s
      JOIN usuarios u ON s.usuario_id = u.id
      LEFT JOIN dependencias d ON u.dependencia_id = d.id
      WHERE s.id = $1
    `;
    
    const params = [id];
    
    // Si es usuario, solo puede ver sus propias solicitudes
    if (req.user.role === 'usuario') {
      query += ' AND s.usuario_id = $2';
      params.push(req.user.id);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitud'
    });
  }
};

// Crear transferencia directa (mover inventario entre spaces)
exports.createTransfer = async (req, res) => {
  try {
    const { inventory_id, from_space, to_space, require_approval } = req.body;
    if (!inventory_id || !to_space) return res.status(400).json({ success: false, message: 'inventory_id y to_space son requeridos' });

    // Update inventario ubicacion to the target space id (we'll store space id as ubicacion_space)
    // Note: existing schema stores ubicacion as text; we'll set ubicacion = 'space:<id>' and log transfer in transfers table
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inv = await client.query('SELECT * FROM inventario WHERE id = $1 FOR UPDATE', [inventory_id]);
      if (inv.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Inventario no encontrado' });
      }

      // If approval required, create a pending transfer record and return
      if (require_approval) {
        const tr = await client.query(
          `INSERT INTO transfers (inventory_id, from_space, to_space, requested_by, status) VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
          [inventory_id, from_space || null, to_space, req.user ? req.user.id : null]
        );
        await client.query('COMMIT');
        return res.status(201).json({ success: true, data: tr.rows[0], message: 'Transferencia creada en estado pendiente' });
      }

      // Direct move: update inventario ubicacion to 'space:<id>'
      const newUbicacion = `space:${to_space}`;
      await client.query('UPDATE inventario SET ubicacion = $1 WHERE id = $2', [newUbicacion, inventory_id]);

      const tr = await client.query(
        `INSERT INTO transfers (inventory_id, from_space, to_space, requested_by, approved_by, status) VALUES ($1,$2,$3,$4,$5,'completed') RETURNING *`,
        [inventory_id, from_space || null, to_space, req.user ? req.user.id : null, req.user ? req.user.id : null]
      );

      await client.query('COMMIT');
      res.status(200).json({ success: true, data: tr.rows[0], message: 'Transferencia completada' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('createTransfer error', error);
    res.status(500).json({ success: false, message: 'Error al crear transferencia' });
  }
};

// List transfers
exports.listTransfers = async (req, res) => {
  try {
    const { estado, asset_id } = req.query;
    let query = 'SELECT * FROM transfers WHERE 1=1';
    const params = [];
    let idx = 1;
    if (estado) {
      query += ` AND status = $${idx}`; params.push(estado); idx++;
    }
    if (asset_id) {
      query += ` AND inventory_id = $${idx}`; params.push(asset_id); idx++;
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('listTransfers error', error);
    res.status(500).json({ success: false, message: 'Error al listar transferencias' });
  }
};

// Get transfer by id
exports.getTransferById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM transfers WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('getTransferById error', error);
    res.status(500).json({ success: false, message: 'Error al obtener transferencia' });
  }
};

// Approve transfer
exports.approveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE transfers SET status = $1, approved_by = $2, updated_at = now() WHERE id = $3 RETURNING *', ['completed', req.user ? req.user.id : null, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
    // update inventario ubicacion
    const tr = result.rows[0];
    if (tr.to_space) {
      await pool.query('UPDATE inventario SET ubicacion = $1 WHERE id = $2', [`space:${tr.to_space}`, tr.inventory_id]);
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('approveTransfer error', error);
    res.status(500).json({ success: false, message: 'Error al aprobar transferencia' });
  }
};

// Reject transfer
exports.rejectTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const result = await pool.query('UPDATE transfers SET status = $1, updated_at = now() WHERE id = $2 RETURNING *', ['rejected', id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('rejectTransfer error', error);
    res.status(500).json({ success: false, message: 'Error al rechazar transferencia' });
  }
};

// Placeholder: generate/download PDF (returns simple message)
exports.getTransferPDF = async (req, res) => {
  try {
    const { id } = req.params;
    // For now return a placeholder PDF response (to be implemented)
    res.status(200).json({ success: true, message: 'PDF generation not implemented yet', id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al generar PDF' });
  }
};