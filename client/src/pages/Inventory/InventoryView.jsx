// =====================================================
// INTEGRACIÓN COMPLETA: Vista de Inventario Master-Detail
// Archivo: client/src/pages/Inventory/InventoryView.jsx
// Propósito: Tabla optimizada + Drawer + Form + RLS
// =====================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FaPlus, FaEye, FaEdit, FaTrash, FaSearch, FaFilter,
  FaDownload, FaSync, FaCheckCircle, FaExclamationCircle,
  FaFileExcel, FaUpload
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { saveAs } from 'file-saver';
import InventoryForm from './InventoryForm';
import InventoryDrawer from './InventoryDrawer';
import UniversalSkeleton from '../../components/UniversalSkeleton';
import api from '../../services/api';
import './InventoryView.css';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const InventoryView = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0); // Nuevo estado

  // Estados para modales y drawer
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [drawerItem, setDrawerItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Estados para Importación
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importJobId, setImportJobId] = useState(null);
  const [importProgress, setImportProgress] = useState({ progress: 0, processed: 0, total: 0, imported: 0, failed: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    estado: '',
    estado_uso: '',
    estatus_validacion: '',
    tipo_inventario: 'todos' // 'todos', 'oficial_siia', 'local', 'investigacion'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Estados para coordinaciones (dropdown)
  const [coordinaciones, setCoordinaciones] = useState([]);

  const userRole = user?.role || 'usuario';
  const isAdmin = userRole === 'admin';
  const canEdit = isAdmin || userRole === 'coordinador';

  // =====================================================
  // CARGAR DATOS INICIALES
  // =====================================================

  useEffect(() => {
    loadCoordinaciones();
  }, []);

  useEffect(() => {
    loadInventory(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchTerm]);

  // Polling para el trabajo de importación
  useEffect(() => {
    let interval;
    if (importJobId && importing) {
      interval = setInterval(async () => {
        try {
          const response = await api.get(`/api/import-jobs/status/${importJobId}`);
          if (response.data && response.data.success) {
            const job = response.data.data;
            setImportProgress({
              progress: job.progress,
              processed: job.processed,
              total: job.totalRows,
              imported: job.imported,
              failed: job.failed
            });

            if (job.status === 'completed' || job.status === 'failed') {
              setImporting(false);
              setImportResult({
                success: job.status === 'completed',
                message: job.status === 'completed' ? 'Importación completada' : 'Importación fallida',
                imported: job.imported,
                failed: job.failed,
                errors: job.errors
              });
              setImportJobId(null);
              if (job.status === 'completed') {
                toast.success('Importación completada exitosamente');
                loadInventory();
              } else {
                toast.error('La importación finalizó con errores');
              }
            }
          }
        } catch (error) {
          console.error('Error polling import status:', error);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [importJobId, importing]);

  const loadInventory = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

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
      if (filters.estado) params.append('estado', filters.estado);
      if (filters.estado_uso) params.append('estado_uso', filters.estado_uso);
      if (filters.estatus_validacion) params.append('estatus_validacion', filters.estatus_validacion);

      if (filters.tipo_inventario === 'oficial_siia') params.append('es_oficial_siia', 'true');
      if (filters.tipo_inventario === 'local') params.append('es_local', 'true');
      if (filters.tipo_inventario === 'investigacion') params.append('es_investigacion', 'true');

      const response = await api.get(`/api/inventory?${params.toString()}`);

      if (response.data.success) {
        if (reset) {
          setItems(response.data.data);
        } else {
          setItems(prev => [...prev, ...response.data.data]);
        }
        setNextCursor(response.data.pagination?.nextCursor || null);
        setHasMore(response.data.pagination?.hasMore || false);
        setTotalResults(response.data.pagination?.total || 0); // Guardar total
      } else {
        setError('Error al cargar inventario');
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar inventario');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadCoordinaciones = async () => {
    try {
      const response = await api.get('/api/coordinaciones');
      if (response.data.success) {
        setCoordinaciones(response.data.data);
      }
    } catch (err) {
      console.error('Error al cargar coordinaciones:', err);
    }
  };

  // =====================================================
  // HANDLERS DE ACCIONES
  // =====================================================

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
    setIsDrawerOpen(false); // Cerrar drawer si está abierto
  };

  const handleView = (item) => {
    setDrawerItem(item);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('¿Estás seguro de dar de baja este activo?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/inventory/${itemId}`);

      if (response.data.success) {
        alert('Activo dado de baja exitosamente');
        loadInventory();
        setIsDrawerOpen(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar activo');
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      let response;

      if (editingItem) {
        // Actualizar
        response = await api.put(`/api/inventory/${editingItem.id}`, data);
      } else {
        // Crear
        response = await api.post('/api/inventory', data);
      }

      if (response.data.success) {
        alert(editingItem ? 'Activo actualizado' : 'Activo creado exitosamente');
        setShowForm(false);
        setEditingItem(null);
        loadInventory();
      }

    } catch (err) {
      throw new Error(err.response?.data?.message || 'Error al guardar');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadInventory();
  };

  const handleClearFilters = () => {
    setFilters({
      estado: '',
      estado_uso: '',
      estatus_validacion: '',
      tipo_inventario: 'todos'
    });
    setSearchTerm('');
  };

  const handleExport = () => {
    // TODO: Implementar exportación a Excel
    alert('Exportación en desarrollo');
  };

  // =====================================================
  // HANDLERS DE IMPORTACIÓN
  // =====================================================

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                      file.type === 'application/vnd.ms-excel' ||
                      file.name.endsWith('.xlsx') || 
                      file.name.endsWith('.xls');

      if (!isExcel) {
        toast.error('Por favor selecciona un archivo Excel válido (.xlsx, .xls)');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
      setImportProgress({ progress: 0, processed: 0, total: 0, imported: 0, failed: 0 });
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
    if (file) {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                      file.type === 'application/vnd.ms-excel' ||
                      file.name.endsWith('.xlsx') || 
                      file.name.endsWith('.xls');

      if (!isExcel) {
        toast.error('Por favor selecciona un archivo Excel válido (.xlsx, .xls)');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
      setImportProgress({ progress: 0, processed: 0, total: 0, imported: 0, failed: 0 });
    }
  };

  const handleImportExcel = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setImporting(true);
      setImportResult(null);
      
      // Aumentar timeout para subida de archivos grandes
      const response = await api.post('/api/inventory/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 600000 // 10 minutos
      });

      if (response.data.success) {
        setImportJobId(response.data.jobId);
        toast.info('Importación iniciada en segundo plano...');
      } else {
        setImporting(false);
        setImportResult({
          success: false,
          message: response.data.message || 'Error al iniciar importación',
          errors: response.data.errors || []
        });
      }
    } catch (error) {
      console.error('Error importing excel:', error);
      setImporting(false);
      setImportResult({
        success: false,
        message: error.response?.data?.message || 'Error al importar archivo',
        errors: [error.message]
      });
      toast.error('Error al iniciar la importación');
    }
  };

  const closeImportModal = () => {
    if (importing) {
      if (!window.confirm('La importación está en progreso. ¿Seguro que deseas cerrar? Se continuará en segundo plano.')) {
        return;
      }
    }
    setShowImportModal(false);
    setSelectedFile(null);
    setImportResult(null);
    setImportJobId(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/api/inventory/template', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'Plantilla_Inventario.xlsx');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Error al descargar la plantilla');
    }
  };

  // =====================================================
  // HELPERS DE RENDERIZADO
  // =====================================================

  const getEstadoBadge = (estado) => {
    const styles = {
      buena: { bg: '#d1fae5', color: '#065f46', label: 'Buena' },
      regular: { bg: '#fef3c7', color: '#92400e', label: 'Regular' },
      mala: { bg: '#fee2e2', color: '#991b1b', label: 'Mala' }
    };
    const style = styles[estado] || styles.buena;
    return (
      <span style={{
        backgroundColor: style.bg,
        color: style.color,
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {style.label}
      </span>
    );
  };

  const getValidacionBadge = (estatus) => {
    const styles = {
      borrador: { bg: '#f1f5f9', color: '#475569', label: 'Borrador' },
      revision: { bg: '#fef3c7', color: '#92400e', label: 'Revisión' },
      validado: { bg: '#d1fae5', color: '#065f46', icon: <FaCheckCircle />, label: 'Validado' },
      rechazado: { bg: '#fee2e2', color: '#991b1b', icon: <FaExclamationCircle />, label: 'Rechazado' }
    };
    const style = styles[estatus] || styles.borrador;
    return (
      <span style={{
        backgroundColor: style.bg,
        color: style.color,
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {style.icon} {style.label}
      </span>
    );
  };

  // =====================================================
  // RENDERIZADO
  // =====================================================

  if (loading && items.length === 0) {
    return <UniversalSkeleton rows={10} />;
  }

  return (
    <div className="inventory-container">

      {/* HEADER */}
      <div className="inventory-header">
        <div>
          <h1>Inventario de Activos</h1>
          <p className="inventory-subtitle">
            {items.length} activos encontrados
            {userRole === 'coordinador' && ' (solo tu coordinación)'}
          </p>
        </div>

        <div className="header-actions">
          <button className="btn-secondary" onClick={loadInventory}>
            <FaSync /> Actualizar
          </button>
          
          <button className="btn-secondary import-btn" onClick={() => setShowImportModal(true)} style={{ backgroundColor: '#217346', color: 'white', borderColor: '#1e6b41' }}>
            <FaFileExcel /> Importar Excel
          </button>

          {canEdit && (
            <button className="btn-primary" onClick={handleCreate}>
              <FaPlus /> Nuevo Activo
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="inventory-toolbar">
        <form onSubmit={handleSearch} className="search-bar">
          <FaSearch />
          <input
            type="text"
            placeholder="Buscar por folio, marca, modelo, serie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        <div className="toolbar-actions">
          <button
            className={`btn-filter ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter /> Filtros
          </button>
          <button className="btn-secondary" onClick={handleExport}>
            <FaDownload /> Exportar
          </button>
        </div>
      </div>

      {/* PANEL DE FILTROS */}
      {showFilters && (
        <div className="filters-panel">
          <h3>Filtros Avanzados</h3>

          <div className="filters-grid">
            <div className="filter-group">
              <label>Estado Físico</label>
              <select
                value={filters.estado}
                onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
              >
                <option value="">Todos</option>
                <option value="buena">Buena</option>
                <option value="regular">Regular</option>
                <option value="mala">Mala</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Estado de Uso</label>
              <select
                value={filters.estado_uso}
                onChange={(e) => setFilters({ ...filters, estado_uso: e.target.value })}
              >
                <option value="">Todos</option>
                <option value="operativo">Operativo</option>
                <option value="en_reparacion">En Reparación</option>
                <option value="resguardo_temporal">Resguardo Temporal</option>
                <option value="obsoleto">Obsoleto</option>
                <option value="de_baja">De Baja</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Validación</label>
              <select
                value={filters.estatus_validacion}
                onChange={(e) => setFilters({ ...filters, estatus_validacion: e.target.value })}
              >
                <option value="">Todos</option>
                <option value="borrador">Borrador</option>
                <option value="revision">En Revisión</option>
                <option value="validado">Validado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
          </div>

          <div className="filter-checkboxes">
            <label>
              <input
                type="radio"
                name="tipo_inventario"
                value="todos"
                checked={filters.tipo_inventario === 'todos'}
                onChange={(e) => setFilters({ ...filters, tipo_inventario: e.target.value })}
              />
              <span>Todos los Inventarios</span>
            </label>
            <label>
              <input
                type="radio"
                name="tipo_inventario"
                value="oficial_siia"
                checked={filters.tipo_inventario === 'oficial_siia'}
                onChange={(e) => setFilters({ ...filters, tipo_inventario: e.target.value })}
              />
              <span>Solo Inventario Oficial SIIA</span>
            </label>
            <label>
              <input
                type="radio"
                name="tipo_inventario"
                value="local"
                checked={filters.tipo_inventario === 'local'}
                onChange={(e) => setFilters({ ...filters, tipo_inventario: e.target.value })}
              />
              <span>Solo Inventario Local</span>
            </label>
            <label>
              <input
                type="radio"
                name="tipo_inventario"
                value="investigacion"
                checked={filters.tipo_inventario === 'investigacion'}
                onChange={(e) => setFilters({ ...filters, tipo_inventario: e.target.value })}
              />
              <span>Solo Inventario de Investigación</span>
            </label>
          </div>

          <button className="btn-clear-filters" onClick={handleClearFilters}>
            Limpiar Filtros
          </button>
        </div>
      )}

      {/* Contador de resultados */}
      <div className="results-count" style={{ marginTop: '10px', marginBottom: '10px', color: '#666', fontSize: '0.9rem', paddingLeft: '20px' }}>
        {!loading && (
          <small>
            Mostrando <strong>{items.length}</strong> de <strong>{totalResults}</strong> resultados
          </small>
        )}
      </div>

      {/* ERROR */}
      {error && (
        <div className="error-banner">
          <FaExclamationCircle /> {error}
        </div>
      )}

      {/* TABLA DE INVENTARIO */}
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Tipo</th>
              <th>Marca / Modelo</th>
              <th>Coordinación</th>
              <th>Ubicación</th>
              <th>Estado</th>
              <th>Validación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  <FaExclamationCircle />
                  <p>No se encontraron activos</p>
                </td>
              </tr>
            ) : (
              items.map(item => (
                <tr
                  key={item.id}
                  className="table-row-clickable"
                  onClick={() => handleView(item)}
                >
                  <td>
                    <span className="folio-cell">{item.folio || 'Pendiente'}</span>
                  </td>
                  <td>{item.tipo_bien}</td>
                  <td>
                    <div className="marca-modelo-cell">
                      <strong>{item.marca}</strong>
                      <small>{item.modelo}</small>
                    </div>
                  </td>
                  <td>{item.coordinacion_nombre || 'Sin asignar'}</td>
                  <td>{item.ubicacion}</td>
                  <td>{getEstadoBadge(item.estado)}</td>
                  <td>{getValidacionBadge(item.estatus_validacion)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons">
                      <span
                        className="action-btn view"
                        onClick={() => handleView(item)}
                        title="Ver detalles"
                      >
                        <FaEye />
                      </span>
                      {canEdit && (
                        <span
                          className="action-btn edit"
                          onClick={() => handleEdit(item)}
                          title="Editar"
                        >
                          <FaEdit />
                        </span>
                      )}
                      {isAdmin && (
                        <span
                          className="action-btn delete"
                          onClick={() => handleDelete(item.id)}
                          title="Dar de baja"
                        >
                          <FaTrash />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Botón Cargar Más - Mostrar siempre que haya más resultados */}
      {!loading && hasMore && (
        <div className="load-more-container">
          <button
            className="btn-load-more"
            onClick={() => loadInventory(false)}
            disabled={loadingMore}
          >
            {loadingMore ? 'Cargando...' : `Cargar Más (${items.length} cargados)`}
          </button>
        </div>
      )}

      {/* MODAL DE IMPORTACIÓN */}
      {showImportModal && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FaFileExcel /> Importar Inventario desde Excel</h2>
              <button className="modal-close" onClick={closeImportModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="import-instructions">
                <p><strong>Instrucciones:</strong></p>
                <ol>
                  <li>El archivo debe contener la columna <strong>Folio</strong> (Obligatorio y Único).</li>
                  <li>Columnas soportadas: Marca, Modelo, Serie, Ubicación, Descripción, Costo, Proveedor.</li>
                  <li>Arrastra el archivo abajo para comenzar.</li>
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
                <label htmlFor="file-input-inv" className="btn-primary">
                  Seleccionar Archivo
                </label>
                <input
                  id="file-input-inv"
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
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="left-actions">
                <button className="btn-secondary" onClick={handleDownloadTemplate}>
                  <FaDownload /> Descargar Plantilla
                </button>
              </div>
              <div className="right-actions" style={{ display: 'flex', gap: '10px' }}>
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
        </div>
      )}

      {/* MODAL DE FORMULARIO */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <InventoryForm
              initialData={editingItem}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
              userRole={userRole}
              userCoordinacionId={user?.coordinacion_id || null}
            />
          </div>
        </div>
      )}

      {/* DRAWER DE DETALLES */}
      <InventoryDrawer
        item={drawerItem}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        userRole={userRole}
      />

    </div>
  );
};

export default InventoryView;
