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

const listViews = async () => {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
};

listViews();
