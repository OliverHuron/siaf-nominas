// =====================================================
// Vista de Correos Masivos - SIGAP
// Archivo: client/src/pages/Emails/EmailsView.jsx
// =====================================================

import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaUsers, FaCog, FaPaperPlane, FaGoogle, FaCheck, FaTimes, FaSignOutAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../services/api';
import './EmailsView.css';

const EmailsView = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Estados del formulario de correo
  const [emailForm, setEmailForm] = useState({
    recipients: '',
    recipientsList: [], // Array de objetos: { id, email, nombre, apellido_paterno, apellido_materno, tipo }
    subject: '',
    message: '',
    senderName: 'SIAF Sistema',
    delayBetweenEmails: 2000,
    includeConfirmation: false
  });

  // Estados de las listas de correos
  const [emailLists, setEmailLists] = useState([]);
  const [showListManager, setShowListManager] = useState(false);

  // Estados de plantillas
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    checkAuthStatus();
    loadEmailLists();
    loadTemplates();
    
    // Verificar si viene de autorización exitosa
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast.success('¡Gmail autorizado exitosamente! Ya puedes enviar correos masivos.');
      // Limpiar parámetros de la URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('error')) {
      const error = urlParams.get('error');
      if (error === 'auth_failed') {
        toast.error('Error al autorizar Gmail. Por favor intenta de nuevo.');
      } else if (error === 'no_code') {
        toast.error('Autorización cancelada.');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/api/gmail/auth/status');
      setIsAuthenticated(response.data.isAuthenticated);
      
      if (response.data.isAuthenticated) {
        loadUserInfo();
      } else {
        getAuthUrl();
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAuthUrl = async () => {
    try {
      const response = await api.get('/api/gmail/auth/url');
      setAuthUrl(response.data.authUrl);
    } catch (error) {
      console.error('Error obteniendo URL de autorización:', error);
      toast.error('Error obteniendo autorización de Gmail');
    }
  };

  const loadUserInfo = async () => {
    try {
      const response = await api.get('/api/gmail/user-info');
      setUserInfo(response.data.profile);
    } catch (error) {
      console.error('Error cargando información del usuario:', error);
    }
  };

  const loadEmailLists = async () => {
    try {
      const response = await api.get('/api/gmail/email-lists');
      setEmailLists(response.data.lists);
    } catch (error) {
      console.error('Error cargando listas:', error);
      toast.error('Error cargando listas de correos');
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await api.get('/api/email-templates/templates');
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando plantillas:', error);
    }
  };

  const applyTemplate = (templateId) => {
    if (!templateId) {
      setSelectedTemplate('');
      return;
    }

    const template = templates.find(t => t.id === parseInt(templateId));
    if (template) {
      setEmailForm({
        ...emailForm,
        subject: template.subject,
        message: template.message
      });
      setSelectedTemplate(templateId);
      toast.success(`Plantilla "${template.name}" aplicada`);
    }
  };

  const openTemplateManager = () => {
    setShowTemplateManager(true);
    setEditingTemplate(null);
    setTemplateForm({ name: '', subject: '', message: '' });
  };

  const openEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      message: template.message
    });
    setShowTemplateManager(true);
  };

  const closeTemplateManager = () => {
    setShowTemplateManager(false);
    setEditingTemplate(null);
    setTemplateForm({ name: '', subject: '', message: '' });
  };

  const saveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.message.trim()) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    try {
      if (editingTemplate) {
        // Actualizar plantilla existente
        await api.put(`/api/email-templates/templates/${editingTemplate.id}`, templateForm);
        toast.success('Plantilla actualizada exitosamente');
      } else {
        // Crear nueva plantilla
        await api.post('/api/email-templates/templates', templateForm);
        toast.success('Plantilla creada exitosamente');
      }
      
      loadTemplates();
      closeTemplateManager();
    } catch (error) {
      console.error('Error guardando plantilla:', error);
      toast.error('Error al guardar plantilla');
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta plantilla?')) {
      return;
    }

    try {
      await api.delete(`/api/email-templates/templates/${templateId}`);
      toast.success('Plantilla eliminada exitosamente');
      loadTemplates();
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      toast.error('Error al eliminar plantilla');
    }
  };

  const handleRecipientChange = (e) => {
    const value = e.target.value;
    setEmailForm({ ...emailForm, recipients: value });
    
    // Convertir texto a lista de objetos (solo email para escritura manual)
    const emails = value.split(',').map(email => email.trim()).filter(email => email);
    const recipientObjects = emails.map(email => ({ email }));
    setEmailForm(prev => ({ ...prev, recipientsList: recipientObjects }));
  };

  const addEmailList = (list) => {
    if (!list.emails || list.emails.length === 0) {
      toast.warning('Esta lista no tiene correos disponibles');
      return;
    }

    // Agregar objetos completos de empleados (no solo emails)
    const currentRecipients = emailForm.recipientsList;
    
    // Evitar duplicados por email
    const existingEmails = new Set(currentRecipients.map(r => r.email || r));
    const newRecipients = list.emails.filter(emp => !existingEmails.has(emp.email));
    
    const allRecipients = [...currentRecipients, ...newRecipients];
    
    // Actualizar el campo de texto solo con los emails para visualización
    const emailsText = allRecipients.map(r => r.email || r).join(', ');
    
    setEmailForm({
      ...emailForm,
      recipients: emailsText,
      recipientsList: allRecipients
    });
    
    toast.success(`${newRecipients.length} correos agregados de "${list.name}"`);
  };

  const sendMassEmail = async () => {
    if (!isAuthenticated) {
      toast.error('Primero debes autorizar Gmail');
      return;
    }

    if (emailForm.recipientsList.length === 0) {
      toast.error('Agrega al menos un destinatario');
      return;
    }

    if (!emailForm.subject.trim()) {
      toast.error('El asunto es requerido');
      return;
    }

    if (!emailForm.message.trim()) {
      toast.error('El mensaje es requerido');
      return;
    }

    setSending(true);

    try {
      const response = await api.post('/api/gmail/send-mass', {
        recipients: emailForm.recipientsList,
        subject: emailForm.subject,
        message: emailForm.message,
        senderName: emailForm.senderName,
        delayBetweenEmails: emailForm.delayBetweenEmails,
        useTemplate: selectedTemplate !== '', // Indica si usó plantilla para personalizar
        templateId: selectedTemplate || null,
        includeConfirmation: emailForm.includeConfirmation || false
      });

      toast.success(`¡Correo enviado exitosamente a ${response.data.stats.sent} destinatarios!`);
      
      if (response.data.stats.failed > 0) {
        toast.warning(`${response.data.stats.failed} correos fallaron. Revisa la consola para detalles.`);
      }

      // Limpiar formulario
      setEmailForm({
        recipients: '',
        recipientsList: [],
        subject: '',
        message: '',
        senderName: 'SIAF Sistema',
        delayBetweenEmails: 2000,
        includeConfirmation: false
      });
      setSelectedTemplate('');

    } catch (error) {
      console.error('Error enviando correo:', error);
      toast.error('Error enviando correo masivo');
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('¿Estás seguro de cerrar sesión de Gmail?')) {
      return;
    }

    try {
      await api.post('/api/gmail/auth/logout');
      setIsAuthenticated(false);
      setUserInfo(null);
      setAuthUrl('');
      toast.success('Sesión cerrada exitosamente');
      // Recargar URL de autenticación
      getAuthUrl();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      toast.error('Error cerrando sesión de Gmail');
    }
  };

  if (loading) {
    return <div className="loading">Cargando módulo de correos...</div>;
  }

  return (
    <div className="emails-container">
      <div className="emails-header">
        <div>
          <h1><FaEnvelope /> Gestión de Correos</h1>
          <p className="subtitle">Envío masivo de correos con Gmail API</p>
        </div>
        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <div className="auth-status success">
                <FaCheck /> Gmail Configurado
              </div>
              <button className="btn btn-outline-danger" onClick={handleLogout}>
                <FaSignOutAlt /> Cerrar Sesión
              </button>
            </>
          ) : (
            <div className="auth-status error">
              <FaTimes /> Gmail No Configurado
            </div>
          )}
        </div>
      </div>

      {!isAuthenticated ? (
        // Sección de autenticación
        <div className="email-card">
          <div className="card-body text-center">
            <div className="auth-setup">
              <FaGoogle size={48} color="#4285f4" />
              <h3>Configurar Gmail API</h3>
              <p>Para enviar correos masivos, necesitas autorizar el acceso a Gmail.</p>
              
              {authUrl && (
                <div className="auth-actions">
                  <a 
                    href={authUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    <FaGoogle /> Autorizar Gmail
                  </a>
                  <p className="auth-help">
                    Después de autorizar, regresa aquí y recarga la página.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Interfaz principal
        <div className="emails-interface">
          {/* Información del usuario */}
          {userInfo && (
            <div className="user-info-card">
              <div className="user-info">
                <FaEnvelope />
                <span>{userInfo.emailAddress}</span>
                <small>{userInfo.messagesTotal} mensajes totales</small>
              </div>
            </div>
          )}

          <div className="email-composer">
            <div className="email-card">
              <div className="card-header">
                <h3><FaPaperPlane /> Envío Masivo</h3>
              </div>
              <div className="card-body">
                {/* Configuración de remitente */}
                <div className="form-group">
                  <label>Nombre del remitente</label>
                  <input
                    type="text"
                    className="form-control"
                    value={emailForm.senderName}
                    onChange={(e) => setEmailForm({...emailForm, senderName: e.target.value})}
                    placeholder="SIAF Sistema"
                  />
                </div>

                {/* Destinatarios */}
                <div className="form-group">
                  <label>Destinatarios (separados por comas)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={emailForm.recipients}
                    onChange={handleRecipientChange}
                    placeholder="email1@example.com, email2@example.com, ..."
                  />
                  <small className="form-text">
                    {emailForm.recipientsList.length} destinatarios encontrados
                  </small>
                </div>

                {/* Listas rápidas */}
                <div className="email-lists">
                  <label>Listas predefinidas</label>
                  <div className="list-buttons">
                    {emailLists.map(list => (
                      <button
                        key={list.id}
                        className="btn btn-outline btn-sm"
                        onClick={() => addEmailList(list)}
                        title={list.description}
                      >
                        <FaUsers /> {list.name} ({list.count})
                      </button>
                    ))}
                  </div>
                  {emailLists.length === 0 && (
                    <small className="form-text">No hay listas disponibles. Asegúrate de tener empleados con correos en el sistema.</small>
                  )}
                </div>

                {/* Plantillas */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0 }}>Plantilla (opcional)</label>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={openTemplateManager}
                      title="Gestionar plantillas"
                    >
                      <FaCog /> Gestionar
                    </button>
                  </div>
                  <select
                    className="form-control"
                    value={selectedTemplate}
                    onChange={(e) => applyTemplate(e.target.value)}
                  >
                    <option value="">Seleccionar plantilla...</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <small className="form-text">
                    Selecciona una plantilla para rellenar automáticamente el asunto y mensaje
                  </small>
                </div>

                {/* Asunto */}
                <div className="form-group">
                  <label>Asunto *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                    placeholder="Asunto del correo"
                    required
                  />
                </div>

                {/* Mensaje */}
                <div className="form-group">
                  <label>Mensaje *</label>
                  <textarea
                    className="form-control message-textarea"
                    rows="6"
                    value={emailForm.message}
                    onChange={(e) => setEmailForm({...emailForm, message: e.target.value})}
                    placeholder="Escribe tu mensaje aquí... (HTML permitido)"
                    required
                  />
                  {selectedTemplate && (
                    <small className="form-text" style={{ color: '#10b981' }}>
                      ✨ Variables personalizadas activas: {'{'}nombre_completo{'}'}, {'{'}email{'}'}, {'{'}tipo{'}'}, {'{'}fecha_actual{'}'}
                      <br />
                      Se reemplazarán automáticamente para cada destinatario
                    </small>
                  )}
                </div>

                {/* Configuración avanzada */}
                <div className="advanced-settings">
                  <details open>
                    <summary>Configuración avanzada</summary>
                    <div className="form-group">
                      <label>Delay entre correos (ms)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={emailForm.delayBetweenEmails}
                        onChange={(e) => setEmailForm({...emailForm, delayBetweenEmails: parseInt(e.target.value)})}
                        min="1000"
                        step="500"
                      />
                      <small className="form-text">
                        Tiempo de espera entre cada envío (recomendado: 2000ms)
                      </small>
                    </div>

                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={emailForm.includeConfirmation || false}
                          onChange={(e) => setEmailForm({...emailForm, includeConfirmation: e.target.checked})}
                          style={{ margin: 0 }}
                        />
                        Incluir botón de confirmación en el correo
                      </label>
                      <small className="form-text">
                        Se añadirá un botón "Confirmar recepción" al final del mensaje. Cada clic se registrará en el historial.
                      </small>
                    </div>
                  </details>
                </div>

                {/* Botón de envío */}
                <div className="send-actions">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={sendMassEmail}
                    disabled={sending || emailForm.recipientsList.length === 0}
                  >
                    {sending ? (
                      <>Enviando... ({emailForm.recipientsList.length} correos)</>
                    ) : (
                      <><FaPaperPlane /> Enviar Correo Masivo</>
                    )}
                  </button>
                </div>

                {/* Información sobre la estrategia */}
                <div className="strategy-info">
                  <h4>¿Cómo funciona?</h4>
                  <ul>
                    <li>📤 <strong>Envío individual:</strong> Cada correo se envía por separado para evitar spam</li>
                    <li>🧹 <strong>Limpieza automática:</strong> Los correos individuales se eliminan de "Enviados"</li>
                    <li>📋 <strong>Evidencia limpia:</strong> Se crea un solo correo con todos los destinatarios en CCO</li>
                    <li>✅ <strong>Resultado:</strong> Tu bandeja de "Enviados" solo muestra un correo organizado</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de gestión de plantillas */}
      {showTemplateManager && (
        <div className="modal-overlay" onClick={closeTemplateManager}>
          <div className="modal-content template-manager-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTemplate ? 'Editar Plantilla' : 'Crear Nueva Plantilla'}</h3>
              <button className="btn-close" onClick={closeTemplateManager}>
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre de la plantilla *</label>
                <input
                  type="text"
                  className="form-control"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                  placeholder="Ej: Recordatorio mensual"
                />
              </div>

              <div className="form-group">
                <label>Asunto *</label>
                <input
                  type="text"
                  className="form-control"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})}
                  placeholder="Asunto del correo"
                />
              </div>

              <div className="form-group">
                <label>Mensaje *</label>
                <textarea
                  className="form-control"
                  rows="8"
                  value={templateForm.message}
                  onChange={(e) => setTemplateForm({...templateForm, message: e.target.value})}
                  placeholder="Escribe el mensaje aquí...&#10;&#10;Puedes usar variables como:&#10;{nombre_completo}&#10;{email}&#10;{dependencia}"
                />
                <small className="form-text">
                  Variables disponibles: {'{'}nombre_completo{'}'}, {'{'}email{'}'}, {'{'}dependencia{'}'}, {'{'}fecha_actual{'}'}
                </small>
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={closeTemplateManager}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={saveTemplate}>
                  {editingTemplate ? 'Actualizar' : 'Crear'} Plantilla
                </button>
              </div>

              {/* Lista de plantillas existentes */}
              {!editingTemplate && templates.length > 0 && (
                <div className="templates-list">
                  <h4>Plantillas existentes</h4>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Asunto</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {templates.map(template => (
                          <tr key={template.id}>
                            <td>{template.name}</td>
                            <td>{template.subject}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => openEditTemplate(template)}
                                title="Editar"
                              >
                                Editar
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => deleteTemplate(template.id)}
                                title="Eliminar"
                                style={{ marginLeft: '5px' }}
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailsView;
