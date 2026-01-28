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

const checkDependencies = async () => {
    const client = await pool.connect();
    try {
        console.log('Checking constraints...');
        let res = await client.query("SELECT conname, contype FROM pg_constraint WHERE conname LIKE '%firmas%'");
        console.table(res.rows);

        console.log('Checking triggers...');
        res = await client.query("SELECT tgname FROM pg_trigger WHERE tgname LIKE '%firmas%'");
        console.table(res.rows);

        console.log('Checking indexes...');
        res = await client.query("SELECT indexname FROM pg_indexes WHERE indexname LIKE '%firmas%'");
        console.table(res.rows);

        console.log('Checking policies...');
        res = await client.query("SELECT polname FROM pg_policy WHERE polname LIKE '%firmas%'");
        console.table(res.rows);

        console.log('Checking views...');
        res = await client.query("SELECT table_name FROM information_schema.views WHERE table_name LIKE '%firmas%'");
        console.table(res.rows);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
};

checkDependencies();
