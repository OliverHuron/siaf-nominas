import React, { useState, useEffect } from 'react';
import { requestService } from '../services/services';
import { toast } from 'react-toastify';
import { FaPlus } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    tipo: 'mantenimiento',
    asunto: '',
    descripcion: ''
  });

  const [selectedFilter, setSelectedFilter] = useState('all');

  const [editData, setEditData] = useState({
    estado: '',
    prioridad: ''
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await requestService.getAll();
      setRequests(res.data.data);
    } catch (error) {
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await requestService.create(formData);
      toast.success('Solicitud creada');
      setShowModal(false);
      setFormData({ tipo: 'mantenimiento', asunto: '', descripcion: '' });
      loadRequests();
    } catch (error) {
      toast.error('Error al crear solicitud');
    }
  };

  const handleEditSubmit = async () => {
    if (editingRequest) {
      try {
        console.log('Datos a enviar:', editData);
        console.log('Request ID:', editingRequest.id);
        
        const updateData = {};
        if (editData.estado) updateData.estado = editData.estado;
        if (editData.prioridad) updateData.prioridad = editData.prioridad;
        
        console.log('Update data:', updateData);

        const response = await requestService.updateStatus(editingRequest.id, updateData);
        console.log('Response:', response);
        
        toast.success('Solicitud actualizada');
        loadRequests();
        setShowEditModal(false);
        setEditingRequest(null);
        setEditData({ estado: '', prioridad: '' });
      } catch (error) {
        console.error('Error completo:', error);
        console.error('Error response:', error.response?.data);
        toast.error('Error al actualizar: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleEdit = (request) => {
    console.log('Editando solicitud:', request);
    setEditingRequest(request);
    setEditData({
      estado: request.estado || 'pendiente',
      prioridad: request.prioridad || 'media'
    });
    console.log('Datos iniciales para edición:', {
      estado: request.estado || 'pendiente',
      prioridad: request.prioridad || 'media'
    });
    setShowEditModal(true);
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente: 'badge-warning',
      aceptada: 'badge-info',
      en_proceso: 'badge-primary',
      completada: 'badge-success',
      rechazada: 'badge-danger',
      no_resuelta: 'badge-secondary'
    };
    return badges[estado] || 'badge-secondary';
  };

  const getPrioridadBadge = (prioridad) => {
    const badges = {
      baja: 'badge-secondary',
      media: 'badge-info',
      alta: 'badge-warning',
      urgente: 'badge-danger'
    };
    return badges[prioridad] || 'badge-secondary';
  };

  const canManageRequests = user?.role === 'admin' || user?.role === 'coordinador';
  const canCreateRequests = user?.role === 'usuario' || user?.role === 'coordinador';

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Solicitudes</h1>
        <p>
          {canManageRequests 
            ? 'Gestión completa de solicitudes del sistema' 
            : 'Mis solicitudes de equipos y servicios'
          }
        </p>
      </div>

      <div className="card">
          <div className="card-header flex-between">
          <h3>
            {canManageRequests ? 'Todas las Solicitudes' : 'Mis Solicitudes'}
          </h3>
        </div>

        <div className="table-container">
          <div className="requests-filters" style={{marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            {['all','pendiente','aceptada','en_proceso','completada','rechazada','no_resuelta'].map((st) => (
              <button
                key={st}
                className={`btn btn-sm ${selectedFilter === st ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setSelectedFilter(st)}
                style={{textTransform: 'capitalize'}}
              >
                {st === 'all' ? 'Todas' : st.replace('_',' ')}
              </button>
            ))}
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Asunto</th>
                {canManageRequests && <th>Usuario</th>}
                <th>Estado</th>
                {canManageRequests && <th>Prioridad</th>}
                <th>Fecha</th>
                {canManageRequests && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {requests
                .filter((r) => {
                  if (selectedFilter === 'all') return true;
                  return r.estado === selectedFilter;
                })
                .map((req) => (
                <tr key={req.id}>
                  <td>{req.tipo}</td>
                  <td>{req.asunto}</td>
                  {canManageRequests && (
                    <td>
                      {req.nombre} {req.apellido_paterno}
                      <br />
                      <small className="text-muted">{req.dependencia_nombre}</small>
                    </td>
                  )}
                  <td>
                    <span className={`badge ${getEstadoBadge(req.estado)}`}>
                      {req.estado}
                    </span>
                  </td>
                  {canManageRequests && (
                    <td>
                      <span className={`badge ${getPrioridadBadge(req.prioridad)}`}>
                        {req.prioridad}
                      </span>
                    </td>
                  )}
                  <td>{new Date(req.created_at).toLocaleDateString()}</td>
                  {canManageRequests && (
                    <td>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleEdit(req)}
                        style={{padding: '6px 12px', fontSize: '12px'}}
                      >
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAB para crear solicitud (visible para coordinador y usuario) */}
      {canCreateRequests && (
        <button
          className="fab"
          onClick={() => setShowModal(true)}
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0d6efd',
            color: '#fff',
            border: 'none',
            boxShadow: '0 6px 12px rgba(0,0,0,0.12)',
            cursor: 'pointer',
            zIndex: 2000
          }}
          aria-label="Nueva solicitud"
        >
          <FaPlus />
        </button>
      )}

      {/* Modal de crear solicitud - solo para roles con permiso */}
      {showModal && canCreateRequests && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nueva Solicitud</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Tipo de Solicitud *</label>
                  <select
                    className="form-control"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    required
                  >
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="reparacion">Reparación</option>
                    <option value="asistencia">Asistencia</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Asunto *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.asunto}
                    onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    className="form-control"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows="4"
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Crear Solicitud
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de editar solicitud - solo para administradores */}
      {showEditModal && editingRequest && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Solicitud</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label><strong>Solicitud:</strong></label>
                <p>{editingRequest.asunto}</p>
              </div>
              <div className="form-group">
                <label><strong>Descripción:</strong></label>
                <p>{editingRequest.descripcion || 'Sin descripción'}</p>
              </div>
              <div className="form-group">
                <label>Estado *</label>
                <select
                  className="form-control"
                  value={editData.estado}
                  onChange={(e) => setEditData({ ...editData, estado: e.target.value })}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="aceptada">Aceptada</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="completada">Completada</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="no_resuelta">No Resuelta</option>
                </select>
              </div>
              <div className="form-group">
                <label>Prioridad *</label>
                <select
                  className="form-control"
                  value={editData.prioridad}
                  onChange={(e) => setEditData({ ...editData, prioridad: e.target.value })}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleEditSubmit}>
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
