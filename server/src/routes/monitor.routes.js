const express = require('express');
const router = express.Router();
const monitorController = require('../controllers/monitor.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/metrics', authenticateToken, monitorController.getMetrics);
router.get('/processes', authenticateToken, monitorController.getProcesses);

module.exports = router;
