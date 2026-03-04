const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkColumns() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'inventario'
      ORDER BY column_name;
    `);
    console.log('Todas las columnas:', res.rows.map(r => r.column_name).join(', '));

    const check = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'inventario'
        AND column_name IN ('folio', 'tipo', 'tipo_bien');
    `);
    console.log('Columnas clave encontradas:', check.rows.map(r => r.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkColumns();
