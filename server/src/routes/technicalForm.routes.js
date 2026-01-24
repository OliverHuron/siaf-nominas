const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Obtener fichas técnicas
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ft.*, u.nombre as usuario_nombre, u.apellido_paterno as usuario_apellido
      FROM fichas_tecnicas ft
      JOIN usuarios u ON ft.usuario_id = u.id
      ORDER BY ft.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener fichas' });
  }
});

// Crear ficha técnica
router.post('/', async (req, res) => {
  try {
    const { titulo, datos_formulario, coordinaciones_requeridas } = req.body;
    const result = await db.query(
      `INSERT INTO fichas_tecnicas (usuario_id, titulo, datos_formulario, coordinaciones_requeridas, estado)
       VALUES ($1, $2, $3, $4, 'revision')
       RETURNING *`,
      [req.user.id, titulo, JSON.stringify(datos_formulario), JSON.stringify(coordinaciones_requeridas)]
    );
    res.status(201).json({ success: true, message: 'Ficha creada', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear ficha' });
  }
});

// Actualizar estado de ficha
router.put('/:id', async (req, res) => {
  try {
    const { estado } = req.body;
    const result = await db.query(
      'UPDATE fichas_tecnicas SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [estado, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ficha no encontrada' });
    }
    res.json({ success: true, message: 'Ficha actualizada', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar ficha' });
  }
});

module.exports = router;
