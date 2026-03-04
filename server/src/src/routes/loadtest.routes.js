// =====================================================
// RUTAS: Load Testing
// Archivo: server/src/routes/loadtest.routes.js
// =====================================================

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const {
  insertTestData,
  simulateConcurrentUsers,
  getMetrics,
  getTestStatus,
  cleanupTestData,
  getSystemStats
} = require('../controllers/loadtest.controller');

// Middleware: Solo administradores pueden acceder
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden usar esta funcionalidad.'
    });
  }
  next();
};

// Todas las rutas requieren autenticación y rol de admin
router.use(authMiddleware);
router.use(adminOnly);

// POST /api/loadtest/insert-data - Insertar datos de prueba
router.post('/insert-data', insertTestData);

// POST /api/loadtest/simulate-users - Simular usuarios concurrentes
router.post('/simulate-users', simulateConcurrentUsers);

// GET /api/loadtest/metrics - Obtener métricas de tests
router.get('/metrics', getMetrics);

// GET /api/loadtest/status/:testId - Obtener estado de un test específico
router.get('/status/:testId', getTestStatus);

// DELETE /api/loadtest/cleanup - Limpiar datos de prueba
router.delete('/cleanup', cleanupTestData);

// GET /api/loadtest/system-stats - Obtener estadísticas del sistema
router.get('/system-stats', getSystemStats);

module.exports = router;
