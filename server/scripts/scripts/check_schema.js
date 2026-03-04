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

const checkSchema = async () => {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'empleados' 
            AND column_name IN ('tipo', 'estatus', 'subtipo_administrativo', 'unidad_responsable', 'telefono')
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
};

checkSchema();
