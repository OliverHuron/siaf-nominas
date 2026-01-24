const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth.middleware');
const spaces = require('../controllers/spaces.controller');

router.use(authMiddleware);

router.get('/', spaces.getAllSpaces);
router.get('/:id', spaces.getSpaceById);
router.post('/', authorize(['admin','coordinator']), spaces.createSpace);

// Auditing endpoints
router.post('/:id/audit/start', authorize(['admin','coordinator','technician']), spaces.startAudit);
router.post('/:id/audit/scan', authorize(['admin','coordinator','technician']), spaces.scanBatch);
router.post('/:id/audit/close', authorize(['admin','coordinator']), spaces.closeAudit);
router.get('/:id/inventory', authorize(['admin','coordinator','tecnico']), spaces.getInventoryForSpace);
router.post('/:id/assign-quadrant', authorize(['admin','coordinator']), spaces.assignQuadrant);

module.exports = router;
