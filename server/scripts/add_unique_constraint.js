const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); 

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'siaf_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234', 
});

const addUnique = async () => {
    const client = await pool.connect();
    try {
        console.log('🧹 Eliminando duplicados antes de agregar restricción...');
        
        // Delete duplicates keeping the one with max ID
        await client.query(`
            DELETE FROM empleados a USING (
                SELECT MIN(id) as id, rfc
                FROM empleados 
                GROUP BY rfc HAVING COUNT(*) > 1
            ) b
            WHERE a.rfc = b.rfc 
            AND a.id <> b.id
        `);
        console.log('✅ Duplicados eliminados.');

        console.log('🛠 Agregando restricción UNIQUE a columna rfc...');
        await client.query('ALTER TABLE empleados ADD CONSTRAINT employees_rfc_unique UNIQUE (rfc)');
        
        console.log('✅ Restricción agregada con éxito.');

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        client.release();
        pool.end();
    }
};

addUnique();
