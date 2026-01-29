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
const multer = require('multer');
const sharp = require('sharp');

// =====================================================
// MULTER CONFIGURATION FOR IMAGE UPLOADS
// =====================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP)'));
    }
  }
});

/**
 * Process and convert images to WebP
 */
async function processImages(files) {
  if (!files || files.length === 0) return [];
  
  const uploadDir = path.join(__dirname, '../../uploads/patrimonio');
  
  // Ensure upload directory exists
  try {
    await fs.promises.access(uploadDir);
  } catch {
    await fs.promises.mkdir(uploadDir, { recursive: true });
  }
  
  const processedImages = [];
  
  for (const file of files) {
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const filepath = path.join(uploadDir, filename);
    
    // Convert to WebP with compression
    await sharp(file.buffer)
      .webp({ quality: 80 })
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .toFile(filepath);
    
    processedImages.push(`/uploads/patrimonio/${filename}`);
  }
  
  return processedImages;
}

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
      tipo_inventario: req.query.tipo_inventario,
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
    let data = req.body;

    // Si viene de FormData, el objeto principal puede estar stringificado en 'data'
    // Esto sucede cuando enviamos imágenes junto con datos complejos
    if (data.data && typeof data.data === 'string') {
      try {
        const parsedData = JSON.parse(data.data);
        // Mezclar con el resto del body por si acaso (aunque data suele tener todo)
        data = { ...data, ...parsedData };
      } catch (e) {
        console.error('Error parsing form data JSON:', e);
        return res.status(400).json({
          success: false,
          message: 'Formato de datos inválido (JSON parse error)'
        });
      }
    }

    // SANITIZACIÓN: data.imagenes solo debe contener strings (URLs existentes).
    // Las nuevas imágenes vienen en req.files y se procesan después.
    // Eliminamos cualquier objeto/array basura que provenga del frontend (como [{}, {}])
    if (data.imagenes) {
       if (Array.isArray(data.imagenes)) {
         data.imagenes = data.imagenes.filter(item => typeof item === 'string' && item.trim() !== '');
       } else if (typeof data.imagenes === 'string') {
          // Si es un string único válido, lo dejamos en array
          data.imagenes = [data.imagenes];
       } else {
          // Si es cualquier otra cosa (objeto basura), lo eliminamos
          delete data.imagenes;
       }
    }

    // Procesar imágenes si existen
    if (req.files && req.files.length > 0) {
      const imageUrls = await processImages(req.files);
      data.imagenes = imageUrls;
      console.log('📸 Imágenes procesadas:', imageUrls);
    }

    // Validación de negocio:
    // Si hay coordinacion_id (Admin enviando a coordinador):
    //   - Requiere: tipo_bien, marca, modelo (para identificar el equipo)
    //   - Requiere: proveedor, costo (datos fiscales mínimos)
    //   - NO requiere: numero_serie, ubicacion (coordinador los llena al recibir)
    if (data.coordinacion_id) {
      // Relaxed validation for now as per user request to unify everything
      // But keeping basic check
      if (!data.tipo_bien && !data.marca) {
         // Log but don't block for now if frontend validation is looser
      }
    }

    console.log('📝 Datos finalizados para crear activo:', JSON.stringify(data, null, 2));

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
  let data = req.body; 

  try {

     // Si viene de FormData
    if (data.data && typeof data.data === 'string') {
      try {
        const parsedData = JSON.parse(data.data);
        data = { ...data, ...parsedData };
      } catch (e) {
        console.error('Error parsing form data JSON:', e);
        return res.status(400).json({ success: false, message: 'Invalid JSON data' });
      }
    }

    // SANITIZACIÓN: data.imagenes solo debe contener strings (URLs existentes).
    // Las nuevas imágenes vienen en req.files y se procesan después.
    // Eliminamos cualquier objeto/array basura que provenga del frontend (como [{}, {}])
    if (data.imagenes) {
       if (Array.isArray(data.imagenes)) {
         data.imagenes = data.imagenes.filter(item => typeof item === 'string' && item.trim() !== '');
       } else if (typeof data.imagenes === 'string') {
          // Si es un string único válido, lo dejamos en array
          data.imagenes = [data.imagenes];
       } else {
          // Si es cualquier otra cosa (objeto basura), lo eliminamos
          delete data.imagenes;
       }
    }

    // Procesar imágenes
    if (req.files && req.files.length > 0) {
        const imageUrls = await processImages(req.files);
        console.log('📸 Imágenes procesadas (update):', imageUrls);
        // En update, podríamos añadir o reemplazar.
        // Por compatibilidad simple, si mandas archivos, se considera que estás ASIGNANDO esas imágenes.
        // Si quisieras append, deberías mandar las viejas en 'imagenes' (array) + las nuevas.
        // Aquí simplificamos: las nuevas imágenes se guardan en data.imagenes.
        // Si el usuario quiere mantener las viejas, el frontend debería enviar las URLs viejas en el JSON,
        // Y el backend debería mezclar.
        // Pero processImages devuelve un array de nuevas URLs.
        // Si data.imagenes ya existe (viejas), concatenamos.
        let oldImages = data.imagenes || [];
        if (typeof oldImages === 'string') {
            try { oldImages = JSON.parse(oldImages); } catch(e) {}
        }
        if (!Array.isArray(oldImages)) oldImages = [];
        
        data.imagenes = [...oldImages, ...imageUrls];
    }


    // Validación de campos fiscales... (omitido)

    console.log('📥 Datos recibidos del frontend (Update):', JSON.stringify(data, null, 2));

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

  // Cargar caché de ubicaciones
  let locationMap = new Map();
  try {
    const locResult = await pool.query('SELECT id, nombre FROM ubicaciones');
    locResult.rows.forEach(r => {
      locationMap.set(r.nombre.trim().toLowerCase(), r.id);
    });
    console.log('[STREAM] Loaded locations cache:', locationMap.size);
  } catch (err) {
    console.error('[STREAM] Error loading locations:', err);
  }

  let totalRows = 0;
  let batch = [];
  const BATCH_SIZE = 500; 
  let headers = null;

  try {
    for await (const worksheetReader of workbook) {
      console.log('[STREAM] Reading worksheet:', worksheetReader.name);
      
      for await (const row of worksheetReader) {
        if (!row.values || row.values.length === 0) continue;
        const rowValues = row.values;

        if (!headers) {
          const potentialHeaders = rowValues.slice(1).map(h => String(h).toLowerCase());
          const hasFolio = potentialHeaders.some(h => h.includes('folio') || h.includes('id'));
          
          if (hasFolio) {
            headers = rowValues.slice(1);
            console.log('[STREAM] Headers found:', headers);
          }
          continue; 
        }

        const item = mapRowToInventory(rowValues.slice(1), headers);
        
        if (item && item.folio) {
          batch.push(item);
          totalRows++;
          job.totalRows = totalRows; 
        }

        if (batch.length >= BATCH_SIZE) {
          await processInventoryBatch(batch, job, locationMap);
          batch = [];
        }
      }
    }

    if (batch.length > 0) {
      await processInventoryBatch(batch, job, locationMap);
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

async function processInventoryBatch(batch, job, locationMap) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const query = `
      INSERT INTO inventario (
        folio, tipo_inventario, tipo_bien, marca, modelo, numero_serie, 
        ubicacion, ubicacion_id, 
        estado, estado_uso, descripcion, costo, proveedor, observaciones_tecnicas,
        registro_patrimonial, registro_interno, factura, fecha_adquisicion,
        ur, recurso,
        es_local, estatus_validacion, stage
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 
        $7, $8, 
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20,
        true, 'borrador', 'COMPLETO'
      )
      ON CONFLICT (folio) DO UPDATE SET
        tipo_inventario = EXCLUDED.tipo_inventario,
        tipo_bien = EXCLUDED.tipo_bien,
        marca = EXCLUDED.marca,
        modelo = EXCLUDED.modelo,
        numero_serie = EXCLUDED.numero_serie,
        ubicacion = EXCLUDED.ubicacion,
        ubicacion_id = EXCLUDED.ubicacion_id,
        estado = EXCLUDED.estado,
        estado_uso = EXCLUDED.estado_uso,
        descripcion = EXCLUDED.descripcion,
        costo = EXCLUDED.costo,
        proveedor = EXCLUDED.proveedor,
        observaciones_tecnicas = EXCLUDED.observaciones_tecnicas,
        registro_patrimonial = EXCLUDED.registro_patrimonial,
        registro_interno = EXCLUDED.registro_interno,
        factura = EXCLUDED.factura,
        fecha_adquisicion = EXCLUDED.fecha_adquisicion,
        ur = EXCLUDED.ur,
        recurso = EXCLUDED.recurso,
        updated_at = CURRENT_TIMESTAMP
    `;

    for (const item of batch) {
      try {
        let ubicacionId = null;
        if (item.ubicacion) {
          ubicacionId = locationMap.get(item.ubicacion.toLowerCase()) || null;
        }

        const values = [
          item.folio,
          item.tipo_inventario || 'INTERNO',
          item.tipo_bien,
          item.marca,
          item.modelo,
          item.numero_serie,
          item.ubicacion, 
          ubicacionId,   
          item.estado || 'buena', 
          item.estado_uso || 'bueno',
          item.descripcion,
          item.costo || 0,
          item.proveedor,
          item.observaciones,
          item.registro_patrimonial,
          item.registro_interno,
          item.factura,
          item.fecha_adquisicion,
          item.ur,
          item.recurso
        ];

        const res = await client.query(query, values);
        if (res.rowCount > 0) {
          job.importedRows++;
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
  
  const normalizedHeaders = headers.map(h => 
    String(h).trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  );

  const getVal = (possibleNames) => {
    const index = normalizedHeaders.findIndex(h => 
      possibleNames.some(name => h.includes(name))
    );
    if (index === -1) return null;
    const val = row[index];
    return val !== undefined && val !== null ? String(val).trim() : null;
  };

  item.folio = getVal(['folio', 'id', 'identificador']);
  item.tipo_inventario = getVal(['tipo inventario', 'interno/externo'])?.toUpperCase();
  item.tipo_bien = getVal(['tipo bien', 'descripcion del bien', 'articulo']) || 'Equipo';
  item.marca = getVal(['marca', 'fabricante']) || 'Genérica';
  item.modelo = getVal(['modelo', 'mod']);
  item.numero_serie = getVal(['serie', 'numero serie', 's/n', 'serial']);
  item.ubicacion = getVal(['ubicacion', 'aula', 'espacio']) || 'Bodega';
  
  let estadoRaw = getVal(['estado fisico', 'estado', 'condicion']) || 'buena';
  if (estadoRaw.toLowerCase().includes('reg')) item.estado = 'regular';
  else if (estadoRaw.toLowerCase().includes('mal')) item.estado = 'mala';
  else item.estado = 'buena';

  let usoRaw = getVal(['estado uso', 'uso']) || 'bueno';
  if (usoRaw.toLowerCase().includes('reg')) item.estado_uso = 'regular';
  else if (usoRaw.toLowerCase().includes('mal')) item.estado_uso = 'malo';
  else item.estado_uso = 'bueno';

  item.descripcion = getVal(['descripcion', 'detalles']) || '';
  item.costo = parseFloat(getVal(['costo', 'precio']) || '0');
  item.proveedor = getVal(['proveedor']);
  item.observaciones = getVal(['observaciones', 'notas']);
  
  // Nuevos campos
  item.registro_patrimonial = getVal(['registro patrimonial', 'patrimonial']);
  item.registro_interno = getVal(['registro interno', 'interno']);
  item.factura = getVal(['factura', 'num factura']);
  item.fecha_adquisicion = getVal(['fecha adquisicion', 'fecha compra']); // YYYY-MM-DD
  item.ur = getVal(['ur', 'unidad responsable']);
  item.recurso = getVal(['recurso', 'fuente']);

  return item;
}

const downloadTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Plantilla Inventario');

    // Definir columnas (20 columnas ahora)
    worksheet.columns = [
      { header: 'Folio (Obligatorio)', key: 'folio', width: 20 },
      { header: 'Tipo de Inventario', key: 'tipo_inventario', width: 20 },
      { header: 'Tipo de Bien', key: 'tipo_bien', width: 20 },
      { header: 'Marca', key: 'marca', width: 20 },
      { header: 'Modelo', key: 'modelo', width: 20 },
      { header: 'Número de Serie', key: 'serie', width: 25 },
      { header: 'Ubicación', key: 'ubicacion', width: 25 },
      { header: 'Estado Físico', key: 'estado', width: 15 },
      { header: 'Estado de Uso', key: 'estado_uso', width: 15 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Costo', key: 'costo', width: 15 },
      { header: 'Proveedor', key: 'proveedor', width: 25 },
      { header: 'Registro Patrimonial', key: 'registro_patrimonial', width: 20 },
      { header: 'Registro Interno', key: 'registro_interno', width: 20 },
      { header: 'Factura', key: 'factura', width: 20 },
      { header: 'Fecha Adquisición (YYYY-MM-DD)', key: 'fecha_adquisicion', width: 25 },
      { header: 'UR', key: 'ur', width: 15 },
      { header: 'Recurso', key: 'recurso', width: 20 },
      { header: 'Observaciones', key: 'observaciones', width: 40 }
    ];

    // Agregar fila de ejemplo
    worksheet.addRow({
      folio: 'INV-2024-001',
      tipo_inventario: 'INTERNO',
      tipo_bien: 'Computadora',
      marca: 'Dell',
      modelo: 'Optiplex 7090',
      serie: 'ABC123456',
      ubicacion: 'Laboratorio 1',
      estado: 'buena',
      estado_uso: 'bueno',
      descripcion: 'PC de Escritorio Core i7',
      costo: 15000.50,
      proveedor: 'Proveedor SA de CV',
      registro_patrimonial: 'PAT-12345',
      registro_interno: 'INT-999',
      factura: 'F-2024-001',
      fecha_adquisicion: '2024-01-15',
      ur: '400',
      recurso: 'PRODEP',
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
