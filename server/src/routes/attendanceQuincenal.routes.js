const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceQuincenal.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas específicas primero (antes de las dinámicas)
router.get('/stats/:anio?', attendanceController.getAttendanceStats);
router.put('/update', attendanceController.updateAttendance);
router.post('/initialize', attendanceController.initializeYear);

// Ruta dinámica al final
router.get('/:anio?', attendanceController.getAttendancesByYear);

module.exports = router;
