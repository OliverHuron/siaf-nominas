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

const checkIds = async () => {
    const client = await pool.connect();
    try {
        const coords = await client.query('SELECT id FROM coordinaciones LIMIT 10');
        const deps = await client.query('SELECT id FROM dependencias LIMIT 10');

        console.log('✅ IDs de Coordinaciones válidos:', coords.rows.map(r => r.id));
        console.log('✅ IDs de Dependencias válidos:', deps.rows.map(r => r.id));
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
};

checkIds();
