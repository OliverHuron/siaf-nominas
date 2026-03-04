const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
// Ajustar path a .env según ubicación del script (server/scripts -> server/.env)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
  const sqlPath = path.join(__dirname, '../../database/migrations/006_patrimonio_master_updates.sql');
  console.log(`Reading migration file from: ${sqlPath}`);
  
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Executing SQL Migration...');
    await pool.query(sql);
    console.log('Migration 006 executed successfully!');
  } catch (err) {
    console.error('Error executing migration:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
