import React, { useState, useEffect } from 'react';
import { FaFileInvoice, FaPaperPlane, FaPlus, FaTimes } from 'react-icons/fa';
import api from '../../services/api';
import './FiscalInventory.css';

const FiscalInventory = () => {
  const [coordinaciones, setCoordinaciones] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    // Datos fiscales
    proveedor: '',
    costo: '',
    uuid_fiscal: '',
    numero_factura: '',
    cog: '',
    fondo: '',
    fecha_compra: '',
    coordinacion_destino: '',
    // Datos básicos del equipo
    marca: '',
    modelo: '',
    descripcion: ''
  });

  useEffect(() => {
    cargarCoordinaciones();
  }, []);

  const cargarCoordinaciones = async () => {
    try {
      const response = await api.get('/api/coordinaciones');
      if (response.data.success) {
        setCoordinaciones(response.data.data);
      }
    } catch (err) {
      console.error('Error al cargar coordinaciones:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Convertir costo a número
      const dataToSend = {
        ...formData,
        costo: parseFloat(formData.costo),
        coordinacion_destino: parseInt(formData.coordinacion_destino)
      };

      const response = await api.post('/api/inventory/workflow/fiscal', dataToSend);

      if (response.data.success) {
        setSuccess(`Equipo registrado y enviado a coordinación exitosamente`);
        setShowModal(false);
        resetForm();
        
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear registro fiscal');
    }
  };

  const resetForm = () => {
    setFormData({
      proveedor: '',
      costo: '',
      uuid_fiscal: '',
      numero_factura: '',
      cog: '',
      fondo: '',
      fecha_compra: '',
      coordinacion_destino: '',
      marca: '',
      modelo: '',
      descripcion: ''
    });
  };

  return (
    <div className="fiscal-inventory-container">
      <div className="page-header">
        <div className="header-content">
          <FaFileInvoice className="header-icon" />
          <div>
            <h1>Registro Fiscal</h1>
            <p>Crear registro con datos de factura y enviar a coordinación</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <FaPlus /> Nuevo Registro Fiscal
        </button>
      </div>

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="info-card">
        <h3><FaFileInvoice /> ¿Cómo funciona?</h3>
        <ol>
          <li>Secretaría Administrativa crea el registro con los datos de la <strong>factura</strong></li>
          <li>Ingresa los datos fiscales: proveedor, costo, UUID, factura, COG, fondo</li>
          <li>Selecciona la <strong>coordinación destino</strong> que recibirá el equipo</li>
          <li>El sistema envía el equipo a la coordinación con estado "En Tránsito"</li>
          <li>El coordinador recibe y completa los datos <strong>físicos</strong> (serie, ubicación)</li>
        </ol>
      </div>

      {/* Modal de Creación */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FaFileInvoice /> Nuevo Registro Fiscal</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="info-banner">
                  <FaFileInvoice />
                  <p>
                    Complete los datos de la factura. Los datos físicos (serie, ubicación) 
                    serán completados por el coordinador al recibir el equipo.
                  </p>
                </div>

                {/* SECCIÓN 1: Datos Básicos del Equipo */}
                <div className="form-section">
                  <h3>Datos Básicos del Equipo</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Marca *</label>
                      <input
                        type="text"
                        name="marca"
                        value={formData.marca}
                        onChange={handleChange}
                        placeholder="Ej: HP, Dell, Lenovo"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Modelo *</label>
                      <input
                        type="text"
                        name="modelo"
                        value={formData.modelo}
                        onChange={handleChange}
                        placeholder="Ej: ProBook 450 G8"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleChange}
                      placeholder="Descripción del equipo..."
                      rows="3"
                    />
                  </div>
                </div>

                {/* SECCIÓN 2: Datos Fiscales */}
                <div className="form-section fiscal">
                  <h3>Datos de la Factura</h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Proveedor *</label>
                      <input
                        type="text"
                        name="proveedor"
                        value={formData.proveedor}
                        onChange={handleChange}
                        placeholder="Nombre del proveedor"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Costo (MXN) *</label>
                      <input
                        type="number"
                        step="0.01"
                        name="costo"
                        value={formData.costo}
                        onChange={handleChange}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Número de Factura</label>
                      <input
                        type="text"
                        name="numero_factura"
                        value={formData.numero_factura}
                        onChange={handleChange}
                        placeholder="Ej: FAC-2024-001"
                      />
                    </div>

                    <div className="form-group">
                      <label>Fecha de Compra</label>
                      <input
                        type="date"
                        name="fecha_compra"
                        value={formData.fecha_compra}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>UUID del CFDI</label>
                    <input
                      type="text"
                      name="uuid_fiscal"
                      value={formData.uuid_fiscal}
                      onChange={handleChange}
                      placeholder="Ej: 12345678-1234-1234-1234-123456789012"
                    />
                    <small>UUID de la factura electrónica (CFDI)</small>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>COG (Clasificador por Objeto del Gasto)</label>
                      <input
                        type="text"
                        name="cog"
                        value={formData.cog}
                        onChange={handleChange}
                        placeholder="Ej: 515"
                      />
                    </div>

                    <div className="form-group">
                      <label>Fondo Presupuestal</label>
                      <input
                        type="text"
                        name="fondo"
                        value={formData.fondo}
                        onChange={handleChange}
                        placeholder="Ej: Estatal, Federal"
                      />
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 3: Destino */}
                <div className="form-section destino">
                  <h3><FaPaperPlane /> Coordinación Destino</h3>

                  <div className="form-group">
                    <label>Enviar a Coordinación *</label>
                    <select
                      name="coordinacion_destino"
                      value={formData.coordinacion_destino}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar coordinación...</option>
                      {coordinaciones.map(coord => (
                        <option key={coord.id} value={coord.id}>
                          {coord.nombre}
                        </option>
                      ))}
                    </select>
                    <small>El coordinador de esta área recibirá el equipo para completar datos físicos</small>
                  </div>
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
                    onClick={() => setShowModal(false)}
                  >
                    <FaTimes /> Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                  >
                    <FaPaperPlane /> Enviar a Coordinación
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

export default FiscalInventory;
