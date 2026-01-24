const pool = require('../config/database');

// Obtener asistencias de todos los empleados para un año con paginación por cursor
exports.getAttendancesByYear = async (req, res) => {
  try {
    const { anio } = req.params;
    const {
      cursor,
      limit, // Quitamos el default 100 aquí para detectar si viene o no
      search,
      unidad_responsable,
      subtipo_administrativo,
      activo,
      debe_quincenas
    } = req.query;
    const year = anio || new Date().getFullYear();

    console.log('🔍 [ASISTENCIAS] Request params:', { year, limit, search, cursor, activeFilters: { unidad_responsable, activo, debe_quincenas } });

    let whereConditions = [];
    let params = [year];
    let paramCount = 2;

    // Cursor: Solo traer registros DESPUÉS del último ID visto
    if (cursor) {
      whereConditions.push(`e.id > $${paramCount}`);
      params.push(parseInt(cursor));
      paramCount++;
    }

    // Search by employee name
    if (search) {
      whereConditions.push(`(
        LOWER(e.nombre || ' ' || e.apellido_paterno || ' ' || COALESCE(e.apellido_materno, '')) LIKE LOWER($${paramCount})
      )`);
      params.push(`%${search}%`);
      paramCount++;
    }

    // Filter by Unidad Responsable
    if (unidad_responsable) {
      whereConditions.push(`e.unidad_responsable = $${paramCount}`);
      params.push(unidad_responsable);
      paramCount++;
    }

    // Filter by Subtipo Administrativo
    if (subtipo_administrativo) {
      whereConditions.push(`e.subtipo_administrativo = $${paramCount}`);
      params.push(subtipo_administrativo);
      paramCount++;
    }

    // Filter by Activo status
    if (activo !== undefined && activo !== '') {
      const isActive = activo === 'true' || activo === '1';
      whereConditions.push(`e.activo = $${paramCount}`);
      params.push(isActive);
      paramCount++;
    }

    if (debe_quincenas === 'true') {
      whereConditions.push(`(
        a.enero_q1 = 'F' OR a.enero_q2 = 'F' OR
        a.febrero_q1 = 'F' OR a.febrero_q2 = 'F' OR
        a.marzo_q1 = 'F' OR a.marzo_q2 = 'F' OR
        a.abril_q1 = 'F' OR a.abril_q2 = 'F' OR
        a.mayo_q1 = 'F' OR a.mayo_q2 = 'F' OR
        a.junio_q1 = 'F' OR a.junio_q2 = 'F' OR
        a.julio_q1 = 'F' OR a.julio_q2 = 'F' OR
        a.agosto_q1 = 'F' OR a.agosto_q2 = 'F' OR
        a.septiembre_q1 = 'F' OR a.septiembre_q2 = 'F' OR
        a.octubre_q1 = 'F' OR a.octubre_q2 = 'F' OR
        a.noviembre_q1 = 'F' OR a.noviembre_q2 = 'F' OR
        a.diciembre_q1 = 'F' OR a.diciembre_q2 = 'F'
      )`);
    }

    const whereClause = whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ') : '';

    // Base query
    let query = `
      SELECT 
        e.id,
        e.nombre,
        e.apellido_paterno,
        e.apellido_materno,
        e.activo,
        e.unidad_responsable,
        e.subtipo_administrativo,
        a.anio,
        a.enero_q1, a.enero_q2,
        a.febrero_q1, a.febrero_q2,
        a.marzo_q1, a.marzo_q2,
        a.abril_q1, a.abril_q2,
        a.mayo_q1, a.mayo_q2,
        a.junio_q1, a.junio_q2,
        a.julio_q1, a.julio_q2,
        a.agosto_q1, a.agosto_q2,
        a.septiembre_q1, a.septiembre_q2,
        a.octubre_q1, a.octubre_q2,
        a.noviembre_q1, a.noviembre_q2,
        a.diciembre_q1, a.diciembre_q2
      FROM empleados e
      LEFT JOIN asistencias_quincenales a ON e.id = a.empleado_id AND a.anio = $1
      WHERE 1=1 ${whereClause}
    `;



    // Ordenar por ID para cursor consistente
    query += ` ORDER BY e.id ASC`;

    console.log('📝 [ASISTENCIAS] Query:', query);
    console.log('🔢 [ASISTENCIAS] Params:', params);

    // Si hay limit, usar paginación. Si no hay limit (o es undefined), traer todos.
    // NOTA: Si query.limit no viene, limit es undefined.
    // Pero espera, si NO enviamos limit desde frontend, queremos TODOS.
    // Si enviamos limit=100 (inicio), queremos paginación.

    // Si hay búsqueda O filtros, el frontend NO envía limit.
    // Si es carga inicial sin filtros, el frontend envía limit=100.

    // ---------------------------------------------------------
    // 1. QUERY DE CONTEO (Total con filtros, sin paginación/cursor)
    // ---------------------------------------------------------
    // Nota: Para el conteo NO usamos cláusula WHERE de cursor (e.id > X)
    // porque el conteo es sobre TODO el universo filtrado, no solo lo restante.
    // Reconstruimos condiciones para conteo:

    let countConditions = [];
    let countParams = [year];
    let countParamCount = 2; // $1 es year

    // Search
    if (search) {
      countConditions.push(`(
        LOWER(e.nombre || ' ' || e.apellido_paterno || ' ' || COALESCE(e.apellido_materno, '')) LIKE LOWER($${countParamCount})
      )`);
      countParams.push(`%${search}%`);
      countParamCount++;
    }
    // Unit Resp
    if (unidad_responsable) {
      countConditions.push(`e.unidad_responsable = $${countParamCount}`);
      countParams.push(unidad_responsable);
      countParamCount++;
    }
    // Subtipo
    if (subtipo_administrativo) {
      countConditions.push(`e.subtipo_administrativo = $${countParamCount}`);
      countParams.push(subtipo_administrativo);
      countParamCount++;
    }
    // Activo
    if (activo !== undefined && activo !== '') {
      const isActive = activo === 'true' || activo === '1';
      countConditions.push(`e.activo = $${countParamCount}`);
      countParams.push(isActive);
      countParamCount++;
    }

    if (debe_quincenas === 'true') {
      countConditions.push(`(
        a.enero_q1 = 'F' OR a.enero_q2 = 'F' OR
        a.febrero_q1 = 'F' OR a.febrero_q2 = 'F' OR
        a.marzo_q1 = 'F' OR a.marzo_q2 = 'F' OR
        a.abril_q1 = 'F' OR a.abril_q2 = 'F' OR
        a.mayo_q1 = 'F' OR a.mayo_q2 = 'F' OR
        a.junio_q1 = 'F' OR a.junio_q2 = 'F' OR
        a.julio_q1 = 'F' OR a.julio_q2 = 'F' OR
        a.agosto_q1 = 'F' OR a.agosto_q2 = 'F' OR
        a.septiembre_q1 = 'F' OR a.septiembre_q2 = 'F' OR
        a.octubre_q1 = 'F' OR a.octubre_q2 = 'F' OR
        a.noviembre_q1 = 'F' OR a.noviembre_q2 = 'F' OR
        a.diciembre_q1 = 'F' OR a.diciembre_q2 = 'F'
      )`);
    }

    const countWhereClause = countConditions.length > 0 ? 'AND ' + countConditions.join(' AND ') : '';

    let countQuery = `
      SELECT COUNT(*)
      FROM empleados e
      LEFT JOIN asistencias_quincenales a ON e.id = a.empleado_id AND a.anio = $1
      WHERE 1=1 ${countWhereClause}
    `;

    // Ejecutar conteo
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // ---------------------------------------------------------
    // 2. QUERY DE DATOS (Con paginación)
    // ---------------------------------------------------------

    if (limit) {
      query += ` LIMIT $${paramCount}`;
      const numericLimit = parseInt(limit);
      params.push(numericLimit + 1);

      const result = await pool.query(query, params);

      const hasMore = result.rows.length > numericLimit;
      const data = hasMore ? result.rows.slice(0, numericLimit) : result.rows;
      const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

      res.json({
        success: true,
        data,
        pagination: {
          nextCursor,
          hasMore,
          limit: numericLimit,
          count: data.length, // en esta pagina
          total: totalCount   // Total global con filtros
        }
      });
    } else {
      // Sin limit: traer todos los resultados
      const result = await pool.query(query, params);

      console.log(`✅ [ASISTENCIAS] Found ${result.rows.length} records (No Limit)`);

      // Post-filtering para "debe_quincenas" si es necesario y no estaba en SQL
      let data = result.rows;
      if (debe_quincenas === 'true') {
        // Implementar lógica si es compleja, por ahora devolvemos todo lo que filtró el WHERE
      }

      res.json({
        success: true,
        data: data,
        pagination: {
          nextCursor: null,
          hasMore: false,
          limit: null,
          count: data.length,
          total: totalCount
        }
      });
    }
  } catch (error) {
    console.error('Error al obtener asistencias:', error);
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
};

// Actualizar asistencia de una quincena específica
exports.updateAttendance = async (req, res) => {
  try {
    const { empleadoId, anio, mes, quincena, estado } = req.body;

    // Validar estado: A (Asistió), F (Falta), null (sin registrar)
    if (estado && !['A', 'F'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Use A (Asistió), F (Falta) o null' });
    }

    const columna = `${mes}_q${quincena}`;

    // Verificar si ya existe un registro para este empleado y año
    const existente = await pool.query(
      'SELECT id FROM asistencias_quincenales WHERE empleado_id = $1 AND anio = $2',
      [empleadoId, anio]
    );

    let result;
    if (existente.rows.length > 0) {
      // Actualizar registro existente
      result = await pool.query(`
        UPDATE asistencias_quincenales 
        SET ${columna} = $1, updated_at = CURRENT_TIMESTAMP
        WHERE empleado_id = $2 AND anio = $3
        RETURNING *
      `, [estado, empleadoId, anio]);
    } else {
      // Crear nuevo registro
      result = await pool.query(`
        INSERT INTO asistencias_quincenales (empleado_id, anio, ${columna})
        VALUES ($1, $2, $3)
        RETURNING *
      `, [empleadoId, anio, estado]);
    }

    res.json({
      success: true,
      message: 'Asistencia actualizada correctamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar asistencia:', error);
    res.status(500).json({ error: 'Error al actualizar asistencia' });
  }
};

// Obtener estadísticas de asistencias por empleado
exports.getAttendanceStats = async (req, res) => {
  try {
    const { anio } = req.params;
    const year = anio || new Date().getFullYear();

    const result = await pool.query(`
      SELECT 
        e.id,
        e.nombre,
        e.apellido_paterno,
        e.apellido_materno,
        (
          CASE WHEN enero_q1 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN enero_q2 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN febrero_q1 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN febrero_q2 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN marzo_q1 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN marzo_q2 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN abril_q1 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN abril_q2 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN mayo_q1 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN mayo_q2 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN junio_q1 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN junio_q2 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN julio_q1 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN julio_q2 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN agosto_q1 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN agosto_q2 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN septiembre_q1 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN septiembre_q2 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN octubre_q1 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN octubre_q2 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN noviembre_q1 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN noviembre_q2 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN diciembre_q1 = 'A' THEN 1 ELSE 0 END +
          CASE WHEN diciembre_q2 = 'A' THEN 1 ELSE 0 END
        ) as asistencias,
        (
          CASE WHEN enero_q1 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN enero_q2 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN febrero_q1 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN febrero_q2 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN marzo_q1 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN marzo_q2 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN abril_q1 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN abril_q2 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN mayo_q1 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN mayo_q2 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN junio_q1 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN junio_q2 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN julio_q1 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN julio_q2 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN agosto_q1 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN agosto_q2 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN septiembre_q1 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN septiembre_q2 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN octubre_q1 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN octubre_q2 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN noviembre_q1 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN noviembre_q2 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN diciembre_q1 = 'F' THEN 1 ELSE 0 END +
          CASE WHEN diciembre_q2 = 'F' THEN 1 ELSE 0 END
        ) as faltas
      FROM empleados e
      LEFT JOIN asistencias_quincenales a ON e.id = a.empleado_id AND a.anio = $1
      WHERE e.activo = true
      ORDER BY e.apellido_paterno, e.apellido_materno, e.nombre
    `, [year]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// Inicializar registros de asistencia para un año
exports.initializeYear = async (req, res) => {
  try {
    const { anio } = req.body;
    const year = anio || new Date().getFullYear();

    // Obtener todos los empleados activos que no tienen registro para este año
    const empleados = await pool.query(`
      SELECT e.id 
      FROM empleados e
      LEFT JOIN asistencias_quincenales a ON e.id = a.empleado_id AND a.anio = $1
      WHERE e.activo = true AND a.id IS NULL
    `, [year]);

    // Crear registros vacíos para cada empleado
    for (const empleado of empleados.rows) {
      await pool.query(`
        INSERT INTO asistencias_quincenales (empleado_id, anio)
        VALUES ($1, $2)
      `, [empleado.id, year]);
    }

    res.json({
      success: true,
      message: `Se inicializaron ${empleados.rows.length} registros para el año ${year}`
    });
  } catch (error) {
    console.error('Error al inicializar año:', error);
    res.status(500).json({ error: 'Error al inicializar año' });
  }
};
