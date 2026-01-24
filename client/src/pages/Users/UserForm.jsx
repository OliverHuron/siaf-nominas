import React, { useState } from 'react';
import { FaUser, FaIdCard, FaSave, FaTimes } from 'react-icons/fa';
import './UserForm.css';

const UserForm = ({ 
  initialData = null, 
  coordinaciones = [],
  onSubmit, 
  onCancel 
}) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialData;
  
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || '',
    apellido_paterno: initialData?.apellido_paterno || '',
    apellido_materno: initialData?.apellido_materno || '',
    email: initialData?.email || '',
    password: '',
    role: initialData?.role || 'usuario',
    rfc: initialData?.rfc || '',
    telefono: initialData?.telefono || '',
    coordinacion_id: initialData?.coordinacion_id || null,
    activo: initialData?.activo !== undefined ? initialData.activo : true
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dataToSend = { ...formData };
      
      // No enviar password vacío en modo edición
      if (isEditMode && !dataToSend.password) {
        delete dataToSend.password;
      }

      // Convertir campos vacíos a null
      dataToSend.rfc = dataToSend.rfc || null;
      dataToSend.telefono = dataToSend.telefono || null;
      dataToSend.coordinacion_id = dataToSend.coordinacion_id || null;

      await onSubmit(dataToSend);
    } catch (error) {
      alert(error.message || 'Error al guardar usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Información Personal', icon: <FaUser /> },
    { id: 'organizacion', label: 'Organización', icon: <FaIdCard /> }
  ];

  return (
    <div className="user-form-container">
      <div className="form-header">
        <h2>{isEditMode ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
        {initialData?.id && (
          <span className="user-id-badge">ID: {initialData.id}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-content">
          {/* Tab: Información Personal */}
          {activeTab === 'personal' && (
            <div className="form-section">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Apellido Paterno *</label>
                  <input
                    type="text"
                    value={formData.apellido_paterno}
                    onChange={(e) => handleChange('apellido_paterno', e.target.value)}
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
                    onChange={(e) => handleChange('apellido_materno', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>RFC</label>
                  <input
                    type="text"
                    value={formData.rfc}
                    onChange={(e) => handleChange('rfc', e.target.value.toUpperCase())}
                    placeholder="XAXX010101000"
                    maxLength="13"
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => handleChange('telefono', e.target.value)}
                    placeholder="4431234567"
                    maxLength="10"
                  />
                </div>
              </div>

              {!isEditMode && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Contraseña *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      required={!isEditMode}
                      minLength="6"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Organización */}
          {activeTab === 'organizacion' && (
            <div className="form-section">
              <div className="form-row">
                <div className="form-group">
                  <label>Coordinación</label>
                  <select
                    value={formData.coordinacion_id || ''}
                    onChange={(e) => handleChange('coordinacion_id', e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Sin coordinación asignada</option>
                    {coordinaciones.map(coord => (
                      <option key={coord.id} value={coord.id}>
                        {coord.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Rol *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    required
                  >
                    <option value="usuario">Usuario</option>
                    <option value="coordinador">Coordinador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              {isEditMode && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Estado</label>
                    <select
                      value={formData.activo}
                      onChange={(e) => handleChange('activo', e.target.value === 'true')}
                    >
                      <option value={true}>Activo</option>
                      <option value={false}>Inactivo</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="info-box">
                <strong>Roles disponibles:</strong>
                <ul>
                  <li><strong>Usuario:</strong> Acceso básico de lectura</li>
                  <li><strong>Coordinador:</strong> Gestión de su coordinación</li>
                  <li><strong>Administrador:</strong> Acceso completo al sistema</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="form-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <FaTimes /> Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            <FaSave /> {isEditMode ? 'Actualizar' : 'Crear'} Usuario
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
