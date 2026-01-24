const express = require('express');
const router = express.Router();
const FichaTecnicaController = require('../controllers/fichaTecnica.controller');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Rutas públicas para usuarios autenticados
router.get('/', FichaTecnicaController.getAllFichasTecnicas);
router.get('/:id', FichaTecnicaController.getFichaTecnicaById);
router.post('/', FichaTecnicaController.createFichaTecnica);

// Rutas que requieren ser el propietario o admin/coordinador
router.put('/:id', FichaTecnicaController.updateFichaTecnica);
router.delete('/:id', FichaTecnicaController.deleteFichaTecnica);

// Rutas exclusivas para admin y coordinador
router.patch('/:id/estado', authorize(['admin', 'coordinador']), FichaTecnicaController.updateEstadoFicha);

module.exports = router;