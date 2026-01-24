const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Obtener todos los edificios con sus salones
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.*, 
             json_agg(
               json_build_object(
                 'id', s.id, 
                 'nombre', s.nombre, 
                 'piso', s.piso,
                 'capacidad_butacas', s.capacidad_butacas,
                 'alumnos_actuales', s.alumnos_actuales
               ) ORDER BY s.piso, s.nombre
             ) as salones
      FROM edificios e
      LEFT JOIN salones s ON s.edificio_id = e.id
      GROUP BY e.id
      ORDER BY e.nombre
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener edificios' });
  }
});

// Actualizar capacidad de salón
router.put('/salones/:id', async (req, res) => {
  try {
    const { capacidad_butacas, alumnos_actuales } = req.body;
    const result = await db.query(
      'UPDATE salones SET capacidad_butacas = $1, alumnos_actuales = $2 WHERE id = $3 RETURNING *',
      [capacidad_butacas, alumnos_actuales, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salón no encontrado' });
    }
    res.json({ success: true, message: 'Salón actualizado', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar salón' });
  }
});

module.exports = router;
