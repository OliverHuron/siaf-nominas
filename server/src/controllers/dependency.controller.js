const db = require('../config/database');

// Obtener todas las dependencias
const getAllDependencies = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM dependencias ORDER BY nombre');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getAllDependencies:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener dependencias'
    });
  }
};

// Obtener una dependencia por ID
const getDependencyById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM dependencias WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dependencia no encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en getDependencyById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener dependencia'
    });
  }
};

// Crear nueva dependencia
const createDependency = async (req, res) => {
  try {
    const { nombre, descripcion, activo = true } = req.body;

    const result = await db.query(
      'INSERT INTO dependencias (nombre, descripcion, activo) VALUES ($1, $2, $3) RETURNING *',
      [nombre, descripcion, activo]
    );

    res.status(201).json({
      success: true,
      message: 'Dependencia creada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en createDependency:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear dependencia'
    });
  }
};

// Actualizar dependencia
const updateDependency = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;

    const result = await db.query(
      'UPDATE dependencias SET nombre = $1, descripcion = $2, activo = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [nombre, descripcion, activo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dependencia no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Dependencia actualizada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en updateDependency:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar dependencia'
    });
  }
};

// Eliminar dependencia (soft delete)
const deleteDependency = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE dependencias SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dependencia no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Dependencia desactivada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error en deleteDependency:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar dependencia'
    });
  }
};

module.exports = {
  getAllDependencies,
  getDependencyById,
  createDependency,
  updateDependency,
  deleteDependency
};
