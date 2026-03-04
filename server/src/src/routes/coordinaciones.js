// =====================================================
// RUTAS: Coordinaciones (para dropdown en formulario)
// Archivo: server/src/routes/coordinaciones.js
// =====================================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/coordinaciones - Listar coordinaciones según rol
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT id, nombre, descripcion FROM coordinaciones ORDER BY nombre');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener coordinaciones:', error);
        res.status(500).json({ success: false, message: 'Error al obtener coordinaciones' });
    }
});

module.exports = router;
