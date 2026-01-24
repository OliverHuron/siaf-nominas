const jwt = require('jsonwebtoken');

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

const authMiddleware = authenticateToken; // Alias para compatibilidad

const authorize = (roles) => {
  return (req, res, next) => {
    console.log('[AUTHORIZE] User role:', req.user?.role);
    console.log('[AUTHORIZE] Required roles:', roles);
    console.log('[AUTHORIZE] User object:', req.user);
    
    if (!req.user) {
      console.log('[AUTHORIZE] No user found in request');
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    // Asegurar que roles es un array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      console.log('[AUTHORIZE] Access denied. User role not in required roles');
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }
    
    console.log('[AUTHORIZE] Access granted');
    next();
  };
};

module.exports = { authMiddleware, authorize, authenticateToken };
