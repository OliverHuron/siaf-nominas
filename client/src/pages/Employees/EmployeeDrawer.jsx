import React from 'react';
import {
  FaTimes, FaUser, FaEnvelope, FaPhone,
  FaBriefcase, FaCheckCircle, FaEdit, FaTrash, FaMapMarkerAlt
} from 'react-icons/fa';
import './EmployeeDrawer.css';

const EmployeeDrawer = ({
  employee,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  if (!employee) return null;

  const getTipoBadge = (tipo) => {
    const badges = {
      docente: { color: '#3b82f6', bg: '#dbeafe', label: 'Docente' },
      administrativo: { color: '#8b5cf6', bg: '#ede9fe', label: 'Administrativo' }
    };
    return badges[tipo] || badges.docente;
  };

  const getUnidadLabel = (unidad) => {
    const unidades = {
      '231': '231 - Morelia',
      '231-1': '231-1 - Cd. Hidalgo',
      '231-2': '231-2 - Lázaro Cárdenas',
      '231-3': '231-3 - Uruapan'
    };
    return unidades[unidad] || unidad || 'No especificada';
  };

  const tipoBadge = getTipoBadge(employee.tipo);

  return (
    <>
      {/* Overlay */}
      <div
        className={`drawer-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className={`drawer-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title">
            <div className="drawer-avatar">
              <FaUser />
            </div>
            <div>
              <h2>{employee.nombre} {employee.apellido_paterno} {employee.apellido_materno}</h2>
              <p className="drawer-subtitle">{employee.email || employee.tipo}</p>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="drawer-content">

          {/* Estado y Tipo */}
          <div className="drawer-section">
            <div className="badges-row">
              <span
                className="status-badge"
                style={{ backgroundColor: tipoBadge.bg, color: tipoBadge.color }}
              >
                <FaBriefcase /> {tipoBadge.label}
              </span>
              <span
                className={`status-badge ${employee.activo ? 'badge-active' : 'badge-inactive'}`}
              >
                {employee.activo ? <FaCheckCircle /> : <FaTimes />}
                {employee.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>

          {/* Información Personal */}
          <div className="drawer-section">
            <h3 className="section-title">
              <FaUser /> Información Personal
            </h3>
            <div className="detail-grid">
              <DetailItem label="Nombre" value={employee.nombre} />
              <DetailItem label="Apellido Paterno" value={employee.apellido_paterno} />
              <DetailItem label="Apellido Materno" value={employee.apellido_materno || '-'} />
            </div>
          </div>

          {/* Información de Contacto */}
          <div className="drawer-section">
            <h3 className="section-title">
              <FaEnvelope /> Contacto
            </h3>
            <div className="detail-grid">
              <DetailItem
                label="Email"
                value={employee.email || 'No especificado'}
                icon={<FaEnvelope />}
              />
              <DetailItem
                label="Teléfono"
                value={employee.telefono || 'No especificado'}
                icon={<FaPhone />}
              />
            </div>
          </div>

          {/* Información Administrativa */}
          <div className="drawer-section">
            <h3 className="section-title">
              <FaBriefcase /> Información Administrativa
            </h3>
            <div className="detail-grid">
              <DetailItem
                label="Tipo de Empleado"
                value={employee.tipo === 'docente' ? 'Docente' : 'Administrativo'}
              />
              {employee.tipo === 'docente' && employee.unidad_responsable && (
                <DetailItem
                  label="Unidad Responsable"
                  value={getUnidadLabel(employee.unidad_responsable)}
                  icon={<FaMapMarkerAlt />}
                />
              )}
              {employee.tipo === 'administrativo' && employee.subtipo_administrativo && (
                <DetailItem
                  label="Subtipo Administrativo"
                  value={employee.subtipo_administrativo}
                />
              )}
              <DetailItem
                label="Estado"
                value={employee.activo ? 'Activo' : 'Inactivo'}
              />
            </div>
          </div>

        </div>

        {/* Footer con acciones */}
        <div className="drawer-footer">
          <button
            className="btn-drawer btn-edit"
            onClick={() => onEdit(employee)}
          >
            <FaEdit /> Editar
          </button>
          {employee.activo && (
            <button
              className="btn-drawer btn-delete"
              onClick={() => onDelete(employee.id)}
            >
              <FaTrash /> Desactivar
            </button>
          )}
        </div>
      </div>
    </>
  );
};

// Componente auxiliar para mostrar detalles
const DetailItem = ({ label, value, icon }) => (
  <div className="detail-item">
    <span className="detail-label">
      {icon && <span className="detail-icon">{icon}</span>}
      {label}
    </span>
    <span className="detail-value">{value}</span>
  </div>
);

export default EmployeeDrawer;
