const express = require('express');
const router = express.Router();
const nominaController = require('../controllers/nomina.controller');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener conceptos de nómina
router.get('/conceptos', nominaController.getConceptosNomina);

// Obtener estatus de firmas (vista consolidada para Control Interno)
router.get('/estatus-firmas', nominaController.getEstatusFirmas);

// Obtener resumen de firmas pendientes
router.get('/resumen-firmas-pendientes', nominaController.getResumenFirmasPendientes);

// Asignar concepto de nómina a empleado (solo admin y coordinadores)
router.post(
  '/asignar-concepto',
  authorize(['admin', 'coordinador']),
  nominaController.asignarConceptoNomina
);

// Registrar firma de concepto (solo admin y coordinadores)
router.put(
  '/registrar-firma/:id',
  authorize(['admin', 'coordinador']),
  nominaController.registrarFirma
);

// Desactivar concepto de nómina (solo admin)
router.delete(
  '/concepto/:id',
  authorize(['admin']),
  nominaController.desactivarConceptoNomina
);

module.exports = router;
