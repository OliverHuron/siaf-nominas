const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Obtener todos los usuarios (solo para admins)
exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.nombre, 
        u.apellido_paterno, 
        u.apellido_materno, 
        u.email, 
        u.role, 
        u.activo, 
        u.created_at,
        u.updated_at,
        u.telefono,
        u.coordinacion_id,
        c.nombre as coordinacion_nombre
      FROM usuarios u
      LEFT JOIN coordinaciones c ON u.coordinacion_id = c.id
      WHERE u.activo = true
      ORDER BY u.apellido_paterno, u.apellido_materno, u.nombre
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios'
    });
  }
};

// Crear nuevo usuario (solo para admins)
exports.createUser = async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, email, password, role, telefono, coordinacion_id } = req.body;

    // Verificar si el email ya existe
    const existingUser = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Validar rol
    const validRoles = ['admin', 'coordinador', 'usuario'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido. Roles permitidos: admin, coordinador, usuario'
      });
    }

    // VALIDACIÓN: Solo un usuario puede estar asignado a una coordinación
    if (coordinacion_id) {
      const coordCheck = await pool.query(
        'SELECT id, nombre, apellido_paterno FROM usuarios WHERE coordinacion_id = $1 AND activo = true',
        [coordinacion_id]
      );

      if (coordCheck.rows.length > 0) {
        const otherUser = coordCheck.rows[0];
        return res.status(400).json({
          success: false,
          message: `La coordinación ya está asignada a ${otherUser.nombre} ${otherUser.apellido_paterno} (ID: ${otherUser.id}). Solo puede haber un usuario por coordinación.`
        });
      }
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario
    const result = await pool.query(`
      INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, email, password, role, telefono, coordinacion_id, activo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING id, nombre, apellido_paterno, apellido_materno, email, role, telefono, coordinacion_id, activo, created_at
    `, [nombre, apellido_paterno, apellido_materno, email, hashedPassword, role, telefono, coordinacion_id]);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario'
    });
  }
};

// Actualizar usuario
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido_paterno, apellido_materno, email, role, activo, telefono, coordinacion_id } = req.body;

    console.log('📝 UPDATE USER - ID:', id);
    console.log('📝 BODY RECIBIDO:', req.body);
    console.log('📝 coordinacion_id recibido:', coordinacion_id, typeof coordinacion_id);

    // Verificar si el usuario existe
    const existingUser = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el email ya está en uso por otro usuario
    const emailCheck = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, id]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está en uso por otro usuario'
      });
    }

    // Validar rol
    const validRoles = ['admin', 'coordinador', 'usuario'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido. Roles permitidos: admin, coordinador, usuario'
      });
    }

    // VALIDACIÓN: Solo un usuario puede estar asignado a una coordinación
    if (coordinacion_id) {
      const coordCheck = await pool.query(
        'SELECT id, nombre, apellido_paterno FROM usuarios WHERE coordinacion_id = $1 AND id != $2 AND activo = true',
        [coordinacion_id, id]
      );

      if (coordCheck.rows.length > 0) {
        const otherUser = coordCheck.rows[0];
        return res.status(400).json({
          success: false,
          message: `La coordinación ya está asignada a ${otherUser.nombre} ${otherUser.apellido_paterno} (ID: ${otherUser.id}). Solo puede haber un usuario por coordinación.`
        });
      }
    }

    // Actualizar usuario
    const result = await pool.query(`
      UPDATE usuarios 
      SET nombre = $1, apellido_paterno = $2, apellido_materno = $3, email = $4, role = $5, activo = $6, 
          telefono = $7, coordinacion_id = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING id, nombre, apellido_paterno, apellido_materno, email, role, activo, telefono, coordinacion_id, updated_at
    `, [nombre, apellido_paterno, apellido_materno, email, role, activo, telefono, coordinacion_id, id]);

    console.log('✅ Usuario actualizado en BD:', result.rows[0]);

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario'
    });
  }
};

// Cambiar contraseña de usuario
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, password } = req.body;
    const passToHash = newPassword || password;

    if (!passToHash) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña es requerida'
      });
    }

    // Verificar si el usuario existe
    const existingUser = await pool.query('SELECT id FROM usuarios WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Hash de nueva contraseña
    const hashedPassword = await bcrypt.hash(passToHash, 10);

    // Actualizar contraseña
    await pool.query(`
      UPDATE usuarios 
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [hashedPassword, id]);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña'
    });
  }
};

// Eliminar usuario (desactivar)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario existe
    const existingUser = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir eliminar al último admin
    if (existingUser.rows[0].role === 'admin') {
      const adminCount = await pool.query('SELECT COUNT(*) FROM usuarios WHERE role = $1 AND activo = true', ['admin']);
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar al último administrador del sistema'
        });
      }
    }

    // Desactivar usuario en lugar de eliminarlo
    await pool.query(`
      UPDATE usuarios 
      SET activo = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario'
    });
  }
};

// Activar/reactivar usuario
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario existe
    const existingUser = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const newStatus = !existingUser.rows[0].activo;

    // Actualizar estado
    const result = await pool.query(`
      UPDATE usuarios 
      SET activo = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, nombre, apellido_paterno, apellido_materno, email, role, activo
    `, [newStatus, id]);

    res.json({
      success: true,
      message: `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado del usuario'
    });
  }
};

// Obtener estadísticas de usuarios
exports.getUserStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE activo = true) as activos,
        COUNT(*) FILTER (WHERE activo = false) as inactivos,
        COUNT(*) FILTER (WHERE role = 'admin') as administradores,
        COUNT(*) FILTER (WHERE role = 'coordinador') as coordinadores,
        COUNT(*) FILTER (WHERE role = 'usuario') as usuarios
      FROM usuarios
    `);

    res.json({
      success: true,
      data: stats.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

// Verificar si existe algún administrador
exports.checkAdminExists = async (req, res) => {
  try {
    const adminCount = await pool.query('SELECT COUNT(*) FROM usuarios WHERE role = $1 AND activo = true', ['admin']);
    const hasAdmin = parseInt(adminCount.rows[0].count) > 0;

    res.json({
      success: true,
      hasAdmin,
      message: hasAdmin ? 'Administrador encontrado' : 'No hay administradores en el sistema'
    });
  } catch (error) {
    console.error('Error al verificar admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar administrador'
    });
  }
};