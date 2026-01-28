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

const getViewDef = async () => {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT pg_get_viewdef('v_control_firmas', true) as definition
        `);
        const fs = require('fs');
        fs.writeFileSync(path.join(__dirname, '../view_def.sql'), res.rows[0].definition);
        console.log('View definition saved to view_def.sql');
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
};

getViewDef();
