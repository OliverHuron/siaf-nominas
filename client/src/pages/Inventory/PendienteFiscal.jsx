import React, { useState, useEffect } from 'react';
import { FaFileInvoiceDollar, FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa';
import api from '../../services/api';
import './PendienteFiscal.css';

const PendienteFiscal = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    proveedor: '',
    costo: '',
    uuid_factura: '',
    numero_factura: '',
    cog: '',
    fondo: '',
    fecha_compra: ''
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await api.get('/api/inventory/workflow/pendientes-fiscal');
      if (response.data.success) {
        setItems(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = (item) => {
    setSelectedItem(item);
    setFormData({
      proveedor: item.proveedor || '',
      costo: item.costo || '',
      uuid_factura: item.uuid_factura || '',
      numero_factura: item.numero_factura || '',
      cog: item.cog || '',
      fondo: item.fondo || '',
      fecha_compra: item.fecha_compra || ''
    });
    setShowModal(true);
  };

  const handleConfirm = async () => {
    try {
      const response = await api.put(
        `/api/inventory/workflow/${selectedItem.id}/completar-fiscal`,
        formData
      );
      
      if (response.data.success) {
        alert('✅ Datos fiscales completados exitosamente');
        setShowModal(false);
        loadItems();
      }
    } catch (error) {
      alert('❌ Error: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="pendiente-fiscal-container">
      <div className="page-header">
        <h1><FaFileInvoiceDollar /> Equipos Pendientes de Datos Fiscales</h1>
        <p>Equipos registrados físicamente por coordinadores que necesitan información de facturación</p>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <FaInfoCircle size={48} />
          <h3>No hay equipos pendientes de datos fiscales</h3>
          <p>Cuando los coordinadores registren equipos existentes sin factura, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="fiscal-table">
            <thead>
              <tr>
                <th>Equipo</th>
                <th>N° Serie</th>
                <th>Ubicación</th>
                <th>Coordinación</th>
                <th>Recibido por</th>
                <th>Fecha Recepción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.marca} {item.modelo}</strong>
                    <br />
                    <small>{item.descripcion}</small>
                  </td>
                  <td>{item.numero_serie || '-'}</td>
                  <td>{item.ubicacion || '-'}</td>
                  <td>{item.coordinacion_nombre || '-'}</td>
                  <td>{item.recibido_por_nombre || '-'}</td>
                  <td>{item.fecha_recepcion ? new Date(item.fecha_recepcion).toLocaleDateString() : '-'}</td>
                  <td>
                    <button 
                      className="btn-complete" 
                      onClick={() => handleComplete(item)}
                    >
                      <FaCheck /> Completar Datos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Completar Datos Fiscales */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Completar Datos Fiscales</h2>
              <button onClick={() => setShowModal(false)}><FaTimes /></button>
            </div>

            <div className="modal-body">
              <div className="item-summary">
                <h3>{selectedItem.marca} {selectedItem.modelo}</h3>
                <p>N° Serie: {selectedItem.numero_serie}</p>
                <p>Ubicación: {selectedItem.ubicacion}</p>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Proveedor *</label>
                  <input
                    type="text"
                    value={formData.proveedor}
                    onChange={e => setFormData({...formData, proveedor: e.target.value})}
                    placeholder="Nombre del proveedor"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Costo *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costo}
                    onChange={e => setFormData({...formData, costo: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>UUID Factura *</label>
                  <input
                    type="text"
                    value={formData.uuid_factura}
                    onChange={e => setFormData({...formData, uuid_factura: e.target.value})}
                    placeholder="UUID de la factura electrónica"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Número de Factura *</label>
                  <input
                    type="text"
                    value={formData.numero_factura}
                    onChange={e => setFormData({...formData, numero_factura: e.target.value})}
                    placeholder="Número de factura"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>COG</label>
                  <input
                    type="text"
                    value={formData.cog}
                    onChange={e => setFormData({...formData, cog: e.target.value})}
                    placeholder="Clave de Objeto del Gasto"
                  />
                </div>

                <div className="form-group">
                  <label>Fondo</label>
                  <input
                    type="text"
                    value={formData.fondo}
                    onChange={e => setFormData({...formData, fondo: e.target.value})}
                    placeholder="Fondo de origen"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Fecha de Compra</label>
                  <input
                    type="date"
                    value={formData.fecha_compra}
                    onChange={e => setFormData({...formData, fecha_compra: e.target.value})}
                  />
                </div>
              </div>

              <div className="alert-info">
                <FaInfoCircle />
                <p>Al completar los datos fiscales, el equipo quedará VALIDADO y contará con información completa administrativa y física.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                <FaTimes /> Cancelar
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleConfirm}
                disabled={!formData.proveedor || !formData.costo || !formData.uuid_factura || !formData.numero_factura}
              >
                <FaCheck /> Completar Datos Fiscales
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendienteFiscal;
