const pool = require('../config/database');

const FichaTecnicaController = {
  // Obtener todas las fichas técnicas (con filtros por role)
  getAllFichasTecnicas: async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      console.log('🔍 Fetching fichas - Usuario ID:', userId, 'Role:', userRole);
      
      let query = `
        SELECT 
          ft.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email
        FROM fichas_tecnicas ft
        JOIN usuarios u ON ft.usuario_id = u.id
      `;
      
      let queryParams = [];
      
      // Si es usuario normal, solo puede ver sus propias fichas
      if (userRole === 'usuario') {
        query += ' WHERE ft.usuario_id = $1';
        queryParams.push(userId);
        console.log('🔍 Filtro usuario aplicado - Solo fichas del usuario:', userId);
      }
      
      // Filtros adicionales
      if (req.query.estado) {
        const whereClause = queryParams.length > 0 ? ' AND' : ' WHERE';
        query += `${whereClause} ft.estado = $${queryParams.length + 1}`;
        queryParams.push(req.query.estado);
      }
      
      if (req.query.fecha_desde) {
        const whereClause = queryParams.length > 0 ? ' AND' : ' WHERE';
        query += `${whereClause} ft.fecha_evento >= $${queryParams.length + 1}`;
        queryParams.push(req.query.fecha_desde);
      }
      
      if (req.query.fecha_hasta) {
        const whereClause = queryParams.length > 0 ? ' AND' : ' WHERE';
        query += `${whereClause} ft.fecha_evento <= $${queryParams.length + 1}`;
        queryParams.push(req.query.fecha_hasta);
      }
      
      // Búsqueda por texto
      if (req.query.search) {
        const whereClause = queryParams.length > 0 ? ' AND' : ' WHERE';
        query += `${whereClause} (ft.nombre_evento ILIKE $${queryParams.length + 1} OR ft.objetivo_actividad ILIKE $${queryParams.length + 1})`;
        queryParams.push(`%${req.query.search}%`);
      }
      
      // Ordenamiento
      query += ' ORDER BY ft.created_at DESC';
      
      // Paginación
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      
      query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);
      
      console.log('🔍 Query final:', query);
      console.log('🔍 Query params:', queryParams);
      
      const result = await pool.query(query, queryParams);
      
      console.log('✅ Fichas encontradas:', result.rows.length);
      console.log('✅ Primeras fichas:', result.rows.slice(0, 2));
      
      // Contar total para paginación
      let countQuery = `
        SELECT COUNT(*) as total
        FROM fichas_tecnicas ft
        JOIN usuarios u ON ft.usuario_id = u.id
      `;
      
      let countParams = [];
      if (userRole === 'usuario') {
        countQuery += ' WHERE ft.usuario_id = $1';
        countParams.push(userId);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      const response = {
        fichas: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
      console.log('✅ Respuesta enviada:', {
        cantidad_fichas: result.rows.length,
        total: total,
        user_role: userRole
      });
      
      res.json(response);
      
    } catch (error) {
      console.error('❌ Error al obtener fichas técnicas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener una ficha técnica por ID
  getFichaTecnicaById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      let query = `
        SELECT 
          ft.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email
        FROM fichas_tecnicas ft
        JOIN usuarios u ON ft.usuario_id = u.id
        WHERE ft.id = $1
      `;
      
      let queryParams = [id];
      
      // Si es usuario normal, solo puede ver sus propias fichas
      if (userRole === 'usuario') {
        query += ' AND ft.usuario_id = $2';
        queryParams.push(userId);
      }
      
      const result = await pool.query(query, queryParams);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Ficha técnica no encontrada' });
      }
      
      res.json(result.rows[0]);
      
    } catch (error) {
      console.error('Error al obtener ficha técnica:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Crear nueva ficha técnica
  createFichaTecnica: async (req, res) => {
    try {
      const userId = req.user.id;
      console.log('Datos recibidos:', req.body);
      console.log('Usuario ID:', userId);
      
      const {
        nombreCoordinacion,
        nombreCoordinador,
        nombreEvento,
        fechaEvento,
        tipoEvento,
        modalidad,
        fechaLimiteInscripcion,
        requiereInscripcion,
        esGratuito,
        costo,
        dirigidoA,
        lugarEvento,
        domicilio,
        duracion,
        telefonoContacto,
        requiereMontaje,
        talleristas,
        objetivos,
        temas,
        observaciones,
        autoridadesInvitadas,
        programaEvento,
        datosEstadisticos,
        informacionHistorica,
        presupuesto,
        requiereDisenoGrafico,
        requierePublicacion,
        requiereTransmision,
        compromisoRectora
      } = req.body;
      
      // Validaciones básicas
      if (!nombreEvento || !fechaEvento || !tipoEvento) {
        return res.status(400).json({ 
          error: 'Nombre del evento, fecha y tipo son obligatorios' 
        });
      }
      
      // Log para debug
      console.log('Valores a insertar:', {
        nombreCoordinacion, nombreCoordinador, nombreEvento, fechaEvento,
        tipoEvento, modalidad, fechaLimiteInscripcion, requiereInscripcion,
        esGratuito, costo, dirigidoA, lugarEvento, talleristas,
        objetivos, temas, observaciones, userId
      });
      
      // Validar y limpiar campo costo (debe ser numérico o null)
      let costoLimpio = null;
      if (costo && costo.toString().trim() !== '') {
        const costoNumerico = parseFloat(costo.toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
        if (!isNaN(costoNumerico)) {
          costoLimpio = costoNumerico;
        }
      }
      
      const query = `
        INSERT INTO fichas_tecnicas (
          nombre_coordinacion, nombre_coordinador, nombre_evento, fecha_evento,
          tipo_evento, modalidad, fecha_limite_inscripcion, requiere_inscripcion,
          es_gratuito, costo, dirigido_a, lugar_evento, domicilio, duracion,
          telefono_contacto, requiere_montaje, talleristas, objetivos, temas,
          observaciones, autoridades_invitadas, programa_evento, datos_estadisticos,
          informacion_historica, presupuesto, requiere_diseno_grafico, requiere_publicacion,
          requiere_transmision, compromiso_rectora, usuario_id, estado, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, 'pendiente', NOW()
        ) RETURNING *
      `;
      
      const values = [
        nombreCoordinacion || null, nombreCoordinador || null, nombreEvento, fechaEvento,
        tipoEvento, modalidad || null, fechaLimiteInscripcion || null, requiereInscripcion || false,
        esGratuito || true, costoLimpio, dirigidoA || null, lugarEvento || null,
        domicilio || null, duracion || null, telefonoContacto || null, requiereMontaje || false,
        talleristas || null, objetivos || null, temas || null, observaciones || null,
        autoridadesInvitadas || null, programaEvento || null, datosEstadisticos || null,
        informacionHistorica || null, presupuesto || null, requiereDisenoGrafico || false,
        requierePublicacion || false, requiereTransmision || null, compromisoRectora || false,
        userId
      ];
      
      const result = await pool.query(query, values);
      console.log('Ficha creada exitosamente:', result.rows[0]);
      
      res.status(201).json({
        message: 'Ficha técnica creada exitosamente',
        ficha: result.rows[0]
      });
      
    } catch (error) {
      console.error('Error completo al crear ficha técnica:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  },

  // Actualizar ficha técnica
  updateFichaTecnica: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Verificar que la ficha existe y el usuario tiene permisos
      let checkQuery = 'SELECT * FROM fichas_tecnicas WHERE id = $1';
      let checkParams = [id];
      
      if (userRole === 'usuario') {
        checkQuery += ' AND usuario_id = $2';
        checkParams.push(userId);
      }
      
      const existingFicha = await pool.query(checkQuery, checkParams);
      
      if (existingFicha.rows.length === 0) {
        return res.status(404).json({ error: 'Ficha técnica no encontrada o sin permisos' });
      }
      
      const {
        folio_control,
        fecha_envio,
        nombre_coordinacion,
        nombre_coordinador,
        nombre_evento,
        fecha_evento,
        tipo_fecha,
        hora,
        duracion_estimada,
        responsable_contacto,
        participantes,
        objetivo_actividad,
        autoridades_invitadas,
        programa_evento,
        datos_estadisticos,
        informacion_contraste,
        presupuesto_estimado,
        requiere_diseno_grafico,
        descripcion_diseno,
        requiere_publicacion,
        descripcion_publicacion,
        requiere_transmision,
        descripcion_transmision,
        deriva_compromiso_rectora,
        estado,
        observaciones
      } = req.body;
      
      // Los usuarios normales no pueden cambiar el estado
      let updateEstado = estado;
      if (userRole === 'usuario') {
        updateEstado = existingFicha.rows[0].estado;
      }
      
      const query = `
        UPDATE fichas_tecnicas SET
          folio_control = $1, fecha_envio = $2, nombre_coordinacion = $3,
          nombre_coordinador = $4, nombre_evento = $5, fecha_evento = $6,
          tipo_fecha = $7, hora = $8, duracion_estimada = $9,
          responsable_contacto = $10, participantes = $11, objetivo_actividad = $12,
          autoridades_invitadas = $13, programa_evento = $14, datos_estadisticos = $15,
          informacion_contraste = $16, presupuesto_estimado = $17,
          requiere_diseno_grafico = $18, descripcion_diseno = $19,
          requiere_publicacion = $20, descripcion_publicacion = $21,
          requiere_transmision = $22, descripcion_transmision = $23,
          deriva_compromiso_rectora = $24, estado = $25, observaciones = $26
        WHERE id = $27
        RETURNING *
      `;
      
      const values = [
        folio_control, fecha_envio, nombre_coordinacion, nombre_coordinador,
        nombre_evento, fecha_evento, tipo_fecha, hora, duracion_estimada,
        responsable_contacto, participantes, objetivo_actividad,
        autoridades_invitadas, programa_evento, datos_estadisticos,
        informacion_contraste, presupuesto_estimado, requiere_diseno_grafico,
        descripcion_diseno, requiere_publicacion, descripcion_publicacion,
        requiere_transmision, descripcion_transmision, deriva_compromiso_rectora,
        updateEstado, observaciones, id
      ];
      
      const result = await pool.query(query, values);
      
      res.json({
        message: 'Ficha técnica actualizada exitosamente',
        ficha: result.rows[0]
      });
      
    } catch (error) {
      console.error('Error al actualizar ficha técnica:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Método específico para cambiar estado (aprobar/rechazar)
  updateEstadoFicha: async (req, res) => {
    try {
      const { id } = req.params;
      const { estado, motivo_rechazo } = req.body;
      const userRole = req.user.role;
      
      console.log('🔄 updateEstadoFicha - ID:', id);
      console.log('🔄 updateEstadoFicha - Estado recibido:', estado);
      console.log('🔄 updateEstadoFicha - Tipo de estado:', typeof estado);
      console.log('🔄 updateEstadoFicha - User role:', userRole);
      console.log('🔄 updateEstadoFicha - Motivo:', motivo_rechazo);
      console.log('🔄 updateEstadoFicha - Body completo:', req.body);
      
      // Solo admins y coordinadores pueden cambiar el estado
      if (userRole === 'usuario') {
        console.log('❌ Access denied - user role');
        return res.status(403).json({ error: 'No tienes permisos para cambiar el estado' });
      }
      
      // Validar estados permitidos - exactamente como están en la base de datos
      const estadosPermitidos = ['pendiente', 'aprobado', 'rechazado'];
      if (!estado || !estadosPermitidos.includes(estado.trim().toLowerCase())) {
        console.log('❌ Invalid estado:', estado, 'Expected one of:', estadosPermitidos);
        return res.status(400).json({ 
          error: 'Estado no válido. Estados permitidos: pendiente, aprobado, rechazado',
          estadosPermitidos: estadosPermitidos
        });
      }
      
      // Limpiar el estado
      const estadoLimpio = estado.trim().toLowerCase();
      
      // Verificar que la ficha existe
      console.log('🔍 Checking if ficha exists...');
      const checkQuery = 'SELECT * FROM fichas_tecnicas WHERE id = $1';
      const existingFicha = await pool.query(checkQuery, [id]);
      
      if (existingFicha.rows.length === 0) {
        console.log('❌ Ficha not found:', id);
        return res.status(404).json({ error: 'Ficha técnica no encontrada' });
      }
      
      console.log('✅ Ficha found:', existingFicha.rows[0]);
      
      // Actualizar solo el estado y motivo de rechazo si aplica
      let query = 'UPDATE fichas_tecnicas SET estado = $1';
      let values = [estadoLimpio];
      
      if (estadoLimpio === 'rechazado' && motivo_rechazo) {
        query += ', motivo_rechazo = $2';
        values.push(motivo_rechazo);
      }
      
      query += ', updated_at = NOW() WHERE id = $' + (values.length + 1) + ' RETURNING *';
      values.push(id);
      
      console.log('🔄 Executing update query:', query);
      console.log('🔄 Query values:', values);
      
      const result = await pool.query(query, values);
      
      console.log('✅ Update successful:', result.rows[0]);
      
      res.json({
        message: `Ficha técnica ${estadoLimpio} exitosamente`,
        ficha: result.rows[0]
      });
      
    } catch (error) {
      console.error('❌ Error al actualizar estado de ficha técnica:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error message:', error.message);
      
      // Verificar si es un error de constraint
      if (error.message.includes('fichas_tecnicas_estado_check')) {
        return res.status(400).json({ 
          error: 'Estado no válido según la base de datos. Estados permitidos: pendiente, aprobado, rechazado',
          details: error.message
        });
      }
      
      // Verificar si es un error de columna no existente
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Error de base de datos: columna no encontrada',
          details: error.message
        });
      }
      
      // Verificar si es un error de tabla no existente
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Error de base de datos: tabla no encontrada',
          details: error.message
        });
      }
      
      res.status(500).json({ 
        error: 'Error interno del servidor',
        details: error.message 
      });
    }
  },

  // Eliminar ficha técnica
  deleteFichaTecnica: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      let query = 'DELETE FROM fichas_tecnicas WHERE id = $1';
      let queryParams = [id];
      
      // Los usuarios normales solo pueden eliminar sus propias fichas
      if (userRole === 'usuario') {
        query += ' AND usuario_id = $2';
        queryParams.push(userId);
      }
      
      const result = await pool.query(query, queryParams);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Ficha técnica no encontrada o sin permisos' });
      }
      
      res.json({ message: 'Ficha técnica eliminada exitosamente' });
      
    } catch (error) {
      console.error('Error al eliminar ficha técnica:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Actualizar solo el estado (para admin/coordinador)
  updateEstado: async (req, res) => {
    try {
      const { id } = req.params;
      const { estado, observaciones } = req.body;
      const userRole = req.user.role;
      
      // Solo admin y coordinador pueden cambiar estados
      if (userRole === 'usuario') {
        return res.status(403).json({ error: 'No tiene permisos para cambiar el estado' });
      }
      
      const query = `
        UPDATE fichas_tecnicas 
        SET estado = $1, observaciones = $2
        WHERE id = $3
        RETURNING *
      `;
      
      const result = await pool.query(query, [estado, observaciones, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Ficha técnica no encontrada' });
      }
      
      res.json({
        message: 'Estado actualizado exitosamente',
        ficha: result.rows[0]
      });
      
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = FichaTecnicaController;
