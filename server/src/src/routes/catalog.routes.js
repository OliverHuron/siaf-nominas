const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * GET /api/catalogs/jerarquias
 * Returns the complete organizational hierarchy tree
 */
router.get('/jerarquias', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        nombre,
        tipo,
        codigo,
        parent_id,
        nivel,
        activo
      FROM jerarquias_responsables
      WHERE activo = true
      ORDER BY codigo ASC
    `);

    // Build tree structure
    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id)
        }));
    };

    const tree = buildTree(result.rows);

    res.json({
      success: true,
      data: tree,
      flat: result.rows // Also return flat list for easier dropdown rendering
    });
  } catch (error) {
    console.error('Error fetching jerarquias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener jerarquías'
    });
  }
});

/**
 * GET /api/catalogs/ubicaciones
 * Returns all locations grouped by building
 */
router.get('/ubicaciones', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.nombre,
        u.piso,
        u.edificio_id,
        e.nombre as edificio_nombre
      FROM ubicaciones u
      JOIN edificios e ON u.edificio_id = e.id
      WHERE u.activo = true
      ORDER BY e.nombre, u.nombre
    `);

    // Group by building
    const grouped = result.rows.reduce((acc, loc) => {
      const edificio = loc.edificio_nombre;
      if (!acc[edificio]) {
        acc[edificio] = [];
      }
      acc[edificio].push({
        id: loc.id,
        nombre: loc.nombre,
        piso: loc.piso,
        edificio_id: loc.edificio_id
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: grouped,
      flat: result.rows
    });
  } catch (error) {
    console.error('Error fetching ubicaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ubicaciones'
    });
  }
});

/**
 * GET /api/catalogs/edificios
 * Returns all buildings
 */
router.get('/edificios', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, descripcion
      FROM edificios
      ORDER BY nombre
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching edificios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener edificios'
    });
  }
});

module.exports = router;
