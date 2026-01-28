// =====================================================
// CONTROLADOR: Inventario con RLS (Row Level Security)
// Archivo: server/src/controllers/inventoryController.js
// Propósito: CRUD con seguridad multi-coordinación
// =====================================================

const { pool } = require('../config/database');
const InventoryService = require('../services/inventoryService');
const ImportJob = require('../services/importJob.service').ImportJob;
const importJobs = require('../services/importJob.service').importJobs;
// Force git sync - Inventory Module
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');

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
// IMPORTACIÓN MASIVA DESDE EXCEL (STREAMING)
// =====================================================

const importInventoryFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo' });
    }

    const userId = req.user.id;
    const filePath = req.file.path;
    const jobId = uuidv4();

    // Crear trabajo de importación
    // Crear trabajo de importación
    const job = new ImportJob(jobId, 0);
    importJobs.set(jobId, job);

    // Iniciar procesamiento en background
    // No esperamos con await para liberar el request
    processInventoryStream(filePath, job).catch(err => {
      console.error(`[BACKGROUND] Fatal error in inventory import job ${jobId}:`, err);
      job.fail(err.message);
    });

    res.json({
      success: true,
      message: 'Importación iniciada',
      jobId: jobId
    });

  } catch (error) {
    console.error('Error al iniciar importación:', error);
    // Eliminar archivo si hubo error síncrono
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Procesamiento Streaming Background
async function processInventoryStream(filePath, job) {
  console.log('[STREAM] Starting Inventory Excel stream:', filePath);
  
  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    worksheets: 'emit',
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    styles: 'ignore'
  });

  let totalRows = 0;
  let batch = [];
  const BATCH_SIZE = 500; // Un poco menor que empleados por ser más columnas
  let headers = null;

  try {
    for await (const worksheetReader of workbook) {
      console.log('[STREAM] Reading worksheet:', worksheetReader.name);
      
      for await (const row of worksheetReader) {
        if (!row.values || row.values.length === 0) continue;

        // ExcelJS values start at index 1
        const rowValues = row.values;
        // console.log(`[STREAM DEBUG] Row ${row.number} raw values:`, JSON.stringify(rowValues));

        if (!headers) {
          // Intentar detectar si es la fila de encabezados
          // Debe tener "folio" o similar
          const potentialHeaders = rowValues.slice(1).map(h => String(h).toLowerCase());
          const hasFolio = potentialHeaders.some(h => h.includes('folio') || h.includes('id'));
          
          if (hasFolio) {
            headers = rowValues.slice(1);
            console.log('[STREAM] Headers found:', headers);
          } else {
             console.log('[STREAM] Skipping row (not headers):', potentialHeaders);
          }
          continue; 
        }

        // Si ya tenemos headers, procesar data
        // slice(1) por el offset de ExcelJS
        const item = mapRowToInventory(rowValues.slice(1), headers);
        
        // Debug para ver qué está mapeando
        // if (totalRows < 5) console.log('[STREAM DEBUG] Mapped item:', JSON.stringify(item));

        if (item && item.folio) {
          batch.push(item);
          totalRows++;
          job.totalRows = totalRows; 
        } else {
           // console.log('[STREAM DEBUG] Invalid item or missing folio:', item);
        }

        if (batch.length >= BATCH_SIZE) {
          await processInventoryBatch(batch, job);
          batch = [];
        }
      }
    }

    if (batch.length > 0) {
      await processInventoryBatch(batch, job);
    }

    job.complete();
    console.log('[STREAM] Inventory Import complete');

  } catch (error) {
    console.error('[STREAM] Error processing stream:', error);
    job.fail(error.message);
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

async function processInventoryBatch(batch, job) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Preparar INSERT masivo con ON CONFLICT (folio)
    // Asumimos que 'folio' es UNIQUE. Si no lo es, el script de la tarea anterior debe asegurar
    // que haya un constraint, o usamos numero_serie. El usuario dijo "folio".
    
    const query = `
      INSERT INTO inventario (
        folio, tipo_bien, marca, modelo, numero_serie, ubicacion, 
        estado, descripcion, costo, proveedor, observaciones_tecnicas,
        es_local, estatus_validacion, stage
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
        true, 'borrador', 'COMPLETO'
      )
      ON CONFLICT (folio) DO NOTHING
    `;

    for (const item of batch) {
      try {
        const values = [
          item.folio,
          item.tipo_bien,
          item.marca,
          item.modelo,
          item.numero_serie,
          item.ubicacion,
          item.estado || 'buena',
          item.descripcion,
          item.costo || 0,
          item.proveedor,
          item.observaciones
        ];

        const res = await client.query(query, values);
        if (res.rowCount > 0) {
          job.importedRows++;
        } else {
          job.failedRows++; 
          console.log(`[BATCH] Duplicate ignored: ${item.folio}`);
        }
        job.processedRows++;

      } catch (err) {
        console.error(`[BATCH] Error inserting item ${item.folio}:`, err.message);
        job.failedRows++;
        job.errors.push(`Folio ${item.folio}: ${err.message}`);
      }
    }

    await client.query('COMMIT');
    job.updateProgress(job.processedRows, job.importedRows, job.failedRows);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[BATCH] Batch transaction error:', error);
    // Si falla toda la transacción del batch, marcamos todos como fallidos
    job.failedRows += batch.length;
    job.processedRows += batch.length;
    job.errors.push(`Batch error: ${error.message}`);
    job.updateProgress(job.processedRows, job.importedRows, job.failedRows);
  } finally {
    client.release();
  }
}

