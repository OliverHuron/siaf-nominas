// =====================================================
// RUTAS: Inventario con RLS
// Archivo: server/src/routes/inventory.js
// =====================================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const inventoryController = require('../controllers/inventoryController');
const inventoryWorkflowService = require('../services/inventoryWorkflow.service');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

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

// POST /api/inventory - Crear nuevo activo
router.post('/', inventoryController.createInventoryItem);

// PUT /api/inventory/:id - Actualizar activo existente
router.put('/:id', inventoryController.updateInventoryItem);

// DELETE /api/inventory/:id - Dar de baja activo (solo admin)
router.delete('/:id', inventoryController.deleteInventoryItem);

module.exports = router;
