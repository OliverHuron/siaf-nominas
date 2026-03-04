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

const checkInvConstraints = async () => {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT conname, contype, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'public.inventario'::regclass
        `);
        console.table(res.rows);
        
        console.log('Checking indexes on inventory...');
        const resIndex = await client.query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'inventario'
        `);
        console.table(resIndex.rows);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
};

checkInvConstraints();
