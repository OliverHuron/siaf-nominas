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
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'import-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
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

// Error handler for Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `El archivo es demasiado grande. Tamaño máximo: 500MB`,
        imported: 0,
        failed: 1
      });
    }
    return res.status(400).json({
      success: false,
      message: `Error al subir archivo: ${err.message}`,
      imported: 0,
      failed: 1
    });
  }
  next(err);
};

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
router.post('/import', upload.single('file'), handleMulterError, importEmployeesFromExcel);
router.get('/', getAllEmployees);
router.get('/:id', getEmployeeById);
router.post('/', employeeValidation, createEmployee);
router.put('/:id', employeeValidation, updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;
