// =====================================================
// SERVICIO: Load Testing
// Archivo: server/src/services/loadtest.service.js
// =====================================================

const { faker } = require('@faker-js/faker');
const { Worker } = require('worker_threads');
const path = require('path');
const autocannon = require('autocannon');
const db = require('../config/database');

class LoadTestService {
  constructor() {
    this.activeTests = new Map();
    this.metrics = {
      responseTime: [],
      throughput: [],
      errors: [],
      activeUsers: 0
    };
  }

  /**
   * Genera datos de prueba para empleados
   */
  async generateEmployeeData(count) {
    const employees = [];
    const tipos = ['docente', 'administrativo'];
    const unidades = ['231', '231-1', '231-2', '231-3'];
    const subtipos = ['Administrativo de Base', 'Administrativo de Apoyo'];

    // Obtener IDs reales de dependencias
    const depResult = await db.query('SELECT id FROM dependencias LIMIT 10');
    const dependenciaIds = depResult.rows.length > 0 
      ? depResult.rows.map(r => r.id) 
      : [null]; // Si no hay dependencias, usar null

    for (let i = 0; i < count; i++) {
      const tipo = faker.helpers.arrayElement(tipos);
      const employee = {
        nombre: faker.person.firstName(),
        apellido_paterno: faker.person.lastName(),
        apellido_materno: faker.person.lastName(),
        email: `test.${faker.internet.email()}`,
        rfc: `TEST${faker.string.alphanumeric(9).toUpperCase()}`,
        telefono: faker.string.numeric(10), // Exactamente 10 dígitos
        tipo: tipo,
        estatus: 'activo',
        activo: true,
        fecha_nacimiento: faker.date.birthdate({ min: 25, max: 65, mode: 'age' }),
        genero: faker.helpers.arrayElement(['M', 'F']),
        unidad_responsable: faker.helpers.arrayElement(unidades),
        subtipo_administrativo: tipo === 'administrativo' ? faker.helpers.arrayElement(subtipos) : null,
        dependencia_id: faker.helpers.arrayElement(dependenciaIds)
      };
      employees.push(employee);
    }
    return employees;
  }

  /**
   * Genera datos de prueba para inventario
   */
  async generateInventoryData(count) {
    const inventory = [];
    const tipos = ['Equipo de Cómputo', 'Mobiliario', 'Equipo de Oficina', 'Vehículo'];
    const estados = ['disponible', 'en_uso', 'mantenimiento'];
    const stages = ['COMPLETO', 'FISCAL', 'FISICO', 'EN_TRANSITO'];

    // Obtener IDs reales de dependencias y coordinaciones
    const depResult = await db.query('SELECT id FROM dependencias LIMIT 10');
    const coordResult = await db.query('SELECT id FROM coordinaciones LIMIT 20');
    
    const dependenciaIds = depResult.rows.length > 0 
      ? depResult.rows.map(r => r.id) 
      : [null];
    const coordinacionIds = coordResult.rows.length > 0 
      ? coordResult.rows.map(r => r.id) 
      : [null];

    for (let i = 0; i < count; i++) {
      const item = {
        folio: `TEST-${faker.string.alphanumeric(8).toUpperCase()}`,
        descripcion: faker.commerce.productDescription(),
        tipo: faker.helpers.arrayElement(tipos),
        numero_serie: `SN-TEST-${faker.string.alphanumeric(10).toUpperCase()}`,
        marca: faker.company.name(),
        modelo: faker.vehicle.model(),
        estado: faker.helpers.arrayElement(estados),
        stage: faker.helpers.arrayElement(stages),
        proveedor: faker.company.name(),
        fecha_compra: faker.date.past({ years: 5 }),
        costo: faker.number.float({ min: 1000, max: 50000, precision: 0.01 }),
        dependencia_id: faker.helpers.arrayElement(dependenciaIds),
        coordinacion_id: faker.helpers.arrayElement(coordinacionIds)
      };
      inventory.push(item);
    }
    return inventory;
  }

