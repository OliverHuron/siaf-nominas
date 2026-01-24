import React, { useState, useEffect, useCallback } from 'react';
import { inventoryService, dependencyService, spacesService } from '../services/services';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaTh, FaList, FaEye } from 'react-icons/fa';
import '../../styles/inventory-modal.css';
import '../../styles/inventory.css';
import '../../styles/inventory-force.css'; // ÚLTIMO - MÁXIMA PRIORIDAD

const Inventory = () => {
  console.log('🔴 Inventory component rendered');
  
  // Inyectar CSS con máxima prioridad
  useEffect(() => {
    const styleId = 'inventory-buttons-override-inline';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        /* MÁXIMA PRIORIDAD - Botones de inventario */
        .table-container table tbody td button,
        table.table tbody td button,
        td button[title="Ver detalles"],
        td button[title="Editar"],
        td button[title="Eliminar"] {
          background: white !important;
          color: #64748b !important;
          border: 1px solid #e2e8f0 !important;
          padding: 6px !important;
          margin: 0 2px !important;
          min-width: 32px !important;
          min-height: 32px !important;
          border-radius: 6px !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s !important;
          font-size: 14px !important;
        }
        
        .table-container table tbody td button:hover,
        table.table tbody td button:hover,
        td button[title="Ver detalles"]:hover,
        td button[title="Editar"]:hover {
          background: #f8fafc !important;
          color: #1e293b !important;
          border-color: #cbd5e1 !important;
        }
        
        td button[title="Eliminar"] {
          background: #fef2f2 !important;
          color: #991b1b !important;
          border: 1px solid #fecaca !important;
        }
        
        td button[title="Eliminar"]:hover {
          background: #fee2e2 !important;
          color: #7f1d1d !important;
          border-color: #fca5a5 !important;
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
  
  const [items, setItems] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('edit'); // 'edit', 'create', 'view'
  const [currentItem, setCurrentItem] = useState(null);
  const [filters, setFilters] = useState({
    estado: '',
    dependencia_id: '',
    search: ''
  });

  const [formData, setFormData] = useState({
    marca: '',
    modelo: '',
    dependencia_id: '',
    ubicacion: '',
    estado: 'buena',
    descripcion: '',
    numero_patrimonio: '',
    numero_serie: ''
  });
  

  const loadData = useCallback(async () => {
    try {
      console.log('Loading inventory and dependencies data...');
      const [inventoryRes, depsRes, spacesRes] = await Promise.all([
        inventoryService.getAll(filters),
        dependencyService.getAll(),
        spacesService.getAll()
      ]);
      console.log('Inventory response:', inventoryRes);
      console.log('Dependencies response:', depsRes);
      console.log('Spaces response:', spacesRes);
      // Normalize responses: API may return { success, data } or direct array
      setItems(inventoryRes.data?.data || inventoryRes.data || []);
      setDependencies(depsRes.data?.data || depsRes.data || []);
      const rawSpaces = spacesRes.data?.data || spacesRes.data || [];
      // Normalize space name field (name / nombre / titulo)
      const normalized = rawSpaces.map(s => ({
        ...s,
        name: s.name || s.nombre || s.titulo || s.label || `Espacio ${s.id}`,
      }));
      setSpaces(normalized);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Limpiar clase modal-open cuando el componente se desmonte
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting inventory data:', formData);
    console.log('Current item:', currentItem);
    
    try {
      if (currentItem) {
        console.log('Updating inventory ID:', currentItem.id);
        const response = await inventoryService.update(currentItem.id, formData);
        console.log('Update response:', response.data);
        toast.success('Item actualizado');
      } else {
        console.log('Creating new inventory item');
        const response = await inventoryService.create(formData);
        console.log('Create response:', response.data);
        toast.success('Item creado');
      }
      closeModal();
      loadData();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Error al guardar item');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este item?')) {
      try {
        await inventoryService.delete(id);
        toast.success('Item eliminado');
        loadData();
      } catch (error) {
        toast.error('Error al eliminar item');
      }
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setCurrentItem(null);
    setFormData({
      marca: '',
      modelo: '',
      dependencia_id: '',
      ubicacion: '',
      estado: 'buena',
      descripcion: '',
      numero_patrimonio: '',
      numero_serie: ''
    });
    setShowModal(true);
    document.body.classList.add('modal-open');
  };

    const openEditModal = (item) => {
    setModalMode('edit');
    setCurrentItem(item);
    // Normalize ubicacion: if stored as "space:<id>" convert to the human-readable name
    let ubicacionValue = item.ubicacion || '';
    if (typeof ubicacionValue === 'string' && ubicacionValue.startsWith('space:')) {
      const id = ubicacionValue.split(':')[1];
      const match = spaces.find(s => String(s.id) === String(id));
      if (match) ubicacionValue = match.name;
    }
    setFormData({
      marca: item.marca,
      modelo: item.modelo,
      dependencia_id: item.dependencia_id,
      ubicacion: ubicacionValue,
      estado: item.estado,
      descripcion: item.descripcion || '',
      numero_patrimonio: item.numero_patrimonio || '',
      numero_serie: item.numero_serie || ''
    });
    setShowModal(true);
    document.body.classList.add('modal-open');
  };

  const openViewModal = (item) => {
    setModalMode('view');
    setCurrentItem(item);
    // Normalize ubicacion for display
    let viewUbicacion = item.ubicacion || '';
    if (typeof viewUbicacion === 'string' && viewUbicacion.startsWith('space:')) {
      const id = viewUbicacion.split(':')[1];
      const match = spaces.find(s => String(s.id) === String(id));
      if (match) viewUbicacion = match.name;
    }
    setFormData({
      marca: item.marca,
      modelo: item.modelo,
      dependencia_id: item.dependencia_id,
      ubicacion: viewUbicacion,
      estado: item.estado,
      descripcion: item.descripcion || '',
      numero_patrimonio: item.numero_patrimonio || '',
      numero_serie: item.numero_serie || ''
    });
    setShowModal(true);
    document.body.classList.add('modal-open');
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentItem(null);
    document.body.classList.remove('modal-open');
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      buena: 'badge-success',
      dañado: 'badge-warning',
      defectuoso: 'badge-danger',
      baja: 'badge-secondary'
    };
    return badges[estado] || 'badge-secondary';
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="inventory-page">
      <div className="page-header">
        <h1>Gestión de Inventario</h1>
        <p>Administra el inventario de equipos y recursos</p>
      </div>

      <div className="card">
        <div className="card-header flex-between">
          <div className="flex gap-2">
            <button 
              type="button"
              className="btn btn-primary" 
              onClick={() => openCreateModal()}
            >
              <FaPlus /> Nuevo Item
            </button>
            <div className="view-toggles">
              <button
                type="button"
                className={`btn btn-icon ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('list')}
              >
                <FaList />
              </button>
              <button
                type="button"
                className={`btn btn-icon ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('grid')}
              >
                <FaTh />
              </button>
            </div>
          </div>
        </div>

        <div className="filters">
          <div className="flex gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por marca, modelo, patrimonio, serie o ubicación..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <select
              className="form-control"
              value={filters.estado}
              onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
            >
              <option value="">Todos los estados</option>
              <option value="buena">Buena</option>
              <option value="dañado">Dañado</option>
              <option value="defectuoso">Defectuoso</option>
              <option value="baja">Baja</option>
            </select>
            <select
              className="form-control"
              value={filters.dependencia_id}
              onChange={(e) => setFilters({ ...filters, dependencia_id: e.target.value })}
            >
              <option value="">Todas las dependencias</option>
              {dependencies.map((dep) => (
                <option key={dep.id} value={dep.id}>{dep.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Dependencia</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.marca}</td>
                    <td>{item.modelo}</td>
                    <td>{item.dependencia_nombre}</td>
                    <td>{item.ubicacion}</td>
                    <td>
                      <span className={`badge ${getEstadoBadge(item.estado)}`}>
                        {item.estado}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <span 
                          onClick={() => openViewModal(item)} 
                          title="Ver"
                          style={{
                            width: '36px',
                            height: '36px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#eff6ff',
                            color: '#3b82f6',
                            border: '1px solid #60a5fa',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#60a5fa';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#eff6ff';
                            e.currentTarget.style.color = '#3b82f6';
                          }}
                        >
                          <FaEye />
                        </span>
                        <span 
                          onClick={() => openEditModal(item)} 
                          title="Editar"
                          style={{
                            width: '36px',
                            height: '36px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#fffbeb',
                            color: '#f59e0b',
                            border: '1px solid #fbbf24',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#fbbf24';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fffbeb';
                            e.currentTarget.style.color = '#f59e0b';
                          }}
                        >
                          <FaEdit />
                        </span>
                        <span 
                          onClick={() => handleDelete(item.id)} 
                          title="Eliminar"
                          style={{
                            width: '36px',
                            height: '36px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#fef2f2',
                            color: '#ef4444',
                            border: '1px solid #f87171',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f87171';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fef2f2';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                        >
                          <FaTrash />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-3">
            {items.map((item) => (
              <div key={item.id} className="card inventory-card">
                <div className="card-header">
                  <h4>{item.marca} {item.modelo}</h4>
                  <span className={`badge ${getEstadoBadge(item.estado)}`}>
                    {item.estado}
                  </span>
                </div>
                <div className="card-body">
                  <p><strong>Dependencia:</strong> {item.dependencia_nombre}</p>
                  <p><strong>Ubicación:</strong> {item.ubicacion}</p>
                  {item.descripcion && <p><strong>Descripción:</strong> {item.descripcion}</p>}
                </div>
                <div className="card-footer flex gap-2">
                  <span 
                    onClick={() => openViewModal(item)}
                    title="Ver"
                    style={{
                      width: '36px',
                      height: '36px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#eff6ff',
                      color: '#3b82f6',
                      border: '1px solid #60a5fa',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#60a5fa';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#eff6ff';
                      e.currentTarget.style.color = '#3b82f6';
                    }}
                  >
                    <FaEye />
                  </span>
                  <span 
                    onClick={() => openEditModal(item)}
                    title="Editar"
                    style={{
                      width: '36px',
                      height: '36px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#fffbeb',
                      color: '#f59e0b',
                      border: '1px solid #fbbf24',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fbbf24';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fffbeb';
                      e.currentTarget.style.color = '#f59e0b';
                    }}
                  >
                    <FaEdit />
                  </span>
                  <span 
                    onClick={() => handleDelete(item.id)}
                    title="Eliminar"
                    style={{
                      width: '36px',
                      height: '36px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#fef2f2',
                      color: '#ef4444',
                      border: '1px solid #f87171',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f87171';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fef2f2';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                  >
                    <FaTrash />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="inventory-modal-overlay" onClick={closeModal}>
          <div className="inventory-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="inventory-modal-header">
              <h3>
                {modalMode === 'view' ? 'Detalles del Item' : modalMode === 'edit' ? 'Editar Item' : 'Nuevo Item'}
              </h3>
              <button 
                type="button"
                className="modal-close" 
                onClick={closeModal}
              >
                &times;
              </button>
            </div>
            <div className="inventory-modal-body">
              {modalMode === 'view' ? (
                // Vista de solo lectura
                <div className="inventory-view-grid">
                  <div className="inventory-view-group">
                    <label>Marca</label>
                    <div className="inventory-view-value">{formData.marca || 'No especificado'}</div>
                  </div>
                  <div className="inventory-view-group">
                    <label>Modelo</label>
                    <div className="inventory-view-value">{formData.modelo || 'No especificado'}</div>
                  </div>
                  <div className="inventory-view-group">
                    <label>Número de Patrimonio</label>
                    <div className="inventory-view-value">{formData.numero_patrimonio || 'No asignado'}</div>
                  </div>
                  <div className="inventory-view-group">
                    <label>Número de Serie</label>
                    <div className="inventory-view-value">{formData.numero_serie || 'No especificado'}</div>
                  </div>
                  <div className="inventory-view-group">
                    <label>Ubicación</label>
                    <div className="inventory-view-value">{formData.ubicacion || 'No especificada'}</div>
                  </div>
                  <div className="inventory-view-group">
                    <label>Dependencia</label>
                    <div className="inventory-view-value">
                      {dependencies.find(dep => dep.id === formData.dependencia_id)?.nombre || 'No asignada'}
                    </div>
                  </div>
                  <div className="inventory-view-group">
                    <label>Estado</label>
                    <div className={`inventory-view-badge ${formData.estado}`}>
                      {formData.estado}
                    </div>
                  </div>
                  <div className="inventory-view-group span-two-cols">
                    <label>Descripción</label>
                    <div className="inventory-view-value">{formData.descripcion || 'Sin descripción'}</div>
                  </div>
                </div>
              ) : (
                // Formulario de edición/creación
                <form onSubmit={handleSubmit}>
                  <div className="inventory-form-grid">
                    <div className="form-group">
                      <label>Marca *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.marca}
                        onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Modelo *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.modelo}
                        onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Estado *</label>
                      <select
                        className="form-control"
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        required
                      >
                        <option value="buena">Buena</option>
                        <option value="dañado">Dañado</option>
                        <option value="defectuoso">Defectuoso</option>
                        <option value="baja">Baja</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Número de Patrimonio</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.numero_patrimonio}
                        onChange={(e) => setFormData({ ...formData, numero_patrimonio: e.target.value })}
                        placeholder="Ingrese número de patrimonio"
                      />
                    </div>
                    <div className="form-group">
                      <label>Número de Serie</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.numero_serie}
                        onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                        placeholder="Ingrese número de serie"
                      />
                    </div>
                    <div className="form-group">
                      <label>Ubicación *</label>
                      <select
                        className="form-control"
                        value={formData.ubicacion}
                        onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                        required
                      >
                        <option value="">Seleccionar espacio...</option>
                        {spaces.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Dependencia *</label>
                      <select
                        className="form-control"
                        value={formData.dependencia_id}
                        onChange={(e) => setFormData({ ...formData, dependencia_id: e.target.value })}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        {dependencies.map((dep) => (
                          <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group span-two-cols">
                      <label>Descripción</label>
                      <textarea
                        className="form-control"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        rows="3"
                        placeholder="Descripción detallada del item"
                      />
                    </div>
                  </div>
                  <div className="inventory-modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-ghost" 
                      onClick={closeModal}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                    >
                      {modalMode === 'edit' ? 'Actualizar' : 'Crear'}
                    </button>
                  </div>
                </form>
              )}
              {modalMode === 'view' && (
                <div className="inventory-modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={closeModal}
                  >
                    Cerrar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => openEditModal(currentItem)}
                  >
                    <FaEdit /> Editar Item
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
