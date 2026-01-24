const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Obtener horarios por aula
router.get('/', async (req, res) => {
  try {
    const { salon_id } = req.query;
    let query = `
      SELECT h.*, s.nombre as salon_nombre, 
             m.nombre as maestro_nombre, m.apellido_paterno as maestro_apellido,
             g.nombre as grupo_nombre, g.semestre
      FROM horarios h
      JOIN salones s ON h.salon_id = s.id
      LEFT JOIN maestros m ON h.maestro_id = m.id
      LEFT JOIN grupos g ON h.grupo_id = g.id
    `;
    
    const params = [];
    if (salon_id) {
      query += ' WHERE h.salon_id = $1';
      params.push(salon_id);
    }
    
    query += ' ORDER BY h.dia, h.hora_inicio';
    
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener horarios' });
  }
});

// Asignar horario
router.post('/', async (req, res) => {
  try {
    const { salon_id, maestro_id, grupo_id, dia, hora_inicio, hora_fin } = req.body;
    
    // Verificar conflictos
    const conflict = await db.query(
      `SELECT * FROM horarios 
       WHERE salon_id = $1 AND dia = $2 
       AND ((hora_inicio <= $3 AND hora_fin > $3) OR (hora_inicio < $4 AND hora_fin >= $4))`,
      [salon_id, dia, hora_inicio, hora_fin]
    );
    
    if (conflict.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Conflicto de horario: El aula ya está ocupada en ese horario' 
      });
    }
    
    const result = await db.query(
      `INSERT INTO horarios (salon_id, maestro_id, grupo_id, dia, hora_inicio, hora_fin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [salon_id, maestro_id, grupo_id, dia, hora_inicio, hora_fin]
    );
    
    res.status(201).json({ success: true, message: 'Horario asignado', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al asignar horario' });
  }
});

// Eliminar horario
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM horarios WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Horario no encontrado' });
    }
    res.json({ success: true, message: 'Horario eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar horario' });
  }
});

module.exports = router;
