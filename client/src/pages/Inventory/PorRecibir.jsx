import React, { useState, useEffect } from 'react';
import { FaBox, FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './PorRecibir.css';

const PorRecibir = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    numero_serie: '',
    ubicacion: '',
    observaciones_recepcion: ''
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await api.get('/api/inventory/workflow/por-recibir');
      if (response.data.success) {
        setItems(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = (item) => {
    setSelectedItem(item);
    setFormData({
      numero_serie: item.numero_serie || '',
      ubicacion: item.ubicacion || '',
      observaciones_recepcion: ''
    });
    setShowModal(true);
  };

  const handleConfirm = async () => {
    try {
      const response = await api.put(
        `/api/inventory/workflow/${selectedItem.id}/recibir`,
        formData
      );
      
      if (response.data.success) {
        alert('✅ Equipo recibido exitosamente');
        setShowModal(false);
        loadItems();
      }
    } catch (error) {
      alert('❌ Error al recibir equipo: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="por-recibir-container">
      <div className="page-header">
        <h1><FaBox /> Equipos Por Recibir</h1>
        <p>Equipos enviados por Secretaría Administrativa pendientes de recepción física</p>
        {items.length > 0 && (
          <div className="stats-badge">
            📦 {items.length} equipo{items.length !== 1 ? 's' : ''} pendiente{items.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <FaInfoCircle size={48} />
          <h3>No hay equipos por recibir</h3>
          <p>Cuando Secretaría Administrativa envíe equipos, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="items-grid">
          {items.map(item => (
            <div key={item.id} className="item-card">
              <div className="card-header">
                <div className="header-badges header-badges-left">
                  <span className="badge-transito">En Tránsito</span>
                  {item.coordinacion_nombre && (
                    <span className="badge-coordinacion">{item.coordinacion_nombre}</span>
                  )}
                </div>
              </div>
              
              <div className="card-body">
                <div className="info-row">
                  <strong>Equipo:</strong>
                  <span>
                    {item.marca || 'Sin marca'}
                    {item.modelo ? ` ${item.modelo}` : ''}
                  </span>
                </div>
                {item.descripcion && (
                  <div className="info-row">
                    <strong>Descripción:</strong>
                    <span>{item.descripcion}</span>
                  </div>
                )}
                
                <div className="info-row">
                  <strong>Enviado por:</strong>
                  <span>{item.enviado_por_nombre || 'Administración'}</span>
                </div>
                
                <div className="info-row">
                  <strong>Fecha envío:</strong>
                  <span>{new Date(item.fecha_envio).toLocaleDateString()}</span>
                </div>

                {item.observaciones_envio && (
                  <div className="info-row">
                    <strong>Observaciones:</strong>
                    <span>{item.observaciones_envio}</span>
                  </div>
                )}

                <div className="fiscal-data">
                  <h4>Datos Fiscales</h4>
                  <div className="fiscal-grid">
                    <div><strong>Proveedor:</strong> {item.proveedor || 'N/A'}</div>
                    <div><strong>Costo:</strong> ${item.costo?.toLocaleString() || 'N/A'}</div>
                    <div><strong>Factura:</strong> {item.numero_factura || 'N/A'}</div>
                    <div><strong>COG:</strong> {item.cog || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div className="card-footer">
                {!isAdmin ? (
                  <button 
                    className="btn-receive" 
                    onClick={() => handleReceive(item)}
                  >
                    <FaCheck /> Confirmar Recepción
                  </button>
                ) : (
                  <div style={{ 
                    padding: '8px 12px', 
                    background: '#e3f2fd', 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    color: '#1976d2',
                    textAlign: 'center'
                  }}>
                    ℹ️ Solo el coordinador puede confirmar recepción
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Recepción */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar Recepción de Equipo</h2>
              <button onClick={() => setShowModal(false)}><FaTimes /></button>
            </div>

            <div className="modal-body">
              <div className="item-summary">
                <h3>{selectedItem.marca} {selectedItem.modelo}</h3>
                <p>{selectedItem.descripcion}</p>
              </div>

              <div className="form-group">
                <label>Número de Serie *</label>
                <input
                  type="text"
                  value={formData.numero_serie}
                  onChange={e => setFormData({...formData, numero_serie: e.target.value})}
                  placeholder="Escanea o escribe el número de serie"
                  required
                />
                <small>Abre la caja y registra el número de serie del equipo físico</small>
              </div>

              <div className="form-group">
                <label>Ubicación *</label>
                <input
                  type="text"
                  value={formData.ubicacion}
                  onChange={e => setFormData({...formData, ubicacion: e.target.value})}
                  placeholder="Ej: Laboratorio 1, Oficina 205"
                  required
                />
              </div>

              <div className="form-group">
                <label>Observaciones</label>
                <textarea
                  value={formData.observaciones_recepcion}
                  onChange={e => setFormData({...formData, observaciones_recepcion: e.target.value})}
                  placeholder="Observaciones sobre el estado físico del equipo"
                  rows={3}
                />
              </div>

              <div className="alert-info">
                <FaInfoCircle />
                <p>Al confirmar la recepción, el equipo quedará registrado en tu inventario y cambiará a estado ACTIVO.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                <FaTimes /> Cancelar
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleConfirm}
                disabled={!formData.numero_serie || !formData.ubicacion}
              >
                <FaCheck /> Confirmar Recepción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PorRecibir;
