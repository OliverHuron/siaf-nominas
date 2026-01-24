// =====================================================
// CONTROLADOR: Inventario con RLS (Row Level Security)
// Archivo: server/src/controllers/inventoryController.js
// Propósito: CRUD con seguridad multi-coordinación
// =====================================================

const { pool } = require('../config/database');
const InventoryService = require('../services/inventoryService');

// =====================================================
// OBTENER INVENTARIO CON FILTROS Y RLS
// =====================================================

const getInventory = async (req, res) => {
  try {
    const userId = req.user.id; // Extraído del middleware de autenticación
    const filters = {
      cursor: req.query.cursor,
      limit: req.query.limit || 100,
      coordinacion_id: req.query.coordinacion_id,
      estado: req.query.estado,
      estado_uso: req.query.estado_uso,
      estatus_validacion: req.query.estatus_validacion,
      search: req.query.search,
    };

    // Solo agregar filtros booleanos si están explícitamente presentes
    if (req.query.es_oficial_siia === 'true') filters.es_oficial_siia = true;
    if (req.query.es_local === 'true') filters.es_local = true;
    if (req.query.es_investigacion === 'true') filters.es_investigacion = true;

    const inventoryService = new InventoryService(pool);
    const result = await inventoryService.getInventory(userId, filters);

    res.json(result);

  } catch (error) {
    console.error('Error al obtener inventario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener inventario',
      error: error.message
    });
  }
};

// =====================================================
// OBTENER UN ACTIVO POR ID (Con RLS)
// =====================================================

const getInventoryById = async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = parseInt(req.params.id);

    const inventoryService = new InventoryService(pool);
    const item = await inventoryService.getInventoryById(userId, itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Activo no encontrado o sin permisos para verlo'
      });
    }

    res.json({
      success: true,
      data: item
    });

  } catch (error) {
    console.error('Error al obtener activo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener activo',
      error: error.message
    });
  }
};

// =====================================================
// CREAR NUEVO ACTIVO
// =====================================================

const createInventoryItem = async (req, res) => {
  try {

    const userId = req.user.id;
    const data = req.body;

    // Validación de negocio:
    // Si hay coordinacion_id (Admin enviando a coordinador):
    //   - Requiere: tipo_bien, marca, modelo (para identificar el equipo)
    //   - Requiere: proveedor, costo (datos fiscales mínimos)
    //   - NO requiere: numero_serie, ubicacion (coordinador los llena al recibir)
    if (data.coordinacion_id) {
      if (!data.tipo_bien || !data.marca || !data.modelo) {
        return res.status(400).json({
          success: false,
          message: 'Para enviar a coordinación necesitas: tipo de bien, marca y modelo (para identificar el equipo)'
        });
      }
      if (!data.proveedor || !data.costo) {
        return res.status(400).json({
          success: false,
          message: 'Para enviar a coordinación necesitas datos fiscales: proveedor y costo'
        });
      }
    }

    console.log('📝 Datos recibidos en inventoryController:', data);

    const inventoryService = new InventoryService(pool);
    const newItem = await inventoryService.createInventoryItem(userId, data);

    res.status(201).json({
      success: true,
      message: 'Activo creado exitosamente',
      data: newItem
    });

  } catch (error) {
    console.error('Error al crear activo:', error);

    // Detectar error de duplicado (PostgreSQL constraint violation)
    if (error.code === '23505') {
      let campo = 'desconocido';
      let valor = '';

      // Extraer el valor del mensaje de error de PostgreSQL
      const match = error.detail?.match(/\(([^)]+)\)=\(([^)]+)\)/);
      if (match) {
        valor = match[2];
      }

      if (error.constraint === 'idx_inventario_numero_serie_unique') {
        campo = 'número de serie';
      } else if (error.constraint === 'idx_inventario_numero_patrimonio_unique') {
        campo = 'número de patrimonio';
      }

      return res.status(409).json({
        success: false,
        message: `El ${campo} ya está registrado en otro activo. Por favor use un valor diferente.`,
        error: 'DUPLICATE_VALUE'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear activo',
      error: error.message
    });
  }
};

// =====================================================
// ACTUALIZAR ACTIVO EXISTENTE
// =====================================================