  /**
   * Inserta datos de prueba en la base de datos usando BULK INSERT
   */
  async insertTestData(table, count) {
    const startTime = Date.now();
    let insertedCount = 0;
    let errors = [];

    try {
      const batchSize = 1000; // Insertar en lotes de 1000
      const totalBatches = Math.ceil(count / batchSize);

      if (table === 'empleados') {
        for (let batch = 0; batch < totalBatches; batch++) {
          const currentBatchSize = Math.min(batchSize, count - (batch * batchSize));
          const employees = await this.generateEmployeeData(currentBatchSize);
          
          // Construir query de inserción masiva
          const values = [];
          const params = [];
          let paramIndex = 1;

          employees.forEach((emp) => {
            const rowParams = [
              emp.nombre, emp.apellido_paterno, emp.apellido_materno, emp.email,
              emp.rfc, emp.telefono, emp.tipo, emp.estatus, emp.activo,
              emp.fecha_nacimiento, emp.genero, emp.unidad_responsable,
              emp.subtipo_administrativo, emp.dependencia_id
            ];
            
            const placeholders = rowParams.map(() => `$${paramIndex++}`).join(', ');
            values.push(`(${placeholders})`);
            params.push(...rowParams);
          });

          const query = `
            INSERT INTO empleados (
              nombre, apellido_paterno, apellido_materno, email, rfc, telefono,
              tipo, estatus, activo, fecha_nacimiento, genero, unidad_responsable,
              subtipo_administrativo, dependencia_id
            ) VALUES ${values.join(', ')}
          `;

          try {
            await db.query(query, params);
            insertedCount += currentBatchSize;
            console.log(`Batch ${batch + 1}/${totalBatches}: ${insertedCount}/${count} empleados insertados`);
          } catch (err) {
            errors.push({ batch, error: err.message });
            console.error(`Error en batch ${batch}:`, err.message);
          }
        }
      } else if (table === 'inventario') {
        for (let batch = 0; batch < totalBatches; batch++) {
          const currentBatchSize = Math.min(batchSize, count - (batch * batchSize));
          const items = await this.generateInventoryData(currentBatchSize);
          
          // Construir query de inserción masiva
          const values = [];
          const params = [];
          let paramIndex = 1;

          items.forEach((item) => {
            const rowParams = [
              item.folio, item.descripcion, item.tipo, item.numero_serie,
              item.marca, item.modelo, item.estado, item.stage, item.proveedor,
              item.fecha_compra, item.costo, item.dependencia_id,
              item.coordinacion_id
            ];
            
            const placeholders = rowParams.map(() => `$${paramIndex++}`).join(', ');
            values.push(`(${placeholders})`);
            params.push(...rowParams);
          });

          const query = `
            INSERT INTO inventario (
              folio, descripcion, tipo_bien, numero_serie, marca, modelo,
              estado, stage, proveedor, fecha_compra, costo,
              dependencia_id, coordinacion_id
            ) VALUES ${values.join(', ')}
          `;

          try {
            await db.query(query, params);
            insertedCount += currentBatchSize;
            console.log(`Batch ${batch + 1}/${totalBatches}: ${insertedCount}/${count} items insertados`);
          } catch (err) {
            errors.push({ batch, error: err.message });
            console.error(`Error en batch ${batch}:`, err.message);
          }
        }
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        table,
        requested: count,
        inserted: insertedCount,
        failed: count - insertedCount,
        duration: `${duration}ms`,
        durationSeconds: (duration / 1000).toFixed(2),
        throughput: `${(insertedCount / (duration / 1000)).toFixed(2)} records/sec`,
        batches: totalBatches,
        errors: errors.slice(0, 10) // Solo primeros 10 errores
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        inserted: insertedCount,
        errors
      };
    }
  }

  /**
   * Genera usuarios de prueba para simulación
   */
  async generateTestUsers(count) {
    const bcrypt = require('bcryptjs');
    const users = [];

    for (let i = 0; i < count; i++) {
      const email = `testuser${i}_${Date.now()}@test.com`;
      const password = 'Test123456';
      const hashedPassword = await bcrypt.hash(password, 10);

      try {
        const query = `
          INSERT INTO usuarios (email, password, nombre, apellido_paterno, role, activo)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, email
        `;
        const result = await db.query(query, [
          email,
          hashedPassword,
          faker.person.firstName(),
          faker.person.lastName(),
          'usuario',
          true
        ]);

        users.push({
          id: result.rows[0].id,
          email: result.rows[0].email,
          password: password // Contraseña sin hash para usar en login
        });
      } catch (err) {
        console.error('Error creating test user:', err.message);
      }
    }

    return users;
  }

