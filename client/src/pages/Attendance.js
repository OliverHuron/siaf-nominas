import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  FaUserCheck, FaUserClock, FaCalendarDay, FaChartBar, 
  FaClock, FaSearch, FaFileExport, FaFilter, FaCheckCircle, FaTimesCircle 
} from 'react-icons/fa';
import '../styles/pages.css';

const Attendance = () => {
  const [employees, setEmployees] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [todayAttendances, setTodayAttendances] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0]
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchTodayAttendances();
    fetchStats();
    fetchAttendances();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/employees');
      setEmployees(response.data.data.filter(e => e.activo));
    } catch (error) {
      toast.error('Error al cargar empleados');
    }
  };

  const fetchTodayAttendances = async () => {
    try {
      const response = await api.get('/api/attendance/today');
      setTodayAttendances(response.data.data);
    } catch (error) {
      console.error('Error al cargar asistencias de hoy:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendances = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedEmployee) params.append('empleado_id', selectedEmployee);
      if (dateFilter.fecha_inicio) params.append('fecha_inicio', dateFilter.fecha_inicio);
      if (dateFilter.fecha_fin) params.append('fecha_fin', dateFilter.fecha_fin);

      const response = await api.get(`/api/attendance?${params}`);
      setAttendances(response.data.data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/attendance/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const handleCheckIn = async (empleado_id) => {
    try {
      await api.post('/api/attendance/check-in', { empleado_id });
      toast.success('Entrada registrada exitosamente');
      fetchTodayAttendances();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al registrar entrada');
    }
  };

  const handleCheckOut = async (empleado_id) => {
    try {
      await api.post('/api/attendance/check-out', { empleado_id });
      toast.success('Salida registrada exitosamente');
      fetchTodayAttendances();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al registrar salida');
    }
  };

  const handleQuickCheckIn = async () => {
    if (!selectedEmployee) {
      toast.warning('Selecciona un empleado');
      return;
    }
    await handleCheckIn(selectedEmployee);
    setSelectedEmployee('');
  };

  const handleGenerateReport = async () => {
    if (!dateFilter.fecha_inicio || !dateFilter.fecha_fin) {
      toast.warning('Selecciona el rango de fechas');
      return;
    }

    try {
      const params = new URLSearchParams(dateFilter);
      const response = await api.get(`/api/attendance/report?${params}`);
      setReportData(response.data.data);
      setShowReportModal(true);
    } catch (error) {
      toast.error('Error al generar reporte');
    }
  };

  const formatTime = (time) => {
    if (!time) return '-';
    return time.substring(0, 5); // HH:MM
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEmployeeAttendanceStatus = (empleado_id) => {
    const attendance = todayAttendances.find(a => a.empleado_id === empleado_id);
    if (!attendance) return { status: 'sin_registro', label: 'Sin registro', color: '#9E9E9E' };
    if (!attendance.hora_salida) return { status: 'en_progreso', label: 'En proceso', color: '#2196F3' };
    return { status: 'completado', label: 'Completado', color: '#4CAF50' };
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.nombre} ${emp.apellido_paterno} ${emp.apellido_materno}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           emp.rfc?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1><FaUserCheck /> SIGAP - Control de Asistencias</h1>
          <p>Registro y seguimiento de asistencias del personal</p>
        </div>
        <button className="btn btn-primary" onClick={handleGenerateReport}>
          <FaFileExport /> Generar Reporte
        </button>
      </div>

      {/* Estadísticas */}
      {stats && stats.hoy && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#4CAF50' }}>
              <FaCheckCircle />
            </div>
            <div className="stat-content">
              <h3>{stats.hoy.presentes || 0}</h3>
              <p>Presentes Hoy</p>
              <small>{stats.hoy.porcentaje_asistencia}% de asistencia</small>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#2196F3' }}>
              <FaUserClock />
            </div>
            <div className="stat-content">
              <h3>{stats.hoy.sin_salida || 0}</h3>
              <p>Sin Salida</p>
              <small>Aún en proceso</small>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#FF9800' }}>
              <FaTimesCircle />
            </div>
            <div className="stat-content">
              <h3>{stats.hoy.total_empleados - (stats.hoy.total_registros || 0)}</h3>
              <p>Sin Registro</p>
              <small>No han marcado entrada</small>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#9C27B0' }}>
              <FaCalendarDay />
            </div>
            <div className="stat-content">
              <h3>{stats.hoy.con_salida || 0}</h3>
              <p>Completados</p>
              <small>Entrada y salida registrada</small>
            </div>
          </div>
        </div>
      )}

      {/* Registro Rápido */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3><FaClock /> Registro Rápido</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Seleccionar Empleado</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="form-control"
              >
                <option value="">Seleccionar...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre} {emp.apellido_paterno} {emp.apellido_materno} - {emp.rfc}
                  </option>
                ))}
              </select>
            </div>
            <button 
              className="btn btn-success" 
              onClick={handleQuickCheckIn}
              disabled={!selectedEmployee}
            >
              <FaUserCheck /> Registrar Entrada
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="date"
            value={dateFilter.fecha_inicio}
            onChange={(e) => {
              setDateFilter({ ...dateFilter, fecha_inicio: e.target.value });
              setTimeout(fetchAttendances, 300);
            }}
            className="form-control"
          />
          <input
            type="date"
            value={dateFilter.fecha_fin}
            onChange={(e) => {
              setDateFilter({ ...dateFilter, fecha_fin: e.target.value });
              setTimeout(fetchAttendances, 300);
            }}
            className="form-control"
          />
        </div>
      </div>

      {/* Asistencias de Hoy */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3><FaCalendarDay /> Asistencias de Hoy - {formatDate(new Date())}</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Puesto</th>
                <th>Dependencia</th>
                <th>Hora Entrada</th>
                <th>Hora Salida</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {todayAttendances.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                    No hay registros de asistencia para hoy
                  </td>
                </tr>
              ) : (
                todayAttendances.map(attendance => (
                  <tr key={attendance.id}>
                    <td>
                      <strong>
                        {attendance.nombre} {attendance.apellido_paterno} {attendance.apellido_materno}
                      </strong>
                    </td>
                    <td>{attendance.puesto || '-'}</td>
                    <td>{attendance.dependencia_nombre || '-'}</td>
                    <td>
                      <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                        <FaClock /> {formatTime(attendance.hora_entrada)}
                      </span>
                    </td>
                    <td>
                      {attendance.hora_salida ? (
                        <span style={{ color: '#2196F3', fontWeight: 'bold' }}>
                          <FaClock /> {formatTime(attendance.hora_salida)}
                        </span>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleCheckOut(attendance.empleado_id)}
                        >
                          Registrar Salida
                        </button>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${attendance.estado === 'presente' ? 'success' : 'warning'}`}>
                        {attendance.estado}
                      </span>
                    </td>
                    <td>
                      {attendance.observaciones || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Asistencias */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3><FaChartBar /> Historial de Asistencias</h3>
          <small>Período seleccionado: {formatDate(dateFilter.fecha_inicio)} - {formatDate(dateFilter.fecha_fin)}</small>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Tipo</th>
                <th>Dependencia</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Horas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                    No hay registros para el período seleccionado
                  </td>
                </tr>
              ) : (
                attendances.map(attendance => {
                  // Calcular horas trabajadas
                  let horasTrabajadas = '-';
                  if (attendance.hora_entrada && attendance.hora_salida) {
                    const entrada = new Date(`2000-01-01T${attendance.hora_entrada}`);
                    const salida = new Date(`2000-01-01T${attendance.hora_salida}`);
                    const diff = (salida - entrada) / (1000 * 60 * 60); // en horas
                    horasTrabajadas = diff.toFixed(2) + ' hrs';
                  }

                  return (
                    <tr key={attendance.id}>
                      <td>{new Date(attendance.fecha).toLocaleDateString('es-MX')}</td>
                      <td>
                        <strong>
                          {attendance.nombre} {attendance.apellido_paterno} {attendance.apellido_materno}
                        </strong>
                      </td>
                      <td>
                        <span className={`badge badge-${attendance.tipo_empleado === 'docente' ? 'primary' : 'info'}`}>
                          {attendance.tipo_empleado}
                        </span>
                      </td>
                      <td>{attendance.dependencia_nombre || '-'}</td>
                      <td>
                        {attendance.hora_entrada ? (
                          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                            <FaClock /> {formatTime(attendance.hora_entrada)}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {attendance.hora_salida ? (
                          <span style={{ color: '#2196F3', fontWeight: 'bold' }}>
                            <FaClock /> {formatTime(attendance.hora_salida)}
                          </span>
                        ) : (
                          <span style={{ color: '#FF9800' }}>En proceso</span>
                        )}
                      </td>
                      <td>{horasTrabajadas}</td>
                      <td>
                        <span className={`badge badge-${
                          attendance.estado === 'presente' ? 'success' : 
                          attendance.estado === 'ausente' ? 'danger' : 
                          attendance.estado === 'justificado' ? 'warning' : 'info'
                        }`}>
                          {attendance.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {attendances.length > 0 && (
            <div style={{ padding: '1rem', textAlign: 'right', borderTop: '1px solid #e0e0e0' }}>
              <strong>Total de registros: {attendances.length}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Empleados para Marcar */}
      <div className="card">
        <div className="card-header">
          <h3><FaUserCheck /> Registro Rápido por Empleado</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>RFC</th>
                <th>Tipo</th>
                <th>Estado Hoy</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(employee => {
                const status = getEmployeeAttendanceStatus(employee.id);
                const attendance = todayAttendances.find(a => a.empleado_id === employee.id);
                
                return (
                  <tr key={employee.id}>
                    <td>
                      <strong>
                        {employee.nombre} {employee.apellido_paterno} {employee.apellido_materno}
                      </strong>
                    </td>
                    <td>{employee.rfc}</td>
                    <td>
                      <span className={`badge badge-${employee.tipo_empleado === 'docente' ? 'primary' : 'info'}`}>
                        {employee.tipo_empleado}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{ backgroundColor: status.color, color: 'white' }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {!attendance ? (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleCheckIn(employee.id)}
                          >
                            <FaUserCheck /> Entrada
                          </button>
                        ) : !attendance.hora_salida ? (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleCheckOut(employee.id)}
                          >
                            <FaUserClock /> Salida
                          </button>
                        ) : (
                          <span style={{ color: '#4CAF50' }}>✓ Completado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Reporte */}
      {showReportModal && reportData && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FaChartBar /> Reporte de Asistencias</h2>
              <button className="modal-close" onClick={() => setShowReportModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <p><strong>Período:</strong> {formatDate(reportData.periodo.fecha_inicio)} - {formatDate(reportData.periodo.fecha_fin)}</p>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Puesto</th>
                      <th>Días Asistidos</th>
                      <th>Presentes</th>
                      <th>Ausentes</th>
                      <th>Justificados</th>
                      <th>Horas Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.empleados.map((emp, idx) => (
                      <tr key={idx}>
                        <td>{emp.nombre_completo}</td>
                        <td>{emp.puesto || '-'}</td>
                        <td>{emp.dias_asistidos || 0}</td>
                        <td>{emp.dias_presentes || 0}</td>
                        <td>{emp.dias_ausentes || 0}</td>
                        <td>{emp.dias_justificados || 0}</td>
                        <td>{emp.horas_promedio || 0} hrs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReportModal(false)}>
                Cerrar
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <FaFileExport /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;

