const express = require('express');
const router = express.Router();
const emailTemplateController = require('../controllers/emailTemplate.controller');

// Rutas para plantillas
router.get('/templates', emailTemplateController.getTemplates);
router.post('/templates', emailTemplateController.createTemplate);
router.put('/templates/:id', emailTemplateController.updateTemplate);
router.delete('/templates/:id', emailTemplateController.deleteTemplate);

// Rutas para empleados elegibles
router.get('/eligible-employees', emailTemplateController.getEligibleEmployees);

// Previsualización de plantillas
router.post('/preview-template', emailTemplateController.previewTemplate);

module.exports = router;