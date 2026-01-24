const db = require('../config/database');
const realtime = require('../utils/realtime');

// List all spaces as a flat or hierarchical response
const getAllSpaces = async (req, res) => {
  try {
    const { type, parent_id } = req.query;
    let query = `SELECT * FROM spaces WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (type) {
      query += ` AND type = $${idx}`;
      params.push(type);
      idx++;
    }
    if (parent_id) {
      query += ` AND parent_id = $${idx}`;
      params.push(parent_id);
      idx++;
    }
    query += ' ORDER BY name';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getAllSpaces error', error);
    res.status(500).json({ success: false, message: 'Error al obtener espacios' });
  }
};

const getSpaceById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM spaces WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Espacio no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('getSpaceById error', error);
    res.status(500).json({ success: false, message: 'Error al obtener espacio' });
  }
};

// Create or update a space
const createSpace = async (req, res) => {
  try {
    const { name, parent_id, type, metadata, assigned_quadrant } = req.body;
    const result = await db.query(
      `INSERT INTO spaces (name, parent_id, type, metadata, assigned_quadrant) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, parent_id || null, type, metadata || {}, assigned_quadrant || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('createSpace error', error);
    res.status(500).json({ success: false, message: 'Error al crear espacio' });
  }
};

// Start an audit for a space
const startAudit = async (req, res) => {
  try {
    const { id } = req.params; // space id
    const started_by = req.user ? req.user.id : null;
    const result = await db.query(
      `INSERT INTO space_audits (space_id, started_by, status) VALUES ($1,$2,'in_progress') RETURNING *`,
      [id, started_by]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('startAudit error', error);
    res.status(500).json({ success: false, message: 'Error al iniciar auditoría' });
  }
};

// Receive batch scans
const scanBatch = async (req, res) => {
  try {
    const { id } = req.params; // space id
    const { audit_id, scans, template } = req.body; // scans: [{codigo, estado, inventory_id, metadata}]
    if (!audit_id || !Array.isArray(scans)) return res.status(400).json({ success: false, message: 'audit_id y scans son requeridos' });

    const insertResults = [];
    const requestUserId = req.user ? req.user.id : null;

    // resolve human-readable space name for ubicacion
    let spaceName = `space:${id}`;
    try {
      const spRes = await db.query('SELECT name FROM spaces WHERE id = $1 LIMIT 1', [id]);
      if (spRes.rows.length > 0 && spRes.rows[0].name) spaceName = spRes.rows[0].name;
    } catch (snErr) {
      console.error('could not load space name', snErr);
    }

    // For each scan: optionally create/update inventory using provided template (per-scan template overrides global)
    for (const s of scans) {
      const effectiveTemplate = s.template || template || null;
      let inventoryId = s.inventory_id || null;

      // If no inventory_id, try to find existing inventory by serie or patrimonio
      if (!inventoryId && s.codigo) {
        const found = await db.query(`SELECT id FROM inventario WHERE numero_serie = $1 OR numero_patrimonio = $1 LIMIT 1`, [s.codigo]);
        if (found.rows.length > 0) {
          inventoryId = found.rows[0].id;
        }
      }

      // If we found an existing inventory and a template is provided, update it with template fields
      if (inventoryId && effectiveTemplate) {
        try {
          const marca = effectiveTemplate.brand || effectiveTemplate.marca || null;
          const modelo = effectiveTemplate.model || effectiveTemplate.modelo || null;
          const estado = effectiveTemplate.state || effectiveTemplate.estado || null;
          const descripcion = effectiveTemplate.description || effectiveTemplate.descripcion || null;
          const numero_serie = s.serie || null;
          const numero_patrimonio = (!s.serie || s.serie === '') ? s.codigo : (s.codigo && s.codigo != s.serie ? s.codigo : null);
          // Prefer explicit location set in the template, otherwise use resolved space name
          const ubicacion = (effectiveTemplate.location && String(effectiveTemplate.location).trim().length > 0) ? effectiveTemplate.location : spaceName;

          await db.query(
            `UPDATE inventario SET marca = $1, modelo = $2, estado = $3, descripcion = $4, numero_serie = $5, numero_patrimonio = $6, ubicacion = $7 WHERE id = $8`,
            [marca, modelo, estado, descripcion, numero_serie, numero_patrimonio, ubicacion, inventoryId]
          );
        } catch (ue) {
          console.error('inventory update error', ue);
        }
      }

      // If still no inventory and we have a template, insert a new inventory record
      if (!inventoryId && effectiveTemplate) {
        try {
          const marca = effectiveTemplate.brand || effectiveTemplate.marca || null;
          const modelo = effectiveTemplate.model || effectiveTemplate.modelo || null;
          const estado = effectiveTemplate.state || effectiveTemplate.estado || null;
          const descripcion = effectiveTemplate.description || effectiveTemplate.descripcion || null;
          // If template provides an explicit location, use it; otherwise use resolved space name
          const ubicacion = (effectiveTemplate.location && String(effectiveTemplate.location).trim().length > 0) ? effectiveTemplate.location : spaceName;
          // Determine serie vs patrimonio placement
          const numero_serie = s.serie || null;
          const numero_patrimonio = (!s.serie || s.serie === '' ) ? s.codigo : (s.codigo && s.codigo != s.serie ? s.codigo : null);

          const invRes = await db.query(
            `INSERT INTO inventario (marca, modelo, estado, descripcion, numero_serie, numero_patrimonio, ubicacion) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
            [marca, modelo, estado, descripcion, numero_serie, numero_patrimonio, ubicacion]
          );
          inventoryId = invRes.rows[0].id;
        } catch (ie) {
          console.error('inventory insert error', ie);
        }
      }

      // finally insert the audit scan record
      const insertRes = await db.query(
        `INSERT INTO space_audit_scans (audit_id, inventory_id, codigo, estado, metadata, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [audit_id, inventoryId || null, s.codigo || null, s.estado || 'found', s.metadata || {}, requestUserId]
      );
      insertResults.push(insertRes.rows[0]);
    }

    // broadcast partial update
    realtime.broadcast('space.scan', { space_id: id, audit_id, inserted: insertResults.length });

    res.json({ success: true, inserted: insertResults.length });
  } catch (error) {
    console.error('scanBatch error', error);
    res.status(500).json({ success: false, message: 'Error al procesar batch' });
  }
};

// Close audit and return summary (missing items detection basic example)
const closeAudit = async (req, res) => {
  try {
    const { id } = req.params; // space id
    const { audit_id } = req.body;
    if (!audit_id) return res.status(400).json({ success: false, message: 'audit_id es requerido' });

    // Simple summary: count scanned items and compare against inventory in that space
    const scanned = await db.query('SELECT * FROM space_audit_scans WHERE audit_id = $1', [audit_id]);
    const inventory = await db.query(
      `SELECT id, numero_serie, numero_patrimonio, ubicacion
       FROM inventario WHERE ubicacion = $1 OR ubicacion = $2`,
      [`space:${id}`, id]
    );

    const scannedCodes = new Set(scanned.rows.map(r => r.codigo).filter(Boolean));

    // Items expected but not scanned
    const missing = inventory.rows.filter(inv => !scannedCodes.has(inv.numero_serie) && !scannedCodes.has(inv.numero_patrimonio)).map(i => ({ id: i.id, numero_serie: i.numero_serie, numero_patrimonio: i.numero_patrimonio }));

    // Suggestions: scanned items that belong to other spaces
    const suggested = [];
    for (const s of scanned.rows) {
      if (!s.codigo) continue;
      // find inventory entry by serie or patrimonio
      const invRes = await db.query(`SELECT id, ubicacion FROM inventario WHERE numero_serie = $1 OR numero_patrimonio = $1 LIMIT 1`, [s.codigo]);
      if (invRes.rows.length > 0) {
        const inv = invRes.rows[0];
        // if ubicacion indicates different space
        const loc = inv.ubicacion || '';
        if (loc && loc !== `space:${id}` && loc !== String(id)) {
          // create suggested transfer
          const fromSpace = loc.startsWith('space:') ? loc.split(':')[1] : null;
          const tr = await db.query(`INSERT INTO transfers (inventory_id, from_space, to_space, status, created_at) VALUES ($1,$2,$3,'suggested', now()) RETURNING *`, [inv.id, fromSpace, id]);
          suggested.push(tr.rows[0]);
        }
      }
    }

    const summary = { scanned: scanned.rows.length, inventory_count: inventory.rows.length, missing, suggested };

    // Update audit status with summary
    await db.query("UPDATE space_audits SET status='closed', closed_at = now(), summary = $1 WHERE id = $2", [JSON.stringify(summary), audit_id]);

    // broadcast audit closed
    realtime.broadcast('space.audit.closed', { space_id: id, audit_id, summary });

    // If request asks for CSV (download), generate CSV content and return as attachment
    if (req.query && req.query.download === 'csv') {
      const { writeFileSync, mkdirSync, existsSync } = require('fs');
      const path = require('path');
      const rows = [['codigo','estado','marca','modelo','numero_serie','numero_patrimonio']];
      for (const sc of scanned.rows) {
        // Try to enrich with inventory data
        const inv = await db.query(`SELECT marca, modelo, numero_serie, numero_patrimonio FROM inventario WHERE numero_serie = $1 OR numero_patrimonio = $1 LIMIT 1`, [sc.codigo]);
        const info = inv.rows[0] || {};
        rows.push([sc.codigo, sc.estado || '', info.marca || '', info.modelo || '', info.numero_serie || '', info.numero_patrimonio || '']);
      }
      const csv = rows.map(r => r.map(cell => `"${(cell||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
      const reportsDir = path.join(__dirname, '..', '..', 'uploads', 'reports');
      if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
      const filename = `audit_${audit_id}_${Date.now()}.csv`;
      const filepath = path.join(reportsDir, filename);
      writeFileSync(filepath, csv);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    res.json({ success: true, summary });
  } catch (error) {
    console.error('closeAudit error', error);
    res.status(500).json({ success: false, message: 'Error al cerrar auditoría' });
  }
};

// Assign quadrant to a space
const assignQuadrant = async (req, res) => {
  try {
    const { id } = req.params;
    const { quadrant } = req.body;
    if (!quadrant) return res.status(400).json({ success: false, message: 'quadrant is required' });
    const result = await db.query('UPDATE spaces SET assigned_quadrant = $1 WHERE id = $2 RETURNING *', [quadrant, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Espacio no encontrado' });
    realtime.broadcast('space.updated', { space_id: id, assigned_quadrant: quadrant });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('assignQuadrant error', error);
    res.status(500).json({ success: false, message: 'Error al asignar cuadrante' });
  }
};

// NOTE: autoCotejo endpoint removed from server routing if desired. Keep implementation
// here if you intend to re-enable later. Currently the route has been removed
// from `spaces.routes.js` but the function was retained for archive purposes.

// Obtener inventario asociado a un espacio
const getInventoryForSpace = async (req, res) => {
  try {
    const { id } = req.params;

    // Prefer almacenado como ubicacion = 'space:<id>'
    const bySpaceId = await db.query('SELECT * FROM inventario WHERE ubicacion = $1', [`space:${id}`]);

    if (bySpaceId.rows.length > 0) {
      return res.json({ success: true, data: bySpaceId.rows });
    }

    // Fallback: buscar por nombre del space
    const spaceRes = await db.query('SELECT name FROM spaces WHERE id = $1', [id]);
    if (spaceRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Espacio no encontrado' });
    const name = spaceRes.rows[0].name;
    const byName = await db.query('SELECT * FROM inventario WHERE ubicacion ILIKE $1', [`%${name}%`]);
    res.json({ success: true, data: byName.rows });
  } catch (error) {
    console.error('getInventoryForSpace error', error);
    res.status(500).json({ success: false, message: 'Error al obtener inventario del espacio' });
  }
};

module.exports = {
  getAllSpaces,
  getSpaceById,
  createSpace,
  startAudit,
  scanBatch,
  closeAudit,
  assignQuadrant,
  getInventoryForSpace
};

