// =====================================================
// COMPONENTE: Drawer Master-Detail para Inventario
// Archivo: client/src/pages/Inventory/InventoryDrawer.jsx
// Propósito: Vista detallada de un activo con animación slide-in
// =====================================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  FaTimes, FaBox, FaBuilding, FaMapMarkerAlt, FaUser, 
  FaFileInvoiceDollar, FaCalendar, FaCheckCircle, FaExclamationCircle,
  FaEdit, FaTrash, FaClock, FaBarcode, FaTag, FaImage
} from 'react-icons/fa';
import './InventoryDrawer.css';

const InventoryDrawer = ({ 
  item, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete,
  userRole = 'coordinador' // 'admin', 'coordinador', 'usuario'
}) => {
  if (!item) return null;
  
  const isAdmin = userRole === 'admin';
  const canEdit = userRole === 'admin' || userRole === 'coordinador';
  
  // Badges de estado
  const getEstadoBadge = (estado) => {
    const badges = {
      buena: { color: '#10b981', bg: '#d1fae5', label: 'Buena' },
      regular: { color: '#f59e0b', bg: '#fef3c7', label: 'Regular' },
      mala: { color: '#ef4444', bg: '#fee2e2', label: 'Mala' }
    };
    return badges[estado] || badges.buena;
  };
  
  const getEstadoUsoBadge = (estadoUso) => {
    const badges = {
      bueno: { color: '#10b981', bg: '#d1fae5', icon: <FaCheckCircle />, label: 'Bueno' },
      regular: { color: '#f59e0b', bg: '#fef3c7', icon: <FaExclamationCircle />, label: 'Regular' },
      malo: { color: '#ef4444', bg: '#fee2e2', icon: <FaTimes />, label: 'Malo' }
    };
    return badges[estadoUso] || badges.bueno;
  };
  
  const getValidacionBadge = (estatus) => {
    const badges = {
      borrador: { color: '#64748b', bg: '#f1f5f9', label: 'Borrador' },
      revision: { color: '#f59e0b', bg: '#fef3c7', label: 'En Revisión' },
      validado: { color: '#10b981', bg: '#d1fae5', label: 'Validado' },
      rechazado: { color: '#ef4444', bg: '#fee2e2', label: 'Rechazado' }
    };
    return badges[estatus] || badges.borrador;
  };
  
  const estadoBadge = getEstadoBadge(item.estado);
  const estadoUsoBadge = getEstadoUsoBadge(item.estado_uso);
  const validacionBadge = getValidacionBadge(item.estatus_validacion);
  
  // Formateo de números
  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN' 
    }).format(value);
  };
  
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
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
            <FaBox />
            <div>
              <h2>{item.tipo_bien || 'Activo de Inventario'}</h2>
              <p className="drawer-subtitle">{item.marca} {item.modelo}</p>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        {/* Content */}
        <div className="drawer-content">
          
          {/* Folio */}
          <div className="drawer-section">
            <div className="folio-display">
              <div>
                <span className="folio-label">Folio</span>
                <span className="folio-value">{item.folio || 'Pendiente'}</span>
              </div>
            </div>
            
            <div className="badges-row">
              <span 
                className="status-badge" 
                style={{ backgroundColor: estadoUsoBadge.bg, color: estadoUsoBadge.color }}
              >
                {estadoUsoBadge.icon} {estadoUsoBadge.label}
              </span>
            </div>
          </div>
          
          {/* Datos Generales */}
          <div className="drawer-section">
            <h3 className="section-title">
              <FaBox /> Datos Generales
            </h3>
            <div className="detail-grid">
              <DetailItem label="Tipo de Inventario" value={item.tipo_inventario} highlight />
              <DetailItem label="Marca" value={item.marca} />
              <DetailItem label="Modelo" value={item.modelo} />
              <DetailItem label="Tipo de Bien" value={item.tipo_bien} />
              <DetailItem label="Número de Serie" value={item.numero_serie} />
              <DetailItem label="Número de Patrimonio" value={item.numero_patrimonio} />
              
              {/* Campos específicos INTERNO */}
              {item.tipo_inventario === 'INTERNO' && (
                <>
                  <DetailItem label="Registro Patrimonial" value={item.registro_patrimonial} />
                  <DetailItem label="Registro Interno" value={item.registro_interno} />
                  <DetailItem label="Ubicación Específica" value={item.ubicacion_especifica} />
                </>
              )}

              {/* Campos específicos EXTERNO */}
              {item.tipo_inventario === 'EXTERNO' && (
                <>
                  <DetailItem label="ID Patrimonio" value={item.id_patrimonio} />
                  <DetailItem label="Clave Patrimonial" value={item.clave_patrimonial} />
                  <DetailItem label="Número de Inventario" value={item.numero_inventario} />
                  <DetailItem label="Número de Empleado" value={item.numero_empleado} />
                </>
              )}
              
              <DetailItem label="Ubicación" value={item.ubicacion_nombre} icon={<FaMapMarkerAlt />} />
            </div>
            
            {item.descripcion && (
              <div className="detail-full">
                <span className="detail-label">Descripción</span>
                <p className="detail-text">{item.descripcion}</p>
              </div>
            )}
            
            {item.comentarios && (
              <div className="detail-full">
                <span className="detail-label">Comentarios</span>
                <p className="detail-text">{item.comentarios}</p>
              </div>
            )}
            
            {/* Galería de Imágenes */}
            {item.imagenes && item.imagenes.length > 0 && (() => {
              const imgs = (typeof item.imagenes === 'string' ? JSON.parse(item.imagenes) : item.imagenes);
              return (
                <ImageGallerySection images={imgs} />
              );
            })()}
          </div>

          

          {/* Asignación y Responsables */}
          <div className="drawer-section">
            <h3 className="section-title">
              <FaUser /> Asignación y Responsables
            </h3>
            <div className="detail-grid">
              <DetailItem 
                label="Coordinación" 
                value={item.coordinacion_nombre || 'Sin asignar'} 
                icon={<FaBuilding />} 
              />
              <DetailItem 
                label="Resguardante" 
                value={item.resguardante_nombre || 'Sin asignar'} 
              />
              <DetailItem 
                label="Usuario Asignado" 
                value={item.usuario_asignado_nombre || 'Sin asignar'} 
              />
              <DetailItem 
                label="Resguardo Interno" 
                value={item.numero_resguardo_interno} 
              />
            </div>
          </div>

          {/* Datos Administrativos / Elaboración */}
          <div className="drawer-section">
             <h3 className="section-title">
               <FaFileInvoiceDollar /> Detalles Administrativos
             </h3>
             <div className="detail-grid">
               <DetailItem label="Elaboró" value={item.elaboro_nombre} />
               <DetailItem label="Fecha Elaboración" value={formatDate(item.fecha_elaboracion)} icon={<FaCalendar />} />
               <DetailItem label="URES de Asignación" value={item.ures_asignacion} />
               <DetailItem label="Recurso" value={item.recurso} />
               <DetailItem label="UR" value={item.ur} />
               <DetailItem label="Número de Empleado" value={item.numero_empleado} />
               <DetailItem label="ENTREGA Responsable" value={item.responsable_entrega_nombre || item.jerarquia_responsable} />
               
               {item.tipo_inventario === 'EXTERNO' && (
                 <>
                   <DetailItem label="COG" value={item.cog} />
                   <DetailItem label="Fondo" value={item.fondo} />
                   <DetailItem label="Cuenta por Pagar" value={item.cuenta_por_pagar} />
                   <DetailItem label="U. Res. Gasto" value={item.ures_gasto} />
                   <DetailItem label="Ejercicio" value={item.ejercicio} />
                   <DetailItem label="Solicitud Compra" value={item.solicitud_compra} />
                   <DetailItem label="IDCON" value={item.idcon} />
                   <DetailItem label="Usu. Asig" value={item.usu_asig} />
                   <DetailItem label="Fecha Registro" value={formatDate(item.fecha_registro)} icon={<FaCalendar />} />
                   <DetailItem label="Fecha Asignación" value={formatDate(item.fecha_asignacion)} icon={<FaCalendar />} />
                 </>
               )}
             </div>
          </div>
          
          {/* Información Administrativa (Solo Admin) */}
          {isAdmin && (
            <div className="drawer-section">
              <h3 className="section-title">
                <FaFileInvoiceDollar /> Información Administrativa
              </h3>
              <div className="admin-warning-small">
                🔒 Información confidencial - Solo administradores
              </div>
              
              <div className="detail-grid">
                <DetailItem 
                  label="Costo de Adquisición" 
                  value={formatCurrency(item.costo)} 
                  highlight 
                />
                <DetailItem label="COG" value={item.cog} />
                <DetailItem label="UUID" value={item.uuid} />
                <DetailItem label="Factura" value={item.factura} />
                <DetailItem label="Fondo" value={item.fondo} />
                <DetailItem label="Cuenta por Pagar" value={item.cuenta_por_pagar} />
                <DetailItem label="Proveedor" value={item.proveedor} />
                <DetailItem 
                  label="Fecha de Adquisición" 
                  value={formatDate(item.fecha_adquisicion)} 
                  icon={<FaCalendar />} 
                />
              </div>
            </div>
          )}
          
          {/* Auditoría */}
          <div className="drawer-section">
            <h3 className="section-title">
              <FaClock /> Información de Auditoría
            </h3>
            <div className="detail-grid">
              <DetailItem 
                label="Creado" 
                value={formatDate(item.created_at)} 
              />
              <DetailItem 
                label="Última Actualización" 
                value={formatDate(item.updated_at)} 
              />
            </div>
          </div>
          
        </div>
        
        {/* Footer Actions */}
        {canEdit && (
          <div className="drawer-footer">
            <button 
              className="btn-drawer btn-edit" 
              onClick={() => onEdit(item)}
            >
              <FaEdit /> Editar
            </button>
            {isAdmin && (
              <button 
                className="btn-drawer btn-delete" 
                onClick={() => {
                  if (window.confirm('¿Estás seguro de dar de baja este activo?')) {
                    onDelete(item.id);
                  }
                }}
              >
                <FaTrash /> Dar de Baja
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// Componente auxiliar para items de detalle
const DetailItem = ({ label, value, icon, highlight }) => (
  <div className={`detail-item ${highlight ? 'highlight' : ''}`}>
    <span className="detail-label">
      {icon && <span className="detail-icon">{icon}</span>}
      {label}
    </span>
    <span className="detail-value">{value || 'N/A'}</span>
  </div>
);

// =====================================================
// Image gallery + lightbox modal component
// =====================================================
const ImageGallerySection = ({ images = [] }) => {
  const [openIndex, setOpenIndex] = useState(null);
  const open = (i) => setOpenIndex(i);
  const close = () => setOpenIndex(null);
  const prev = () => setOpenIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setOpenIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  // Debug helper
  console.log('InventoryDrawer: images for gallery', images);

  // Keyboard navigation for lightbox (Esc to close, arrows to navigate)
  useEffect(() => {
    if (openIndex === null) return;
    const handler = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openIndex, images.length]);

  // Lightbox portal content
  const Lightbox = () => (
    <div className="lightbox-overlay" onClick={close} role="dialog" aria-modal="true">
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={close} aria-label="Cerrar">✕</button>
        <button className="lightbox-prev" onClick={prev} aria-label="Anterior">‹</button>
        <img className="lightbox-img" src={images[openIndex]} alt={`Evidencia ${openIndex + 1}`} />
        <button className="lightbox-next" onClick={next} aria-label="Siguiente">›</button>
      </div>
    </div>
  );

  return (
    <div className="detail-full">
      <span className="detail-label"><FaImage /> Fotografías</span>

      {images.length === 0 ? (
        <div className="no-images-placeholder">No hay fotografías</div>
      ) : (
        <div className="image-gallery">
          {images.map((img, idx) => (
            <div key={idx} className="gallery-item" onClick={() => open(idx)} role="button" tabIndex={0}>
              <img src={img} alt={`Evidencia ${idx + 1}`} onError={(e) => { e.currentTarget.src = '/images/image-missing.png'; }} />
            </div>
          ))}
        </div>
      )}

      {openIndex !== null && createPortal(<Lightbox />, document.body)}
    </div>
  );
};

export default InventoryDrawer;

// =====================================================
// ESTILOS CSS (InventoryDrawer.css)
// =====================================================

/*
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 999;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.drawer-overlay.open {
  opacity: 1;
  visibility: visible;
}

.drawer-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 600px;
  max-width: 90vw;
  background: white;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.drawer-panel.open {
  transform: translateX(0);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 2px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.drawer-title svg {
  font-size: 28px;
  color: #3b82f6;
}

.drawer-title h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.drawer-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 4px 0 0 0;
}

.drawer-close {
  background: #f1f5f9;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
}

.drawer-close:hover {
  background: #fee2e2;
  color: #ef4444;
  transform: scale(1.05);
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.drawer-section {
  margin-bottom: 32px;
}

.drawer-section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e2e8f0;
}

.section-title svg {
  color: #3b82f6;
}

.folio-display {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  border: 1.5px solid #3b82f6;
}

.folio-display svg {
  font-size: 32px;
  color: #3b82f6;
}

.folio-label {
  display: block;
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.folio-value {
  display: block;
  font-size: 18px;
  color: #1e293b;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.badges-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.highlight {
  grid-column: 1 / -1;
  background: #fffbeb;
  border: 1.5px solid #fbbf24;
  padding: 12px;
  border-radius: 8px;
}

.detail-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-icon {
  color: #3b82f6;
}

.detail-value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
}

.detail-full {
  margin-top: 12px;
}

.detail-text {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  margin: 6px 0 0 0;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}

.inventory-types {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.type-badge {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-badge.official {
  background: #dbeafe;
  color: #1e40af;
  border: 1.5px solid #3b82f6;
}

.type-badge.local {
  background: #d1fae5;
  color: #065f46;
  border: 1.5px solid #10b981;
}

.type-badge.research {
  background: #e0e7ff;
  color: #4338ca;
  border: 1.5px solid #6366f1;
}

.admin-section {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  padding: 20px;
  border-radius: 12px;
  border: 2px solid #fbbf24;
}

.admin-warning-small {
  background: white;
  border: 1px solid #fbbf24;
  padding: 10px;
  border-radius: 6px;
  font-size: 12px;
  color: #92400e;
  margin-bottom: 16px;
  text-align: center;
  font-weight: 600;
}

.drawer-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 2px solid #e2e8f0;
  background: #f8fafc;
}

.btn-drawer {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-edit {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-edit:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-delete {
  background: #fee2e2;
  color: #dc2626;
  border: 1.5px solid #ef4444;
}

.btn-delete:hover {
  background: #fecaca;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .drawer-panel {
    width: 100%;
    max-width: 100%;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .drawer-footer {
    flex-direction: column;
  }
}
*/
