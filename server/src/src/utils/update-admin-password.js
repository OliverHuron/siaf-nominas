// Script para generar hash de contraseña y actualizar usuario admin
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function updateAdminPassword() {
  console.log('=================================');
  console.log('Actualizando contraseña de Admin');
  console.log('=================================\n');

  // Generar hash de la contraseña "admin123"
  const password = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  console.log('Contraseña:', password);
  console.log('Hash generado:', hashedPassword);
  console.log('');

  // Conectar a la base de datos
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'siaf_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'tu_password',
  });

  try {
    // Actualizar la contraseña del usuario admin
    const result = await pool.query(
      "UPDATE usuarios SET password = $1 WHERE email = 'admin@siaf.com' RETURNING id, email, nombre",
      [hashedPassword]
    );

    if (result.rows.length > 0) {
      console.log('✓ Contraseña actualizada exitosamente');
      console.log('Usuario:', result.rows[0].email);
      console.log('');
      console.log('Credenciales:');
      console.log('  Email: admin@siaf.com');
      console.log('  Contraseña: admin123');
    } else {
      console.log('✗ Usuario admin no encontrado');
      console.log('Creando usuario admin...');
      
      const createResult = await pool.query(
        "INSERT INTO usuarios (email, password, nombre, apellido_paterno, role, activo) VALUES ($1, $2, 'Admin', 'Sistema', 'admin', true) RETURNING id, email",
        ['admin@siaf.com', hashedPassword]
      );
      
      console.log('✓ Usuario admin creado exitosamente');
      console.log('Usuario:', createResult.rows[0].email);
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await pool.end();
  }

  console.log('\n=================================');
  console.log('Proceso completado');
  console.log('=================================');
}

// Cargar variables de entorno
require('dotenv').config();

// Ejecutar
updateAdminPassword().catch(console.error);
