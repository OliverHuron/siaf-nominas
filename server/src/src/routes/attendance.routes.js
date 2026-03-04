const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const {
  checkIn,
  checkOut,
  getAttendanceToday,
  getAllAttendances,
  getAttendanceByEmployee,
  getAttendanceStats,
  updateAttendanceStatus,
  generateReport
} = require('../controllers/attendance.controller');
const { body } = require('express-validator');

router.use(authMiddleware);

// Validaciones
const checkInValidation = [
  body('empleado_id').isInt().withMessage('ID de empleado inválido')
];

const checkOutValidation = [
  body('empleado_id').isInt().withMessage('ID de empleado inválido')
];

const updateStatusValidation = [
  body('estado').isIn(['presente', 'ausente', 'justificado', 'permiso']).withMessage('Estado inválido')
];

// Rutas principales
router.post('/check-in', checkInValidation, checkIn);
router.post('/check-out', checkOutValidation, checkOut);
router.get('/today', getAttendanceToday);
router.get('/stats', getAttendanceStats);
router.get('/report', generateReport);
router.get('/employee/:id', getAttendanceByEmployee);
router.get('/', getAllAttendances);
router.put('/:id/status', updateStatusValidation, updateAttendanceStatus);

module.exports = router;
