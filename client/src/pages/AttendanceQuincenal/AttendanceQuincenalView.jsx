// =====================================================
// Vista de Asistencias Quincenales - SIGAP
// Archivo: client/src/pages/AttendanceQuincenal/AttendanceQuincenalView.jsx
// =====================================================

import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaCheck, FaTimes, FaCircle, FaExpand, FaCompress, FaQuestionCircle, FaFilter } from 'react-icons/fa';
import api from '../../services/api';
import { toast } from 'react-toastify';
import UniversalSkeleton from '../../components/UniversalSkeleton';
import './AttendanceQuincenalView.css';

const AttendanceQuincenalView = () => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0); // Nuevo estado

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [filters, setFilters] = useState({
    employee: '',
    status: '',
    month: '',
    unidad_responsable: '',
    subtipo_administrativo: '',
    activo: '',
    debe_quincenas: ''
  });

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Generar años dinámicamente
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttendances(true);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, filters.employee, filters.unidad_responsable, filters.subtipo_administrativo, filters.activo, filters.debe_quincenas]);

  const fetchAttendances = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams();

      // Siempre usar paginación por defecto
      params.append('limit', '100');

      if (!reset && nextCursor) {
        params.append('cursor', nextCursor);
      }

      // Aplicar filtros
      if (filters.employee && filters.employee.trim()) {
        params.append('search', filters.employee.trim());
      }
      if (filters.unidad_responsable) params.append('unidad_responsable', filters.unidad_responsable);
      if (filters.subtipo_administrativo) params.append('subtipo_administrativo', filters.subtipo_administrativo);
      if (filters.activo) params.append('activo', filters.activo);
      if (filters.debe_quincenas === 'debe') params.append('debe_quincenas', 'true');

      const response = await api.get(`/api/attendance/${selectedYear}?${params.toString()}`);

      if (reset) {
        setAttendances(response.data.data);
      } else {
        setAttendances(prev => [...prev, ...response.data.data]);
      }

      setNextCursor(response.data.pagination?.nextCursor || null);
      setHasMore(response.data.pagination?.hasMore || false);
      setTotalResults(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error al cargar asistencias:', error);
      toast.error('Error al cargar asistencias');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleAttendanceClick = async (empleadoId, mes, quincena, estadoActual) => {
    // Ciclo: null -> A -> F -> null
    let nuevoEstado = null;
    if (estadoActual === null || estadoActual === undefined) {
      nuevoEstado = 'A';
    } else if (estadoActual === 'A') {
      nuevoEstado = 'F';
    } else {
      nuevoEstado = null;
    }

    try {
      await api.put('/api/attendance/update', {
        empleadoId,
        anio: selectedYear,
        mes: mes.toLowerCase(),
        quincena,
        estado: nuevoEstado
      });

      // Actualizar estado local
      setAttendances(prev => prev.map(emp => {
        if (emp.id === empleadoId) {
          const columna = `${mes.toLowerCase()}_q${quincena}`;
          return { ...emp, [columna]: nuevoEstado };
        }
        return emp;
      }));

      toast.success('Asistencia actualizada');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar asistencia');
    }
  };

  const getQuincenaValue = (empleado, mes, quincena) => {
    const columna = `${mes.toLowerCase()}_q${quincena}`;
    return empleado[columna];
  };

  const renderQuincenaCell = (empleado, mes, quincena) => {
    const valor = getQuincenaValue(empleado, mes, quincena);

    let icon = <FaCircle />;
    let className = 'quincena-cell empty';

    if (valor === 'A') {
      icon = <FaCheck />;
      className = 'quincena-cell asistio';
    } else if (valor === 'F') {
      icon = <FaTimes />;
      className = 'quincena-cell falta';
    }

    return (
      <td
        key={`${mes}-${quincena}`}
        className={className}
        onClick={() => handleAttendanceClick(empleado.id, mes, quincena, valor)}
        title={`Click para cambiar: ${valor === 'A' ? 'Asistió' : valor === 'F' ? 'Falta' : 'Sin registrar'}`}
      >
        {icon}
      </td>
    );
  };

  const initializeYear = async () => {
    try {
      const response = await api.post('/api/attendance/initialize', { anio: selectedYear });
      toast.success(response.data.message);
      fetchAttendances();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al inicializar año');
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const openInstructionsModal = () => {
    setShowInstructionsModal(true);
    document.body.classList.add('modal-open');
  };

  const closeInstructionsModal = () => {
    setShowInstructionsModal(false);
    document.body.classList.remove('modal-open');
  };

  const clearFilters = () => {
    setFilters({
      employee: '',
      status: '',
      month: '',
      unidad_responsable: '',
      subtipo_administrativo: '',
      activo: '',
      debe_quincenas: ''
    });
    toast.info('Filtros limpiados');
  };



  // Effect para manejar la clase del body cuando está expandido
  useEffect(() => {
    if (isExpanded) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    // Cleanup cuando el componente se desmonte
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isExpanded]);

  return (
    <div className="attendance-quincenal-container">
      <div className="attendance-quincenal-header">
        <div>
          <h1><FaCalendarAlt /> Control de Asistencias Quincenales</h1>
          <p className="subtitle">Registro de asistencias por quincena - Sistema de nómina</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="filter-select"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button onClick={openInstructionsModal} className="btn btn-outline">
            <FaQuestionCircle />
            Ayuda
          </button>
          <button onClick={initializeYear} className="btn btn-primary">
            Inicializar Año
          </button>
          <button
            onClick={toggleExpanded}
            className={`btn ${isExpanded ? 'btn-secondary' : 'btn-outline'}`}
            title={isExpanded ? 'Contraer tabla' : 'Expandir tabla a pantalla completa'}
          >
            {isExpanded ? <FaCompress /> : <FaExpand />}
            {isExpanded ? 'Contraer' : 'Expandir'}
          </button>
        </div>
      </div>

      {/* Filtros visibles */}
      <div className="attendance-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label>Buscar empleado:</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Nombre del empleado..."
              value={filters.employee}
              onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>U.R:</label>
            <select
              className="filter-select"
              value={filters.unidad_responsable}
              onChange={(e) => setFilters({ ...filters, unidad_responsable: e.target.value })}
              disabled={filters.subtipo_administrativo !== ''}
            >
              <option value="">Todas</option>
              <option value="231">231 - Morelia</option>
              <option value="231-1">231-1 - Cd. Hidalgo</option>
              <option value="231-2">231-2 - L. Cárdenas</option>
              <option value="231-3">231-3 - Uruapan</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Subtipo:</label>
            <select
              className="filter-select"
              value={filters.subtipo_administrativo}
              onChange={(e) => setFilters({ ...filters, subtipo_administrativo: e.target.value })}
              disabled={filters.unidad_responsable !== ''}
            >
              <option value="">Todos</option>
              <option value="Administrativo de Base">Base</option>
              <option value="Administrativo de Apoyo">Apoyo</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Estado:</label>
            <select
              className="filter-select"
              value={filters.activo}
              onChange={(e) => setFilters({ ...filters, activo: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Debe Quincenas:</label>
            <select
              className="filter-select"
              value={filters.debe_quincenas}
              onChange={(e) => setFilters({ ...filters, debe_quincenas: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="debe">Debe Quincenas</option>
            </select>
          </div>

          <div className="filter-results">
            <span>{attendances.length} empleados encontrados</span>
          </div>

          {(filters.employee || filters.unidad_responsable || filters.subtipo_administrativo || filters.activo || filters.debe_quincenas) && (
            <button className="btn btn-outline btn-sm" onClick={clearFilters}>
              <FaFilter /> Limpiar
            </button>
          )}
        </div>

        {/* Contador de resultados */}
        <div className="results-count" style={{ marginTop: '10px', color: '#666', fontSize: '0.9rem' }}>
          {!loading && (
            <small>
              Mostrando <strong>{attendances.length}</strong> de <strong>{totalResults}</strong> empleados
            </small>
          )}
        </div>
      </div>

      <div className="attendance-legend">
        <div className="legend-item">
          <FaCheck className="icon-asistio" /> <span>Asistió</span>
        </div>
        <div className="legend-item">
          <FaTimes className="icon-falta" /> <span>Falta</span>
        </div>
        <div className="legend-item">
          <FaCircle className="icon-empty" /> <span>Sin registrar</span>
        </div>
        <p className="legend-note">Click en cada celda para cambiar el estado</p>
      </div>

      <div className="attendance-card">
        <div className="card-body">
          {isExpanded && <div className="table-overlay" onClick={toggleExpanded}></div>}
          <div className={`table-container-quincenal ${isExpanded ? 'expanded' : ''}`}>
            <table className="attendance-table-quincenal">
              <thead>
                <tr>
                  <th rowSpan="2" className="sticky-col employee-col">Empleado</th>
                  <th rowSpan="2" className="sticky-col status-col">Estado</th>
                  {meses.map(mes => (
                    <th key={mes} colSpan="2" className="mes-header">{mes}</th>
                  ))}
                </tr>
                <tr>
                  {meses.map(mes => (
                    <React.Fragment key={mes}>
                      <th className="quincena-header">Q1</th>
                      <th className="quincena-header">Q2</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="26">
                      <UniversalSkeleton rows={10} />
                    </td>
                  </tr>
                ) : attendances.length === 0 ? (
                  <tr>
                    <td colSpan="26" className="no-data">
                      {attendances.length === 0
                        ? "No hay empleados registrados. Click en 'Inicializar Año' para crear los registros."
                        : "No se encontraron empleados con los filtros aplicados."
                      }
                    </td>
                  </tr>
                ) : (
                  attendances.map(empleado => (
                    <tr key={empleado.id}>
                      <td className="employee-name">
                        {`${empleado.apellido_paterno} ${empleado.apellido_materno || ''} ${empleado.nombre}`.trim()}
                      </td>
                      <td className="employee-status">
                        <span className={`badge ${empleado.activo ? 'badge-success' : 'badge-danger'}`}>
                          {empleado.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {meses.map(mes => (
                        <React.Fragment key={mes}>
                          {renderQuincenaCell(empleado, mes, 1)}
                          {renderQuincenaCell(empleado, mes, 2)}
                        </React.Fragment>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Botón Cargar Más - Solo mostrar cuando NO hay filtros */}
      {!loading && hasMore &&
        !filters.employee &&
        !filters.status &&
        !filters.month &&
        !filters.unidad_responsable &&
        !filters.subtipo_administrativo &&
        !filters.activo &&
        filters.debe_quincenas !== 'debe' && (
          <div className="load-more-container">
            <button
              className="btn-load-more"
              onClick={() => fetchAttendances(false)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Cargando...' : `Cargar Más (${attendances.length} cargados)`}
            </button>
          </div>
        )}

      {/* Modal de Instrucciones */}
      {showInstructionsModal && (
        <div className="modal-overlay" onClick={closeInstructionsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FaQuestionCircle /> Instrucciones de Uso</h3>
              <button className="modal-close" onClick={closeInstructionsModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="instructions-content">
                <h4>Control de Asistencias Quincenales</h4>
                <ul>
                  <li><strong>Click en cualquier celda</strong> para cambiar el estado de asistencia</li>
                  <li><strong>Primer click:</strong> Marca como Asistió <FaCheck className="icon-asistio" /></li>
                  <li><strong>Segundo click:</strong> Marca como Falta <FaTimes className="icon-falta" /></li>
                  <li><strong>Tercer click:</strong> Limpia el registro <FaCircle className="icon-sin-registrar" /></li>
                </ul>

                <h4>Información de Quincenas</h4>
                <ul>
                  <li><strong>Q1:</strong> Primera quincena (días 1-15 del mes)</li>
                  <li><strong>Q2:</strong> Segunda quincena (días 16-fin de mes)</li>
                </ul>

                <h4>Controles Disponibles</h4>
                <ul>
                  <li><strong>Expandir:</strong> Muestra la tabla en pantalla completa</li>
                  <li><strong>Filtros:</strong> Permite filtrar empleados por nombre o estado</li>
                  <li><strong>Inicializar Año:</strong> Crea registros para todos los empleados activos</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={closeInstructionsModal}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceQuincenalView;
