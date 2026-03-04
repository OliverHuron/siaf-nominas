// =====================================================
// Vista de Empleados - SIGAP
// Archivo: client/src/pages/Employees/EmployeesView.jsx
// =====================================================

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { saveAs } from 'file-saver';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaUser, FaIdCard, FaEnvelope, FaPhone, FaBriefcase, FaSync, FaEye, FaFileExcel, FaDownload, FaUpload } from 'react-icons/fa';
import UniversalSkeleton from '../../components/UniversalSkeleton';
import EmployeeDrawer from './EmployeeDrawer';
import './EmployeesView.css';

const EmployeesView = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0); // Nuevo estado para total

  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [drawerEmployee, setDrawerEmployee] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUR, setFilterUR] = useState('');
  const [filterSubtipo, setFilterSubtipo] = useState('');
  const [filterActivo, setFilterActivo] = useState('');
  const [stats, setStats] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    rfc: '',
    email: '',
    telefono: '',
    tipo_empleado: 'docente',
    activo: true,
    unidad_responsable: '',
    subtipo_administrativo: ''
  });

  useEffect(() => {
    fetchEmployees(true);
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterUR, filterSubtipo, filterActivo]);

  // Estado para el job de importación en background
  const [importJobId, setImportJobId] = useState(null);
  const [importProgress, setImportProgress] = useState({ 
    processed: 0, 
    total: 0, 
    imported: 0, 
    failed: 0, 
    progress: 0,
    status: 'idle' 
  });

  // Polling del estado del job
  useEffect(() => {
    let intervalId;

    if (importJobId) {
      intervalId = setInterval(async () => {
        try {
          const response = await api.get(`/api/import-jobs/status/${importJobId}`);
          const jobStatus = response.data.data;

          setImportProgress({
            processed: jobStatus.processedRows,
            total: jobStatus.totalRows,
            imported: jobStatus.importedRows,
            failed: jobStatus.failedRows,
            progress: jobStatus.progress,
            status: jobStatus.status,
            errors: jobStatus.errors
          });

          if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
            clearInterval(intervalId);
            setImporting(false);
            setImportJobId(null);
            
            if (jobStatus.status === 'completed') {
              toast.success(`Importación completada: ${jobStatus.importedRows} importados, ${jobStatus.failedRows} fallidos`);
              setImportResult({
                success: true,
                message: `Proceso completado`,
                imported: jobStatus.importedRows,
                failed: jobStatus.failedRows,
                errors: jobStatus.errors
              });
              fetchEmployees();
              fetchStats();
            } else {
              toast.error('La importación falló');
              setImportResult({
                success: false,
                message: 'Error en el proceso de importación',
                errors: jobStatus.errors
              });
            }
          }
        } catch (error) {
          console.error('Error polling job status:', error);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [importJobId]);

  const handleImportExcel = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo Excel');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setImporting(true);
      setImportResult(null); // Reset previous results
      
      const response = await api.post('/api/employees/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 600000 // 10 minutes timeout
      });

      if (response.data.async) {
        // Start polling
        setImportJobId(response.data.jobId);
        toast.info('Importación iniciada en segundo plano. Por favor espere...');
        setImportProgress({
          processed: 0,
          total: response.data.totalRows,
          imported: 0,
          failed: 0,
          progress: 0,
          status: 'processing'
        });
      } else {
        // Sincrono (fallback)
        setImportResult(response.data);
        toast.success(response.data.message);
        setImporting(false);

        if (response.data.imported > 0) {
          fetchEmployees();
          fetchStats();
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      const errorData = error.response?.data;
      setImportResult(errorData || { success: false, message: 'Error al importar empleados' });
      toast.error(errorData?.message || 'Error al importar empleados');
      setImporting(false);
    }
  };



  const fetchEmployees = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams();

      // Siempre usar paginación por defecto, el backend maneja filtros + cursor
      params.append('limit', '100');

      if (!reset && nextCursor) {
        params.append('cursor', nextCursor);
      }

      // Filtros
      if (searchTerm && searchTerm.trim().length > 0) {
        params.append('search', searchTerm.trim());
      }
      if (filterUR) params.append('unidad_responsable', filterUR);
      if (filterSubtipo) params.append('subtipo_administrativo', filterSubtipo);
      if (filterActivo) params.append('activo', filterActivo);

      const response = await api.get(`/api/employees?${params}`);

      if (reset) {
        setEmployees(response.data.data);
      } else {
        setEmployees(prev => [...prev, ...response.data.data]);
      }

      setNextCursor(response.data.pagination?.nextCursor || null);
      setHasMore(response.data.pagination?.hasMore || false);
      setTotalResults(response.data.pagination?.total || 0); // Guardar total actual
    } catch (error) {
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/employees/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const backendData = {
      nombre: formData.nombre,
      apellido_paterno: formData.apellido_paterno,
      apellido_materno: formData.apellido_materno,
      rfc: formData.rfc,
      email: formData.email,
      telefono: formData.telefono,
      tipo: formData.tipo_empleado,
      dependencia_id: null,
      activo: formData.activo,
      unidad_responsable: formData.unidad_responsable || null,
      subtipo_administrativo: formData.subtipo_administrativo || null
    };

    try {
      if (editingEmployee) {
        await api.put(`/api/employees/${editingEmployee.id}`, backendData);
        toast.success('Empleado actualizado exitosamente');
      } else {
        await api.post('/api/employees', backendData);
        toast.success('Empleado creado exitosamente');
      }
      closeModal();
      fetchEmployees();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar empleado');
    }
  };

  const handleView = (employee) => {
    setDrawerEmployee(employee);
    setIsDrawerOpen(true);
  };

  const handleEditFromDrawer = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      nombre: employee.nombre,
      apellido_paterno: employee.apellido_paterno,
      apellido_materno: employee.apellido_materno || '',
      rfc: employee.rfc,
      email: employee.email || '',
      telefono: employee.telefono || '',
      tipo_empleado: employee.tipo || 'docente',
      activo: employee.activo,
      unidad_responsable: employee.unidad_responsable || '',
      subtipo_administrativo: employee.subtipo_administrativo || ''
    });
    setIsDrawerOpen(false);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de desactivar este empleado?')) {
      try {
        await api.delete(`/api/employees/${id}`);
        toast.success('Empleado desactivado exitosamente');
        fetchEmployees();
        fetchStats();
      } catch (error) {
        toast.error('Error al desactivar empleado');
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData({
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      rfc: '',
      email: '',
      telefono: '',
      tipo_empleado: 'docente',
      activo: true,
      unidad_responsable: '',
      subtipo_administrativo: ''
    });
  };

  // No filtramos en cliente porque el backend ya lo hace
  const displayedEmployees = employees;

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/employees/template`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al descargar');
      }

      const blob = await response.blob();

      // Use file-saver for proper filename handling
      saveAs(blob, 'plantilla_empleados.xlsx');

      toast.success('Plantilla descargada exitosamente');
    } catch (error) {
      console.error('Error al descargar plantilla:', error);
      toast.error('Error al descargar plantilla');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel')) {
      setSelectedFile(file);
      setImportResult(null);
    } else {
      toast.error('Solo se permiten archivos Excel (.xlsx, .xls)');
    }
  };



  const closeImportModal = () => {
    setShowImportModal(false);
    setSelectedFile(null);
    setImportResult(null);
    setIsDragging(false);
  };


  return (
    <div className="employees-container">
      <div className="employees-header">
        <div>
          <h1><FaUser /> SIGAP - Gestión de Empleados</h1>
          <p className="subtitle">Administración de personal docente y administrativo</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={fetchEmployees}>
            <FaSync /> Actualizar
          </button>
          <button className="btn-outline" onClick={handleDownloadTemplate}>
            <FaDownload /> Descargar Plantilla
          </button>
          <button className="btn-info" onClick={() => setShowImportModal(true)}>
            <FaFileExcel /> Importar Excel
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <FaPlus /> Nuevo Empleado
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon primary">
              <FaUser />
            </div>
            <div className="stat-content">
              <h3>{stats.total}</h3>
              <p>Total Empleados</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <FaBriefcase />
            </div>
            <div className="stat-content">
              <h3>{stats.activos}</h3>
              <p>Activos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <FaUser />
            </div>
            <div className="stat-content">
              <h3>{stats.docentes}</h3>
              <p>Docentes</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <FaUser />
            </div>
            <div className="stat-content">
              <h3>{stats.administrativos}</h3>
              <p>Administrativos</p>
            </div>
          </div>
        </div>
      )}

      <div className="employees-toolbar">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, RFC o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={filterUR}
          onChange={(e) => setFilterUR(e.target.value)}
          className="filter-select"
        >
          <option value="">Todas las U.R</option>
          <option value="231">231 - Morelia</option>
          <option value="231-1">231-1 - Cd. Hidalgo</option>
          <option value="231-2">231-2 - L. Cárdenas</option>
          <option value="231-3">231-3 - Uruapan</option>
        </select>

        <select
          value={filterSubtipo}
          onChange={(e) => setFilterSubtipo(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos los Subtipos</option>
          <option value="Administrativo de Base">Base</option>
          <option value="Administrativo de Apoyo">Apoyo</option>
        </select>

        <select
          value={filterActivo}
          onChange={(e) => setFilterActivo(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos los Estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {/* Contador de resultados */}
      <div className="results-count" style={{ marginTop: '10px', color: '#666', fontSize: '0.9rem' }}>
        {!loading && (
          <small>
            Mostrando <strong>{displayedEmployees.length}</strong> de <strong>{totalResults}</strong> resultados
          </small>
        )}
      </div>

      <div className="employees-content">
        <div className="table-container">
          {loading ? (
            <UniversalSkeleton rows={10} />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>RFC</th>
                  <th>Email</th>
                  <th>Tipo</th>
                  <th>U.R / Subtipo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-cell">
                      No se encontraron empleados
                    </td>
                  </tr>
                ) : (
                  displayedEmployees.map(employee => (
                    <tr key={employee.id} onClick={() => handleView(employee)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="employee-cell">
                          <div className="employee-avatar">
                            <FaUser />
                          </div>
                          <strong>
                            {employee.nombre} {employee.apellido_paterno} {employee.apellido_materno}
                          </strong>
                        </div>
                      </td>
                      <td><span className="rfc-text">{employee.rfc}</span></td>
                      <td>{employee.email || '-'}</td>
                      <td>
                        <span className={`badge badge-${employee.tipo === 'docente' ? 'primary' : 'secondary'}`}>
                          {employee.tipo}
                        </span>
                      </td>
                      <td>
                        {employee.tipo === 'docente' ? (
                          employee.unidad_responsable ? (
                            <span className="unidad-text">
                              {employee.unidad_responsable === '231' && '231 - Morelia'}
                              {employee.unidad_responsable === '231-1' && '231-1 - Cd. Hidalgo'}
                              {employee.unidad_responsable === '231-2' && '231-2 - L. Cárdenas'}
                              {employee.unidad_responsable === '231-3' && '231-3 - Uruapan'}
                            </span>
                          ) : '-'
                        ) : (
                          employee.subtipo_administrativo ? (
                            <span className="subtipo-text">
                              {employee.subtipo_administrativo === 'Administrativo de Base' && 'Base'}
                              {employee.subtipo_administrativo === 'Administrativo de Apoyo' && 'Apoyo'}
                            </span>
                          ) : '-'
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${employee.activo ? 'success' : 'danger'}`}>
                          {employee.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn-icon btn-view"
                            onClick={() => handleView(employee)}
                            title="Ver detalles"
                          >
                            <FaEye />
                          </button>
                          <button
                            className="btn-icon btn-edit"
                            onClick={() => handleEditFromDrawer(employee)}
                            title="Editar"
                          >
                            <FaEdit />
                          </button>
                          {employee.activo && (
                            <button
                              className="btn-icon btn-delete"
                              onClick={() => handleDelete(employee.id)}
                              title="Desactivar"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Botón Cargar Más - Mostrar siempre que haya más resultados */}
      {!loading && hasMore && (
        <div className="load-more-container">
          <button
            className="btn-load-more"
            onClick={() => fetchEmployees(false)}
            disabled={loadingMore}
          >
            {loadingMore ? 'Cargando...' : `Cargar Más (${employees.length} cargados)`}
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label><FaUser /> Nombre *</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Apellido Paterno *</label>
                    <input
                      type="text"
                      value={formData.apellido_paterno}
                      onChange={(e) => setFormData({ ...formData, apellido_paterno: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Apellido Materno</label>
                    <input
                      type="text"
                      value={formData.apellido_materno}
                      onChange={(e) => setFormData({ ...formData, apellido_materno: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label><FaIdCard /> RFC *</label>
                    <input
                      type="text"
                      value={formData.rfc}
                      onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                      maxLength="13"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label><FaEnvelope /> Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label><FaPhone /> Teléfono</label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label><FaBriefcase /> Tipo de Empleado *</label>
                    <select
                      value={formData.tipo_empleado}
                      onChange={(e) => setFormData({ ...formData, tipo_empleado: e.target.value, subtipo_administrativo: '', unidad_responsable: '' })}
                      required
                    >
                      <option value="docente">Docente</option>
                      <option value="administrativo">Administrativo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Estado</label>
                    <select
                      value={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'true' })}
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                </div>

                {formData.tipo_empleado === 'docente' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Unidad Responsable</label>
                      <select
                        value={formData.unidad_responsable}
                        onChange={(e) => setFormData({ ...formData, unidad_responsable: e.target.value })}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="231">231 - Morelia</option>
                        <option value="231-1">231-1 - Cd. Hidalgo</option>
                        <option value="231-2">231-2 - Lázaro Cárdenas</option>
                        <option value="231-3">231-3 - Uruapan</option>
                      </select>
                    </div>
                  </div>
                )}

                {formData.tipo_empleado === 'administrativo' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Subtipo Administrativo *</label>
                      <select
                        value={formData.subtipo_administrativo}
                        onChange={(e) => setFormData({ ...formData, subtipo_administrativo: e.target.value })}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Administrativo de Base">Administrativo de Base</option>
                        <option value="Administrativo de Apoyo">Administrativo de Apoyo</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingEmployee ? 'Actualizar' : 'Crear'} Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FaFileExcel /> Importar Empleados desde Excel</h2>
              <button className="modal-close" onClick={closeImportModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="import-instructions">
                <p><strong>Instrucciones:</strong></p>
                <ol>
                  <li>Descarga la plantilla Excel haciendo clic en "Descargar Plantilla"</li>
                  <li>Llena los datos de los empleados en la plantilla</li>
                  <li>Sube el archivo completado usando el área de carga</li>
                </ol>
              </div>

              <div
                className={`file-upload-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <FaUpload className="upload-icon" />
                <p>Arrastra y suelta tu archivo Excel aquí</p>
                <p className="upload-or">o</p>
                <label htmlFor="file-input" className="btn-primary">
                  Seleccionar Archivo
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                {selectedFile && (
                  <div className="selected-file">
                    <FaFileExcel /> {selectedFile.name}
                  </div>
                )}
              </div>

              {/* Progress UI */}
              {importJobId && (
                <div className="import-progress-container" style={{ margin: '20px 0', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>Procesando importación...</span>
                    <span>{importProgress.progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${importProgress.progress}%`, 
                        height: '100%', 
                        backgroundColor: '#4a90e2', 
                        transition: 'width 0.3s ease' 
                      }} 
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                    <span>Procesados: {(importProgress?.processed || 0).toLocaleString()} / {(importProgress?.total || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '5px', fontSize: '0.85em' }}>
                    <span style={{ color: '#28a745' }}>✅ Importados: {(importProgress?.imported || 0).toLocaleString()}</span>
                    <span style={{ color: '#dc3545' }}>❌ Fallidos: {(importProgress?.failed || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {importResult && (
                <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
                  <h4>{importResult.message}</h4>
                  <div className="import-stats">
                    <div className="stat-item success">
                      <strong>Importados:</strong> {importResult.imported || 0}
                    </div>
                    <div className="stat-item error">
                      <strong>Fallidos:</strong> {importResult.failed || 0}
                    </div>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="import-errors">
                      <h5>Errores encontrados:</h5>
                      <ul>
                        {importResult.errors.slice(0, 10).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {importResult.errors.length > 10 && (
                          <li>... y {importResult.errors.length - 10} errores más</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeImportModal}>
                Cerrar
              </button>
              <button
                className="btn-primary"
                onClick={handleImportExcel}
                disabled={!selectedFile || importing}
              >
                {importing ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <EmployeeDrawer
        employee={drawerEmployee}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={handleEditFromDrawer}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default EmployeesView;