  /**
   * Simula usuarios concurrentes haciendo peticiones
   */
  async simulateConcurrentUsers(config) {
    const {
      userCount = 10,
      duration = 30,
      requestsPerSecond = 10,
      targetUrl = 'http://localhost:5000'
    } = config;

    const testId = `test_${Date.now()}`;
    const metrics = {
      testId,
      startTime: new Date(),
      userCount,
      duration,
      requestsPerSecond,
      results: null,
      status: 'running'
    };

    this.activeTests.set(testId, metrics);

    try {
      // Generar usuarios de prueba
      console.log(`Generando ${userCount} usuarios de prueba...`);
      const testUsers = await this.generateTestUsers(userCount);

      // Autenticar usuarios y obtener tokens
      console.log('Autenticando usuarios...');
      const tokens = await this.authenticateUsers(testUsers, targetUrl);

      // Ejecutar prueba de carga con autocannon
      console.log('Iniciando simulación de carga...');
      const instance = autocannon({
        url: `${targetUrl}/api/employees`,
        connections: userCount,
        duration: duration,
        pipelining: 1,
        requests: [
          {
            method: 'GET',
            path: '/api/employees',
            headers: {
              'Authorization': `Bearer ${tokens[0]}`, // Rotar tokens
              'Content-Type': 'application/json'
            }
          },
          {
            method: 'GET',
            path: '/api/inventory',
            headers: {
              'Authorization': `Bearer ${tokens[0]}`,
              'Content-Type': 'application/json'
            }
          }
        ]
      });

      return new Promise((resolve, reject) => {
        autocannon.track(instance, { renderProgressBar: false });

        instance.on('done', (results) => {
          metrics.results = {
            requests: {
              total: results.requests.total,
              average: results.requests.average,
              mean: results.requests.mean,
              stddev: results.requests.stddev,
              min: results.requests.min,
              max: results.requests.max,
              p50: results.latency.p50,
              p75: results.latency.p75,
              p90: results.latency.p90,
              p99: results.latency.p99
            },
            latency: {
              average: results.latency.mean,
              min: results.latency.min,
              max: results.latency.max,
              p50: results.latency.p50,
              p75: results.latency.p75,
              p90: results.latency.p90,
              p95: results.latency.p95,
              p99: results.latency.p99
            },
            throughput: {
              average: results.throughput.average,
              mean: results.throughput.mean,
              total: results.throughput.total
            },
            errors: results.errors,
            timeouts: results.timeouts,
            duration: results.duration,
            finish: new Date()
          };
          metrics.status = 'completed';
          this.activeTests.set(testId, metrics);
          resolve(metrics);
        });

        instance.on('error', (err) => {
          metrics.status = 'failed';
          metrics.error = err.message;
          this.activeTests.set(testId, metrics);
          reject(err);
        });
      });
    } catch (error) {
      metrics.status = 'failed';
      metrics.error = error.message;
      this.activeTests.set(testId, metrics);
      throw error;
    }
  }

  /**
   * Autentica usuarios de prueba y obtiene tokens JWT
   */
  async authenticateUsers(users, baseUrl) {
    const axios = require('axios');
    const tokens = [];

    for (const user of users) {
      try {
        const response = await axios.post(`${baseUrl}/api/auth/login`, {
          email: user.email,
          password: user.password
        });
        tokens.push(response.data.token);
      } catch (err) {
        console.error(`Error authenticating user ${user.email}:`, err.message);
      }
    }

    return tokens;
  }

  /**
   * Obtiene métricas del test activo
   */
  getMetrics(testId) {
    if (testId) {
      return this.activeTests.get(testId);
    }
    return Array.from(this.activeTests.values());
  }

  /**
   * Limpia todos los datos de prueba
   */
  async cleanupTestData() {
    const results = {
      usuarios: 0,
      empleados: 0,
      inventario: 0,
      errors: []
    };

    try {
      // Eliminar usuarios de prueba (preservar admin)
      const usersResult = await db.query(`
        DELETE FROM usuarios 
        WHERE email LIKE '%test%' 
        AND role != 'admin'
        RETURNING id
      `);
      results.usuarios = usersResult.rowCount;

      // Eliminar empleados de prueba
      const employeesResult = await db.query(`
        DELETE FROM empleados 
        WHERE email LIKE '%test%' 
        OR rfc LIKE 'TEST%'
        RETURNING id
      `);
      results.empleados = employeesResult.rowCount;

      // Eliminar inventario de prueba
      const inventoryResult = await db.query(`
        DELETE FROM inventario 
        WHERE folio LIKE 'TEST%'
        RETURNING id
      `);
      results.inventario = inventoryResult.rowCount;

      return {
        success: true,
        deleted: results,
        message: `Eliminados: ${results.usuarios} usuarios, ${results.empleados} empleados, ${results.inventario} items de inventario`
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        deleted: results
      };
    }
  }

  /**
   * Obtiene estadísticas del sistema
   */
  async getSystemStats() {
    try {
      const stats = {
        database: {},
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date()
      };

      // Estadísticas de la base de datos
      const dbStats = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM usuarios) as total_usuarios,
          (SELECT COUNT(*) FROM empleados) as total_empleados,
          (SELECT COUNT(*) FROM inventario) as total_inventario,
          (SELECT COUNT(*) FROM usuarios WHERE email LIKE '%test%') as test_usuarios,
          (SELECT COUNT(*) FROM empleados WHERE email LIKE '%test%' OR rfc LIKE 'TEST%') as test_empleados,
          (SELECT COUNT(*) FROM inventario WHERE folio LIKE 'TEST%') as test_inventario
      `);

      stats.database = dbStats.rows[0];

      return stats;
    } catch (error) {
      throw new Error(`Error getting system stats: ${error.message}`);
    }
  }
}

module.exports = new LoadTestService();
