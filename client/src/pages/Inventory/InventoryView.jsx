// =====================================================
// INTEGRACIÓN COMPLETA: Vista de Inventario Master-Detail
// Archivo: client/src/pages/Inventory/InventoryView.jsx
// Propósito: Tabla optimizada + Drawer + Form + RLS
// =====================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FaPlus, FaEye, FaEdit, FaTrash, FaSearch, FaFilter,
  FaDownload, FaSync, FaCheckCircle, FaExclamationCircle
} from 'react-icons/fa';
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
