// =====================================================
// RUTAS: Inventario con RLS
// Archivo: server/src/routes/inventory.js
// =====================================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const inventoryController = require('../controllers/inventoryController');
const inventoryWorkflowService = require('../services/inventoryWorkflow.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// =====================================================
// CONFIGURACIÓN DE UPLOAD (MULTER)
// =====================================================

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
    cb(null, 'inv-import-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadExcel = multer({
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

// Configure memory storage for images (processed by sharp in controller)
const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, WEBP)'));
    }
  }
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `Error de archivo: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// Todas las rutas requieren autenticación
router.use(authenticateToken);
router.get('/template', inventoryController.downloadTemplate);
router.post('/import', uploadExcel.single('file'), handleMulterError, inventoryController.importInventoryFromExcel);

// =====================================================
// RUTAS DE WORKFLOW
// =====================================================

// GET /api/inventory/workflow/por-recibir - Items pendientes de recibir
router.get('/workflow/por-recibir', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const result = await inventoryWorkflowService.getItemsPorRecibir(userId, userRole);
    res.json(result);
  } catch (error) {
    console.error('Error en /workflow/por-recibir:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/inventory/workflow/pendientes-fiscal - Items pendientes de completar fiscal
router.get('/workflow/pendientes-fiscal', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await inventoryWorkflowService.getItemsPendientesFiscal(userId);
    res.json(result);
  } catch (error) {
    console.error('Error en /workflow/pendientes-fiscal:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/inventory/workflow/:id/recibir - Confirmar recepción de equipo
router.put('/workflow/:id/recibir', async (req, res) => {
  try {
    // Solo coordinadores pueden confirmar recepción
    if (req.user.role !== 'coordinador') {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo coordinadores pueden confirmar recepción' 
      });
    }
    
    // Llamar a la función correcta
    await inventoryWorkflowService.recibirEquipo(req, res);
  } catch (error) {
    console.error('Error en /workflow/:id/recibir:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/inventory/workflow/:id/completar-fiscal - Completar datos fiscales (Admin)
router.put('/workflow/:id/completar-fiscal', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden completar datos fiscales'
      });
    }

    await inventoryWorkflowService.completarDatosFiscales(req, res);
  } catch (error) {
    console.error('Error en /workflow/:id/completar-fiscal:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================
// RUTAS ESTÁNDAR
// =====================================================

// GET /api/inventory - Listar inventario (con RLS automático)
router.get('/', inventoryController.getInventory);

// GET /api/inventory/stats - Estadísticas para Dashboard
router.get('/stats', inventoryController.getInventoryStats);

// GET /api/inventory/:id - Obtener un activo específico
router.get('/:id', inventoryController.getInventoryById);

// POST /api/inventory - Crear nuevo activo (Soporta multipart/form-data para imágenes)
router.post('/', uploadImages.array('imagenes', 3), handleMulterError, inventoryController.createInventoryItem);

// PUT /api/inventory/:id - Actualizar activo existente (Soporta multipart/form-data)
router.put('/:id', uploadImages.array('imagenes', 3), handleMulterError, inventoryController.updateInventoryItem);

// DELETE /api/inventory/:id - Dar de baja activo (solo admin)
router.delete('/:id', inventoryController.deleteInventoryItem);

module.exports = router;
