// =====================================================
// CONTROLADOR: Load Testing
// Archivo: server/src/controllers/loadtest.controller.js
// =====================================================

const loadTestService = require('../services/loadtest.service');

/**
 * Inserta datos de prueba en masa
 */
const insertTestData = async (req, res) => {
  try {
    const { table, count } = req.body;

    // Validaciones
    if (!table || !['empleados', 'inventario'].includes(table)) {
      return res.status(400).json({
        success: false,
        message: 'Tabla inválida. Debe ser "empleados" o "inventario"'
      });
    }

    if (!count || count < 1 || count > 10000000) {
      return res.status(400).json({
        success: false,
        message: 'Cantidad inválida. Debe ser entre 1 y 10,000,000'
      });
    }

    const result = await loadTestService.insertTestData(table, parseInt(count));
    
    res.json(result);
  } catch (error) {
    console.error('Error in insertTestData:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Simula usuarios concurrentes
 */
const simulateConcurrentUsers = async (req, res) => {
  try {
    const { 
      userCount = 10, 
      duration = 30, 
      requestsPerSecond = 10,
      targetUrl 
    } = req.body;

    // Validaciones
    if (userCount < 1 || userCount > 200) {
      return res.status(400).json({
        success: false,
        message: 'Cantidad de usuarios debe ser entre 1 y 200'
      });
    }

    if (duration < 5 || duration > 300) {
      return res.status(400).json({
        success: false,
        message: 'Duración debe ser entre 5 y 300 segundos'
      });
    }

    // Determinar URL base
    const baseUrl = targetUrl || `${req.protocol}://${req.get('host')}`;

    const config = {
      userCount: parseInt(userCount),
      duration: parseInt(duration),
      requestsPerSecond: parseInt(requestsPerSecond),
      targetUrl: baseUrl
    };

    // Iniciar simulación (asíncrona)
    loadTestService.simulateConcurrentUsers(config)
      .then(result => {
        console.log('Load test completed:', result.testId);
      })
      .catch(err => {
        console.error('Load test failed:', err);
      });

    // Responder inmediatamente con ID del test
    res.json({
      success: true,
      message: 'Simulación iniciada',
      testId: `test_${Date.now()}`,
      config
    });
  } catch (error) {
    console.error('Error in simulateConcurrentUsers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtiene métricas de un test
 */
const getMetrics = async (req, res) => {
  try {
    const { testId } = req.query;
    const metrics = loadTestService.getMetrics(testId);

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error in getMetrics:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtiene el estado de un test en ejecución
 */
const getTestStatus = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = loadTestService.getMetrics(testId);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test no encontrado'
      });
    }

    res.json({
      success: true,
      test
    });
  } catch (error) {
    console.error('Error in getTestStatus:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Limpia todos los datos de prueba
 */
const cleanupTestData = async (req, res) => {
  try {
    const result = await loadTestService.cleanupTestData();
    res.json(result);
  } catch (error) {
    console.error('Error in cleanupTestData:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtiene estadísticas del sistema
 */
const getSystemStats = async (req, res) => {
  try {
    const stats = await loadTestService.getSystemStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error in getSystemStats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  insertTestData,
  simulateConcurrentUsers,
  getMetrics,
  getTestStatus,
  cleanupTestData,
  getSystemStats
};
