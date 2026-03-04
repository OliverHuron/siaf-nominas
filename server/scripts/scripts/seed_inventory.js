const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: false
});

// Datos de prueba acordes a las constraints SQL
const marcas = ['HP', 'Dell', 'Lenovo', 'Apple', 'Samsung', 'Canon', 'Epson', 'Logitech', 'Sony', 'Asus'];
const equipos = ['Laptop', 'Desktop', 'Monitor', 'Impresora', 'Teclado', 'Mouse', 'Proyector', 'Tablet', 'Scanner', 'Cámara'];
const condiciones = ['buena', 'regular', 'mala'];

// Constraint: estado_uso IN ('operativo', 'en_reparacion', 'de_baja', 'obsoleto', 'resguardo_temporal')
const estadosUso = ['operativo', 'en_reparacion', 'de_baja', 'obsoleto', 'resguardo_temporal'];

// Constraint: estatus_validacion IN ('borrador', 'revision', 'validado', 'rechazado')
const estatusValidacion = ['borrador', 'revision', 'validado', 'rechazado'];

const ubicaciones = ['Laboratorio 1', 'Laboratorio 2', 'Oficina 101', 'Oficina 102', 'Almacén', 'Recepción', 'Sala de Juntas', 'Biblioteca'];
// IDs de coordinaciones válidas (Verificados: 1, 2, 3)
const coordinacionIds = [1, 2, 3];
const dependenciaIds = [1, 2, 3];

const BATCH_SIZE = 2000;
const TOTAL_RECORDS = 20000;

const seedInventory = async () => {
    const client = await pool.connect();
    try {
        console.log(`🚀 Iniciando inserción masiva de ${TOTAL_RECORDS} items de inventario...`);
        const startTime = Date.now();

        await client.query('BEGIN');

        // Obtener el último folio actual para empezar la secuencia
        const lastFolioRes = await client.query("SELECT folio FROM inventario WHERE folio LIKE 'INV-2026-%' ORDER BY folio DESC LIMIT 1");
        let currentSequence = 0;
        if (lastFolioRes.rows.length > 0) {
            const match = lastFolioRes.rows[0].folio.match(/INV-2026-(\d+)/);
            if (match) currentSequence = parseInt(match[1]);
        }

        console.log(`📝 Iniciando folios desde secuencia: ${currentSequence + 1}`);

        let currentBatchValues = [];
        let placeholders = [];
        let counter = 0;

        for (let i = 0; i < TOTAL_RECORDS; i++) {
            currentSequence++; // Incrementar secuencia para cada item
            const marca = marcas[Math.floor(Math.random() * marcas.length)];
            const tipo = equipos[Math.floor(Math.random() * equipos.length)];
            const modelo = `${tipo} ${marca} Series ${Math.floor(Math.random() * 1000)}`;
            // Garantizar unicidad usando timestamp y el índice del loop
            const serie = `SN-${Date.now()}-${i}-${Math.random().toString(36).substring(7).toUpperCase()}`;
            const patrimonio = `UMSNH-${Date.now()}-${i}`;
            const folio = `INV-2026-${String(currentSequence).padStart(3, '0')}`;

            const estado = condiciones[Math.floor(Math.random() * condiciones.length)];
            const estadoUso = estadosUso[Math.floor(Math.random() * estadosUso.length)];
            const ubicacion = ubicaciones[Math.floor(Math.random() * ubicaciones.length)];

            // Randomly assign coordination and dependency
            const coordId = coordinacionIds[Math.floor(Math.random() * coordinacionIds.length)];
            const depId = dependenciaIds[Math.floor(Math.random() * dependenciaIds.length)];
            const estatus = estatusValidacion[Math.floor(Math.random() * estatusValidacion.length)];

            // Values
            // ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            // marca, modelo, numero_serie, numero_patrimonio, coordinacion_id, dependencia_id, ubicacion, estado, tipo_bien, descripcion, estado_uso, costo, estatus_validacion, es_oficial_siia, es_local, folio

            const offset = currentBatchValues.length;
            placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16})`);

            currentBatchValues.push(
                marca,
                modelo,
                serie,
                patrimonio,
                coordId,
                depId,
                ubicacion,
                estado,
                tipo, // tipo_bien
                `Equipo ${tipo} ${marca} generado automáticamente`,
                estadoUso,
                (Math.random() * 20000 + 1000).toFixed(2), // Costo
                estatus, // estatus_validacion (antes era hardcoded 'sin_validar', lo cual violaba la constraint)
                Math.random() > 0.5, // es_oficial_siia
                Math.random() > 0.5, // es_local
                folio // Added folio
            );

            // Execute batch
            if ((i + 1) % BATCH_SIZE === 0 || i === TOTAL_RECORDS - 1) {
                const queryText = `
                    INSERT INTO inventario (
                        marca, modelo, numero_serie, numero_patrimonio,
                        coordinacion_id, dependencia_id, ubicacion,
                        estado, tipo_bien, descripcion, estado_uso,
                        costo, estatus_validacion, es_oficial_siia, es_local,
                        folio
                    ) VALUES ${placeholders.join(', ')}
                `;

                await client.query(queryText, currentBatchValues);

                counter += placeholders.length;
                console.log(`✅ ${counter} items insertados...`);

                currentBatchValues = [];
                placeholders = [];
            }
        }

        await client.query('COMMIT');

        const duration = (Date.now() - startTime) / 1000;
        console.log(`✨ Completado! ${TOTAL_RECORDS} items de inventario insertados en ${duration} segundos.`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error fatal:', error);
    } finally {
        client.release();
        pool.end();
    }
};

seedInventory();
