const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Middleware para verificar que el usuario sea admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};

// Rutas públicas (no requieren autenticación)
router.get('/check-admin', userController.checkAdminExists);

// Rutas que requieren autenticación
router.use(authMiddleware);

// Ruta para obtener usuarios (accesible para todos los autenticados, para dropdowns)
router.get('/', userController.getAllUsers);

// Rutas que requieren permisos de administrador
router.get('/stats', requireAdmin, userController.getUserStats);
router.post('/', requireAdmin, userController.createUser);
router.put('/:id', requireAdmin, userController.updateUser);
router.patch('/:id/password', requireAdmin, userController.changePassword);
router.patch('/:id/toggle-status', requireAdmin, userController.toggleUserStatus);
router.delete('/:id', requireAdmin, userController.deleteUser);

module.exports = router;
