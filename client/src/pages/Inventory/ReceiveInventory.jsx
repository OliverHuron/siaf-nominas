import React, { useState, useEffect } from 'react';
import { FaBox, FaCheckCircle, FaInfoCircle, FaClock } from 'react-icons/fa';
import api from '../../services/api';
import './ReceiveInventory.css';

const ReceiveInventory = () => {
  const [equiposPorRecibir, setEquiposPorRecibir] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedEquipo, setSelectedEquipo] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    numero_serie: '',
    numero_patrimonio: '',
    ubicacion: '',
    estado_uso: 'en_uso',
    folio: ''
  });

  useEffect(() => {
    cargarEquiposPorRecibir();
  }, []);

  const cargarEquiposPorRecibir = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/inventory/workflow/por-recibir');
      
      if (response.data.success) {
        setEquiposPorRecibir(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar equipos por recibir');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalRecepcion = (equipo) => {
    setSelectedEquipo(equipo);
    setFormData({
      numero_serie: '',
      numero_patrimonio: '',
      ubicacion: '',
      estado_uso: 'en_uso',
      folio: ''
    });
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setSelectedEquipo(null);
    setError('');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRecibir = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await api.put(
        `/api/inventory/workflow/${selectedEquipo.id}/recibir`,
        formData
      );

      if (response.data.success) {
        setSuccess('Equipo recibido exitosamente');
        cerrarModal();
        cargarEquiposPorRecibir();
        
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al recibir equipo');
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando equipos por recibir...</p>
      </div>
    );
  }

  return (
    <div className="receive-inventory-container">
      <div className="page-header">
        <div className="header-content">
          <FaBox className="header-icon" />
          <div>
            <h1>Equipos Por Recibir</h1>
            <p>Equipos enviados por Secretaría Administrativa pendientes de recepción</p>
          </div>
        </div>
        <div className="header-badge">
          {equiposPorRecibir.length} pendientes
        </div>
      </div>

      {success && (
        <div className="alert alert-success">
          <FaCheckCircle /> {success}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <FaInfoCircle /> {error}
        </div>
      )}

      {equiposPorRecibir.length === 0 ? (
        <div className="empty-state">
          <FaBox className="empty-icon" />
          <h3>No hay equipos por recibir</h3>
          <p>Cuando Secretaría Administrativa envíe equipos, aparecerán aquí</p>
        </div>
      ) : (
        <div className="equipos-grid">
          {equiposPorRecibir.map(equipo => (
            <div key={equipo.id} className="equipo-card">
              <div className="card-header">
                <span className="badge badge-warning">
                  <FaClock /> En tránsito
                </span>
                <span className="fecha-envio">
                  Enviado: {formatFecha(equipo.fecha_envio)}
                </span>
              </div>

              <div className="card-body">
                <h3>{equipo.marca} {equipo.modelo}</h3>
                
                <div className="info-group">
                  <label>Descripción:</label>
                  <p>{equipo.descripcion || 'Sin descripción'}</p>
                </div>

                <div className="info-row">
                  <div className="info-item">
                    <label>Proveedor:</label>
                    <span>{equipo.proveedor}</span>
                  </div>
                  <div className="info-item">
                    <label>Costo:</label>
                    <span className="costo">{formatCurrency(equipo.costo)}</span>
                  </div>
                </div>

                {equipo.numero_factura && (
                  <div className="info-item">
                    <label>Factura:</label>
                    <span>{equipo.numero_factura}</span>
                  </div>
                )}

                {equipo.uuid_fiscal && (
                  <div className="info-item">
                    <label>UUID:</label>
                    <span className="uuid">{equipo.uuid_fiscal.substring(0, 20)}...</span>
                  </div>
                )}

                <div className="info-row">
                  <div className="info-item">
                    <label>COG:</label>
                    <span>{equipo.cog || '-'}</span>
                  </div>
                  <div className="info-item">
                    <label>Fondo:</label>
                    <span>{equipo.fondo || '-'}</span>
                  </div>
                </div>

                <div className="info-item">
                  <label>Enviado por:</label>
                  <span>{equipo.enviado_por_nombre}</span>
                </div>
              </div>

              <div className="card-footer">
                <button 
                  className="btn-primary"
                  onClick={() => abrirModalRecepcion(equipo)}
                >
                  <FaCheckCircle /> Recibir Equipo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Recepción */}
      {showModal && selectedEquipo && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Recibir Equipo</h2>
              <button className="btn-close" onClick={cerrarModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="equipo-info-box">
                <h3>{selectedEquipo.marca} {selectedEquipo.modelo}</h3>
                <p><strong>Proveedor:</strong> {selectedEquipo.proveedor}</p>
                <p><strong>Costo:</strong> {formatCurrency(selectedEquipo.costo)}</p>
              </div>

              <div className="info-message">
                <FaInfoCircle />
                <p>
                  Complete los datos físicos del equipo. Los datos fiscales 
                  (proveedor, costo, factura) ya fueron ingresados por Secretaría Administrativa.
                </p>
              </div>

              <form onSubmit={handleRecibir}>
                <div className="form-group">
                  <label>Número de Serie *</label>
                  <input
                    type="text"
                    name="numero_serie"
                    value={formData.numero_serie}
                    onChange={handleChange}
                    placeholder="Ej: SN123456789"
                    required
                  />
                  <small>Localiza el número de serie en la etiqueta del equipo</small>
                </div>

                <div className="form-group">
                  <label>Número de Patrimonio</label>
                  <input
                    type="text"
                    name="numero_patrimonio"
                    value={formData.numero_patrimonio}
                    onChange={handleChange}
                    placeholder="Ej: FAC-2024-001"
                  />
                </div>

                <div className="form-group">
                  <label>Ubicación *</label>
                  <input
                    type="text"
                    name="ubicacion"
                    value={formData.ubicacion}
                    onChange={handleChange}
                    placeholder="Ej: Laboratorio 1, Edificio A"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Estado de Uso</label>
                  <select
                    name="estado_uso"
                    value={formData.estado_uso}
                    onChange={handleChange}
                  >
                    <option value="en_uso">En uso</option>
                    <option value="disponible">Disponible</option>
                    <option value="mantenimiento">En mantenimiento</option>
                    <option value="almacenado">Almacenado</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Folio</label>
                  <input
                    type="text"
                    name="folio"
                    value={formData.folio}
                    onChange={handleChange}
                    placeholder="Folio interno de control"
                  />
                </div>

                {error && (
                  <div className="alert alert-error">
                    {error}
                  </div>
                )}

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={cerrarModal}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                  >
                    <FaCheckCircle /> Confirmar Recepción
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiveInventory;
