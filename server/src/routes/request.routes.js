const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');
const { authMiddleware, authorize } = require('../middleware/auth.middleware');

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

// Obtener solicitudes (admin/coordinador ven todas, usuarios solo las suyas)
router.get('/', requestController.getAllRequests);

// Obtener estadísticas (solo admin/coordinador)
router.get('/stats', authorize(['admin', 'coordinador']), requestController.getRequestStats);

// Obtener solicitud por ID
router.get('/:id', requestController.getRequestById);

// Crear nueva solicitud
router.post('/', requestController.createRequest);

// Transfer endpoint: move inventory (can be immediate or require approval)
router.post('/transfer', authorize(['admin','coordinador','tecnico']), requestController.createTransfer);
// Transfer management
router.get('/transfer', authorize(['admin','coordinador','tecnico']), requestController.listTransfers);
router.get('/transfer/:id', authorize(['admin','coordinador','tecnico']), requestController.getTransferById);
router.get('/transfer/:id/pdf', authorize(['admin','coordinador','tecnico']), requestController.getTransferPDF);
router.patch('/transfer/:id/approve', authorize(['admin','coordinador']), requestController.approveTransfer);
router.patch('/transfer/:id/reject', authorize(['admin','coordinador']), requestController.rejectTransfer);

// Actualizar estado de solicitud (solo admin/coordinador)
router.put('/:id/status', authorize(['admin', 'coordinador']), requestController.updateRequestStatus);

module.exports = router;
