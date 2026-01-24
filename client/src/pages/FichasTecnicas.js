import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/pages.css';
import '../styles/ficha-umsnh.css';
import '../styles/ficha-modal.css';
import '../styles/fichas-modern.css';

const FichasTecnicas = () => {
  const { user } = useAuth();
  const [fichas, setFichas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedFicha, setExpandedFicha] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(0.8); // Nivel de zoom inicial
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
    domicilio: '',
    duracion: '',
    telefonoContacto: '',
    requiereMontaje: false,
    talleristas: '',
    objetivos: '',
    temas: '',
    observaciones: '',
    autoridadesInvitadas: '',
    programaEvento: '',
    datosEstadisticos: '',
    informacionHistorica: '',
    presupuesto: '',
    requiereDisenoGrafico: false,
    requierePublicacion: false,
    requiereTransmision: '',
    compromisoRectora: false
  });

  useEffect(() => {
    fetchFichas();
  }, []);
  
  // Debug: monitorear cambios en expandedFicha
  useEffect(() => {
    console.log('🔄 expandedFicha changed:', expandedFicha);
  }, [expandedFicha]);

  const fetchFichas = async () => {
    try {
      console.log('🔍 Iniciando fetch fichas...');
      console.log('Fetch fichas URL:', '/api/fichas-tecnicas');
      const response = await api.get('/api/fichas-tecnicas');
      console.log('✅ Respuesta del servidor:', response.data);
      
      // Verificar si response.data es un array o si tiene una propiedad fichas
      let fichasData = response.data;
      if (response.data.fichas) {
        fichasData = response.data.fichas;
      }
      
      console.log('📋 Fichas procesadas:', fichasData);
      console.log('📊 Tipo de datos:', Array.isArray(fichasData) ? 'Array' : typeof fichasData);
      console.log('📈 Cantidad de fichas:', Array.isArray(fichasData) ? fichasData.length : 'No es array');
      
      // Asegurar que siempre sea un array
      setFichas(Array.isArray(fichasData) ? fichasData : []);
    } catch (error) {
      console.error('❌ Error fetching fichas:', error);
      console.error('❌ Error response:', error.response);
      // En caso de error, mantener un array vacío
      setFichas([]);
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
    if (e) e.preventDefault();
    
    // Validaciones mejoradas
    if (!formData.nombreEvento || !formData.fechaEvento || !formData.tipoEvento) {
      alert('❌ Campos obligatorios faltantes:\n• Nombre del evento\n• Fecha del evento\n• Tipo de evento');
      return;
    }
    
    // Validar formato de fecha
    if (new Date(formData.fechaEvento) <= new Date()) {
      if (!window.confirm('⚠️ La fecha del evento es hoy o en el pasado. ¿Deseas continuar?')) {
        return;
      }
    }
    
    // Validar y limpiar campo costo (debe ser numérico o vacío)
    let costoLimpio = '';
    if (formData.costo && formData.costo.trim() !== '') {
      const costoNumerico = parseFloat(formData.costo.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (isNaN(costoNumerico)) {
        alert('❌ Error en el campo COSTO:\n• Debe ser un número válido\n• Ejemplos: 500, 1500.50, 0\n• Deja vacío si es gratuito');
        return;
      }
      costoLimpio = costoNumerico;
    }
    
    // Validar fechas si se proporcionan
    if (formData.fechaLimiteInscripcion) {
      const fechaLimite = new Date(formData.fechaLimiteInscripcion);
      const fechaEvento = new Date(formData.fechaEvento);
      if (fechaLimite >= fechaEvento) {
        alert('❌ Error en FECHA LÍMITE DE INSCRIPCIÓN:\n• Debe ser anterior a la fecha del evento');
        return;
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('❌ Sesión expirada. Por favor inicia sesión nuevamente.');
        return;
      }
      
      // Mapear campos del frontend al backend - TODOS los campos
      const backendData = {
        nombreCoordinacion: formData.nombreCoordinacion || null,
        nombreCoordinador: formData.nombreCoordinador || null,
        nombreEvento: formData.nombreEvento,
        fechaEvento: formData.fechaEvento,
        tipoEvento: formData.tipoEvento,
        modalidad: formData.modalidad || null,
        fechaLimiteInscripcion: formData.fechaLimiteInscripcion || null,
        requiereInscripcion: Boolean(formData.requiereInscripcion),
        esGratuito: Boolean(formData.esGratuito),
        costo: costoLimpio || null,
        dirigidoA: formData.dirigidoA || null,
        lugarEvento: formData.lugarEvento || null,
        domicilio: formData.domicilio || null,
        duracion: formData.duracion || null,
        telefonoContacto: formData.telefonoContacto || null,
        requiereMontaje: Boolean(formData.requiereMontaje),
        talleristas: formData.talleristas || null,
        objetivos: formData.objetivos || null,
        temas: formData.temas || null,
        observaciones: formData.observaciones || null,
        autoridadesInvitadas: formData.autoridadesInvitadas || null,
        programaEvento: formData.programaEvento || null,
        datosEstadisticos: formData.datosEstadisticos || null,
        informacionHistorica: formData.informacionHistorica || null,
        presupuesto: formData.presupuesto || null,
        requiereDisenoGrafico: Boolean(formData.requiereDisenoGrafico),
        requierePublicacion: Boolean(formData.requierePublicacion),
        requiereTransmision: formData.requiereTransmision || null,
        compromisoRectora: Boolean(formData.compromisoRectora)
      };
      
      console.log('Enviando datos al servidor:', backendData);
      console.log('URL completa:', '/api/fichas-tecnicas');
      
      const response = await api.post('/api/fichas-tecnicas', backendData);
      
      if (response.status === 201) {
        alert('✅ ¡Ficha técnica enviada exitosamente!\n\n📋 Tu solicitud ha sido registrada y está pendiente de revisión.\n\n🔄 La lista se actualizará automáticamente.');
        setShowForm(false);
        setShowPreview(false);
        resetForm();
        fetchFichas(); // Recargar la lista automáticamente
      }
    } catch (error) {
      console.error('Error completo:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      if (error.response) {
        // Error del servidor
        const errorMessage = error.response.data?.error || 'Error del servidor';
        const errorDetails = error.response.data?.details || '';
        
        let userMessage = `❌ ${errorMessage}`;
        
        // Agregar consejos específicos según el tipo de error
        if (errorDetails.includes('numeric')) {
          userMessage += '\n\n💡 Tips para campos numéricos:\n• COSTO: Solo números (ej: 1500.50)\n• Deja vacío si no aplica\n• Usa punto para decimales';
        }
        
        if (errorDetails.includes('date') || errorDetails.includes('fecha')) {
          userMessage += '\n\n💡 Tips para fechas:\n• Usar formato YYYY-MM-DD\n• Fecha límite debe ser antes del evento\n• Fecha del evento debe ser futura';
        }
        
        if (errorDetails.includes('required') || errorDetails.includes('obligatorio')) {
          userMessage += '\n\n💡 Campos obligatorios:\n• Nombre del evento\n• Fecha del evento\n• Tipo de evento';
        }
        
        if (errorDetails) {
          userMessage += `\n\n🔍 Detalle técnico: ${errorDetails}`;
        }
        
        alert(userMessage);
      } else if (error.request) {
        // Error de red
        alert('❌ Error de conexión\n\n💡 Verifica:\n• Tu conexión a internet\n• Que el servidor esté funcionando\n• Intenta recargar la página');
        console.error('Error de red:', error.request);
      } else {
        // Error de configuración
        alert('❌ Error inesperado al enviar la ficha\n\n💡 Intenta:\n• Recargar la página\n• Verificar todos los campos\n• Contactar al administrador');
      }
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
      domicilio: '',
      duracion: '',
      telefonoContacto: '',
      requiereMontaje: false,
      talleristas: '',
      objetivos: '',
      temas: '',
      observaciones: '',
      autoridadesInvitadas: '',
      programaEvento: '',
      datosEstadisticos: '',
      informacionHistorica: '',
      presupuesto: '',
      requiereDisenoGrafico: false,
      requierePublicacion: false,
      requiereTransmision: '',
      compromisoRectora: false
    });
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta ficha técnica?')) {
      try {
        const token = localStorage.getItem('token');
        await api.delete(`/api/fichas-tecnicas/${id}`);
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
      console.log('🔄 Intentando aprobar ficha ID:', id);
      
      // Verificar el token antes de hacer la solicitud
      const token = localStorage.getItem('token');
      if (!token) {
        alert('No hay sesión activa. Por favor inicia sesión.');
        return;
      }
      
      // Decodificar el token para ver el role
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔍 Token payload:', payload);
        console.log('🔍 User role:', payload.role);
      } catch (e) {
        console.log('❌ Error decodificando token:', e);
      }
      
      const response = await api.patch(`/api/fichas-tecnicas/${id}/estado`, 
        { estado: 'aprobado' }
      );
      
      console.log('✅ Respuesta del servidor:', response);
      
      if (response.status === 200) {
        // Actualizar el estado local inmediatamente
        setFichas(prevFichas => 
          prevFichas.map(ficha => 
            ficha.id === id 
              ? { ...ficha, estado: 'aprobado' }
              : ficha
          )
        );
        
        alert('Ficha técnica aprobada correctamente');
        
        // Recargar las fichas para asegurar sincronización
        await fetchFichas();
      }
    } catch (error) {
      console.error('❌ Error completo al aprobar ficha:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      let errorMessage = 'Error al aprobar la ficha técnica';
      
      if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para aprobar fichas técnicas';
      } else if (error.response?.status === 404) {
        errorMessage = 'Ficha técnica no encontrada';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };

  const handleReject = async (id) => {
    const motivo = prompt('Motivo del rechazo (opcional):');
    
    try {
      console.log('🔄 Intentando rechazar ficha ID:', id, 'con motivo:', motivo);
      
      const response = await api.patch(`/api/fichas-tecnicas/${id}/estado`, 
        { 
          estado: 'rechazado',
          motivo_rechazo: motivo 
        }
      );
      
      console.log('✅ Respuesta del servidor:', response);
      
      if (response.status === 200) {
        // Actualizar el estado local inmediatamente
        setFichas(prevFichas => 
          prevFichas.map(ficha => 
            ficha.id === id 
              ? { ...ficha, estado: 'rechazado', motivo_rechazo: motivo }
              : ficha
          )
        );
        
        alert('Ficha técnica rechazada correctamente');
        
        // Recargar las fichas para asegurar sincronización
        await fetchFichas();
      }
    } catch (error) {
      console.error('❌ Error completo al rechazar ficha:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      let errorMessage = 'Error al rechazar la ficha técnica';
      
      if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para rechazar fichas técnicas';
      } else if (error.response?.status === 404) {
        errorMessage = 'Ficha técnica no encontrada';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };

  const handleViewDetail = (id) => {
    const ficha = fichas.find(f => f.id === id);
    
    if (ficha) {
      // Verificar permisos: el usuario solo puede ver sus propias fichas
      if (user?.role === 'usuario' && ficha.usuario_id !== user.id) {
        alert('No tienes permisos para ver esta ficha técnica.');
        return;
      }
      
      setExpandedFicha(ficha);
    }
  };

  const handlePrintFicha = () => {
    // Crear una nueva ventana para imprimir usando exactamente los mismos estilos CSS del diseño original
    const printWindow = window.open('', '_blank');
    const dataToUse = expandedFicha || formData;
    
    if (printWindow) {
      // Usar exactamente los mismos estilos CSS del archivo ficha-umsnh.css
      const cssContent = `
        .a4-size {
          width: 216mm; /* Tamaño carta: 8.5 pulgadas */
          height: 279mm; /* Tamaño carta: 11 pulgadas */
          margin: 0;
          position: relative;
          background-color: white;
          z-index: 0;
          padding: 25px; /* Más padding para tamaño carta */
          box-sizing: border-box;
          page-break-after: always;
        }
        
        .a4-size::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: url('/image001.jpg');
          background-repeat: no-repeat;
          background-position: center center;
          background-size: cover;
          opacity: 0.3;
          z-index: 1;
        }
        
        .facultad {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 10px;
          margin-left: 20px;
        }
        
        .facultad h1 {
          font-size: 16px;
          margin-bottom: 8px;
          text-align: right;
          transform: translateY(50px) translateX(-20px); /* Ajustar posición */
          color: #002061;
          font-weight: bold;
          letter-spacing: 1px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
          line-height: 0.8;
          font-family: 'Arial', sans-serif;
          max-width: 200px;
          margin-left: auto;
        }
        
        .humanista {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 10px;
        }
        
        .humanista h1 {
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 8px;
          margin-top: 45px;
          align-items: center;
          text-align: center;
          color: #002061;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
          line-height: 0.7;
          font-family: 'Arial', sans-serif;
        }
        
        .fecha-envio-container {
          display: flex;
          align-items: flex-start;
          margin: 15px 0; /* Más separación */
          margin-bottom: 25px; /* Más espacio abajo */
          position: relative;
          z-index: 2;
          justify-content: flex-end;
        }
        
        .fecha-envio-label {
          color: #808080;
          font-size: 11px;
          font-family: Arial, sans-serif;
          margin-right: 5px;
          text-align: right;
          flex-shrink: 0;
        }
        
        .fecha-envio {
          width: 50%;
          border-collapse: collapse;
          font-family: Arial, sans-serif;
        }
        
        .fecha-envio td {
          border: 0.5px solid #888;
          padding: 15px 8px;
          font-size: 10px;
          color: #333;
          background-color: white;
        }
        
        .form-table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0 5px 0; /* Bajar las celdas */
          font-size: 10px;
          font-family: Arial, sans-serif;
        }
        
        .form-table td {
          border: 0.5px solid #888;
          padding: 8px 10px 16px 10px; /* Más padding para tamaño carta */
          vertical-align: top;
          text-align: left;
          line-height: 1.3; /* Más espacio entre líneas */
        }
        
        .field-label-4col {
          width: 25%;
          font-size: 12px; /* Más grande para carta */
          color: #808080;
          font-family: Century Gothic, sans-serif;
          text-align: left;
          vertical-align: top;
        }
        
        .field-value-empty {
          font-size: 12px; /* Más grande para carta */
          color: #333;
          text-align: left;
          vertical-align: top;
        }
        
        .hour-label-small {
          width: 7%;
          font-size: 12px; /* Más grande para carta */
          color: #808080;
          text-align: center;
          vertical-align: middle;
          padding: 8px 6px 8px 6px;
        }
        
        .hour-value-large {
          width: 38%;
          font-size: 12px; /* Más grande para carta */
          color: #333;
          text-align: left;
          vertical-align: top;
        }
        
        .footer-signature {
          margin-top: 25px; /* Aumentado para bajar más */
          text-align: center;
          padding-top: 10px; /* Más padding */
        }
        
        .footer-line {
          width: 150px;
          border-top: 0.5px solid #333;
          margin: 15px auto 5px auto;
        }
        
        .footer-text {
          font-size: 14px; /* Más grande */
          color: #333;
          text-align: center;
          font-family: Arial, sans-serif;
          font-weight: bold; /* Más prominente */
        }
        
        .folio-control {
          position: absolute;
          bottom: 60px; /* Subir más */
          left: 30%;
          transform: translateX(-50%);
          font-size: 10px;
          color: #ff0000;
          font-family: Arial, sans-serif;
          font-weight: bold;
        }
        
        /* Estilos para VISTA PREVIA */
        .facultad h1 {
          font-size: 12px;
          margin-bottom: 6px;
          text-align: right;
          transform: translateY(50px) translateX(-20px); /* Para vista previa */
          color: #002061;
          font-weight: bold;
          letter-spacing: 1px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
          line-height: 0.8;
          font-family: 'Arial', sans-serif;
          max-width: 200px;
          margin-left: auto;
        }
        
        /* Subir las celdas de la segunda página en vista previa */
        .a4-size:nth-child(2) .form-table {
          margin-top: -10px; /* Subir las celdas de la página 2 en vista previa */
        }
        
        .footer-signature {
          margin-top: 15px;
          text-align: center;
          padding-top: 5px;
        }
        
        .footer-line {
          width: 150px;
          border-top: 0.5px solid #333;
          margin: 15px auto 5px auto;
        }
        
        .footer-text {
          font-size: 10px;
          color: #333;
          text-align: center;
          font-family: Arial, sans-serif;
          font-weight: normal;
        }
        
        .folio-control {
          position: absolute;
          bottom: 20px;
          left: 30%;
          transform: translateX(-50%);
          font-size: 10px;
          color: #ff0000;
          font-family: Arial, sans-serif;
          font-weight: bold;
        }
        
        /* Estilos para IMPRESION - diferentes configuraciones */
        @media print {
          .facultad h1 {
            font-size: 16px;
            margin-bottom: 8px;
            text-align: right;
            transform: translateY(50px) translateX(-10px); /* Aún más a la izquierda para impresión */
            color: #002061;
            font-weight: bold;
            letter-spacing: 1px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
            line-height: 0.8;
            font-family: 'Arial', sans-serif;
            max-width: 250px; /* Más ancho para evitar saltos de línea */
            margin-left: auto;
          }
          
          /* Bajar más las celdas de la segunda página específicamente */
          .a4-size:nth-child(2) .form-table {
            margin-top: 35px; /* Bajar las celdas de la página 2 */
          }
          
          .footer-signature {
            margin-top: 30px; /* Más abajo para impresión */
            text-align: center;
            padding-top: 15px;
          }
          
          .footer-line {
            width: 150px;
            border-top: 0.5px solid #333;
            margin: 15px auto 5px auto;
          }
          
          .footer-text {
            font-size: 14px; /* Más grande para impresión */
            color: #333;
            text-align: center;
            font-family: Arial, sans-serif;
            font-weight: bold;
          }
          
          .folio-control {
            position: absolute;
            bottom: 70px; /* Más arriba para impresión */
            left: 30%;
            transform: translateX(-50%);
            font-size: 10px;
            color: #ff0000;
            font-family: Arial, sans-serif;
            font-weight: bold;
          }
        }
        
        @page {
          size: letter portrait; /* Tamaño carta */
          margin: 0;
        }
        
        @media print {
          body { margin: 0; }
          .a4-size { page-break-after: always; }
        }
        
        /* Estilos para botones más compactos y ajustados al texto */
        .btn-action {
          padding: 6px 10px !important;
          margin: 0 !important;
          font-size: 9px !important;
          border-radius: 12px !important;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
          display: inline-block;
          text-align: center;
          white-space: nowrap;
          line-height: 1.2 !important;
          min-width: 50px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .btn-action.primary-action {
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
        }
        
        .btn-action.primary-action:hover {
          background: linear-gradient(135deg, #2980b9, #21618c);
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        
        .btn-action.success-action {
          background: linear-gradient(135deg, #27ae60, #229954);
          color: white;
        }
        
        .btn-action.success-action:hover {
          background: linear-gradient(135deg, #229954, #1e8449);
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        
        .btn-action.danger-action {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          color: white;
        }
        
        .btn-action.danger-action:hover {
          background: linear-gradient(135deg, #c0392b, #a93226);
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        
        .ficha-actions.modern-flex {
          display: grid !important;
          grid-template-columns: 1fr auto 1fr;
          gap: 4px !important;
          margin: 10px 8px !important;
          padding: 0 !important;
          align-items: center;
        }
        
        .botones-ficha-horizontal {
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin: 10px 0;
          padding: 0;
        }
        
        .btn-ficha-azul, .btn-ficha-verde, .btn-ficha-rojo {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          color: white;
          min-width: 70px;
          text-align: center;
        }
        
        .btn-ficha-azul {
          background-color: #007bff;
        }
        
        .btn-ficha-azul:hover {
          background-color: #0056b3;
        }
        
        .btn-ficha-verde {
          background-color: #28a745;
        }
        
        .btn-ficha-verde:hover {
          background-color: #1e7e34;
        }
        
        .btn-ficha-rojo {
          background-color: #dc3545;
        }
        
        .btn-ficha-rojo:hover {
          background-color: #c82333;
        }
      `;
      
      // Crear el contenido HTML exacto usando la estructura del diseño original
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ficha Técnica - ${dataToUse?.nombreEvento || dataToUse?.nombre_evento || 'Sin nombre'}</title>
          <meta charset="utf-8">
          <style>${cssContent}</style>
        </head>
        <body>
          <!-- Primera página -->
          <div class="a4-size">
            <div class="facultad">
              <h1>Facultad de Contaduría y</h1>
              <h1>Ciencias Administrativas</h1>
            </div>
            <div class="humanista">
              <h1>"Humanista Por Siempre"</h1>
            </div>
            
            <div class="fecha-envio-container">
              <div class="fecha-envio-label">Fecha de envío:</div>
              <table class="fecha-envio">
                <tbody>
                  <tr>
                    <td>${new Date().toLocaleDateString('es-MX')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <table class="form-table">
              <tbody>
              <tr>
                <td class="field-label-4col">Nombre de la Coordinación</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.nombreCoordinacion || dataToUse?.nombre_coordinacion || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Nombre del Coordinador</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.nombreCoordinador || dataToUse?.nombre_coordinador || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Nombre del evento o Actividad</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.nombreEvento || dataToUse?.nombre_evento || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Fecha del evento<br/>(Marca con X)<br/>Fija ( X ) Propuesta (   )</td>
                <td class="field-value-empty">
                  ${dataToUse?.fechaEvento ? new Date(dataToUse.fechaEvento).toLocaleDateString('es-MX') : (dataToUse?.fecha_evento ? new Date(dataToUse.fecha_evento).toLocaleDateString('es-MX') : '')}
                </td>
                <td class="hour-label-small">Hora:</td>
                <td class="hour-value-large">
                  ${dataToUse?.fechaEvento ? new Date(dataToUse.fechaEvento).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'}) : (dataToUse?.fecha_evento ? new Date(dataToUse.fecha_evento).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'}) : '')}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Indicar si se requiere montaje anticipado.</td>
                <td class="field-value-empty">
                  ${dataToUse?.requiereMontaje !== undefined ? (dataToUse.requiereMontaje ? 'Sí' : 'No') : (dataToUse?.requiere_montaje ? 'Sí' : 'No')}
                </td>
                <td class="hour-label-small">Hora:</td>
                <td class="hour-value-large"></td>
              </tr>
              <tr>
                <td class="field-label-4col">Lugar</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.lugarEvento || dataToUse?.lugar_evento || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Domicilio completo donde se piensa desarrollar el evento</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.domicilio || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Duración estimada</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.duracion || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Responsable, contacto o enlace del evento (nombre, cargo y teléfono)</td>
                <td class="field-value-empty" colspan="3">
                  ${(dataToUse?.nombreCoordinador || dataToUse?.nombre_coordinador || '')} - ${dataToUse?.telefonoContacto || dataToUse?.telefono_contacto || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Participantes asistentes o destinatario y/o público al que va dirigido</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.dirigidoA || dataToUse?.dirigido_a || ''}
                </td>
              </tr>
            </tbody>
          </table>
          
          <div class="folio-control">
            Folio de control interno:
          </div>
        </div>

        <!-- Segunda página -->
        <div class="a4-size">
          <div class="facultad">
            <h1>Facultad de Contaduría y</h1>
            <h1>Ciencias Administrativas</h1>
          </div>
          <div class="humanista">
            <h1>"Humanista Por Siempre"</h1>
          </div>

          <table class="form-table">
            <tbody>
              <tr>
                <td class="field-label-4col">Objetivo de la actividad</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.objetivos || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Autoridades invitadas (Grado Académico, Nombre y Cargo)</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.autoridadesInvitadas || dataToUse?.autoridades_invitadas || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Programa del evento o actividad</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.programaEvento || dataToUse?.programa_evento || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Datos estadísticos (Beneficiarios del evento o actividad)</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.datosEstadisticos || dataToUse?.datos_estadisticos || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Información de contraste (Información histórica del evento)</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.informacionHistorica || dataToUse?.informacion_historica || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Presupuesto estimado desglosado (Agregar cotizaciones)</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.presupuesto || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Se requiere Diseño Gráfico (describir)</td>
                <td class="field-value-empty" colspan="3">
                  SÍ ( ${dataToUse?.requiereDisenoGrafico !== undefined ? (dataToUse.requiereDisenoGrafico ? 'X' : ' ') : (dataToUse?.requiere_diseno_grafico ? 'X' : ' ')} )    NO ( ${dataToUse?.requiereDisenoGrafico !== undefined ? (!dataToUse.requiereDisenoGrafico ? 'X' : ' ') : (!dataToUse?.requiere_diseno_grafico ? 'X' : ' ')} )
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Se requiere Publicación en la Página y Redes Sociales (describir)</td>
                <td class="field-value-empty" colspan="3">
                  SÍ ( ${dataToUse?.requierePublicacion !== undefined ? (dataToUse.requierePublicacion ? 'X' : ' ') : (dataToUse?.requiere_publicacion ? 'X' : ' ')} )   NO ( ${dataToUse?.requierePublicacion !== undefined ? (!dataToUse.requierePublicacion ? 'X' : ' ') : (!dataToUse?.requiere_publicacion ? 'X' : ' ')} )
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">Se requiere Transmisión en vivo y/o grabación del evento (describir)</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.requiereTransmision || dataToUse?.requiere_transmision || ''}
                </td>
              </tr>
              <tr>
                <td class="field-label-4col">¿La actividad deriva de un compromiso de la Rectora?</td>
                <td class="field-value-empty" colspan="3">
                  ${dataToUse?.compromisoRectora !== undefined ? (dataToUse.compromisoRectora ? 'SÍ' : 'NO') : (dataToUse?.compromiso_rectora ? 'SÍ' : 'NO')}
                </td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer-signature">
            <div class="footer-line"></div>
            <div class="footer-text">Nombre y Cargo</div>
          </div>
          
          <div class="folio-control">
            Folio de control interno:
          </div>
        </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Esperar a que se cargue el contenido antes de imprimir
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 1000);
    }
  };
  const FichaTecnicaPreviewModal = ({ data, isPreview, onClose, showActions = false }) => {
    const handleZoomIn = () => {
      setZoomLevel(prev => Math.min(prev + 0.1, 1.5));
    };

    const handleZoomOut = () => {
      setZoomLevel(prev => Math.max(prev - 0.1, 0.3));
    };

    const handleResetZoom = () => {
      setZoomLevel(0.8);
    };

    const handleSubmitFromModal = async () => {
      try {
        await handleSubmit();
        onClose();
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    };

    return (
      <div className="preview-modal-overlay">
        <div className="preview-modal-content">
          {/* Controles de zoom modernos */}
          <div className="preview-controls">
            <div className="zoom-controls-modern">
              <button onClick={handleZoomOut} className="zoom-btn modern" title="Alejar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13H5v-2h14v2z"/>
                </svg>
              </button>
              <div className="zoom-display">
                <span className="zoom-percentage">{Math.round(zoomLevel * 100)}%</span>
              </div>
              <button onClick={handleZoomIn} className="zoom-btn modern" title="Acercar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </button>
              <button onClick={handleResetZoom} className="zoom-btn reset-modern" title="Restablecer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
              </button>
              <button onClick={handlePrintFicha} className="zoom-btn print-modern" title="Imprimir ficha técnica">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-actions">
              {isPreview && (
                <>
                  <button onClick={handleSubmitFromModal} className="btn-primary modal-btn">
                    Enviar Ficha
                  </button>
                  <button onClick={() => {
                    setShowPreview(false);
                    setZoomLevel(0.8);
                  }} className="btn-secondary modal-btn">
                    Editar
                  </button>
                </>
              )}
              <button onClick={onClose} className="close-preview-btn">✕ Cerrar</button>
            </div>
          </div>

          {/* Vista previa con zoom */}
          <div className="preview-container">
            <div 
              className="preview-content" 
              style={{ 
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center'
              }}
            >
              <FichaTecnicaPreview data={data} isPreview={isPreview} />
            </div>
          </div>
        </div>
      </div>
    );
  };
  const FichaTecnicaPreview = ({ data, isPreview = false }) => {
    if (!data) return null;
    
    const displayData = isPreview ? data : data;
    const fechaEvento = isPreview ? data.fechaEvento : data.fecha_evento;
    
    // Estilo para la imagen de fondo
    const backgroundStyle = {
      backgroundImage: 'url(/image001.jpg)',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: 'contain'
    };
    
    return (
      <>
        {/* Primera página */}
        <div className="a4-size" style={backgroundStyle}>
          <div className="facultad">
            <h1>Facultad de Contaduría y </h1>
            <h1>Ciencias Administrativas</h1>
          </div>
          <div className="humanista">
            <h1>"Humanista Por Siempre"</h1>
          </div>
          
          <div className="fecha-envio-container">
            <div className="fecha-envio-label">Fecha de envío:</div>
            <table className="fecha-envio">
              <tbody>
                <tr>
                  <td>{new Date().toLocaleDateString('es-MX')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <table className="form-table">
            <tbody>
            <tr>
              <td className="field-label-4col">Nombre de la Coordinación</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.nombreCoordinacion : displayData.nombre_coordinacion || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">Nombre del Coordinador</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.nombreCoordinador : displayData.nombre_coordinador || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">Nombre del evento o Actividad</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.nombreEvento : displayData.nombre_evento || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col" style={{whiteSpace: 'pre-wrap'}}>
                Fecha del evento{'\n'}(Marca con X){'\n'}Fija ( {fechaEvento ? 'X' : ' '} ) Propuesta ( {!fechaEvento ? 'X' : ' '} )
              </td>
              <td className="field-value-empty">
                {fechaEvento ? new Date(fechaEvento).toLocaleDateString('es-MX') : ''}
              </td>
              <td className="hour-label-small">Hora:</td>
              <td className="hour-value-large">
                {fechaEvento ? new Date(fechaEvento).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'}) : ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col" style={{whiteSpace: 'pre-wrap'}}>
                Indicar si se requiere montaje anticipado.{'\n\n'}
              </td>
              <td className="field-value-empty">
                {isPreview ? (data.requiereMontaje ? 'Sí' : 'No') : 
                            (displayData.requiere_montaje ? 'Sí' : 'No')}
              </td>
              <td className="hour-label-small">Hora:</td>
              <td className="hour-value-large"></td>
            </tr>
            <tr>
              <td className="field-label-4col">Lugar</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.lugarEvento : displayData.lugar_evento || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">Domicilio completo donde se piensa desarrollar el evento</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.domicilio : displayData.domicilio || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">Duración estimada</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.duracion : displayData.duracion || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">Responsable, contacto o enlace del evento (nombre, cargo y teléfono)</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? `${data.nombreCoordinador}${data.telefonoContacto ? ` - ${data.telefonoContacto}` : ''}` : 
                            `${displayData.nombre_coordinador || ''}${displayData.telefono_contacto ? ` - ${displayData.telefono_contacto}` : ''}`}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">Participantes asistentes o destinatario y/o público al que va dirigido</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.dirigidoA : displayData.dirigido_a || ''}
              </td>
            </tr>
          </tbody>
        </table>
        
        <div className="folio-control">
          Folio de control interno:
        </div>
      </div>

      {/* Segunda página */}
      <div className="a4-size" style={backgroundStyle}>
        <div className="facultad">
          <h1>Facultad de Contaduría y </h1>
          <h1>Ciencias Administrativas</h1>
        </div>
        <div className="humanista">
          <h1>"Humanista Por Siempre"</h1>
        </div>

        <table className="form-table">
          <tbody>
            <tr>
              <td className="field-label-4col">Objetivo de la actividad</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.objetivos : displayData.objetivos || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">Autoridades invitadas(Grado Académico, Nombre y Cargo)</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.autoridadesInvitadas : displayData.autoridades_invitadas || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">Programa del evento o actividad</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.programaEvento : displayData.programa_evento || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">Datos estadísticos (Beneficiarios del evento o actividad)</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.datosEstadisticos : displayData.datos_estadisticos || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">Información de contraste (Información histórica del evento)</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.informacionHistorica : displayData.informacion_historica || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">Presupuesto estimado desglosado (Agregar cotizaciones)</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.presupuesto : displayData.presupuesto || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col" style={{whiteSpace: 'pre-wrap'}}>
                Se requiere Diseño Gráfico(describir){'\n\n'}
              </td>
              <td className="field-value-empty" colSpan="3">
                SÍ ( {isPreview ? (data.requiereDisenoGrafico ? 'X' : ' ') : (displayData.requiere_diseno_grafico ? 'X' : ' ')} )    NO ( {isPreview ? (!data.requiereDisenoGrafico ? 'X' : ' ') : (!displayData.requiere_diseno_grafico ? 'X' : ' ')} ) Si Programar con la M.A. Alicia Contreras Lugo
              </td>
            </tr>
            <tr>
              <td className="field-label-4col" style={{whiteSpace: 'pre-wrap'}}>
                Se requiere Publicación en la Página y Redes Sociales (describir){'\n\n'}
              </td>
              <td className="field-value-empty" colSpan="3">
                SÍ ( {isPreview ? (data.requierePublicacion ? 'X' : ' ') : (displayData.requiere_publicacion ? 'X' : ' ')} )   NO ( {isPreview ? (!data.requierePublicacion ? 'X' : ' ') : (!displayData.requiere_publicacion ? 'X' : ' ')} ) Si Programar con el I.S.C. Héctor Ulises Gaona Campos
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">Se requiere Transmisión en vivo y/o grabación del evento (describir)</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? data.requiereTransmision : displayData.requiere_transmision || ''}
              </td>
            </tr>
            <tr>
              <td className="field-label-4col">¿La actividad deriva de un compromiso de la Rectora?</td>
              <td className="field-value-empty" colSpan="3">
                {isPreview ? (data.compromisoRectora ? 'SÍ' : 'NO') : 
                            (displayData.compromiso_rectora ? 'SÍ' : 'NO')}
              </td>
            </tr>
          </tbody>
        </table>
        
        <div className="footer-signature">
          <div className="footer-line"></div>
          <div className="footer-text">Nombre y Cargo</div>
        </div>
        
        <div className="folio-control">
          Folio de control interno:
        </div>
      </div>
      </>
    );
  };

  // Vista para usuarios normales
  if (user?.role === 'usuario') {
    const fichasFiltradas = Array.isArray(fichas) ? fichas.filter(f => f.usuario_id === user.id) : [];
    
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
            <div className="modal-content large ficha-modal">
              <div className="modal-header-fixed">
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
                <div className="modal-body-scrollable">
                  <form className="form-grid-modern">
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
                    <label>Fecha del Evento: <span style={{fontSize: '12px', color: '#666'}}>📅 Debe ser fecha futura</span></label>
                    <input
                      type="date"
                      name="fechaEvento"
                      value={formData.fechaEvento}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      title="Selecciona la fecha del evento. Debe ser hoy o fecha futura."
                    />
                  </div>

                  <div className="form-group">
                    <label>Tipo de Evento: <span style={{fontSize: '12px', color: '#666'}}>🎯 Selecciona la categoría</span></label>
                    <select
                      name="tipoEvento"
                      value={formData.tipoEvento}
                      onChange={handleInputChange}
                      required
                      title="Selecciona el tipo de evento que mejor describa tu actividad"
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
                    <label>Fecha Límite de Inscripción: <span style={{fontSize: '12px', color: '#666'}}>📋 Debe ser antes del evento</span></label>
                    <input
                      type="date"
                      name="fechaLimiteInscripcion"
                      value={formData.fechaLimiteInscripcion}
                      onChange={handleInputChange}
                      max={formData.fechaEvento || undefined}
                      title="Fecha límite para inscribirse. Debe ser anterior a la fecha del evento."
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
                      <label>Costo: <span style={{fontSize: '12px', color: '#666'}}>💡 Solo números (ej: 1500.50)</span></label>
                      <input
                        type="number"
                        name="costo"
                        value={formData.costo}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        placeholder="Ejemplo: 1500.50"
                        title="Ingresa solo números. Usa punto decimal para centavos (ej: 1500.50)"
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
                    <label>Domicilio completo donde se piensa desarrollar el evento:</label>
                    <textarea
                      name="domicilio"
                      value={formData.domicilio}
                      onChange={handleInputChange}
                      rows="2"
                      placeholder="Dirección completa del lugar del evento"
                    />
                  </div>

                  <div className="form-group">
                    <label>Duración estimada:</label>
                    <input
                      type="text"
                      name="duracion"
                      value={formData.duracion}
                      onChange={handleInputChange}
                      placeholder="Ej: 2 horas, 1 día, etc."
                    />
                  </div>

                  <div className="form-group">
                    <label>Teléfono de contacto:</label>
                    <input
                      type="tel"
                      name="telefonoContacto"
                      value={formData.telefonoContacto}
                      onChange={handleInputChange}
                      placeholder="Número de teléfono"
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="requiereMontaje"
                        checked={formData.requiereMontaje}
                        onChange={handleInputChange}
                      />
                      Requiere montaje anticipado
                    </label>
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

                  <div className="form-group full-width">
                    <label>Autoridades invitadas (Grado Académico, Nombre y Cargo):</label>
                    <textarea
                      name="autoridadesInvitadas"
                      value={formData.autoridadesInvitadas}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Ejemplo: Dr. Juan Pérez - Rector"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Programa del evento o actividad:</label>
                    <textarea
                      name="programaEvento"
                      value={formData.programaEvento}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="Detalle el programa o agenda del evento"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Datos estadísticos (Beneficiarios del evento o actividad):</label>
                    <textarea
                      name="datosEstadisticos"
                      value={formData.datosEstadisticos}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Número estimado de beneficiarios y características"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Información de contraste (Información histórica del evento):</label>
                    <textarea
                      name="informacionHistorica"
                      value={formData.informacionHistorica}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Información sobre eventos similares anteriores"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Presupuesto estimado desglosado (Agregar cotizaciones):</label>
                    <textarea
                      name="presupuesto"
                      value={formData.presupuesto}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="Desglose detallado del presupuesto con cotizaciones"
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="requiereDisenoGrafico"
                        checked={formData.requiereDisenoGrafico}
                        onChange={handleInputChange}
                      />
                      Se requiere Diseño Gráfico
                    </label>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="requierePublicacion"
                        checked={formData.requierePublicacion}
                        onChange={handleInputChange}
                      />
                      Se requiere Publicación en la Página y Redes Sociales
                    </label>
                  </div>

                  <div className="form-group full-width">
                    <label>Se requiere Transmisión en vivo y/o grabación del evento (describir):</label>
                    <textarea
                      name="requiereTransmision"
                      value={formData.requiereTransmision}
                      onChange={handleInputChange}
                      rows="2"
                      placeholder="Descripción de los requerimientos de transmisión"
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="compromisoRectora"
                        checked={formData.compromisoRectora}
                        onChange={handleInputChange}
                      />
                      ¿La actividad deriva de un compromiso de la Rectora?
                    </label>
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
                      className="btn-primary"
                      onClick={handleSubmit}
                    >
                      Enviar Ficha
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
                </div>
              ) : (
                <FichaTecnicaPreviewModal 
                  data={formData} 
                  isPreview={true}
                  onClose={() => {
                    setShowPreview(false);
                    setZoomLevel(0.8); // Reset zoom al cerrar
                  }}
                />
              )}
            </div>
          </div>
        )}

        <div className="user-fichas">
          <h2>📋 Mis Fichas Técnicas</h2>
          {Array.isArray(fichas) && fichas.length === 0 ? (
            <div className="fichas-empty">
              <div className="icon">📄</div>
              <h3>No tienes fichas técnicas</h3>
              <p>Crea tu primera ficha técnica usando el botón "Crear Nueva Ficha"</p>
            </div>
          ) : (
            <div className="fichas-grid">
              {fichasFiltradas.map(ficha => (
                <div 
                  key={ficha.id} 
                  className="ficha-card"
                  onClick={() => handleViewDetail(ficha.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="ficha-card-header">
                    <h3 className="ficha-card-title">{ficha.nombre_evento}</h3>
                    <span className={`ficha-status ${ficha.estado || 'pendiente'}`}>
                      {ficha.estado === 'pendiente' ? 'Pendiente' : 
                       ficha.estado === 'aprobado' ? 'Aprobado' : 
                       ficha.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="ficha-card-body">
                    <div className="ficha-meta">
                      <span>📅 {new Date(ficha.fecha_evento).toLocaleDateString('es-MX')}</span>
                      <span>🎯 {ficha.tipo_evento}</span>
                    </div>
                    <div className="ficha-description">
                      <p><strong>Modalidad:</strong> {ficha.modalidad || 'No especificada'}</p>
                      <p><strong>Lugar:</strong> {ficha.lugar_evento || 'No especificado'}</p>
                      {ficha.objetivos && (
                        <p><strong>Objetivos:</strong> {ficha.objetivos.substring(0, 100)}{ficha.objetivos.length > 100 ? '...' : ''}</p>
                      )}
                    </div>
                    <div className="ficha-actions">
                      <button 
                        className="btn-ficha primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(ficha.id);
                        }}
                        title="Ver detalles"
                      >
                        Ver Detalle
                      </button>
                      {(ficha.estado === 'pendiente' || !ficha.estado) && (
                        <button 
                          className="btn-ficha danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ficha.id);
                          }}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal para ver ficha completa - Vista Usuario */}
        {expandedFicha && (
          <div 
            className="modal-overlay" 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}
          >
            <div 
              className="modal-content" 
              style={{
                width: '95vw', 
                height: '95vh', 
                maxWidth: 'none', 
                maxHeight: 'none', 
                position: 'relative',
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'auto'
              }}
            >
              {/* Botón de cerrar arriba a la derecha */}
              <button 
                className="btn-close"
                onClick={() => {
                  setExpandedFicha(null);
                  setZoomLevel(0.8);
                }}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  zIndex: 1001,
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>

              {/* Encabezado del modal con título y controles */}
              <div style={{
                background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                color: 'white',
                padding: '20px',
                paddingRight: '60px', // Espacio adicional para el botón de cerrar
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 100
              }}>
                <h2 style={{margin: 0, fontSize: '1.5em', fontWeight: 'bold'}}>
                  📋 Ficha Técnica Completa
                </h2>
                
                {/* Controles de zoom e impresión */}
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <button 
                    onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    −
                  </button>
                  <span style={{
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    padding: '8px 15px', 
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    minWidth: '60px',
                    textAlign: 'center'
                  }}>
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button 
                    onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    +
                  </button>
                  <button 
                    onClick={handlePrintFicha}
                    style={{
                      backgroundColor: '#6f42c1',
                      color: 'white',
                      border: '2px solid #6f42c1',
                      borderRadius: '6px',
                      padding: '8px 15px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      marginLeft: '10px'
                    }}
                  >
                    🖨️ Imprimir
                  </button>
                </div>
              </div>
              
              <div className="ficha-preview-container" style={{flex: 1, overflow: 'auto', padding: '20px', background: '#e8e8e8'}}>
                <div 
                  style={{ 
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'top center',
                    marginBottom: `${(1 - zoomLevel) * 500}px`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start'
                  }}
                >
                  <FichaTecnicaPreview data={expandedFicha} isPreview={false} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista para admin/coordinador
  console.log('🔍 Vista admin - fichas:', fichas);
  console.log('🔍 Usuario admin:', user);
  console.log('🔍 Tipo de fichas:', typeof fichas, Array.isArray(fichas));
  
  return (
    <div className="page-container">
      <style>{`
        .botones-ficha-horizontal {
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin: 10px 0;
          padding: 0;
        }
        
        .btn-ficha-azul, .btn-ficha-verde, .btn-ficha-rojo {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          color: white;
          min-width: 70px;
          text-align: center;
        }
        
        .btn-ficha-azul {
          background-color: #007bff;
        }
        
        .btn-ficha-azul:hover {
          background-color: #0056b3;
        }
        
        .btn-ficha-verde {
          background-color: #28a745;
        }
        
        .btn-ficha-verde:hover {
          background-color: #1e7e34;
        }
        
        .btn-ficha-rojo {
          background-color: #dc3545;
        }
        
        .btn-ficha-rojo:hover {
          background-color: #c82333;
        }
      `}</style>
      <div className="page-header">
        <h1>Solicitudes de Fichas Técnicas</h1>
        <div className="stats-bar">
          <span className="stat-item">Total: {Array.isArray(fichas) ? fichas.length : 0}</span>
          <span className="stat-item pendientes">
            Pendientes: {Array.isArray(fichas) ? fichas.filter(f => f.estado === 'pendiente' || !f.estado).length : 0}
          </span>
          <span className="stat-item aprobadas">
            Aprobadas: {Array.isArray(fichas) ? fichas.filter(f => f.estado === 'aprobada').length : 0}
          </span>
        </div>
      </div>

      <div className="solicitudes-lista">
        {!Array.isArray(fichas) || fichas.length === 0 ? (
          <div className="fichas-empty">
            <div className="icon">📄</div>
            <h3>No hay solicitudes de fichas técnicas</h3>
            <p>Cuando los usuarios envíen solicitudes aparecerán aquí</p>
          </div>
        ) : (
          <div className="fichas-grid">
            {fichas.map(ficha => (
              <div key={ficha.id} className="ficha-card" onClick={() => setExpandedFicha(ficha)}>
                <div className="ficha-card-header">
                  <h3 className="ficha-card-title">{ficha.nombre_evento}</h3>
                  <span className={`ficha-status ${ficha.estado || 'pendiente'}`}>
                    {ficha.estado === 'pendiente' ? 'Pendiente' : 
                     ficha.estado === 'aprobado' ? 'Aprobado' : 
                     ficha.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                  </span>
                </div>
                <div className="ficha-card-body">
                  <div className="ficha-meta">
                    <span>📅 {new Date(ficha.fecha_evento).toLocaleDateString('es-MX')}</span>
                    <span>🎯 {ficha.tipo_evento}</span>
                  </div>
                  <div className="ficha-description">
                    <p><strong>Coordinación:</strong> {ficha.nombre_coordinacion}</p>
                    <p><strong>Coordinador:</strong> {ficha.nombre_coordinador}</p>
                    <p><strong>Usuario:</strong> {ficha.usuario_nombre || ficha.usuario_email}</p>
                    <p><strong>Modalidad:</strong> {ficha.modalidad || 'No especificada'}</p>
                    {ficha.objetivos && (
                      <p><strong>Objetivos:</strong> {ficha.objetivos.substring(0, 80)}{ficha.objetivos.length > 80 ? '...' : ''}</p>
                    )}
                  </div>
                  <div className="botones-ficha-horizontal">
                    <button className="btn-ficha-azul" onClick={() => handleViewDetail(ficha.id)} title="Ver detalles">
                      Ver Detalles
                    </button>
                    {(ficha.estado === 'pendiente' || !ficha.estado) && (
                      <>
                        <button 
                          className="btn-ficha-verde"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(ficha.id);
                          }}
                          title="Aprobar"
                        >
                          Aprobar
                        </button>
                        <button 
                          className="btn-ficha-rojo"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(ficha.id);
                          }}
                          title="Rechazar"
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para ver ficha completa */}
      {expandedFicha && (
        <div 
          className="modal-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div 
            className="modal-content" 
            style={{
              width: '95vw', 
              height: '95vh', 
              maxWidth: 'none', 
              maxHeight: 'none', 
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'auto'
            }}
          >
            
            {/* Botón de cerrar arriba a la derecha */}
            <button 
              className="btn-close"
              onClick={() => {
                setExpandedFicha(null);
                setZoomLevel(0.8);
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '20px',
                zIndex: 1000,
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#cc0000'}
              onMouseLeave={(e) => e.target.style.background = '#ff4444'}
            >
              ×
            </button>
            
            <div className="modal-header" style={{paddingRight: '80px'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
                <h2>📋 Ficha Técnica Completa</h2>
                
                {/* Controles de zoom en el encabezado */}
                <div className="zoom-controls-modern" style={{marginRight: '20px'}}>
                  <button onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.3))} className="zoom-btn modern" title="Alejar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13H5v-2h14v2z"/>
                    </svg>
                  </button>
                  <div className="zoom-display">
                    <span className="zoom-percentage">{Math.round(zoomLevel * 100)}%</span>
                  </div>
                  <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 1.5))} className="zoom-btn modern" title="Acercar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </button>
                  <button onClick={() => setZoomLevel(0.8)} className="zoom-btn reset-modern" title="Restablecer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                    </svg>
                  </button>
                  <button onClick={handlePrintFicha} className="zoom-btn print-modern" title="Imprimir ficha técnica">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Los controles de zoom ahora están en el encabezado */}
            
            <div className="ficha-preview-container" style={{flex: 1, overflow: 'auto', padding: '20px', background: '#e8e8e8'}}>
              <div 
                style={{ 
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  marginBottom: `${(1 - zoomLevel) * 500}px`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start'
                }}
              >
                <FichaTecnicaPreview data={expandedFicha} isPreview={false} />
              </div>
            </div>
            
            <div className="modal-actions" style={{textAlign: 'center', padding: '10px'}}>
              {/* Los botones de acción se pueden agregar aquí si es necesario */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FichasTecnicas;
