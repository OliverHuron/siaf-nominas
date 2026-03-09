import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaKey, FaUserCheck, FaUserSlash, FaTrash, FaUsers, FaCheckCircle, FaUserShield, FaStar } from 'react-icons/fa';
import UserForm from './UserForm';
import api from '../../services/api';
import './UsersView.css';

const UsersView = () => {
  const [users, setUsers] = useState([]);
  const [coordinaciones, setCoordinaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({});

  // Estados del formulario
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Modal de contraseña
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      fetchUsers(),
      fetchStats(),
      fetchCoordinaciones()
    ]);
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
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

  const handleCreate = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleFormSubmit = async (data) => {
    try {
      let response;

      if (editingUser) {
        response = await api.put(`/api/users/${editingUser.id}`, data);
      } else {
        response = await api.post('/api/users', data);
      }

      if (response.data.success) {
        setSuccess(editingUser ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');
        setShowForm(false);
        setEditingUser(null);
        loadData();

        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const openPasswordModal = (user) => {
    setEditingUser(user);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const response = await api.patch(`/api/users/${editingUser.id}/password`, {
        newPassword: newPassword
      });

      if (response.data.success) {
        setSuccess('Contraseña actualizada exitosamente');
        setIsPasswordModalOpen(false);
        setNewPassword('');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error al cambiar contraseña');
    }
  };

  const handleToggleStatus = async (userId) => {
    if (!window.confirm('¿Está seguro de cambiar el estado de este usuario?')) {
      return;
    }

    try {
      const response = await api.patch(`/api/users/${userId}/toggle-status`);
      if (response.data.success) {
        setSuccess(response.data.message);
        fetchUsers();
        fetchStats();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError('Error al cambiar estado del usuario');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('¿Está seguro de desactivar este usuario?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/users/${userId}`);
      if (response.data.success) {
        setSuccess(response.data.message);
        loadData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError('Error al eliminar usuario');
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { class: 'badge-admin', text: 'Administrador' },
      coordinador: { class: 'badge-coordinador', text: 'Coordinador' },
      usuario: { class: 'badge-usuario', text: 'Usuario' }
    };
    return badges[role] || badges.usuario;
  };

  if (loading) {
    return (
      <div className="users-view">
        <div className="loading-spinner">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="users-view">
      {/* Header */}
      <div className="users-header">
        <div className="header-content">
          <h1>Gestión de Usuarios</h1>
          <p>Administra usuarios y permisos del sistema</p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          <FaPlus /> Nuevo Usuario
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div className="alert alert-error">
          <span>⚠️</span> {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span>✅</span> {success}
        </div>
      )}

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon"><FaUsers /></div>
          <div className="stat-content">
            <div className="stat-number">{stats.total || 0}</div>
            <div className="stat-label">Total Usuarios</div>
          </div>
        </div>
        <div className="stat-card stat-activos">
          <div className="stat-icon"><FaCheckCircle /></div>
          <div className="stat-content">
            <div className="stat-number">{stats.activos || 0}</div>
            <div className="stat-label">Activos</div>
          </div>
        </div>
        <div className="stat-card stat-admin">
          <div className="stat-icon"><FaUserShield /></div>
          <div className="stat-content">
            <div className="stat-number">{stats.administradores || 0}</div>
            <div className="stat-label">Administradores</div>
          </div>
        </div>
        <div className="stat-card stat-coordinador">
          <div className="stat-icon"><FaStar /></div>
          <div className="stat-content">
            <div className="stat-number">{stats.coordinadores || 0}</div>
            <div className="stat-label">Coordinadores</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Coordinación</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const badge = getRoleBadge(user.role);
              return (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-name">
                        {user.nombre} {user.apellido_paterno} {user.apellido_materno}
                      </div>
                      <div className="user-id">ID: {user.id}</div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.telefono || '-'}</td>
                  <td>
                    <span className="coordinacion-badge">
                      {user.coordinacion_nombre || 'Sin asignar'}
                    </span>
                  </td>
                  <td>
                    <span className={`role-badge ${badge.class}`}>
                      {badge.text}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.activo ? 'status-active' : 'status-inactive'}`}>
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn edit"
                        onClick={() => handleEdit(user)}
                        title="Editar usuario"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="action-btn password"
                        onClick={() => openPasswordModal(user)}
                        title="Cambiar contraseña"
                      >
                        <FaKey />
                      </button>
                      <button
                        className={`action-btn ${user.activo ? 'deactivate' : 'activate'}`}
                        onClick={() => handleToggleStatus(user.id)}
                        title={user.activo ? 'Desactivar' : 'Activar'}
                      >
                        {user.activo ? <FaUserSlash /> : <FaUserCheck />}
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(user.id)}
                        title="Eliminar usuario"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h3>No hay usuarios registrados</h3>
            <p>Comienza creando el primer usuario del sistema</p>
            <button className="btn-primary" onClick={handleCreate}>
              <FaPlus /> Crear Usuario
            </button>
          </div>
        )}
      </div>

      {/* Modal de Formulario */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <UserForm
              initialData={editingUser}
              coordinaciones={coordinaciones}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingUser(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de Contraseña */}
      {isPasswordModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="modal-content password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cambiar Contraseña</h2>
              <button
                className="modal-close"
                onClick={() => setIsPasswordModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="password-form">
              <div className="user-info-display">
                <strong>
                  {editingUser?.nombre} {editingUser?.apellido_paterno}
                </strong>
                <span className="user-email">{editingUser?.email}</span>
              </div>
              <div className="form-group">
                <label>Nueva Contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength="6"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
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

export default UsersView;
