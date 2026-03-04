// =====================================================
// OPTIMIZACIÓN DE IMÁGENES CON SHARP
// 📸 JPG/PNG/JPEG → WebP + Compresión + Redimensionado
// =====================================================

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ImageOptimizer {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.join(__dirname, '../../uploads/patrimonio');
    this.maxWidth = options.maxWidth || 1920;
    this.maxHeight = options.maxHeight || 1080;
    this.quality = options.quality || 85;
    this.thumbnailSize = options.thumbnailSize || 300;
    this.allowedFormats = ['jpg', 'jpeg', 'png', 'webp'];
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
  }

  /**
   * Procesar múltiples imágenes de un inventario (máximo 3)
   * @param {Array} files - Array de archivos de multer
   * @param {string} inventoryId - ID del inventario
   * @returns {Promise<Array>} URLs de las imágenes procesadas
   */
  async processInventoryImages(files, inventoryId) {
    if (!files || files.length === 0) return [];
    
    // Máximo 3 imágenes como especifica SIAF
    const filesToProcess = files.slice(0, 3);
    const processedImages = [];

    // Asegurar que el directorio existe
    await this.ensureDirectory(`${this.baseDir}/${inventoryId}`);

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      
      try {
        // Validar archivo
        this.validateFile(file);
        
        // Generar nombres únicos
        const imageId = uuidv4();
        const baseName = `${inventoryId}_${i + 1}_${imageId}`;
        
        // Procesar imagen principal (WebP optimizada)
        const mainImagePath = await this.processMainImage(file.buffer, baseName);
        
        // Procesar thumbnail
        const thumbnailPath = await this.processThumbnail(file.buffer, baseName);
        
        processedImages.push({
          original: file.originalname,
          mainImage: `/uploads/patrimonio/${inventoryId}/${path.basename(mainImagePath)}`,
          thumbnail: `/uploads/patrimonio/${inventoryId}/${path.basename(thumbnailPath)}`,
          size: file.size,
          processed: true,
          format: 'webp'
        });

        console.log(`✅ Imagen ${i + 1}/3 procesada: ${file.originalname} → WebP`);
        
      } catch (error) {
        console.error(`❌ Error procesando imagen ${i + 1}:`, error.message);
        // Continuar con las otras imágenes
        processedImages.push({
          original: file.originalname,
          error: error.message,
          processed: false
        });
      }
    }

    return processedImages;
  }

  /**
   * Procesar imagen principal optimizada para web
   */
  async processMainImage(buffer, baseName) {
    const outputPath = path.join(this.baseDir, `${baseName}.webp`);
    
    await sharp(buffer)
      .resize(this.maxWidth, this.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: this.quality,
        effort: 6, // Mayor compresión
        smartSubsample: true
      })
      .toFile(outputPath);

    return outputPath;
  }

  /**
   * Procesar thumbnail para listados rápidos
   */
  async processThumbnail(buffer, baseName) {
    const outputPath = path.join(this.baseDir, `${baseName}_thumb.webp`);
    
    await sharp(buffer)
      .resize(this.thumbnailSize, this.thumbnailSize, {
        fit: 'cover',
        position: 'center'
      })
      .webp({
        quality: 75,
        effort: 6
      })
      .toFile(outputPath);

    return outputPath;
  }

  /**
   * Validar archivo de imagen
   */
  validateFile(file) {
    // Validar tamaño
    if (file.size > this.maxFileSize) {
      throw new Error(`Archivo muy grande: ${Math.round(file.size / 1024 / 1024)}MB. Máximo: ${Math.round(this.maxFileSize / 1024 / 1024)}MB`);
    }

    // Validar formato por extensión
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    if (!this.allowedFormats.includes(ext)) {
      throw new Error(`Formato no válido: .${ext}. Formatos permitidos: ${this.allowedFormats.join(', ')}`);
    }

    // Validar MIME type
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new Error(`MIME type no válido: ${file.mimetype}`);
    }
  }

  /**
   * Asegurar que el directorio existe
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`📁 Directorio creado: ${dirPath}`);
    }
  }

  /**
   * Eliminar imágenes de un inventario
   */
  async deleteInventoryImages(inventoryId, imageUrls = []) {
    const inventoryDir = path.join(this.baseDir, inventoryId.toString());
    
    try {
      if (imageUrls.length > 0) {
        // Eliminar imágenes específicas
        for (const url of imageUrls) {
          try {
            const fileName = path.basename(url);
            const filePath = path.join(inventoryDir, fileName);
            await fs.unlink(filePath);
            
            // También eliminar el thumbnail si existe
            const thumbName = fileName.replace('.webp', '_thumb.webp');
            const thumbPath = path.join(inventoryDir, thumbName);
            try {
              await fs.unlink(thumbPath);
            } catch {} // Ignorar si no existe
            
            console.log(`🗑️ Imagen eliminada: ${fileName}`);
          } catch (error) {
            console.warn(`⚠️ Error eliminando imagen: ${url}`, error.message);
          }
        }
      } else {
        // Eliminar todo el directorio del inventario
        await fs.rm(inventoryDir, { recursive: true, force: true });
        console.log(`🗑️ Directorio eliminado: ${inventoryDir}`);
      }
    } catch (error) {
      console.error(`❌ Error eliminando imágenes del inventario ${inventoryId}:`, error.message);
    }
  }

  /**
   * Obtener información de las imágenes existentes
   */
  async getInventoryImages(inventoryId) {
    const inventoryDir = path.join(this.baseDir, inventoryId.toString());
    
    try {
      const files = await fs.readdir(inventoryDir);
      const images = files
        .filter(file => file.endsWith('.webp') && !file.includes('_thumb'))
        .map(file => {
          const thumbFile = file.replace('.webp', '_thumb.webp');
          return {
            mainImage: `/uploads/patrimonio/${inventoryId}/${file}`,
            thumbnail: files.includes(thumbFile) ? `/uploads/patrimonio/${inventoryId}/${thumbFile}` : null,
            fileName: file
          };
        });
      
      return images;
    } catch (error) {
      console.warn(`⚠️ No se encontraron imágenes para inventario ${inventoryId}`);
      return [];
    }
  }

  /**
   * Generar estadísticas de almacenamiento
   */
  async getStorageStats() {
    try {
      const calculateDirSize = async (dirPath) => {
        let totalSize = 0;
        let fileCount = 0;
        
        try {
          const items = await fs.readdir(dirPath, { withFileTypes: true });
          
          for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            
            if (item.isDirectory()) {
              const { size, count } = await calculateDirSize(fullPath);
              totalSize += size;
              fileCount += count;
            } else {
              const stats = await fs.stat(fullPath);
              totalSize += stats.size;
              fileCount++;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error calculando tamaño de directorio ${dirPath}`);
        }
        
        return { size: totalSize, count: fileCount };
      };
      
      const { size, count } = await calculateDirSize(this.baseDir);
      
      return {
        totalSize: size,
        totalFiles: count,
        totalSizeMB: Math.round(size / 1024 / 1024 * 100) / 100,
        totalSizeGB: Math.round(size / 1024 / 1024 / 1024 * 100) / 100,
        avgFileSize: count > 0 ? Math.round(size / count / 1024) : 0, // KB
        baseDirectory: this.baseDir,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error calculando estadísticas de almacenamiento:', error);
      return null;
    }
  }

  /**
   * Limpiar imágenes huérfanas (sin inventario asociado)
   */
  async cleanupOrphanedImages(validInventoryIds = []) {
    try {
      const inventoryDirs = await fs.readdir(this.baseDir, { withFileTypes: true });
      let cleanedCount = 0;
      let cleanedSize = 0;
      
      for (const dir of inventoryDirs) {
        if (dir.isDirectory()) {
          const inventoryId = parseInt(dir.name);
          
          if (!isNaN(inventoryId) && !validInventoryIds.includes(inventoryId)) {
            const dirPath = path.join(this.baseDir, dir.name);
            
            // Calcular tamaño antes de eliminar
            const { size } = await this.calculateDirectorySize(dirPath);
            cleanedSize += size;
            
            // Eliminar directorio
            await fs.rm(dirPath, { recursive: true, force: true });
            cleanedCount++;
            
            console.log(`🧹 Limpieza: directorio ${dir.name} eliminado`);
          }
        }
      }
      
      return {
        cleaned: cleanedCount,
        cleanedSizeMB: Math.round(cleanedSize / 1024 / 1024 * 100) / 100,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error en limpieza de imágenes huérfanas:', error);
      return null;
    }
  }

  async calculateDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
      }
    } catch (error) {
      console.warn(`⚠️ Error calculando tamaño de ${dirPath}`);
    }
    
    return { size: totalSize };
  }
}

// =====================================================
// CONFIGURACIÓN MULTER OPTIMIZADA
// =====================================================
const multer = require('multer');

const createOptimizedMulter = () => {
  return multer({
    storage: multer.memoryStorage(), // Procesar en memoria para Sharp
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB por archivo
      files: 3, // Máximo 3 archivos como especifica SIAF
      fieldSize: 1024 * 1024, // 1MB para otros campos
    },
    fileFilter: (req, file, cb) => {
      // Validar formato
      const allowedTypes = /^image\/(jpeg|jpg|png|webp)$/i;
      const isValidMime = allowedTypes.test(file.mimetype);
      
      const allowedExts = /\.(jpg|jpeg|png|webp)$/i;
      const isValidExt = allowedExts.test(file.originalname);
      
      if (isValidMime && isValidExt) {
        cb(null, true);
      } else {
        cb(new Error(`Formato no válido: ${file.mimetype}. Solo se permiten JPG, PNG y WebP`), false);
      }
    },
  });
};

// =====================================================
// MIDDLEWARE PARA PROCESAMIENTO DE IMÁGENES
// =====================================================
const processInventoryImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    req.processedImages = [];
    return next();
  }
  
  try {
    const optimizer = new ImageOptimizer();
    const inventoryId = req.params.id || 'temp_' + Date.now();
    
    req.processedImages = await optimizer.processInventoryImages(req.files, inventoryId);
    
    console.log(`📸 Procesadas ${req.processedImages.length} imágenes para inventario ${inventoryId}`);
    next();
  } catch (error) {
    console.error('❌ Error procesando imágenes:', error);
    res.status(500).json({
      error: 'Error procesando imágenes',
      details: error.message
    });
  }
};

module.exports = {
  ImageOptimizer,
  createOptimizedMulter,
  processInventoryImages
};