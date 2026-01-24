import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../styles/pages.css';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const TechnicalForms = () => {
  const { user } = useAuth();
  const [fichas, setFichas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedFicha, setExpandedFicha] = useState(null);
  const [formData, setFormData] = useState({
    nombreCoordinacion: '',
    nombreCoordinador: '',
    nombreEvento: '',
    fechaEvento: '',
    tipoEvento: '',
    modalidad: '',
    fechaLimiteInscripcion: '',
    requiereInscripcion: false,
    esGratuito: true,
    costo: '',
    dirigidoA: '',
    lugarEvento: '',
    talleristas: '',
    objetivos: '',
    temas: '',
    observaciones: ''
  });

  useEffect(() => {
    fetchFichas();
  }, []);

  const fetchFichas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/fichas-tecnicas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFichas(response.data);
    } catch (error) {
      console.error('Error fetching fichas:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // Mapear campos del frontend al backend
      const backendData = {
        nombreCoordinacion: formData.nombreCoordinacion,
        nombreCoordinador: formData.nombreCoordinador,
        nombreEvento: formData.nombreEvento,
        fechaEvento: formData.fechaEvento,
        tipoEvento: formData.tipoEvento,
        modalidad: formData.modalidad,
        fechaLimiteInscripcion: formData.fechaLimiteInscripcion,
        requiereInscripcion: formData.requiereInscripcion,
        esGratuito: formData.esGratuito,
        costo: formData.costo,
        dirigidoA: formData.dirigidoA,
        lugarEvento: formData.lugarEvento,
        talleristas: formData.talleristas,
        objetivos: formData.objetivos,
        temas: formData.temas,
        observaciones: formData.observaciones
      };
      
      await axios.post(`${API_URL}/fichas-tecnicas`, backendData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFichas();
      setShowForm(false);
      setShowPreview(false);
      resetForm();
      alert('Ficha técnica enviada correctamente');
    } catch (error) {
      console.error('Error saving ficha:', error);
      alert('Error al enviar la ficha técnica');
    }
  };

  const resetForm = () => {
    setFormData({
      nombreCoordinacion: '',
      nombreCoordinador: '',
      nombreEvento: '',
      fechaEvento: '',
      tipoEvento: '',
      modalidad: '',
      fechaLimiteInscripcion: '',
      requiereInscripcion: false,
      esGratuito: true,
      costo: '',
      dirigidoA: '',
      lugarEvento: '',
      talleristas: '',
      objetivos: '',
      temas: '',
      observaciones: ''
    });
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta ficha técnica?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/fichas-tecnicas/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchFichas();
        alert('Ficha técnica eliminada correctamente');
      } catch (error) {
        console.error('Error deleting ficha:', error);
        alert('Error al eliminar la ficha técnica');
      }
    }
  };

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/fichas-tecnicas/${id}/estado`, 
        { estado: 'aprobada' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchFichas();
      alert('Ficha técnica aprobada correctamente');
    } catch (error) {
      console.error('Error approving ficha:', error);
      alert('Error al aprobar la ficha técnica');
    }
  };

  const handleReject = async (id) => {
    const motivo = prompt('Motivo del rechazo (opcional):');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/fichas-tecnicas/${id}/estado`, 
        { 
          estado: 'rechazada',
          motivo_rechazo: motivo 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchFichas();
      alert('Ficha técnica rechazada');
    } catch (error) {
      console.error('Error rejecting ficha:', error);
      alert('Error al rechazar la ficha técnica');
    }
  };

  // Componente para la vista previa de la ficha técnica oficial
  const FichaTecnicaPreview = ({ data, isPreview = false }) => {
    // Si es vista previa, usar los datos del formulario, sino usar los datos de la base de datos
    const displayData = isPreview ? data : {
      nombre_coordinacion: data.nombre_coordinacion,
      nombre_coordinador: data.nombre_coordinador,
      nombre_evento: data.nombre_evento,
      fecha_evento: data.fecha_evento,
      tipo_evento: data.tipo_evento,
      modalidad: data.modalidad,
      dirigido_a: data.dirigido_a,
      lugar_evento: data.lugar_evento,
      talleristas: data.talleristas,
      objetivos: data.objetivos,
      temas: data.temas,
      es_gratuito: data.es_gratuito,
      costo: data.costo,
      observaciones: data.observaciones,
      fecha_limite_inscripcion: data.fecha_limite_inscripcion,
      requiere_inscripcion: data.requiere_inscripcion
    };

    return (
      <div className="ficha-tecnica-umsnh">
        {/* Header institucional */}
        <div className="ficha-header-institucional">
          <div className="universidad-info">
            <div className="lema-institucional">"HUMANISTA POR SIEMPRE"</div>
            <div className="universidad-nombre">
              <strong>UNIVERSIDAD MICHOACANA DE SAN NICOLÁS DE HIDALGO</strong>
            </div>
          </div>
          <div className="facultad-seccion">
            <div className="facultad-titulo">
              <strong>FACULTAD DE CONTADURÍA Y CIENCIAS ADMINISTRATIVAS</strong>
            </div>
            <div className="documento-tipo">
              <h2>FICHA TÉCNICA</h2>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="ficha-contenido-principal">
          {/* Información de control */}
          <div className="seccion-control">
            <div className="campo-linea">
              <span className="etiqueta">Folio de Control Interno:</span>
              <span className="linea-relleno">_____________________</span>
            </div>
            <div className="campo-fecha">
              <span className="etiqueta">Fecha de envío:</span>
              <span className="valor-campo">{new Date().toLocaleDateString('es-MX')}</span>
            </div>
          </div>

          {/* Información del evento */}
          <div className="seccion-evento">
            <div className="fila-campo">
              <span className="etiqueta-campo">Nombre de la Coordinación:</span>
              <div className="campo-valor-subrayado">
                {isPreview ? data.nombreCoordinacion : displayData.nombre_coordinacion}
              </div>
            </div>

            <div className="fila-campo">
              <span className="etiqueta-campo">Nombre del Coordinador:</span>
              <div className="campo-valor-subrayado">
                {isPreview ? data.nombreCoordinador : displayData.nombre_coordinador}
              </div>
            </div>

            <div className="fila-campo campo-completo">
              <span className="etiqueta-campo">Nombre del evento o Actividad:</span>
              <div className="campo-valor-subrayado">
                {isPreview ? data.nombreEvento : displayData.nombre_evento}
              </div>
            </div>

            <div className="fila-campo-doble">
              <div className="campo-mitad">
                <span className="etiqueta-campo">Fecha del evento:</span>
                <div className="campo-valor-subrayado">
                  {new Date(isPreview ? data.fechaEvento : displayData.fecha_evento).toLocaleDateString('es-MX')}
                </div>
              </div>
              <div className="campo-mitad">
                <span className="etiqueta-campo">Tipo de evento:</span>
                <div className="campo-valor-subrayado">
                  {isPreview ? data.tipoEvento : displayData.tipo_evento}
                </div>
              </div>
            </div>

            <div className="fila-campo-doble">
              <div className="campo-mitad">
                <span className="etiqueta-campo">Modalidad:</span>
                <div className="campo-valor-subrayado">
                  {isPreview ? data.modalidad : displayData.modalidad}
                </div>
              </div>
              <div className="campo-mitad">
                <span className="etiqueta-campo">Lugar del evento:</span>
                <div className="campo-valor-subrayado">
                  {isPreview ? data.lugarEvento : displayData.lugar_evento}
                </div>
              </div>
            </div>

            <div className="fila-campo campo-completo">
              <span className="etiqueta-campo">Dirigido a:</span>
              <div className="campo-valor-textarea">
                {isPreview ? data.dirigidoA : displayData.dirigido_a}
              </div>
            </div>

            <div className="fila-campo campo-completo">
              <span className="etiqueta-campo">Talleristas/Ponentes:</span>
              <div className="campo-valor-textarea">
                {isPreview ? data.talleristas : displayData.talleristas}
              </div>
            </div>

            <div className="fila-campo campo-completo">
              <span className="etiqueta-campo">Objetivos:</span>
              <div className="campo-valor-textarea">
                {isPreview ? data.objetivos : displayData.objetivos}
              </div>
            </div>

            <div className="fila-campo campo-completo">
              <span className="etiqueta-campo">Temas a tratar:</span>
              <div className="campo-valor-textarea">
                {isPreview ? data.temas : displayData.temas}
              </div>
            </div>

            <div className="fila-campo-doble">
              <div className="campo-mitad">
                <span className="etiqueta-campo">Costo:</span>
                <div className="campo-valor-subrayado">
                  {(isPreview ? data.esGratuito : displayData.es_gratuito) 
                    ? 'Gratuito' 
                    : `$${(isPreview ? data.costo : displayData.costo) || '0'}`}
                </div>
              </div>
              <div className="campo-mitad">
                <span className="etiqueta-campo">Requiere inscripción:</span>
                <div className="campo-valor-subrayado">
                  {(isPreview ? data.requiereInscripcion : displayData.requiere_inscripcion) ? 'Sí' : 'No'}
                </div>
              </div>
            </div>

            {(isPreview ? data.fechaLimiteInscripcion : displayData.fecha_limite_inscripcion) && (
              <div className="fila-campo">
                <span className="etiqueta-campo">Fecha límite de inscripción:</span>
                <div className="campo-valor-subrayado">
                  {new Date(isPreview ? data.fechaLimiteInscripcion : displayData.fecha_limite_inscripcion).toLocaleDateString('es-MX')}
                </div>
              </div>
            )}

            <div className="fila-campo campo-completo">
              <span className="etiqueta-campo">Observaciones:</span>
              <div className="campo-valor-textarea">
                {isPreview ? data.observaciones : displayData.observaciones}
              </div>
            </div>
          </div>

          {/* Pie del documento */}
          <div className="seccion-firmas">
            <div className="linea-firma">
              <div className="firma-campo">
                <div className="linea-firma-texto">_________________________________</div>
                <div className="firma-etiqueta">Coordinador(a) Responsable</div>
              </div>
              <div className="firma-campo">
                <div className="linea-firma-texto">_________________________________</div>
                <div className="firma-etiqueta">Vo. Bo. Secretario Académico</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Vista para usuarios normales
  if (user?.role === 'usuario') {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Solicitar Ficha Técnica</h1>
          <button 
            className="btn-primary"
            onClick={() => setShowForm(true)}
          >
            Nueva Solicitud
          </button>
        </div>

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content large">
              <div className="modal-header">
                <h2>Nueva Ficha Técnica</h2>
                <button 
                  className="btn-close"
                  onClick={() => {
                    setShowForm(false);
                    setShowPreview(false);
                    resetForm();
                  }}
                >
                  ×
                </button>
              </div>
              
              {!showPreview ? (
                <form className="form-grid">
                  <div className="form-group">
                    <label>Nombre de la Coordinación:</label>
                    <input
                      type="text"
                      name="nombreCoordinacion"
                      value={formData.nombreCoordinacion}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Nombre del Coordinador:</label>
                    <input
                      type="text"
                      name="nombreCoordinador"
                      value={formData.nombreCoordinador}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Nombre del Evento o Actividad:</label>
                    <input
                      type="text"
                      name="nombreEvento"
                      value={formData.nombreEvento}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Fecha del Evento:</label>
                    <input
                      type="date"
                      name="fechaEvento"
                      value={formData.fechaEvento}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Tipo de Evento:</label>
                    <select
                      name="tipoEvento"
                      value={formData.tipoEvento}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleccionar</option>
                      <option value="curso">Curso</option>
                      <option value="taller">Taller</option>
                      <option value="conferencia">Conferencia</option>
                      <option value="seminario">Seminario</option>
                      <option value="congreso">Congreso</option>
                      <option value="diplomado">Diplomado</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Modalidad:</label>
                    <select
                      name="modalidad"
                      value={formData.modalidad}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleccionar</option>
                      <option value="presencial">Presencial</option>
                      <option value="virtual">Virtual</option>
                      <option value="hibrida">Híbrida</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Fecha Límite de Inscripción:</label>
                    <input
                      type="date"
                      name="fechaLimiteInscripcion"
                      value={formData.fechaLimiteInscripcion}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="requiereInscripcion"
                        checked={formData.requiereInscripcion}
                        onChange={handleInputChange}
                      />
                      Requiere Inscripción
                    </label>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="esGratuito"
                        checked={formData.esGratuito}
                        onChange={handleInputChange}
                      />
                      Es Gratuito
                    </label>
                  </div>

                  {!formData.esGratuito && (
                    <div className="form-group">
                      <label>Costo:</label>
                      <input
                        type="number"
                        name="costo"
                        value={formData.costo}
                        onChange={handleInputChange}
                        step="0.01"
                      />
                    </div>
                  )}

                  <div className="form-group full-width">
                    <label>Dirigido a:</label>
                    <textarea
                      name="dirigidoA"
                      value={formData.dirigidoA}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Lugar del Evento:</label>
                    <input
                      type="text"
                      name="lugarEvento"
                      value={formData.lugarEvento}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Talleristas/Ponentes:</label>
                    <textarea
                      name="talleristas"
                      value={formData.talleristas}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Objetivos:</label>
                    <textarea
                      name="objetivos"
                      value={formData.objetivos}
                      onChange={handleInputChange}
                      rows="4"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Temas a tratar:</label>
                    <textarea
                      name="temas"
                      value={formData.temas}
                      onChange={handleInputChange}
                      rows="4"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Observaciones:</label>
                    <textarea
                      name="observaciones"
                      value={formData.observaciones}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>

                  <div className="form-actions full-width">
                    <button 
                      type="button" 
                      className="btn-secondary"
                      onClick={handlePreview}
                    >
                      Vista Previa
                    </button>
                    <button 
                      type="button" 
                      className="btn-secondary"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <FichaTecnicaPreview data={formData} isPreview={true} />
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn-primary"
                      onClick={handleSubmit}
                    >
                      Enviar Ficha
                    </button>
                    <button 
                      type="button" 
                      className="btn-secondary"
                      onClick={() => setShowPreview(false)}
                    >
                      Editar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="user-fichas">
          <h2>Mis Solicitudes</h2>
          {fichas.filter(f => f.usuario_id === user.id).map(ficha => (
            <div key={ficha.id} className="card">
              <div className="card-header">
                <h3>{ficha.nombre_evento}</h3>
                <span className={`status ${ficha.estado || 'pendiente'}`}>
                  {ficha.estado || 'Pendiente'}
                </span>
              </div>
              <div className="card-body">
                <p><strong>Fecha:</strong> {new Date(ficha.fecha_evento).toLocaleDateString()}</p>
                <p><strong>Tipo:</strong> {ficha.tipo_evento}</p>
                <p><strong>Modalidad:</strong> {ficha.modalidad}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Vista para admin/coordinador
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Solicitudes de Fichas Técnicas</h1>
        <div className="stats-bar">
          <span className="stat-item">Total: {fichas.length}</span>
          <span className="stat-item pendientes">
            Pendientes: {fichas.filter(f => f.estado === 'pendiente' || !f.estado).length}
          </span>
          <span className="stat-item aprobadas">
            Aprobadas: {fichas.filter(f => f.estado === 'aprobada').length}
          </span>
        </div>
      </div>

      <div className="solicitudes-lista">
        {fichas.length === 0 ? (
          <div className="empty-state">
            <p>No hay solicitudes de fichas técnicas</p>
          </div>
        ) : (
          fichas.map(ficha => (
            <div key={ficha.id} className="solicitud-card">
              <div className="solicitud-header">
                <div className="solicitud-info-principal">
                  <h3 className="evento-nombre">{ficha.nombre_evento}</h3>
                  <div className="solicitud-metadata">
                    <span className="coordinacion">📋 {ficha.nombre_coordinacion}</span>
                    <span className="coordinador">👤 {ficha.nombre_coordinador}</span>
                    <span className="fecha-evento">📅 {new Date(ficha.fecha_evento).toLocaleDateString('es-MX')}</span>
                  </div>
                </div>
                <div className="solicitud-acciones">
                  <span className={`estado-badge ${ficha.estado || 'pendiente'}`}>
                    {ficha.estado === 'aprobada' ? '✅ Aprobada' : 
                     ficha.estado === 'rechazada' ? '❌ Rechazada' : 
                     '⏳ Pendiente'}
                  </span>
                  <button 
                    className="btn-ver-completa"
                    onClick={() => setExpandedFicha(expandedFicha === ficha.id ? null : ficha.id)}
                  >
                    {expandedFicha === ficha.id ? '📄 Contraer' : '📋 Ver Completa'}
                  </button>
                </div>
              </div>
              
              <div className="solicitud-resumen">
                <div className="resumen-items">
                  <div className="resumen-item">
                    <strong>Tipo:</strong> {ficha.tipo_evento}
                  </div>
                  <div className="resumen-item">
                    <strong>Modalidad:</strong> {ficha.modalidad}
                  </div>
                  <div className="resumen-item">
                    <strong>Costo:</strong> {ficha.es_gratuito ? 'Gratuito' : `$${ficha.costo}`}
                  </div>
                  <div className="resumen-item">
                    <strong>Lugar:</strong> {ficha.lugar_evento}
                  </div>
                </div>
                
                {ficha.objetivos && (
                  <div className="objetivos-resumen">
                    <strong>Objetivos:</strong> 
                    <p>{ficha.objetivos.substring(0, 150)}{ficha.objetivos.length > 150 ? '...' : ''}</p>
                  </div>
                )}
              </div>

              <div className="solicitud-footer">
                <div className="fecha-envio">
                  <small>📤 Enviado: {new Date(ficha.created_at || ficha.fecha_evento).toLocaleDateString('es-MX')}</small>
                </div>
                <div className="acciones-admin">
                  {(!ficha.estado || ficha.estado === 'pendiente') && (
                    <>
                      <button 
                        className="btn-aprobar"
                        onClick={() => handleApprove(ficha.id)}
                      >
                        ✅ Aprobar
                      </button>
                      <button 
                        className="btn-rechazar"
                        onClick={() => handleReject(ficha.id)}
                      >
                        ❌ Rechazar
                      </button>
                    </>
                  )}
                  <button 
                    className="btn-eliminar"
                    onClick={() => handleDelete(ficha.id)}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {expandedFicha && (
        <div className="modal-overlay">
          <div className="modal-content extra-large">
            <div className="modal-header">
              <h2>Ficha Técnica Completa</h2>
              <button 
                className="btn-close"
                onClick={() => setExpandedFicha(null)}
              >
                ×
              </button>
            </div>
            <div className="ficha-preview-container">
              <FichaTecnicaPreview data={fichas.find(f => f.id === expandedFicha)} isPreview={false} />
            </div>
            <div className="modal-actions">
              <button 
                className="btn-print"
                onClick={() => window.print()}
              >
                🖨️ Imprimir
              </button>
              <button 
                className="btn-close-modal"
                onClick={() => setExpandedFicha(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalForms;
