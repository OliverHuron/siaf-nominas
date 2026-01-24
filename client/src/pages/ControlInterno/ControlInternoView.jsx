// =====================================================
// INTEGRACIÓN COMPLETA: Vista de Control Interno SIGAP
// Archivo: client/src/pages/ControlInterno/ControlInternoView.jsx
// Propósito: Control de firmas y conceptos de nómina
// =====================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FaSearch, FaFilter, FaCheckCircle, FaTimesCircle, 
  FaUser, FaBuilding, FaFileSignature, FaDownload,
  FaSync, FaPlus, FaEdit
} from 'react-icons/fa';
import api from '../../services/api';
import './ControlInternoView.css';

// =====================================================
// CONSTANTES
// =====================================================

const UNIDADES_RESPONSABLES = [
  { value: '231', label: 'Morelia' },
  { value: '231-1', label: 'Cd. Hidalgo' },
  { value: '231-2', label: 'Lázaro Cárdenas' },
  { value: '231-3', label: 'Uruapan' }
];

const TIPOS_PERSONAL = [
  { value: 'docente', label: 'Docente' },
  { value: 'administrativo', label: 'Administrativo' }
];

const SUBTIPOS_ADMINISTRATIVO = [
  { value: 'Administrativo de Base', label: 'Administrativo de Base' },
  { value: 'Administrativo de Apoyo', label: 'Administrativo de Apoyo' }
];

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const ControlInternoView = () => {
  const { user } = useAuth();
  const [empleados, setEmpleados] = useState([]);
  const [conceptos, setConceptos] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    unidad_responsable: '',
    tipo: '',
    subtipo_administrativo: '',
    periodo_aplicacion: getCurrentPeriod(),
    firmado: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const userRole = user?.role || 'usuario';
  const canEdit = userRole === 'admin' || userRole === 'coordinador';
  
  // =====================================================
  // CARGAR DATOS
  // =====================================================
  
  useEffect(() => {
    loadData();
  }, [filters, searchTerm]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const [empleadosRes, conceptosRes, resumenRes] = await Promise.all([
        api.get(`/api/nomina/estatus-firmas?${params.toString()}`),
        api.get('/api/nomina/conceptos?activo=true'),
        api.get(`/api/nomina/resumen-firmas-pendientes?periodo_aplicacion=${filters.periodo_aplicacion}`)
      ]);

      setEmpleados(empleadosRes.data.data);
      setConceptos(conceptosRes.data.data);
      setResumen(resumenRes.data.data);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError(err.response?.data?.message || 'Error al cargar información de control interno');
    } finally {
      setLoading(false);
    }
  };
  
  // =====================================================
  // HANDLERS
  // =====================================================
  
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  const clearFilters = () => {
    setFilters({
      unidad_responsable: '',
      tipo: '',
      subtipo_administrativo: '',
      periodo_aplicacion: getCurrentPeriod(),
      firmado: ''
    });
    setSearchTerm('');
  };
  
  const handleExport = () => {
    // TODO: Implementar exportación a Excel
    alert('Funcionalidad de exportación próximamente');
  };
  
  // =====================================================
  // FUNCIONES DE UTILIDAD
  // =====================================================
  
  const getNombreCompleto = (empleado) => {
    return `${empleado.nombre} ${empleado.apellido_paterno} ${empleado.apellido_materno || ''}`.trim();
  };
  
  const getNombreUnidad = (clave) => {
    const unidad = UNIDADES_RESPONSABLES.find(u => u.value === clave);
    return unidad ? unidad.label : clave;
  };
  
  const getPorcentajeFirmados = (firmados, total) => {
    if (total === 0) return 0;
    return Math.round((firmados / total) * 100);
  };
  
  // =====================================================
  // RENDERIZADO
  // =====================================================
  
  return (
    <div className="control-interno-container">
      {/* HEADER */}
      <div className="control-interno-header">
        <div>
          <h1>Control Interno - SIGAP</h1>
          <p className="subtitle">Control de firmas y conceptos de nómina por empleado</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={loadData}>
            <FaSync /> Actualizar
          </button>
          <button className="btn-secondary" onClick={handleExport}>
            <FaDownload /> Exportar
          </button>
          <button 
            className={`btn-filter ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter /> Filtros
          </button>
        </div>
      </div>
      
      {/* RESUMEN DE FIRMAS */}
      {resumen.length > 0 && (
        <div className="stats-grid">
          {resumen.map((item, index) => {
            const porcentaje = getPorcentajeFirmados(parseInt(item.firmados), parseInt(item.total));
            return (
              <div key={index} className="stat-card">
                <div className="stat-icon">
                  <FaFileSignature />
                </div>
                <div className="stat-content">
                  <h3>{item.concepto_nombre}</h3>
                  <div className="stat-numbers">
                    <div className="stat-item success">
                      <FaCheckCircle />
                      <span>{item.firmados} firmados</span>
                    </div>
                    <div className="stat-item warning">
                      <FaTimesCircle />
                      <span>{item.pendientes} pendientes</span>
                    </div>
                  </div>
                  <div className="stat-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    <span className="progress-label">{porcentaje}% completado</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* TOOLBAR: BÚSQUEDA */}
      <div className="control-interno-toolbar">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, RFC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {showFilters && (
          <button className="btn-clear-filters" onClick={clearFilters}>
            Limpiar Filtros
          </button>
        )}
      </div>
      
      {/* PANEL DE FILTROS */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Periodo</label>
              <input
                type="month"
                className="form-control"
                value={filters.periodo_aplicacion}
                onChange={(e) => handleFilterChange('periodo_aplicacion', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Unidad Responsable</label>
              <select
                className="form-control"
                value={filters.unidad_responsable}
                onChange={(e) => handleFilterChange('unidad_responsable', e.target.value)}
              >
                <option value="">Todas</option>
                {UNIDADES_RESPONSABLES.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Tipo de Personal</label>
              <select
                className="form-control"
                value={filters.tipo}
                onChange={(e) => handleFilterChange('tipo', e.target.value)}
              >
                <option value="">Todos</option>
                {TIPOS_PERSONAL.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {filters.tipo === 'administrativo' && (
              <div className="filter-group">
                <label>Subtipo Administrativo</label>
                <select
                  className="form-control"
                  value={filters.subtipo_administrativo}
                  onChange={(e) => handleFilterChange('subtipo_administrativo', e.target.value)}
                >
                  <option value="">Todos</option>
                  {SUBTIPOS_ADMINISTRATIVO.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="filter-group">
              <label>Estado de Firma</label>
              <select
                className="form-control"
                value={filters.firmado}
                onChange={(e) => handleFilterChange('firmado', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Firmados</option>
                <option value="false">Pendientes</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* TABLA DE DATOS */}
      <div className="control-interno-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Cargando información...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <FaTimesCircle />
            <p>{error}</p>
            <button className="btn-secondary" onClick={loadData}>
              Reintentar
            </button>
          </div>
        ) : empleados.length === 0 ? (
          <div className="empty-state">
            <FaUser />
            <h3>No se encontraron empleados</h3>
            <p>No hay empleados que coincidan con los filtros seleccionados</p>
            <button className="btn-secondary" onClick={clearFilters}>
              Limpiar Filtros
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>RFC</th>
                  <th>Tipo</th>
                  <th>Unidad Responsable</th>
                  <th>Dependencia</th>
                  <th>Conceptos de Nómina</th>
                </tr>
              </thead>
              <tbody>
                {empleados.map((empleado) => (
                  <tr key={empleado.empleado_id}>
                    <td>
                      <div className="employee-cell">
                        <div className="employee-avatar">
                          <FaUser />
                        </div>
                        <div className="employee-info">
                          <div className="employee-name">
                            {getNombreCompleto(empleado)}
                          </div>
                          {empleado.subtipo_administrativo && (
                            <div className="employee-subtitle">
                              {empleado.subtipo_administrativo}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="rfc-text">{empleado.rfc || 'N/A'}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${empleado.tipo === 'docente' ? 'primary' : 'secondary'}`}>
                        {empleado.tipo}
                      </span>
                    </td>
                    <td>
                      {empleado.unidad_responsable ? (
                        <div className="unidad-cell">
                          <FaBuilding />
                          <span>{getNombreUnidad(empleado.unidad_responsable)}</span>
                        </div>
                      ) : (
                        <span className="text-muted">No asignada</span>
                      )}
                    </td>
                    <td>
                      <span className="dependencia-text">
                        {empleado.dependencia_nombre || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {empleado.conceptos && empleado.conceptos.length > 0 ? (
                        <div className="conceptos-list">
                          {empleado.conceptos.map((concepto, idx) => (
                            <div
                              key={idx}
                              className={`concepto-badge ${concepto.firmado ? 'firmado' : 'pendiente'}`}
                            >
                              {concepto.firmado ? (
                                <FaCheckCircle className="icon-success" />
                              ) : (
                                <FaTimesCircle className="icon-warning" />
                              )}
                              <span className="concepto-nombre">
                                {concepto.concepto_nombre}
                              </span>
                              {concepto.fecha_firma && (
                                <span className="concepto-fecha">
                                  {new Date(concepto.fecha_firma).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">Sin conceptos asignados</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* FOOTER CON LEYENDA */}
      <div className="control-interno-footer">
        <div className="legend">
          <h4>Leyenda:</h4>
          <div className="legend-items">
            <div className="legend-item">
              <FaCheckCircle className="icon-success" />
              <span>Firmado</span>
            </div>
            <div className="legend-item">
              <FaTimesCircle className="icon-warning" />
              <span>Pendiente de Firma</span>
            </div>
          </div>
        </div>
        {empleados.length > 0 && (
          <div className="footer-stats">
            <span>Mostrando {empleados.length} empleado{empleados.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlInternoView;
