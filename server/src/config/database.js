const { Pool } = require('pg');
const path = require('path');

// 1. Forzamos a dotenv a leer el archivo .env de la ruta exacta
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// 2. Imprimimos qué está leyendo Node.js (seguro, sin texto plano)
console.log('--- 🔍 DEBUG CONEXIÓN DB ---');
console.log('HOST:', process.env.DB_HOST);
console.log('USER:', process.env.DB_USER);
console.log('PASS:', process.env.DB_PASSWORD ? `SÍ EXISTE (${process.env.DB_PASSWORD.length} caracteres)` : 'UNDEFINED ❌');
console.log('----------------------------');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: false,
  // Configuración de codificación para caracteres especiales
  client_encoding: 'UTF8'
});

pool.on('connect', (client) => {
  console.log('✅ Conectado a PostgreSQL');
  // Configurar codificación UTF-8 para cada conexión
  client.query('SET client_encoding TO "UTF8"');
});

pool.on('error', (err) => {
  console.error('❌ Error en PostgreSQL:', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