function mapRowToInventory(row, headers) {
  const item = {};
  
  // Normalizar headers
  const normalizedHeaders = headers.map(h => 
    String(h).trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  );

  // Mapeo flexible
  const getVal = (possibleNames) => {
    // Buscar si algún header contiene alguna de las palabras clave
    const index = normalizedHeaders.findIndex(h => 
      possibleNames.some(name => h.includes(name))
    );
    if (index === -1) return null;
    const val = row[index];
    return val !== undefined && val !== null ? String(val).trim() : null;
  };

  item.folio = getVal(['folio', 'id', 'identificador', 'numero inventario']);
  item.tipo_bien = getVal(['tipo', 'tipo bien', 'descripcion del bien', 'articulo']) || 'Equipo';
  item.marca = getVal(['marca', 'fabricante']) || 'Genérica';
  item.modelo = getVal(['modelo', 'mod']);
  item.numero_serie = getVal(['serie', 'numero serie', 's/n', 'serial']);
  item.ubicacion = getVal(['ubicacion', 'aula', 'espacio', 'lugar']) || 'Bodega';
  
  // Estado
  let estadoRaw = getVal(['estado', 'condicion', 'status']) || 'buena';
  if (estadoRaw.toLowerCase().includes('reg')) item.estado = 'regular';
  else if (estadoRaw.toLowerCase().includes('mal')) item.estado = 'mala';
  else item.estado = 'buena';

  item.descripcion = getVal(['descripcion', 'detalles', 'observaciones']) || '';
  item.costo = parseFloat(getVal(['costo', 'precio', 'valor']) || '0');
  item.proveedor = getVal(['proveedor', 'vendedor']);
  item.observaciones = getVal(['observaciones tecnicas', 'notas']);
  
  return item;
}

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

// =====================================================
// DESCARGAR PLANTILLA EXCEL
// =====================================================

const downloadTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Plantilla Inventario');

    // Definir columnas
    worksheet.columns = [
      { header: 'Folio (Obligatorio)', key: 'folio', width: 20 },
      { header: 'Tipo de Bien', key: 'tipo', width: 20 },
      { header: 'Marca', key: 'marca', width: 20 },
      { header: 'Modelo', key: 'modelo', width: 20 },
      { header: 'Número de Serie', key: 'serie', width: 25 },
      { header: 'Ubicación', key: 'ubicacion', width: 25 },
      { header: 'Estado (buena, regular, mala)', key: 'estado', width: 30 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Costo', key: 'costo', width: 15 },
      { header: 'Proveedor', key: 'proveedor', width: 25 },
      { header: 'Observaciones', key: 'observaciones', width: 40 }
    ];

    // Agregar fila de ejemplo
    worksheet.addRow({
      folio: 'INV-2024-001',
      tipo: 'Computadora',
      marca: 'Dell',
      modelo: 'Optiplex 7090',
      serie: 'ABC123456',
      ubicacion: 'Laboratorio 1',
      estado: 'buena',
      descripcion: 'PC de Escritorio Core i7',
      costo: 15000.50,
      proveedor: 'Proveedor SA de CV',
      observaciones: 'Equipo nuevo'
    });

    // Estilo para headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Plantilla_Inventario.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error al generar plantilla:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar plantilla',
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
  getCoordinaciones,
  importInventoryFromExcel,
  downloadTemplate
};
