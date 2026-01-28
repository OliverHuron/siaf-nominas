const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'inventario'
      ORDER BY column_name;
    `);
    
    console.log('--- COLUMNAS DE INVENTARIO ---');
    res.rows.forEach(r => {
      console.log(`${r.column_name} (${r.data_type})`);
    });
    console.log('------------------------------');

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkSchema();
