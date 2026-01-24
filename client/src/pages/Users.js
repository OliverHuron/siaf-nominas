import React, { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/pages.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({});
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    email: '',
    password: '',
    role: 'usuario',
    rfc: '',
    telefono: '',
    coordinacion_id: null,
    activo: true
  });
  const [newPassword, setNewPassword] = useState('');
  const [coordinaciones, setCoordinaciones] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchCoordinaciones();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('🔍 Fetching users...');
      const response = await api.get('/api/users');
      console.log('📦 Response received:', response);
      
      if (response.data.success) {
        console.log('✅ Users loaded:', response.data.data);
        setUsers(response.data.data);
      } else {
        console.log('❌ API Error:', response.data.message);
        setError(response.data.message);
      }
    } catch (error) {
      console.log('💥 Catch Error:', error);
      console.log('💥 Error Response:', error.response);
      setError(`Error al cargar usuarios: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/users/stats');
      
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas');
    }
  };

  const fetchCoordinaciones = async () => {
    try {
      const response = await api.get('/api/coordinaciones');
      if (response.data.success) {
        setCoordinaciones(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar coordinaciones:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      console.log('📝 Submitting form with data:', formData);
      
      const body = editingUser 
        ? {
            nombre: formData.nombre,
            apellido_paterno: formData.apellido_paterno,
            apellido_materno: formData.apellido_materno,
            email: formData.email,
            role: formData.role,
            rfc: formData.rfc || null,
            telefono: formData.telefono || null,
            coordinacion_id: formData.coordinacion_id || null,
            activo: formData.activo !== undefined ? formData.activo : true
          }
        : formData;

      console.log('📤 Sending body:', body);
      console.log('🎯 Target URL:', editingUser ? `/users/${editingUser.id}` : '/users');

      const response = editingUser
        ? await api.put(`/api/users/${editingUser.id}`, body)
        : await api.post('/api/users', body);

      console.log('📦 Submit response:', response);

      if (response.data.success) {
        console.log('✅ Submit success:', response.data.message);
        setSuccess(response.data.message);
        closeModal();
        fetchUsers();
        fetchStats();
      } else {
        console.log('❌ Submit API error:', response.data.message);
        setError(response.data.message);
      }
    } catch (error) {
      console.log('💥 Submit catch error:', error);
      console.log('💥 Submit error response:', error.response);
      setError(`Error al procesar solicitud: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.patch(`/api/users/${editingUser.id}/password`, { newPassword });

      if (response.data.success) {
        setSuccess(response.data.message);
        setIsPasswordModalOpen(false);
        setNewPassword('');
        setEditingUser(null);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError('Error al cambiar contraseña');
    }
  };

  const handleToggleStatus = async (userId) => {
    // Encontrar el usuario para mostrar el mensaje correcto
    const user = users.find(u => u.id === userId);
    const action = user?.activo ? 'desactivar' : 'activar';
    
    if (!window.confirm(`¿Está seguro de que desea ${action} este usuario?`)) {
      return;
    }

    try {
      const response = await api.patch(`/api/users/${userId}/toggle-status`);

      if (response.data.success) {
        setSuccess(response.data.message);
        fetchUsers();
        fetchStats();
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Error en toggle status:', error);
      setError('Error al cambiar estado del usuario');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('¿Está seguro de que desea desactivar este usuario?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/users/${userId}`);

      if (response.data.success) {
        setSuccess(response.data.message);
        fetchUsers();
        fetchStats();
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError('Error al eliminar usuario');
    }
  };

  const openModal = (user = null) => {
    setEditingUser(user);
    setFormData(user ? {
      nombre: user.nombre,
      apellido_paterno: user.apellido_paterno,
      apellido_materno: user.apellido_materno || '',
      email: user.email,
      role: user.role,
      rfc: user.rfc || '',
      telefono: user.telefono || '',
      coordinacion_id: user.coordinacion_id || null,
      activo: user.activo
    } : {
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      email: '',
      password: '',
      role: 'usuario',
      rfc: '',
      telefono: '',
      coordinacion_id: null,
      activo: true
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      email: '',
      password: '',
      role: 'usuario',
      rfc: '',
      telefono: '',
      coordinacion_id: null,
      activo: true
    });
  };

  const openPasswordModal = (user) => {
    setEditingUser(user);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'badge-admin';
      case 'coordinador': return 'badge-coordinador';
      default: return 'badge-usuario';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">Administra usuarios y permisos del sistema</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => openModal()}
        >
          <span className="icon">👤</span>
          Nuevo Usuario
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="icon">⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="icon">✅</span>
          {success}
        </div>
      )}

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{stats.total || 0}</div>
            <div className="stat-label">Total Usuarios</div>
          </div>
        </div>
        <div className="stat-card stat-activos">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.activos || 0}</div>
            <div className="stat-label">Activos</div>
          </div>
        </div>
        <div className="stat-card stat-admin">
          <div className="stat-icon">👑</div>
          <div className="stat-content">
            <div className="stat-number">{stats.administradores || 0}</div>
            <div className="stat-label">Administradores</div>
          </div>
        </div>
        <div className="stat-card stat-coordinador">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-number">{stats.coordinadores || 0}</div>
            <div className="stat-label">Coordinadores</div>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>RFC</th>
              <th>Teléfono</th>
              <th>Coordinación</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.nombre?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="user-details">
                      <div className="user-name">
                        {user.nombre} {user.apellido_paterno} {user.apellido_materno}
                      </div>
                      <div className="user-id">ID: {user.id}</div>
                    </div>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>{user.rfc || '-'}</td>
                <td>{user.telefono || '-'}</td>
                <td>{user.coordinacion_nombre || '-'}</td>
                <td>
                  <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status ${user.activo ? 'status-active' : 'status-inactive'}`}>
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>{formatDate(user.created_at)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => openModal(user)}
                      title="Editar usuario"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-password"
                      onClick={() => openPasswordModal(user)}
                      title="Cambiar contraseña"
                    >
                      🔑
                    </button>
                    <button
                      className={`btn-icon ${user.activo ? 'btn-deactivate' : 'btn-activate'}`}
                      onClick={() => handleToggleStatus(user.id)}
                      title={user.activo ? 'Desactivar' : 'Activar'}
                    >
                      {user.activo ? '🚫' : '✅'}
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(user.id)}
                      title="Eliminar usuario"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h3>No hay usuarios registrados</h3>
            <p>Comienza creando el primer usuario del sistema</p>
            <button 
              className="btn-primary"
              onClick={() => openModal()}
            >
              Crear Usuario
            </button>
          </div>
        )}
      </div>

      {/* Modal para crear/editar usuario */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Apellido Paterno</label>
                  <input
                    type="text"
                    value={formData.apellido_paterno}
                    onChange={(e) => setFormData({...formData, apellido_paterno: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, apellido_materno: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>
              {!editingUser && (
                <div className="form-group">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength="6"
                  />
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>RFC</label>
                  <input
                    type="text"
                    value={formData.rfc}
                    onChange={(e) => setFormData({...formData, rfc: e.target.value.toUpperCase()})}
                    placeholder="XAXX010101000"
                    maxLength="13"
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    placeholder="4431234567"
                    maxLength="10"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Coordinación</label>
                  <select
                    value={formData.coordinacion_id || ''}
                    onChange={(e) => setFormData({...formData, coordinacion_id: e.target.value ? parseInt(e.target.value) : null})}
                  >
                    <option value="">Sin coordinación asignada</option>
                    {coordinaciones.map(coord => (
                      <option key={coord.id} value={coord.id}>
                        {coord.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Rol</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    required
                  >
                    <option value="usuario">Usuario</option>
                    <option value="coordinador">Coordinador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                {editingUser && (
                  <div className="form-group">
                    <label>Estado</label>
                    <select
                      value={formData.activo}
                      onChange={(e) => setFormData({...formData, activo: e.target.value === 'true'})}
                    >
                      <option value={true}>Activo</option>
                      <option value={false}>Inactivo</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Actualizar' : 'Crear'} Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para cambiar contraseña */}
      {isPasswordModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cambiar Contraseña</h2>
              <button className="modal-close" onClick={() => setIsPasswordModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleChangePassword} className="modal-form">
              <div className="user-info-modal">
                <strong>{editingUser?.nombre} {editingUser?.apellido_paterno}</strong>
                <span>{editingUser?.email}</span>
              </div>
              <div className="form-group">
                <label>Nueva Contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength="6"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsPasswordModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Cambiar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
