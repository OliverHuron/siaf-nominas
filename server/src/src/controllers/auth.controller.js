const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registro de usuario
const register = async (req, res) => {
  try {
    const { email, password, nombre, apellido_paterno, apellido_materno, role } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // LÓGICA INTELIGENTE: Si no hay usuarios admin, el primero se convierte en admin
    const adminCount = await db.query('SELECT COUNT(*) FROM usuarios WHERE role = $1', ['admin']);
    const isFirstAdmin = parseInt(adminCount.rows[0].count) === 0;

    // Determinar rol: Si no hay admins, este será admin. Si no se especifica rol, será 'usuario'
    const userRole = isFirstAdmin ? 'admin' : (role || 'usuario');

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario
    const result = await db.query(
      `INSERT INTO usuarios (email, password, nombre, apellido_paterno, apellido_materno, role, activo) 
       VALUES ($1, $2, $3, $4, $5, $6, true) 
       RETURNING id, email, nombre, apellido_paterno, apellido_materno, role, activo, created_at`,
      [email, hashedPassword, nombre, apellido_paterno, apellido_materno, userRole]
    );

    const user = result.rows[0];

    // Generar token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    const message = isFirstAdmin ?
      'Primer administrador creado exitosamente' :
      'Usuario registrado exitosamente';

    res.status(201).json({
      success: true,
      message,
      data: { user, token },
      isFirstAdmin
    });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario'
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    console.log('[AUTH] Raw request body:', req.body);
    console.log('[AUTH] Request headers:', req.headers);

    const { email, password } = req.body;

    console.log('[AUTH] Login attempt:', {
      email,
      passwordLength: password?.length,
      emailType: typeof email,
      passwordType: typeof password,
      bodyKeys: Object.keys(req.body)
    });

    if (!email || !password) {
      console.log('[AUTH] Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1 AND activo = true', [email]);

    console.log('[AUTH] User search result:', {
      found: result.rows.length > 0,
      email: email,
      userCount: result.rows.length,
      queryUsed: 'SELECT * FROM usuarios WHERE email = $1 AND activo = true'
    });

    if (result.rows.length === 0) {
      console.log('[AUTH] User not found or inactive');
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const user = result.rows[0];
    console.log('[AUTH] User found:', { id: user.id, email: user.email, role: user.role });

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('[AUTH] Password validation:', { isValid: isValidPassword });

    if (!isValidPassword) {
      console.log('[AUTH] Invalid password');
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    console.log('[AUTH] Login successful for user:', user.email);

    // Remover password del objeto user
    delete user.password;

    res.json({
      success: true,
      message: 'Login exitoso',
      data: { user, token }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión'
    });
  }
};

// Obtener usuario actual
const getCurrentUser = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        id,
        email,
        nombre,
        apellido_paterno,
        apellido_materno,
        role,
        activo,
        created_at,
        coordinacion_id
       FROM usuarios 
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en getCurrentUser:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario'
    });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser
};
