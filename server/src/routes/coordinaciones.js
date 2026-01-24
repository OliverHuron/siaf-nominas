// =====================================================
// RUTAS: Coordinaciones (para dropdown en formulario)
// Archivo: server/src/routes/coordinaciones.js
// =====================================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const inventoryController = require('../controllers/inventoryController');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/coordinaciones - Listar coordinaciones según rol
router.get('/', inventoryController.getCoordinaciones);

module.exports = router;
