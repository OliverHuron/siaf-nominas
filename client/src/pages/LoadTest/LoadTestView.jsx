// =====================================================
// Vista Principal de Load Testing
// Archivo: client/src/pages/LoadTest/LoadTestView.jsx
// =====================================================

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { 
  FaDatabase, FaUsers, FaChartLine, FaTrash, FaPlay, FaStop,
  FaServer, FaClock, FaMemory, FaTachometerAlt, FaDownload
} from 'react-icons/fa';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './LoadTestView.css';

const LoadTestView = () => {
  const [config, setConfig] = useState({
    table: 'empleados',
    recordCount: 100,
    userCount: 10,
    duration: 30,
    requestsPerSecond: 10
  });

  const [isRunning, setIsRunning] = useState(false);
  const [testType, setTestType] = useState(null);
  const [results, setResults] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [currentTestId, setCurrentTestId] = useState(null);

  useEffect(() => {
    loadSystemStats();
    const interval = setInterval(loadSystemStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemStats = async () => {
    try {
      const response = await api.get('/api/loadtest/system-stats');
      setSystemStats(response.data.stats);
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const handleInsertData = async () => {
    if (isRunning) return;
    
    // Validate count
    const count = parseInt(config.recordCount);
    console.log('Count value:', count, 'Type:', typeof count, 'Original:', config.recordCount);
    
    if (isNaN(count) || count < 1 || count > 10000000) {
      toast.error('❌ Cantidad inválida. Debe ser entre 1 y 10,000,000');
      return;
    }

    setIsRunning(true);
    setTestType('insert');
    setResults(null);

    try {
      const payload = {
        table: config.table,
        count: count
      };
      console.log('Sending payload:', payload);
      
      const response = await api.post('/api/loadtest/insert-data', payload);

      console.log('Insert results:', response.data);
      setResults(response.data);
      toast.success(`✅ ${response.data.inserted.toLocaleString()} registros insertados`);
      loadSystemStats();
    } catch (error) {
      console.error('Error response:', error.response?.data);
      toast.error(`❌ Error: ${error.response?.data?.message || error.message}`);
      setResults({ success: false, error: error.response?.data?.message || error.message });
    } finally {
      setIsRunning(false);
      setTestType(null);
    }
  };

  const handleSimulateUsers = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setTestType('simulate');
    setResults(null);

    try {
      const response = await api.post('/api/loadtest/simulate-users', {
        userCount: config.userCount,
        duration: config.duration,
        requestsPerSecond: config.requestsPerSecond
      });

      setCurrentTestId(response.data.testId);
      toast.info('🚀 Simulación iniciada...');

      const pollInterval = setInterval(async () => {
        try {
          const metricsResponse = await api.get(`/api/loadtest/metrics?testId=${response.data.testId}`);
          const testMetrics = metricsResponse.data.metrics;

          if (testMetrics && testMetrics.status === 'completed') {
            clearInterval(pollInterval);
            setResults(testMetrics);
            setIsRunning(false);
            setTestType(null);
            toast.success('✅ Simulación completada');
          } else if (testMetrics && testMetrics.status === 'failed') {
            clearInterval(pollInterval);
            setResults(testMetrics);
            setIsRunning(false);
            setTestType(null);
            toast.error('❌ Simulación fallida');
          }
        } catch (err) {
          console.error('Error polling metrics:', err);
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (isRunning) {
          setIsRunning(false);
          setTestType(null);
        }
      }, (config.duration + 10) * 1000);

    } catch (error) {
      toast.error(`❌ Error: ${error.response?.data?.message || error.message}`);
      setResults({ success: false, error: error.message });
      setIsRunning(false);
      setTestType(null);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('¿Eliminar TODOS los datos de prueba?')) return;

    try {
      const response = await api.delete('/api/loadtest/cleanup');
      toast.success(response.data.message);
      setResults(null);
      loadSystemStats();
    } catch (error) {
      toast.error(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleExportResults = () => {
    if (!results) return;
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loadtest-results-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="loadtest-container">
      <div className="loadtest-header">
        <div>
          <h1><FaChartLine /> Pruebas de Carga</h1>
          <p className="subtitle">Sistema de testing y métricas de rendimiento</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={loadSystemStats}>
            <FaClock /> Actualizar
          </button>
          {results && (
            <button className="btn-outline" onClick={handleExportResults}>
              <FaDownload /> Exportar JSON
            </button>
          )}
          <button className="btn-danger" onClick={handleCleanup} disabled={isRunning}>
            <FaTrash /> Limpiar Datos
          </button>
        </div>
      </div>

      {/* System Stats */}
      {systemStats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon primary">
              <FaDatabase />
            </div>
            <div className="stat-content">
              <h3>{(parseInt(systemStats.database.total_empleados) + parseInt(systemStats.database.total_inventario)).toLocaleString()}</h3>
              <p>Registros Totales</p>
              <span className="stat-subtitle">
                {(parseInt(systemStats.database.test_empleados) + parseInt(systemStats.database.test_inventario)).toLocaleString()} de prueba
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              <FaMemory />
            </div>
            <div className="stat-content">
              <h3>{(systemStats.memory.heapUsed / 1024 / 1024).toFixed(0)} MB</h3>
              <p>Memoria Usada</p>
              <span className="stat-subtitle">
                de {(systemStats.memory.heapTotal / 1024 / 1024).toFixed(0)} MB total
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              <FaClock />
            </div>
            <div className="stat-content">
              <h3>{Math.floor(systemStats.uptime / 60)}</h3>
              <p>Minutos Activo</p>
              <span className="stat-subtitle">Uptime del servidor</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <FaServer />
            </div>
            <div className="stat-content">
              <h3>{systemStats.database.total_usuarios}</h3>
              <p>Usuarios Sistema</p>
              <span className="stat-subtitle">{systemStats.database.test_usuarios} de prueba</span>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      <div className="config-panel">
        <div className="config-section">
          <h3><FaDatabase /> Inserción de Datos</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Tabla</label>
              <select 
                value={config.table} 
                onChange={(e) => setConfig({...config, table: e.target.value})}
                disabled={isRunning}
              >
                <option value="empleados">Empleados</option>
                <option value="inventario">Inventario</option>
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad de Registros</label>
              <input 
                type="text" 
                pattern="[0-9]*"
                placeholder="Máx: 10,000,000"
                value={config.recordCount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value === '') {
                    setConfig({...config, recordCount: 100});
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num <= 10000000) {
                      setConfig({...config, recordCount: num});
                    }
                  }
                }}
                disabled={isRunning}
              />
            </div>
            <button 
              className="btn-primary"
              onClick={handleInsertData}
              disabled={isRunning}
            >
              {isRunning && testType === 'insert' ? (
                <>⏳ Insertando...</>
              ) : (
                <><FaPlay /> Insertar Datos</>
              )}
            </button>
          </div>
        </div>

        <div className="config-section">
          <h3><FaUsers /> Simulación de Usuarios Concurrentes</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Usuarios Simultáneos</label>
              <input 
                type="number" 
                min="1" 
                max="200" 
                value={config.userCount}
                onChange={(e) => setConfig({...config, userCount: parseInt(e.target.value)})}
                disabled={isRunning}
              />
            </div>
            <div className="form-group">
              <label>Duración (segundos)</label>
              <input 
                type="number" 
                min="5" 
                max="300" 
                value={config.duration}
                onChange={(e) => setConfig({...config, duration: parseInt(e.target.value)})}
                disabled={isRunning}
              />
            </div>
            <div className="form-group">
              <label>Requests/segundo</label>
              <input 
                type="number" 
                min="1" 
                max="100" 
                value={config.requestsPerSecond}
                onChange={(e) => setConfig({...config, requestsPerSecond: parseInt(e.target.value)})}
                disabled={isRunning}
              />
            </div>
            <button 
              className="btn-success"
              onClick={handleSimulateUsers}
              disabled={isRunning}
            >
              {isRunning && testType === 'simulate' ? (
                <>⏳ Simulando...</>
              ) : (
                <><FaPlay /> Simular Usuarios</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="results-panel">
          <h2>📊 Resultados del Test</h2>
          
          {results.success === false ? (
            <div className="error-message">
              <p>❌ Error: {results.error || results.message}</p>
            </div>
          ) : results.table ? (
            <div className="insert-results">
              <div className="metrics-grid">
                <div className="metric-card">
                  <h3>Insertados</h3>
                  <div className="metric-value success">{results.inserted.toLocaleString()}</div>
                  <div className="metric-label">de {results.requested.toLocaleString()} solicitados</div>
                </div>
                <div className="metric-card">
                  <h3>Duración</h3>
                  <div className="metric-value">{results.durationSeconds || (parseInt(results.duration) / 1000).toFixed(2)}s</div>
                  <div className="metric-label">{results.duration}</div>
                </div>
                <div className="metric-card">
                  <h3>Throughput</h3>
                  <div className="metric-value">{results.throughput}</div>
                  <div className="metric-label">velocidad de inserción</div>
                </div>
                <div className="metric-card">
                  <h3>Errores</h3>
                  <div className="metric-value error">{results.failed}</div>
                  <div className="metric-label">registros fallidos</div>
                </div>
                {results.batches && (
                  <div className="metric-card">
                    <h3>Batches</h3>
                    <div className="metric-value">{results.batches}</div>
                    <div className="metric-label">lotes de 1000</div>
                  </div>
                )}
              </div>

              {/* Charts Section */}
              <div className="charts-section">
                <div className="chart-container">
                  <h3> Tasa de Éxito</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Exitosos', value: results.inserted, color: '#10b981' },
                          { name: 'Fallidos', value: results.failed, color: '#ef4444' }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-container">
                  <h3>⏱️ Rendimiento</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        {
                          name: 'Métricas',
                          'Registros/seg': parseFloat(results.throughput.split(' ')[0]),
                          'Duración (s)': parseFloat(results.durationSeconds || (parseInt(results.duration) / 1000)),
                          'Batches': results.batches || 1
                        }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Registros/seg" fill="#3b82f6" />
                      <Bar dataKey="Duración (s)" fill="#f59e0b" />
                      <Bar dataKey="Batches" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : results.results ? (
            <div className="simulation-results">
              <div className="metrics-grid">
                <div className="metric-card">
                  <h3>Requests Totales</h3>
                  <div className="metric-value">{results.results.requests.total}</div>
                  <div className="metric-label">{results.results.requests.average.toFixed(2)}/s promedio</div>
                </div>
                <div className="metric-card">
                  <h3>Latencia Promedio</h3>
                  <div className="metric-value">{results.results.latency.average.toFixed(2)}</div>
                  <div className="metric-label">ms</div>
                </div>
                <div className="metric-card">
                  <h3>P95 Latencia</h3>
                  <div className="metric-value">{results.results.latency.p95}</div>
                  <div className="metric-label">ms (percentil 95)</div>
                </div>
                <div className="metric-card">
                  <h3>P99 Latencia</h3>
                  <div className="metric-value">{results.results.latency.p99}</div>
                  <div className="metric-label">ms (percentil 99)</div>
                </div>
                <div className="metric-card">
                  <h3>Throughput</h3>
                  <div className="metric-value">{(results.results.throughput.average / 1024).toFixed(2)}</div>
                  <div className="metric-label">KB/s</div>
                </div>
                <div className="metric-card">
                  <h3>Errores</h3>
                  <div className="metric-value error">{results.results.errors || 0}</div>
                  <div className="metric-label">{results.results.timeouts || 0} timeouts</div>
                </div>
              </div>

              <div className="latency-breakdown">
                <h3>Distribución de Latencia</h3>
                <div className="breakdown-grid">
                  <div className="breakdown-item">
                    <span className="breakdown-label">Mínimo</span>
                    <span className="breakdown-value">{results.results.latency.min} ms</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">P50 (Mediana)</span>
                    <span className="breakdown-value">{results.results.latency.p50} ms</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">P75</span>
                    <span className="breakdown-value">{results.results.latency.p75} ms</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">P90</span>
                    <span className="breakdown-value">{results.results.latency.p90} ms</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">P95</span>
                    <span className="breakdown-value">{results.results.latency.p95} ms</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">P99</span>
                    <span className="breakdown-value">{results.results.latency.p99} ms</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Máximo</span>
                    <span className="breakdown-value">{results.results.latency.max} ms</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default LoadTestView;
