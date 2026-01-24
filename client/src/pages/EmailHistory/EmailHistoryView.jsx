// =====================================================
// Vista de Historial de Correos - SIAF
// Archivo: client/src/pages/EmailHistory/EmailHistoryView.jsx
// =====================================================

import React, { useState, useEffect } from 'react';
import { FaHistory, FaEnvelope, FaUsers, FaCheckCircle, FaTimesCircle, FaCalendarAlt, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './EmailHistoryView.css';

const EmailHistoryView = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    searchTerm: ''
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/gmail/email-history');
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Error cargando historial:', error);
      toast.error('Error al cargar historial de correos');
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = (email) => {
    setSelectedEmail(email);
    setShowDetailModal(true);
    loadRecipients(email.id);
  };

  const closeModal = () => {
    setShowDetailModal(false);
    setSelectedEmail(null);
    setRecipients([]);
    setLoadingRecipients(false);
  };

  const loadRecipients = async (historyId) => {
    try {
      setLoadingRecipients(true);
      const response = await api.get(`/api/gmail/email-history/${historyId}/recipients`);
      setRecipients(response.data.recipients || []);
    } catch (error) {
      console.error('Error cargando destinatarios:', error);
      toast.error('Error al cargar detalles por destinatario');
    } finally {
      setLoadingRecipients(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = !filters.searchTerm || 
      item.subject.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    const itemDate = new Date(item.created_at);
    const matchesStartDate = !filters.startDate || 
      itemDate >= new Date(filters.startDate);
    const matchesEndDate = !filters.endDate || 
      itemDate <= new Date(filters.endDate);

    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  // Calcular estadísticas
  const stats = {
    total: history.length,
    totalSent: history.reduce((sum, item) => sum + (item.sent_count || 0), 0),
    totalFailed: history.reduce((sum, item) => sum + (item.failed_count || 0), 0),
    totalRecipients: history.reduce((sum, item) => sum + (item.recipients_count || 0), 0)
  };

  return (
    <div className="email-history-container">
      <div className="page-header">
        <div className="header-content">
          <h1><FaHistory /> Historial de Correos</h1>
          <p className="subtitle">Registro de todos los correos masivos enviados</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#3b82f6' }}>
            <FaEnvelope />
          </div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Envíos masivos</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b981' }}>
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <h3>{stats.totalSent}</h3>
            <p>Correos enviados</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ef4444' }}>
            <FaTimesCircle />
          </div>
          <div className="stat-content">
            <h3>{stats.totalFailed}</h3>
            <p>Fallidos</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#8b5cf6' }}>
            <FaUsers />
          </div>
          <div className="stat-content">
            <h3>{stats.totalRecipients}</h3>
            <p>Total destinatarios</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Buscar</label>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por asunto..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
          />
        </div>

        <div className="filter-group">
          <label>Desde</label>
          <input
            type="date"
            className="form-control"
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
          />
        </div>

        <div className="filter-group">
          <label>Hasta</label>
          <input
            type="date"
            className="form-control"
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
          />
        </div>

        <button 
          className="btn btn-secondary"
          onClick={() => setFilters({ startDate: '', endDate: '', searchTerm: '' })}
        >
          Limpiar filtros
        </button>
      </div>

      {/* Tabla de historial */}
      <div className="history-table-container">
        {loading ? (
          <div className="loading-state">
            <p>Cargando historial...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="empty-state">
            <FaHistory size={48} color="#94a3b8" />
            <h3>No hay registros</h3>
            <p>Aún no se han enviado correos masivos</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Asunto</th>
                <th>Destinatarios</th>
                <th>Enviados</th>
                <th>Fallidos</th>
                <th>Aperturas</th>
                <th>Plantilla</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="date-cell">
                      <FaCalendarAlt />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </td>
                  <td>
                    <strong>{item.subject}</strong>
                  </td>
                  <td className="text-center">{item.recipients_count}</td>
                  <td className="text-center">
                    <span className="badge badge-success">{item.sent_count}</span>
                  </td>
                  <td className="text-center">
                    {item.failed_count > 0 ? (
                      <span className="badge badge-danger">{item.failed_count}</span>
                    ) : (
                      <span className="badge badge-secondary">0</span>
                    )}
                  </td>
                  <td className="text-center">
                    {item.opened_count > 0 ? (
                      <span className="badge badge-info" title={`Primera apertura: ${item.first_opened_at ? formatDate(item.first_opened_at) : 'N/A'}`}>
                        👁️ {item.opened_count}
                      </span>
                    ) : (
                      <span className="badge badge-secondary">Sin abrir</span>
                    )}
                  </td>
                  <td>
                    {item.used_variables ? (
                      <span className="badge badge-info">Personalizado</span>
                    ) : (
                      <span className="badge badge-secondary">Estándar</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => viewDetails(item)}
                      title="Ver detalles"
                    >
                      <FaEye /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de detalles */}
      {showDetailModal && selectedEmail && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content email-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalles del envío</h3>
              <button className="btn-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h4>Información general</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Fecha de envío:</label>
                    <span>{formatDate(selectedEmail.created_at)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Asunto:</label>
                    <span>{selectedEmail.subject}</span>
                  </div>
                  <div className="detail-item">
                    <label>Total destinatarios:</label>
                    <span>{selectedEmail.recipients_count}</span>
                  </div>
                  <div className="detail-item">
                    <label>Enviados exitosamente:</label>
                    <span className="text-success">{selectedEmail.sent_count}</span>
                  </div>
                  <div className="detail-item">
                    <label>Fallidos:</label>
                    <span className="text-danger">{selectedEmail.failed_count}</span>
                  </div>
                  <div className="detail-item">
                    <label>Aperturas:</label>
                    <span>{selectedEmail.opened_count || 0}</span>
                  </div>
                  <div className="detail-item">
                    <label>Primera apertura:</label>
                    <span>{selectedEmail.first_opened_at ? formatDate(selectedEmail.first_opened_at) : 'Sin abrir'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Última apertura:</label>
                    <span>{selectedEmail.last_opened_at ? formatDate(selectedEmail.last_opened_at) : 'Sin abrir'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Variables personalizadas:</label>
                    <span>{selectedEmail.used_variables ? 'Sí' : 'No'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Mensaje enviado</h4>
                <div className="message-preview">
                  {selectedEmail.message}
                </div>
              </div>

              <div className="detail-section">
                <h4>Destinatarios individuales</h4>
                {loadingRecipients ? (
                  <p>Cargando destinatarios...</p>
                ) : recipients.length === 0 ? (
                  <p>No hay información detallada de destinatarios para este envío.</p>
                ) : (
                  <div className="recipients-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Correo</th>
                          <th>Nombre</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipients.map((r) => (
                          <tr key={r.id}>
                            <td>{r.recipient_email}</td>
                            <td>{r.recipient_name || '-'}</td>
                            <td>
                              {r.status === 'confirmado' && <span className="badge badge-success">Confirmado</span>}
                              {r.status === 'abierto' && <span className="badge badge-info">Abierto</span>}
                              {r.status === 'fallido' && <span className="badge badge-danger">Fallido</span>}
                              {r.status === 'enviado' && <span className="badge badge-secondary">Enviado</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selectedEmail.failed_count > 0 && selectedEmail.failed_emails && (
                <div className="detail-section">
                  <h4>Correos fallidos ({selectedEmail.failed_count})</h4>
                  <div className="failed-list">
                    {selectedEmail.failed_emails.map((failed, index) => (
                      <div key={index} className="failed-item">
                        <span className="failed-email">{failed.email}</span>
                        <span className="failed-reason">{failed.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailHistoryView;
