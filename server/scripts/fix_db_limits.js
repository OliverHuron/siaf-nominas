const { Pool } = require('pg');
const path = require('path');
// Intentar cargar .env desde el directorio actual (server)
require('dotenv').config({ path: path.join(__dirname, '../.env') }); 

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'siaf_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234', // Hardcoded fallback based on file view
});

const fixLimits = async () => {
    const client = await pool.connect();
    try {
        const viewDef = `
 CREATE OR REPLACE VIEW public.v_control_firmas AS
 SELECT e.id AS empleado_id,
    e.nombre,
    e.apellido_paterno,
    e.apellido_materno,
    e.rfc,
    e.tipo,
    e.subtipo_administrativo,
    e.unidad_responsable,
    e.dependencia_id,
    d.nombre AS dependencia_nombre,
    cn.id AS concepto_id,
    cn.nombre AS concepto_nombre,
    ecn.activo AS concepto_activo,
    ecn.firmado,
    ecn.fecha_firma,
    ecn.periodo_aplicacion,
    ecn.observaciones
   FROM empleados e
     LEFT JOIN dependencias d ON e.dependencia_id = d.id
     LEFT JOIN empleado_concepto_nomina ecn ON e.id = ecn.empleado_id
     LEFT JOIN conceptos_nomina cn ON ecn.concepto_nomina_id = cn.id
  WHERE e.activo = true
  ORDER BY e.apellido_paterno, e.apellido_materno, e.nombre, cn.nombre;
`;

        const commands = [
            // 1. Drop view dependent on columns
            'DROP VIEW IF EXISTS v_control_firmas',

            // 2. Drop constraints
            'ALTER TABLE empleados DROP CONSTRAINT IF EXISTS empleados_subtipo_administrativo_check',
            'ALTER TABLE empleados DROP CONSTRAINT IF EXISTS empleados_unidad_responsable_check',
            
            // 3. Alter columns
            'ALTER TABLE empleados ALTER COLUMN tipo TYPE varchar(255)',
            'ALTER TABLE empleados ALTER COLUMN estatus TYPE varchar(255)',
            'ALTER TABLE empleados ALTER COLUMN subtipo_administrativo TYPE varchar(255)',
            'ALTER TABLE empleados ALTER COLUMN unidad_responsable TYPE varchar(255)',
            'ALTER TABLE empleados ALTER COLUMN telefono TYPE varchar(50)',

            // 4. Recreate view
            viewDef
        ];

        for (const cmd of commands) {
            console.log(`🛠 Ejecutando: ${cmd.substring(0, 50)}...`);
            await client.query(cmd);
        }

        console.log('✅ ¡Actualización de esquema completada con éxito!');

    } catch (e) {
        console.error('❌ Error actualizando la base de datos:', e.message);
        console.error('Code:', e.code);
        console.error('Detail:', e.detail);
    } finally {
        client.release();
        pool.end();
    }
};

fixLimits();
