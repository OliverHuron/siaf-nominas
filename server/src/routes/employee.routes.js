const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth.middleware');
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
  importEmployeesFromExcel,
  downloadTemplate
} = require('../controllers/employee.controller');
const { body } = require('express-validator');

// Multer configuration for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  }
});

router.use(authMiddleware);

// Validaciones
const employeeValidation = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('apellido_paterno').notEmpty().withMessage('El apellido paterno es requerido'),
  body('rfc').notEmpty().withMessage('El RFC es requerido').isLength({ min: 10, max: 13 }).withMessage('RFC debe tener entre 10 y 13 caracteres'),
  body('tipo').isIn(['docente', 'administrativo']).withMessage('Tipo de empleado inválido'),
  body('email').optional().isEmail().withMessage('Email inválido')
];

// Rutas
router.get('/stats', getEmployeeStats);
router.get('/template', downloadTemplate);
router.post('/import', upload.single('file'), importEmployeesFromExcel);
router.get('/', getAllEmployees);
router.get('/:id', getEmployeeById);
router.post('/', employeeValidation, createEmployee);
router.put('/:id', employeeValidation, updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;
