import React, { useState, useEffect } from 'react';
import { FaBoxes, FaUsers, FaFileAlt, FaExclamationTriangle, FaCheckCircle, FaClock, FaChartLine, FaArrowUp, FaArrowDown, FaTachometerAlt } from 'react-icons/fa';
import api from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    // Estado Actual
    inventoryCount: 0,
    inventoryDisponible: 0,
    inventoryEnUso: 0,
    inventoryMantenimiento: 0,
    employeeCount: 0,
    employeeActive: 0,
    
    // Solicitudes y Fichas
    requestsCount: 0,
    pendingRequests: 0,
    fichasTecnicasCount: 0,
    fichasPendientes: 0,
    fichasAprobadas: 0,
    fichasRechazadas: 0,
    
    // Tendencias (comparación con periodo anterior)
    inventoryTrend: 0,
    requestsTrend: 0,
    fichasTrend: 0,
    
    // Alertas críticas
    alertasCriticas: 0,
    solicitudesVencidas: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // Actualizar cada 5 minutos
    const interval = setInterval(loadStats, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const [inventory, employees, requests, fichasTecnicas] = await Promise.all([
        api.get('/api/inventory'),
        api.get('/api/employees'),
        api.get('/api/requests'),
        api.get('/api/fichas-tecnicas')
      ]);

      const inventoryData = inventory.data.data || [];
      const inventoryDisponible = inventoryData.filter(i => i.estado === 'disponible').length;
      const inventoryEnUso = inventoryData.filter(i => i.estado === 'en uso').length;
      const inventoryMantenimiento = inventoryData.filter(i => i.estado === 'mantenimiento').length;

      const pendingRequests = requests.data.data.filter(r => r.estado === 'pendiente').length;
      const fichas = fichasTecnicas.data.data || [];
      const fichasPendientes = fichas.filter(f => f.estado === 'pendiente' || !f.estado).length;
      const fichasAprobadas = fichas.filter(f => f.estado === 'aprobado').length;
      const fichasRechazadas = fichas.filter(f => f.estado === 'rechazado').length;

      // Calcular alertas críticas
      const solicitudesVencidas = requests.data.data.filter(r => {
        if (!r.fecha_creacion) return false;
        const diasPendiente = Math.floor((Date.now() - new Date(r.fecha_creacion)) / (1000 * 60 * 60 * 24));
        return r.estado === 'pendiente' && diasPendiente > 7;
      }).length;

      const alertasCriticas = inventoryMantenimiento + solicitudesVencidas + fichasPendientes;

      setStats({
        inventoryCount: inventoryData.length,
        inventoryDisponible,
        inventoryEnUso,
        inventoryMantenimiento,
        employeeCount: employees.data.data.length,
        employeeActive: employees.data.data.filter(e => e.estado === 'activo').length,
        requestsCount: requests.data.data.length,
        pendingRequests,
        fichasTecnicasCount: fichas.length,
        fichasPendientes,
        fichasAprobadas,
        fichasRechazadas,
        alertasCriticas,
        solicitudesVencidas,
        // Tendencias (simuladas por ahora, deberían venir del backend)
        inventoryTrend: 5.2,
        requestsTrend: -2.1,
        fichasTrend: 8.4
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Inventario Total',
      value: stats.inventoryCount,
      subtitle: `${stats.inventoryDisponible} disponibles`,
      icon: <FaBoxes />,
      color: '#3b82f6',
      trend: stats.inventoryTrend,
      status: stats.inventoryDisponible > stats.inventoryCount * 0.3 ? 'success' : 'warning'
    },
    {
      title: 'Alertas Críticas',
      value: stats.alertasCriticas,
      subtitle: 'Requieren atención',
      icon: <FaExclamationTriangle />,
      color: stats.alertasCriticas > 5 ? '#ef4444' : '#f59e0b',
      status: stats.alertasCriticas === 0 ? 'success' : 'error'
    },
    {
      title: 'Solicitudes Pendientes',
      value: stats.pendingRequests,
      subtitle: `${stats.solicitudesVencidas} vencidas`,
      icon: <FaClock />,
      color: '#f59e0b',
      trend: stats.requestsTrend,
      status: stats.solicitudesVencidas > 0 ? 'warning' : 'success'
    },
    {
      title: 'Eficiencia Aprobación',
      value: stats.fichasTecnicasCount > 0 
        ? `${Math.round((stats.fichasAprobadas / stats.fichasTecnicasCount) * 100)}%`
        : '0%',
      subtitle: `${stats.fichasAprobadas} aprobadas`,
      icon: <FaCheckCircle />,
      color: '#10b981',
      trend: stats.fichasTrend,
      status: (stats.fichasAprobadas / stats.fichasTecnicasCount) > 0.7 ? 'success' : 'warning'
    }
  ];

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard - SIAF</h1>
        <p className="dashboard-subtitle">
          <FaClock size={14} /> Última actualización: {new Date().toLocaleTimeString('es-MX')}
        </p>
      </div>

      {/* 1. ESTADO ACTUAL - ¿Cómo vamos? */}
      <div className="dashboard-status">
        {stats.alertasCriticas === 0 ? (
          <div className="status-banner success">
            <FaCheckCircle size={24} />
            <div>
              <h3>✓ Todo está bien</h3>
              <p>No hay alertas críticas. El sistema opera normalmente.</p>
            </div>
          </div>
        ) : (
          <div className="status-banner warning">
            <FaExclamationTriangle size={24} />
            <div>
              <h3>Atención requerida</h3>
              <p>{stats.alertasCriticas} elementos necesitan tu atención inmediata</p>
            </div>
          </div>
        )}
      </div>

      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`stat-card ${card.status || ''}`}
            style={{ borderLeftColor: card.color }}
          >
            <div className="stat-icon" style={{ backgroundColor: card.color }}>
              {card.icon}
            </div>
            <div className="stat-content">
              <h3>{card.value}</h3>
              <p>{card.title}</p>
              <span className="stat-subtitle">{card.subtitle}</span>
              {card.trend !== undefined && (
                <div className={`trend ${card.trend >= 0 ? 'up' : 'down'}`}>
                  {card.trend >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                  <span>{Math.abs(card.trend)}% vs mes anterior</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 2. ANÁLISIS DE DESVIACIONES - ¿Por qué está pasando? */}
      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="card">
            <div className="card-header">
              <h3>Estado del Inventario</h3>
              <span className="card-subtitle">Distribución actual</span>
            </div>
            <div className="inventory-breakdown">
              <div className="breakdown-item">
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill success" 
                    style={{ width: `${(stats.inventoryDisponible / stats.inventoryCount) * 100}%` }}
                  ></div>
                </div>
                <div className="breakdown-label">
                  <span className="label-text">Disponible</span>
                  <span className="label-value">{stats.inventoryDisponible} ({Math.round((stats.inventoryDisponible / stats.inventoryCount) * 100)}%)</span>
                </div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill info" 
                    style={{ width: `${(stats.inventoryEnUso / stats.inventoryCount) * 100}%` }}
                  ></div>
                </div>
                <div className="breakdown-label">
                  <span className="label-text">En Uso</span>
                  <span className="label-value">{stats.inventoryEnUso} ({Math.round((stats.inventoryEnUso / stats.inventoryCount) * 100)}%)</span>
                </div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill warning" 
                    style={{ width: `${(stats.inventoryMantenimiento / stats.inventoryCount) * 100}%` }}
                  ></div>
                </div>
                <div className="breakdown-label">
                  <span className="label-text">Mantenimiento</span>
                  <span className="label-value">{stats.inventoryMantenimiento} ({Math.round((stats.inventoryMantenimiento / stats.inventoryCount) * 100)}%)</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 3. ACCIÓN ESTRATÉGICA - ¿Qué debo hacer ahora? */}
          <div className="card">
            <div className="card-header">
              <h3>Acciones Prioritarias</h3>
              <span className="card-subtitle">Qué hacer hoy</span>
            </div>
            <div className="action-list">
              {stats.solicitudesVencidas > 0 && (
                <div className="action-item urgent">
                  <FaExclamationTriangle />
                  <div>
                    <strong>Revisar {stats.solicitudesVencidas} solicitudes vencidas</strong>
                    <p>Llevan más de 7 días pendientes</p>
                    <a href="/requests">Ver solicitudes →</a>
                  </div>
                </div>
              )}
              {stats.inventoryMantenimiento > 0 && (
                <div className="action-item warning">
                  <FaClock />
                  <div>
                    <strong>Atender {stats.inventoryMantenimiento} equipos en mantenimiento</strong>
                    <p>Verificar estado y programar reparaciones</p>
                    <a href="/inventory">Ver inventario →</a>
                  </div>
                </div>
              )}
              {stats.fichasPendientes > 0 && (
                <div className="action-item info">
                  <FaFileAlt />
                  <div>
                    <strong>Aprobar {stats.fichasPendientes} fichas técnicas</strong>
                    <p>En espera de revisión</p>
                    <a href="/fichas-tecnicas">Ver fichas →</a>
                  </div>
                </div>
              )}
              {stats.alertasCriticas === 0 && (
                <div className="action-item success">
                  <FaCheckCircle />
                  <div>
                    <strong>Sistema operando correctamente</strong>
                    <p>No hay acciones urgentes pendientes</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="card">
            <div className="card-header">
              <h3>Estado de Fichas Técnicas</h3>
              <span className="card-subtitle">Eficiencia del proceso</span>
            </div>
            <div className="fichas-status">
              <div className="status-item pending">
                <span className="status-number">{stats.fichasPendientes}</span>
                <span className="status-label">Pendientes</span>
              </div>
              <div className="status-item approved">
                <span className="status-number">{stats.fichasAprobadas}</span>
                <span className="status-label">Aprobadas</span>
              </div>
              <div className="status-item rejected">
                <span className="status-number">{stats.fichasRechazadas}</span>
                <span className="status-label">Rechazadas</span>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              <h3>Accesos Rápidos</h3>
              <span className="card-subtitle">Módulos del sistema</span>
            </div>
            <div className="quick-links">
              <a href="/inventory" className="quick-link">
                <FaBoxes />
                <span>Inventario</span>
              </a>
              <a href="/employees" className="quick-link">
                <FaUsers />
                <span>Personal</span>
              </a>
              <a href="/requests" className="quick-link">
                <FaFileAlt />
                <span>Solicitudes</span>
              </a>
              <a href="/fichas-tecnicas" className="quick-link">
                <FaChartLine />
                <span>Fichas Técnicas</span>
              </a>
              <a href="/loadtest" className="quick-link">
                <FaTachometerAlt />
                <span>Load Testing</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
