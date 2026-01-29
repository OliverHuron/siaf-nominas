// =====================================================
// Service Layer para Inventario con RLS
// Archivo: server/src/services/inventoryService.js
// =====================================================

class InventoryService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Establece el contexto del usuario actual para RLS
   * CRÍTICO: Debe llamarse ANTES de cada query que use RLS
   */
  async setUserContext(client, userId) {
    await client.query('SELECT set_current_user($1)', [userId]);
  }

  /**
   * Obtener inventario filtrado por coordinación (automático con RLS)
   * @param {number} userId - ID del usuario autenticado
   * @param {object} filters - Filtros adicionales (estatus, tipo_bien, cursor, limit, etc)
   */
  async getInventory(userId, filters = {}) {
    const client = await this.pool.connect();

    try {
      const { cursor, limit = 100, ...otherFilters } = filters;

      // PASO 1: Obtener información del usuario
      const userInfo = await client.query(
        'SELECT role, coordinacion_id FROM usuarios WHERE id = $1',
        [userId]
      );

      if (userInfo.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const { role, coordinacion_id } = userInfo.rows[0];

      // PASO 2: Construir query base
      let query = `
        SELECT 
          i.*,
          c.nombre AS coordinacion_nombre,
          j.nombre AS responsable_entrega_nombre,
          u.nombre AS ubicacion_nombre,
          ua.nombre AS usuario_asignado_nombre
        FROM public.inventario i
        LEFT JOIN public.coordinaciones c ON i.coordinacion_id = c.id
        LEFT JOIN public.jerarquias_responsables j ON i.responsable_entrega_id = j.id
        LEFT JOIN public.ubicaciones u ON i.ubicacion_id = u.id
        LEFT JOIN public.usuarios ua ON i.usuario_asignado_id = ua.id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      // Cursor: Solo traer registros DESPUÉS del último ID visto
      if (cursor) {
        query += ` AND i.id > $${paramCount}`;
        params.push(parseInt(cursor));
        paramCount++;
      }

      // PASO 3: Aplicar filtro por coordinación si es coordinador
      if (role === 'coordinador' && coordinacion_id) {
        query += ` AND i.coordinacion_id = $${paramCount}`;
        params.push(coordinacion_id);
        paramCount++;
      }

      // Filtros opcionales
      if (otherFilters.estatus_validacion) {
        query += ` AND i.estatus_validacion = $${paramCount}`;
        params.push(otherFilters.estatus_validacion);
        paramCount++;
      }

      if (otherFilters.es_oficial_siia !== undefined) {
        query += ` AND i.es_oficial_siia = $${paramCount}`;
        params.push(otherFilters.es_oficial_siia);
        paramCount++;
      }

      // Búsqueda en múltiples campos
      if (otherFilters.search) {
        query += ` AND (
          i.marca ILIKE $${paramCount} OR 
          i.modelo ILIKE $${paramCount} OR 
          i.numero_serie ILIKE $${paramCount} OR
          i.numero_patrimonio ILIKE $${paramCount} OR
          i.folio ILIKE $${paramCount} OR
          i.descripcion ILIKE $${paramCount} OR
          c.nombre ILIKE $${paramCount}
        )`;
        params.push(`%${otherFilters.search}%`);
        paramCount++;
      }

      // Filtros adicionales de estado
      if (otherFilters.estado) {
        query += ` AND i.estado = $${paramCount}`;
        params.push(otherFilters.estado);
        paramCount++;
      }

      if (otherFilters.estado_uso) {
        query += ` AND i.estado_uso = $${paramCount}`;
        params.push(otherFilters.estado_uso);
        paramCount++;
      }

      if (otherFilters.es_local !== undefined) {
        query += ` AND i.es_local = $${paramCount}`;
        params.push(otherFilters.es_local);
        paramCount++;
      }

      if (otherFilters.es_investigacion !== undefined) {
        query += ` AND i.es_investigacion = $${paramCount}`;
        params.push(otherFilters.es_investigacion);
        paramCount++;
      }

      if (otherFilters.tipo_inventario) {
        query += ` AND i.tipo_inventario = $${paramCount}`;
        params.push(otherFilters.tipo_inventario);
        paramCount++;
      }

      // ---------------------------------------------------------
      // PASO 4: QUERY DE CONTEO (Total con filtros, sin paginación)
      // ---------------------------------------------------------
      let countQuery = `
        SELECT COUNT(*) 
        FROM public.inventario i
        LEFT JOIN public.coordinaciones c ON i.coordinacion_id = c.id
        WHERE 1=1
      `;
      const countParams = [];
      let countParamCount = 1;

      // Aplicar mismos filtros al countQuery (copiar lógica de arriba)
      if (role === 'coordinador' && coordinacion_id) {
        countQuery += ` AND i.coordinacion_id = $${countParamCount}`;
        countParams.push(coordinacion_id);
        countParamCount++;
      }
      if (otherFilters.estatus_validacion) {
        countQuery += ` AND i.estatus_validacion = $${countParamCount}`;
        countParams.push(otherFilters.estatus_validacion);
        countParamCount++;
      }
      if (otherFilters.es_oficial_siia !== undefined) {
        countQuery += ` AND i.es_oficial_siia = $${countParamCount}`;
        countParams.push(otherFilters.es_oficial_siia);
        countParamCount++;
      }
      if (otherFilters.search) {
        countQuery += ` AND (
          i.marca ILIKE $${countParamCount} OR 
          i.modelo ILIKE $${countParamCount} OR 
          i.numero_serie ILIKE $${countParamCount} OR
          i.numero_patrimonio ILIKE $${countParamCount} OR
          i.folio ILIKE $${countParamCount} OR
          i.descripcion ILIKE $${countParamCount} OR
          c.nombre ILIKE $${countParamCount}
        )`;
        countParams.push(`%${otherFilters.search}%`);
        countParamCount++;
      }
      if (otherFilters.estado) {
        countQuery += ` AND i.estado = $${countParamCount}`;
        countParams.push(otherFilters.estado);
        countParamCount++;
      }
      if (otherFilters.estado_uso) {
        countQuery += ` AND i.estado_uso = $${countParamCount}`;
        countParams.push(otherFilters.estado_uso);
        countParamCount++;
      }
      if (otherFilters.es_local !== undefined) {
        countQuery += ` AND i.es_local = $${countParamCount}`;
        countParams.push(otherFilters.es_local);
        countParamCount++;
      }
      if (otherFilters.es_investigacion !== undefined) {
        countQuery += ` AND i.es_investigacion = $${countParamCount}`;
        countParams.push(otherFilters.es_investigacion);
        countParamCount++;
      }

      if (otherFilters.tipo_inventario) {
        countQuery += ` AND i.tipo_inventario = $${countParamCount}`;
        countParams.push(otherFilters.tipo_inventario);
        countParamCount++;
      }

      // Ejecutar conteo
      const countResult = await client.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      // ---------------------------------------------------------
      // PASO 5: EJECUTAR QUERY PAGINADO
      // ---------------------------------------------------------

      // Ordenar por ID para cursor consistente
      query += ` ORDER BY i.id ASC`;

      // Si hay limit, usar paginación. Si no hay limit (búsqueda), traer todos
      if (limit) {
        const numericLimit = parseInt(limit);
        query += ` LIMIT $${paramCount}`;
        params.push(numericLimit + 1); // +1 para detectar si hay más

        const result = await client.query(query, params);

        // Detectar si hay más registros
        const hasMore = result.rows.length > numericLimit;
        const data = hasMore ? result.rows.slice(0, numericLimit) : result.rows;
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

        return {
          success: true,
          data,
          pagination: {
            nextCursor,
            hasMore,
            limit: numericLimit,
            count: data.length, // Registros en esta página
            total: totalCount   // Total global con filtros
          }
        };
      } else {
        const result = await client.query(query, params);

        return {
          success: true,
          data: result.rows,
          pagination: {
            nextCursor: null,
            hasMore: false,
            limit: null,
            count: result.rows.length,
            total: totalCount
          }
        };
      }

    } catch (error) {
      console.error('Error en getInventory:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Crear nuevo activo de inventario
   * RLS valida automáticamente que el usuario tenga permiso sobre la coordinación
   */
  async createInventoryItem(userId, data) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await this.setUserContext(client, userId);

      // Validación: El usuario debe tener acceso a la coordinación
      const userCheck = await client.query(`
        SELECT u.role, c.id as coordinacion_id
        FROM public.usuarios u
        LEFT JOIN public.coordinaciones c ON u.dependencia_id = c.dependencia_id
        WHERE u.id = $1
      `, [userId]);

      if (userCheck.rowCount === 0) {
        throw new Error('Usuario no encontrado');
      }

      const { role, coordinacion_id } = userCheck.rows[0];

      // Si es coordinador, forzar su coordinación
      if (role === 'coordinador') {
        data.coordinacion_id = coordinacion_id;
      }

      // Validación: Si no es admin, no puede modificar datos fiscales en estado validado
      if (role !== 'admin' && data.estatus_validacion === 'validado') {
        const camposFiscalesRequeridos = ['costo', 'factura', 'uuid'];
        const faltantes = camposFiscalesRequeridos.filter(campo => !data[campo]);

        if (faltantes.length > 0) {
          throw new Error(`Campos fiscales requeridos para validar: ${faltantes.join(', ')}`);
        }
      }

      const query = `
        INSERT INTO public.inventario (
          marca, modelo, numero_serie, numero_patrimonio,
          coordinacion_id, dependencia_id, ubicacion,
          estado, descripcion, tipo_bien, comentarios, estado_uso,
          costo, cog, uuid, factura, fondo, cuenta_por_pagar,
          empleado_resguardante_id, usuario_asignado_id, numero_resguardo_interno,
          estatus_validacion, es_oficial_siia, es_local, es_investigacion,
          fecha_adquisicion, vida_util_anios, garantia_meses, proveedor,
          tipo_inventario, imagenes, registro_patrimonial, registro_interno,
          ubicacion_id, ubicacion_especifica, responsable_entrega_id,
          elaboro_nombre, fecha_elaboracion, ures_asignacion, recurso, ur,
          id_patrimonio, clave_patrimonial, numero_inventario,
          ures_gasto, ejercicio, solicitud_compra, idcon, usu_asig,
          fecha_registro, fecha_asignacion, numero_empleado
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
          $30, $31, $32, $33, $34, $35, $36, $37, $38, $39,
          $40, $41, $42, $43, $44, $45, $46, $47, $48, $49,
          $50, $51, $52
        )
        RETURNING *
      `;

      const values = [
        data.marca,
        data.modelo,
        data.numero_serie || null,
        data.numero_patrimonio || null,
        data.coordinacion_id,
        data.dependencia_id || null,
        data.ubicacion,
        data.estado || 'buena',
        data.descripcion || null,
        data.tipo_bien,
        data.comentarios || null,
        data.estado_uso || 'operativo',
        data.costo || null,
        data.cog || null,
        data.uuid || null,
        data.factura || null,
        data.fondo || null,
        data.cuenta_por_pagar || null,
        data.empleado_resguardante_id || null,
        data.usuario_asignado_id || null,
        data.numero_resguardo_interno || null,
        data.estatus_validacion || 'borrador',
        data.es_oficial_siia || false,
        data.es_local !== undefined ? data.es_local : true,
        data.es_investigacion || false,
        (data.fecha_adquisicion && data.fecha_adquisicion !== '' && data.fecha_adquisicion !== 'null') ? data.fecha_adquisicion : null,
        data.vida_util_anios || 5,
        data.garantia_meses || null,
        data.proveedor || null,
        data.tipo_inventario || null,
        data.imagenes ? JSON.stringify(data.imagenes) : '[]',
        data.registro_patrimonial || null,
        data.registro_interno || null,
        data.ubicacion_id || null,
        data.ubicacion_especifica || null,
        data.responsable_entrega_id || null,
        data.elaboro_nombre || null,
        data.fecha_elaboracion || null,
        data.ures_asignacion || null,
        data.recurso || null,
        data.ur || null,
        data.id_patrimonio || null,
        data.clave_patrimonial || null,
        data.numero_inventario || null,
        // Eliminado descripcion_bien (data.descripcion ya se usa en $9)
        data.ures_gasto || null,
        data.ejercicio || null,
        data.solicitud_compra || null,
        data.idcon || null,
        data.usu_asig || null,
        data.fecha_registro || null,
        data.fecha_asignacion || null,
        data.numero_empleado || null
      ];

      const result = await client.query(query, values);

      await client.query('COMMIT');

      return {
        success: true,
        data: result.rows[0],
        message: 'Activo creado exitosamente'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en createInventoryItem:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Actualizar activo existente
   * RLS valida automáticamente permisos
   */
  async updateInventoryItem(userId, itemId, data) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await this.setUserContext(client, userId);

      // Verificar que el usuario tenga permiso (lo hará RLS)
      const checkQuery = `SELECT id FROM public.inventario WHERE id = $1`;
      const checkResult = await client.query(checkQuery, [itemId]);

      if (checkResult.rowCount === 0) {
        throw new Error('Activo no encontrado o sin permisos');
      }

      // Construir UPDATE dinámico
      console.log('📝 Datos recibidos para actualizar:', JSON.stringify(data, null, 2));
      const fields = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = [
        'marca', 'modelo', 'numero_serie', 'numero_patrimonio',
        'ubicacion', 'estado', 'descripcion', 'tipo_bien', 'comentarios', 'estado_uso',
        'costo', 'cog', 'uuid', 'factura', 'fondo', 'cuenta_por_pagar',
        'empleado_resguardante_id', 'usuario_asignado_id', 'numero_resguardo_interno',
        'estatus_validacion', 'es_oficial_siia', 'es_local', 'es_investigacion',
        'fecha_adquisicion', 'vida_util_anios', 'garantia_meses', 'proveedor', 'observaciones_tecnicas',
        'coordinacion_id',
        // Nuevos campos Master
        'tipo_inventario', 'imagenes', 'registro_patrimonial', 'registro_interno',
        'ubicacion_id', 'ubicacion_especifica', 'responsable_entrega_id', 
        'elaboro_nombre', 'fecha_elaboracion', 'ures_asignacion', 'recurso', 'ur',
        'id_patrimonio', 'clave_patrimonial', 'numero_inventario', // descripcion_bien removed
        'ures_gasto', 'ejercicio', 'solicitud_compra', 'idcon', 'usu_asig',
        'fecha_registro', 'fecha_asignacion', 'numero_empleado'
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          let value = data[field];

          // Sanitizar valores: convertir strings vacíos y null-like a NULL
          if (value === '' || value === null || value === 'null' || value === 'undefined') {
            value = null;
          }


          // Para fechas, validar formato o convertir a NULL
          const dateFields = ['fecha_adquisicion', 'fecha_elaboracion', 'fecha_registro', 'fecha_asignacion'];
          if (dateFields.includes(field) && value !== null) {
            // Si no es una fecha válida, convertir a NULL
            const dateValue = new Date(value);
            if (isNaN(dateValue.getTime())) {
              value = null;
            }
          }


          // Para campos JSON, asegurar que sean string si es objeto/array
          if (field === 'imagenes' && value !== null && typeof value === 'object') {
            value = JSON.stringify(value);
          }

          fields.push(`${field} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      // Si no hay campos para actualizar
      if (fields.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'No se recibieron datos para actualizar' };
      }

      // Añadir ID al final
      values.push(itemId);

      // Ejecutar UPDATE
      const query = `
        UPDATE public.inventario 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      console.log('🔍 Query SQL:', query);
      console.log('🔍 Valores:', values);

      const result = await client.query(query, values);

      await client.query('COMMIT');

      return {
        success: true,
        data: result.rows[0],
        message: 'Activo actualizado exitosamente'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en updateInventoryItem:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Eliminar activo (soft delete cambiando estado)
   */
  async deleteInventoryItem(userId, itemId) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await this.setUserContext(client, userId);

      // Soft delete: cambiar estado a 'de_baja'
      const query = `
        UPDATE public.inventario 
        SET estado_uso = 'de_baja', 
            fecha_baja = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(query, [itemId]);

      if (result.rowCount === 0) {
        throw new Error('Activo no encontrado o sin permisos');
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Activo dado de baja exitosamente'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en deleteInventoryItem:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener estadísticas del inventario (respeta RLS)
   */
  async getInventoryStats(userId) {
    const client = await this.pool.connect();

  }

  /**
   * Obtener un activo por ID (respeta RLS)
   */
  async getInventoryById(userId, itemId) {
    const client = await this.pool.connect();
    try {
      console.log(`getInventoryById called with userId=${userId}, itemId=${itemId}`);
      await this.setUserContext(client, userId);

      const query = `
        SELECT i.*, c.nombre AS coordinacion_nombre
        FROM public.inventario i
        LEFT JOIN public.coordinaciones c ON i.coordinacion_id = c.id
        WHERE i.id = $1
        LIMIT 1
      `;

      const result = await client.query(query, [itemId]);
      console.log('getInventoryById SQL returned rows:', result.rowCount);
      if (result.rowCount === 0) return null;

      // Parse imagenes if present
      const item = result.rows[0];
      try {
        if (item.imagenes && typeof item.imagenes === 'string') {
          item.imagenes = JSON.parse(item.imagenes);
        }
      } catch (e) {
        console.warn('Warning: could not parse imagenes JSON for item', itemId, e.message);
      }

      return item;
    } catch (error) {
      console.error('Error en getInventoryById:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getInventoryStats(userId) {
    const client = await this.pool.connect();

    try {
      await this.setUserContext(client, userId);

      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE estatus_validacion = 'validado') as validados,
          COUNT(*) FILTER (WHERE estatus_validacion = 'borrador') as borradores,
          COUNT(*) FILTER (WHERE estado_uso = 'operativo') as operativos,
          COUNT(*) FILTER (WHERE estado_uso = 'en_reparacion') as en_reparacion,
          COUNT(*) FILTER (WHERE es_oficial_siia = true) as oficial_siia,
          COALESCE(SUM(costo), 0) as valor_total,
          COALESCE(SUM(valor_actual), 0) as valor_actual_total
        FROM public.inventario
      `;

      const result = await client.query(query);

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      console.error('Error en getInventoryStats:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new InventoryService();

// =====================================================
// EJEMPLO DE USO EN EL CONTROLADOR
// Archivo: server/src/controllers/inventoryController.js
// =====================================================

/*
const inventoryService = require('../services/inventoryService');

exports.getInventory = async (req, res) => {
  try {
    const userId = req.user.id; // Del middleware de autenticación
    const filters = req.query;
    
    const result = await inventoryService.getInventory(userId, filters);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.createInventory = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;
    
    const result = await inventoryService.createInventoryItem(userId, data);
    
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};
*/

module.exports = InventoryService;