const updateInventoryItem = async (req, res) => {
  const userId = req.user.id;
  const itemId = parseInt(req.params.id);
  const data = req.body; // Declarar aquí para acceso en catch

  try {

    // Validación de campos fiscales si se intenta validar (comentado - validación movida al frontend)
    // if (data.estatus_validacion === 'validado') {
    //   if (!data.costo || !data.uuid || !data.factura) {
    //     return res.status(400).json({
    //       success: false,
    //       message: 'Para validar se requiere: costo, uuid, factura'
    //     });
    //   }
    // }

    console.log('📥 Datos recibidos del frontend:', JSON.stringify(data, null, 2));

    const inventoryService = new InventoryService(pool);
    const updatedItem = await inventoryService.updateInventoryItem(
      userId,
      itemId,
      data
    );

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: 'Activo no encontrado o sin permisos para editarlo'
      });
    }

    res.json({
      success: true,
      message: 'Activo actualizado exitosamente',
      data: updatedItem
    });

  } catch (error) {
    console.error('Error al actualizar activo:', error);

    // Detectar error de duplicado (PostgreSQL constraint violation)
    if (error.code === '23505') {
      let campo = 'desconocido';
      let valor = '';

      // Extraer el valor del mensaje de error de PostgreSQL
      // El formato es: "Ya existe la llave (campo)=(valor)."
      const match = error.detail?.match(/\(([^)]+)\)=\(([^)]+)\)/);
      if (match) {
        valor = match[2]; // El valor duplicado
      }

      if (error.constraint === 'idx_inventario_numero_serie_unique') {
        campo = 'número de serie';
      } else if (error.constraint === 'idx_inventario_numero_patrimonio_unique') {
        campo = 'número de patrimonio';
      }

      return res.status(409).json({
        success: false,
        message: `El ${campo} "${valor}" ya está registrado en otro activo. Por favor use un valor diferente.`,
        error: 'DUPLICATE_VALUE',
        field: error.constraint === 'idx_inventario_numero_serie_unique' ? 'numero_serie' : 'numero_patrimonio'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar activo',
      error: error.message
    });
  }
};

// =====================================================
// ELIMINAR (Dar de Baja) ACTIVO
// =====================================================

const deleteInventoryItem = async (req, res) => {
  try {

    const userId = req.user.id;
    const itemId = parseInt(req.params.id);

    // Verificar que el usuario es admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden dar de baja activos'
      });
    }

    const inventoryService = new InventoryService(pool);
    const deleted = await inventoryService.deleteInventoryItem(userId, itemId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Activo no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Activo dado de baja exitosamente'
    });

  } catch (error) {
    console.error('Error al dar de baja activo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al dar de baja activo',
      error: error.message
    });
  }
};

// =====================================================
// ESTADÍSTICAS DEL INVENTARIO (Para Dashboard)
// =====================================================

const getInventoryStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const inventoryService = new InventoryService(pool);
    const stats = await inventoryService.getInventoryStats(userId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// =====================================================
// OBTENER COORDINACIONES (Para select dropdown)
// =====================================================

const getCoordinaciones = async (req, res) => {
  try {
    const role = req.user.role;
    const result = await pool.query(
      role === 'admin'
        ? 'SELECT id, nombre, descripcion FROM coordinaciones ORDER BY nombre'
        : 'SELECT id, nombre, descripcion FROM coordinaciones ORDER BY nombre' // Por ahora todos ven todas
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al obtener coordinaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener coordinaciones',
      error: error.message
    });
  }
};

// =====================================================
// EXPORTAR CONTROLADORES
// =====================================================

module.exports = {
  getInventory,
  getInventoryById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryStats,
  getCoordinaciones
};

// =====================================================
// EJEMPLO DE USO EN RUTAS (server/src/routes/inventory.js)
// =====================================================

/*
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Middleware de autenticación
const inventoryController = require('../controllers/inventoryController');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/inventory - Listar inventario (con RLS automático)
router.get('/', inventoryController.getInventory);

// GET /api/inventory/stats - Estadísticas
router.get('/stats', inventoryController.getInventoryStats);

// GET /api/inventory/:id - Obtener un activo
router.get('/:id', inventoryController.getInventoryById);

// POST /api/inventory - Crear activo
router.post('/', inventoryController.createInventoryItem);

// PUT /api/inventory/:id - Actualizar activo
router.put('/:id', inventoryController.updateInventoryItem);

// DELETE /api/inventory/:id - Dar de baja activo (solo admin)
router.delete('/:id', inventoryController.deleteInventoryItem);

// GET /api/coordinaciones - Listar coordinaciones
router.get('/coordinaciones', inventoryController.getCoordinaciones);

module.exports = router;
*/
