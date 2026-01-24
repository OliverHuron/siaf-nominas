const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

class GmailController {
  constructor() {
    this.oauth2Client = null;
    this.gmail = null;
    this.initializeOAuth();
  }

  initializeOAuth() {
    // Configuración OAuth2 para Gmail API
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || `${process.env.SERVER_URL}/api/gmail/auth/callback`
    );

    // Si hay tokens guardados, cargarlos
    this.loadSavedTokens();
  }

  async loadSavedTokens() {
    try {
      const tokenPath = path.join(__dirname, '../config/gmail_tokens.json');
      const tokens = await fs.readFile(tokenPath, 'utf8');
      const parsedTokens = JSON.parse(tokens);
      
      this.oauth2Client.setCredentials(parsedTokens);
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      console.log('✅ Tokens de Gmail cargados exitosamente');
    } catch (error) {
      console.log('ℹ️ No se encontraron tokens guardados de Gmail');
    }
  }

  async saveTokens(tokens) {
    try {
      const tokenPath = path.join(__dirname, '../config/gmail_tokens.json');
      await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));
      console.log('✅ Tokens de Gmail guardados exitosamente');
    } catch (error) {
      console.error('❌ Error guardando tokens:', error);
    }
  }

  // Paso 1: Obtener URL de autorización
  getAuthUrl = (req, res) => {
    try {
      const scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.insert',
        'https://www.googleapis.com/auth/gmail.labels'
      ];

      console.log('🔍 Configuración OAuth2:');
      console.log('Client ID:', process.env.GMAIL_CLIENT_ID);
      console.log('Redirect URI:', process.env.GMAIL_REDIRECT_URI);

      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });

      console.log('🌐 URL generada:', authUrl);

      res.json({ 
        success: true, 
        authUrl,
        message: 'Visita esta URL para autorizar la aplicación' 
      });
    } catch (error) {
      console.error('Error generando URL de autorización:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error generando URL de autorización' 
      });
    }
  };

  // Paso 2: Manejar callback de autorización
  handleAuthCallback = async (req, res) => {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.redirect(`${process.env.CLIENT_URL}/emails?error=no_code`);
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Guardar tokens para uso futuro
      await this.saveTokens(tokens);
      
      // Inicializar Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      console.log('✅ Gmail autorizado exitosamente');
      
      // Redirigir a la página de correos con mensaje de éxito
      res.redirect(`${process.env.CLIENT_URL}/emails?success=true`);
    } catch (error) {
      console.error('Error en callback de autorización:', error);
      // Redirigir con mensaje de error
      res.redirect(`${process.env.CLIENT_URL}/emails?error=auth_failed`);
    }
  };

  // Verificar estado de autenticación
  getAuthStatus = (req, res) => {
    const isAuthenticated = !!(this.oauth2Client && this.gmail);
    
    res.json({
      success: true,
      isAuthenticated,
      message: isAuthenticated ? 'Gmail API configurada' : 'Autenticación requerida'
    });
  };

  // Estrategia "Enviar, Limpiar y Fingir" con soporte para plantillas
  sendMassEmail = async (req, res) => {
    try {
      if (!this.gmail) {
        return res.status(401).json({
          success: false,
          message: 'Gmail API no configurada. Autorización requerida.'
        });
      }

      const { 
        recipients, 
        subject, 
        message: emailBody, 
        senderName = '',
        delayBetweenEmails = 2000,
        useTemplate = false,
        templateId = null,
        recipientType = 'to', // 'to', 'cc', 'bcc'
        includeConfirmation = false
      } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de destinatarios requerida'
        });
      }

      console.log(`📧 Iniciando envío masivo a ${recipients.length} destinatarios`);

      // PASO 0.5: Guardar en historial primero para obtener tracking ID
      console.log('💾 Creando registro de historial...');
      const historyRecord = await this.saveToHistory({
        subject,
        message: emailBody,
        senderName,
        recipientsCount: recipients.length,
        recipientsData: recipients,
        sentCount: 0, // Se actualizará después
        failedCount: 0,
        failedEmails: [],
        templateId,
        usedVariables: useTemplate
      });

      const trackingId = historyRecord ? historyRecord.trackingId : null;
      const historyId = historyRecord ? historyRecord.id : null;

      // PASO 1: Enviar correos individuales (personalizados si usa plantilla)
      const sentMessageIds = [];
      const failedEmails = [];

      const baseUrl = process.env.SERVER_URL;

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        try {
          console.log(`📤 Enviando ${i + 1}/${recipients.length} a: ${recipient.email || recipient}`);
          
          let personalizedSubject = subject;
          let personalizedMessage = emailBody;

          // Si usa plantilla y tiene datos del empleado, personalizar
          if (useTemplate && recipient.id) {
            const variables = {
              nombre: recipient.nombre || '',
              apellido_paterno: recipient.apellido_paterno || '',
              apellido_materno: recipient.apellido_materno || '',
              nombre_completo: `${recipient.nombre || ''} ${recipient.apellido_paterno || ''} ${recipient.apellido_materno || ''}`.trim(),
              email: recipient.email || '',
              puesto: recipient.puesto || '',
              dependencia: recipient.dependencia || '',
              fecha_actual: new Date().toLocaleDateString('es-ES'),
              año_actual: new Date().getFullYear()
            };

            // Reemplazar variables
            Object.keys(variables).forEach(key => {
              const regex = new RegExp(`{${key}}`, 'g');
              personalizedSubject = personalizedSubject.replace(regex, variables[key]);
              personalizedMessage = personalizedMessage.replace(regex, variables[key]);
            });
          }

          // Generar token por destinatario para tracking detallado
          const recipientToken = randomUUID();

          // Agregar pixel de tracking al mensaje
          if (trackingId) {
            const trackingPixel = `<img src="${baseUrl}/api/gmail/track/${trackingId}/${recipientToken}" width="1" height="1" style="display:none;" />`;
            personalizedMessage = personalizedMessage + trackingPixel;
          }

          // Agregar botón/enlace de confirmación si está habilitado
          if (includeConfirmation && trackingId) {
            const confirmationUrl = `${baseUrl}/api/gmail/confirm/${trackingId}/${recipientToken}`;
            const confirmationButton = `
<div style="margin-top:16px;">
  <a href="${confirmationUrl}" style="background-color:#28a745;color:#ffffff;padding:10px 18px;border-radius:4px;text-decoration:none;display:inline-block;font-weight:bold;">
    Confirmar recepción
  </a>
</div>`;
            personalizedMessage = personalizedMessage + confirmationButton;
          }
          
          const messageId = await this.sendIndividualEmail(
            recipient.email || recipient, 
            personalizedSubject, 
            personalizedMessage, 
            senderName,
            recipientType
          );
          sentMessageIds.push(messageId);
          
          // Registrar historial por destinatario (enviado)
          if (historyId) {
            const db = require('../config/database');
            await db.query(`
              INSERT INTO email_recipient_history (
                history_id, recipient_email, recipient_name, status, tracking_token
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              historyId,
              recipient.email || recipient,
              recipient.nombre ? `${recipient.nombre} ${recipient.apellido_paterno || ''} ${recipient.apellido_materno || ''}`.trim() : null,
              'enviado',
              recipientToken
            ]);
          }
          
          // Delay entre envíos para evitar rate limiting
          if (i < recipients.length - 1) {
            await this.delay(delayBetweenEmails);
          }
          
        } catch (error) {
          console.error(`❌ Error enviando a ${recipient.email || recipient}:`, error);
          failedEmails.push({ email: recipient.email || recipient, error: error.message });

          // Registrar historial por destinatario (fallido)
          if (historyId) {
            const db = require('../config/database');
            await db.query(`
              INSERT INTO email_recipient_history (
                history_id, recipient_email, recipient_name, status, error_message
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              historyId,
              recipient.email || recipient,
              recipient.nombre ? `${recipient.nombre} ${recipient.apellido_paterno || ''} ${recipient.apellido_materno || ''}`.trim() : null,
              'fallido',
              error.message || null
            ]);
          }
        }
      }

      console.log(`✅ Enviados: ${sentMessageIds.length}, Fallidos: ${failedEmails.length}`);

      // PASO 2: Limpiar bandeja de enviados
      if (sentMessageIds.length > 0) {
        console.log('🧹 Limpiando bandeja de enviados...');
        await this.cleanSentFolder(sentMessageIds);
      }

      // PASO 3: Crear evidencia con CCO
      console.log('📝 Creando evidencia en bandeja de enviados...');
      const emailList = recipients.map(r => r.email || r);
      const evidenceMessageId = await this.createEvidenceEmail(emailList, subject, emailBody, senderName, recipientType);

      // PASO 3.5: Aplicar label de Gmail
      if (evidenceMessageId) {
        console.log('🏷️ Aplicando etiqueta de organización...');
        const labelName = `SIAF/${new Date().getFullYear()}`;
        const labelId = await this.getOrCreateLabel(labelName);
        if (labelId) {
          await this.applyLabelToMessage(evidenceMessageId, labelId);
        }
      }

      // PASO 4: Actualizar estadísticas en historial
      if (trackingId) {
        console.log('📊 Actualizando estadísticas en historial...');
        await this.updateHistoryStats(trackingId, sentMessageIds.length, failedEmails.length, failedEmails);
      }

      res.json({
        success: true,
        message: `Correo masivo enviado exitosamente`,
        stats: {
          total: recipients.length,
          sent: sentMessageIds.length,
          failed: failedEmails.length,
          failedEmails: failedEmails.length > 0 ? failedEmails : undefined
        }
      });

    } catch (error) {
      console.error('❌ Error en envío masivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno en envío masivo'
      });
    }
  };

  // Función auxiliar: Enviar correo individual
  async sendIndividualEmail(recipient, subject, body, senderName, recipientType = 'to') {
    const email = this.createEmailMessage(recipient, subject, body, senderName, recipientType);
    
    const result = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: email
      }
    });

    return result.data.id;
  }

  // Función auxiliar: Limpiar bandeja de enviados
  async cleanSentFolder(messageIds) {
    try {
      // Gmail API permite eliminar hasta 1000 mensajes por batch
      const batchSize = 1000;
      
      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);
        
        await this.gmail.users.messages.batchDelete({
          userId: 'me',
          requestBody: {
            ids: batch
          }
        });
      }
      
      console.log(`🗑️ ${messageIds.length} mensajes eliminados de Enviados`);
    } catch (error) {
      console.error('❌ Error limpiando bandeja:', error);
    }
  }

  // Función auxiliar: Crear evidencia con CCO
  async createEvidenceEmail(recipients, subject, body, senderName, recipientType = 'bcc') {
    try {
      // Usar el primer destinatario como "Para" principal si es TO
      let primaryRecipient = 'me';
      let ccList = [];
      let bccList = [];

      if (recipientType === 'to') {
        primaryRecipient = recipients[0];
        bccList = recipients.slice(1);
      } else if (recipientType === 'cc') {
        ccList = recipients;
      } else {
        bccList = recipients;
      }

      const evidenceEmail = this.createEvidenceMessage(
        primaryRecipient,
        ccList,
        bccList,
        subject,
        body,
        senderName
      );

      // Insertar el mensaje en la bandeja de enviados
      const result = await this.gmail.users.messages.insert({
        userId: 'me',
        requestBody: {
          raw: evidenceEmail,
          labelIds: ['SENT']
        }
      });

      console.log('📋 Evidencia creada en bandeja de enviados');
      return result.data.id; // Retornar ID para aplicar label después
    } catch (error) {
      console.error('❌ Error creando evidencia:', error);
      return null;
    }
  }

  // Función auxiliar: Obtener o crear label de Gmail
  async getOrCreateLabel(labelName) {
    try {
      // Buscar si el label ya existe
      const labelsResponse = await this.gmail.users.labels.list({
        userId: 'me'
      });

      const existingLabel = labelsResponse.data.labels.find(
        label => label.name === labelName
      );

      if (existingLabel) {
        return existingLabel.id;
      }

      // Crear nuevo label
      const newLabel = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
          color: {
            backgroundColor: '#764ba2',
            textColor: '#ffffff'
          }
        }
      });

      console.log(`🏷️ Label "${labelName}" creado`);
      return newLabel.data.id;
    } catch (error) {
      console.error('❌ Error gestionando label:', error);
      return null;
    }
  }

  // Función auxiliar: Aplicar label a un mensaje
  async applyLabelToMessage(messageId, labelId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId]
        }
      });
    } catch (error) {
      console.error('❌ Error aplicando label:', error);
    }
  }

  // Función auxiliar: Crear mensaje de correo
  createEmailMessage(to, subject, body, senderName = '', recipientType = 'to') {
    const from = senderName ? `${senderName} <me>` : 'me';
    
    let email = [
      `From: ${from}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      ''
    ];

    // Agregar destinatario según tipo
    if (recipientType === 'to') {
      email.splice(1, 0, `To: ${to}`);
    } else if (recipientType === 'cc') {
      email.splice(1, 0, `To: me`);
      email.splice(2, 0, `Cc: ${to}`);
    } else if (recipientType === 'bcc') {
      email.splice(1, 0, `To: me`);
      email.splice(2, 0, `Bcc: ${to}`);
    }

    email.push(body);

    return Buffer.from(email.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }

  // Función auxiliar: Crear mensaje de evidencia
  createEvidenceMessage(to, ccList = [], bccList = [], subject, body, senderName = '') {
    const from = senderName ? `${senderName} <me>` : 'me';
    
    const email = [
      `From: ${from}`,
      `To: ${to}`,
      ccList.length > 0 ? `Cc: ${ccList.join(', ')}` : '',
      bccList.length > 0 ? `Bcc: ${bccList.join(', ')}` : '',
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body
    ].filter(line => line !== '').join('\n');

    return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }

  // Función auxiliar: Delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Obtener información del usuario de Gmail
  getUserInfo = async (req, res) => {
    try {
      if (!this.gmail) {
        return res.status(401).json({
          success: false,
          message: 'Gmail API no configurada'
        });
      }

      const profile = await this.gmail.users.getProfile({ userId: 'me' });
      
      res.json({
        success: true,
        profile: {
          emailAddress: profile.data.emailAddress,
          messagesTotal: profile.data.messagesTotal,
          threadsTotal: profile.data.threadsTotal
        }
      });
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo información del usuario'
      });
    }
  };

  // Cerrar sesión de Gmail (eliminar tokens)
  logout = async (req, res) => {
    try {
      const tokenPath = path.join(__dirname, '../config/gmail_tokens.json');
      
      // Intentar eliminar el archivo de tokens
      try {
        await fs.unlink(tokenPath);
        console.log('🔓 Tokens de Gmail eliminados');
      } catch (error) {
        // Si el archivo no existe, no hay problema
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Limpiar estado en memoria
      this.oauth2Client.setCredentials({});
      this.gmail = null;

      res.json({
        success: true,
        message: 'Sesión de Gmail cerrada exitosamente'
      });
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      res.status(500).json({
        success: false,
        message: 'Error cerrando sesión de Gmail'
      });
    }
  };

  // Obtener listas de correos predefinidas
  getEmailLists = async (req, res) => {
    try {
      const db = require('../config/database');
      
      // Consultar todas las listas con su cantidad de empleados
      const allEmployees = await db.query(`
        SELECT id, nombre, apellido_paterno, apellido_materno, email, dependencia_id, tipo
        FROM empleados 
        WHERE email IS NOT NULL AND email != '' AND activo = true
        ORDER BY apellido_paterno, apellido_materno, nombre
      `);

      const activeEmployees = allEmployees.rows;

      // Empleados administrativos
      const admins = activeEmployees.filter(e => e.tipo === 'administrativo');

      // Empleados docentes
      const teachers = activeEmployees.filter(e => e.tipo === 'docente');

      // Obtener empleados que deben quincenas (tienen 'F' en asistencias)
      const employeesWithDebtsResult = await db.query(`
        SELECT DISTINCT e.id, e.nombre, e.apellido_paterno, e.apellido_materno, e.email, e.tipo
        FROM empleados e
        INNER JOIN asistencias_quincenales aq ON e.id = aq.empleado_id
        WHERE e.email IS NOT NULL AND e.email != '' AND e.activo = true
        AND (
          aq.enero_q1 = 'F' OR aq.enero_q2 = 'F' OR
          aq.febrero_q1 = 'F' OR aq.febrero_q2 = 'F' OR
          aq.marzo_q1 = 'F' OR aq.marzo_q2 = 'F' OR
          aq.abril_q1 = 'F' OR aq.abril_q2 = 'F' OR
          aq.mayo_q1 = 'F' OR aq.mayo_q2 = 'F' OR
          aq.junio_q1 = 'F' OR aq.junio_q2 = 'F' OR
          aq.julio_q1 = 'F' OR aq.julio_q2 = 'F' OR
          aq.agosto_q1 = 'F' OR aq.agosto_q2 = 'F' OR
          aq.septiembre_q1 = 'F' OR aq.septiembre_q2 = 'F' OR
          aq.octubre_q1 = 'F' OR aq.octubre_q2 = 'F' OR
          aq.noviembre_q1 = 'F' OR aq.noviembre_q2 = 'F' OR
          aq.diciembre_q1 = 'F' OR aq.diciembre_q2 = 'F'
        )
        ORDER BY e.apellido_paterno, e.apellido_materno, e.nombre
      `);

      const employeesWithDebts = employeesWithDebtsResult.rows;

      const lists = [
        {
          id: 'all',
          name: 'Todos los empleados',
          count: activeEmployees.length,
          description: 'Todos los empleados activos con email',
          emails: activeEmployees.map(e => ({
            id: e.id,
            email: e.email,
            nombre: e.nombre,
            apellido_paterno: e.apellido_paterno,
            apellido_materno: e.apellido_materno,
            tipo: e.tipo
          }))
        },
        {
          id: 'admins',
          name: 'Administrativos',
          count: admins.length,
          description: 'Personal administrativo',
          emails: admins.map(e => ({
            id: e.id,
            email: e.email,
            nombre: e.nombre,
            apellido_paterno: e.apellido_paterno,
            apellido_materno: e.apellido_materno,
            tipo: e.tipo
          }))
        },
        {
          id: 'teachers',
          name: 'Docentes',
          count: teachers.length,
          description: 'Personal docente',
          emails: teachers.map(e => ({
            id: e.id,
            email: e.email,
            nombre: e.nombre,
            apellido_paterno: e.apellido_paterno,
            apellido_materno: e.apellido_materno,
            tipo: e.tipo
          }))
        },
        {
          id: 'debts',
          name: 'Deben quincenas',
          count: employeesWithDebts.length,
          description: 'Empleados activos que tienen faltas pendientes',
          emails: employeesWithDebts.map(e => ({
            id: e.id,
            email: e.email,
            nombre: e.nombre,
            apellido_paterno: e.apellido_paterno,
            apellido_materno: e.apellido_materno,
            tipo: e.tipo
          }))
        }
      ];

      res.json({
        success: true,
        lists: lists
      });
    } catch (error) {
      console.error('Error obteniendo listas de correos:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo listas de correos'
      });
    }
  };

  // Guardar envío en historial
  async saveToHistory(data) {
    try {
      const db = require('../config/database');
      
      const result = await db.query(`
        INSERT INTO email_history (
          subject, message, sender_name, recipients_count, recipients_data,
          sent_count, failed_count, failed_emails, template_id, used_variables
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, tracking_id
      `, [
        data.subject,
        data.message,
        data.senderName,
        data.recipientsCount,
        JSON.stringify(data.recipientsData),
        data.sentCount,
        data.failedCount,
        JSON.stringify(data.failedEmails),
        data.templateId || null,
        data.usedVariables || false
      ]);

      const row = result.rows[0];
      console.log('✅ Historial guardado exitosamente. ID:', row.id, 'Tracking ID:', row.tracking_id);
      return {
        id: row.id,
        trackingId: row.tracking_id
      };
    } catch (error) {
      console.error('❌ Error guardando historial:', error);
      return null;
    }
  }

  // Actualizar estadísticas de envío
  async updateHistoryStats(trackingId, sentCount, failedCount, failedEmails) {
    try {
      const db = require('../config/database');
      
      await db.query(`
        UPDATE email_history
        SET sent_count = $1, failed_count = $2, failed_emails = $3
        WHERE tracking_id = $4
      `, [sentCount, failedCount, JSON.stringify(failedEmails), trackingId]);

      console.log('✅ Estadísticas actualizadas');
    } catch (error) {
      console.error('❌ Error actualizando estadísticas:', error);
    }
  }

  // Endpoint para tracking pixel (registrar apertura)
  trackEmailOpen = async (req, res) => {
    try {
      const { trackingId, recipientToken } = req.params;
      const db = require('../config/database');

      // Actualizar contador de aperturas globales
      await db.query(`
        UPDATE email_history
        SET 
          opened_count = opened_count + 1,
          first_opened_at = COALESCE(first_opened_at, NOW()),
          last_opened_at = NOW()
        WHERE tracking_id = $1
      `, [trackingId]);

      // Si hay token de destinatario, actualizar historial por destinatario
      if (recipientToken) {
        await db.query(`
          UPDATE email_recipient_history
          SET 
            status = CASE WHEN status = 'enviado' THEN 'abierto' ELSE status END,
            opened_at = COALESCE(opened_at, NOW())
          WHERE tracking_token = $1
        `, [recipientToken]);
      }

      console.log(`👁️ Email abierto. Tracking ID: ${trackingId}${recipientToken ? ', token: ' + recipientToken : ''}`);

      // Retornar pixel transparente 1x1
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );

      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private'
      });
      res.end(pixel);
    } catch (error) {
      console.error('❌ Error en tracking:', error);
      res.status(200).end(); // Retornar 200 aunque falle para no romper el email
    }
  };

  // Endpoint para botón de confirmación
  confirmEmail = async (req, res) => {
    try {
      const { trackingId, recipientToken } = req.params;
      const db = require('../config/database');

      await db.query(`
        UPDATE email_history
        SET 
          confirmed_count = confirmed_count + 1,
          first_confirmed_at = COALESCE(first_confirmed_at, NOW()),
          last_confirmed_at = NOW()
        WHERE tracking_id = $1
      `, [trackingId]);

      if (recipientToken) {
        await db.query(`
          UPDATE email_recipient_history
          SET 
            status = 'confirmado',
            confirmed_at = COALESCE(confirmed_at, NOW())
          WHERE tracking_token = $1
        `, [recipientToken]);
      }

      console.log(`✅ Confirmacion recibida. Tracking ID: ${trackingId}${recipientToken ? ', token: ' + recipientToken : ''}`);

      // Redirigir a página de confirmación en el frontend
      const confirmationPageUrl = `${process.env.CLIENT_URL.split(',')[0]}/confirmation`;
      res.redirect(confirmationPageUrl);
    } catch (error) {
      console.error('❌ Error en confirmacion:', error);
      res.send('Gracias, tu confirmacion fue recibida.');
    }
  };

  // Obtener historial de correos
  getEmailHistory = async (req, res) => {
    try {
      const db = require('../config/database');
      
      const result = await db.query(`
        SELECT 
          id, subject, message, sender_name, recipients_count,
          sent_count, failed_count, failed_emails, template_id,
          used_variables, created_at, tracking_id,
          opened_count, first_opened_at, last_opened_at,
          confirmed_count, first_confirmed_at, last_confirmed_at
        FROM email_history
        ORDER BY created_at DESC
        LIMIT 100
      `);

      res.json({
        success: true,
        history: result.rows
      });
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo historial de correos'
      });
    }
  };

  // Obtener historial por destinatario para un envío
  getEmailRecipientHistory = async (req, res) => {
    try {
      const { historyId } = req.params;
      const db = require('../config/database');

      const result = await db.query(`
        SELECT 
          id,
          recipient_email,
          recipient_name,
          status,
          sent_at,
          opened_at,
          confirmed_at,
          error_message
        FROM email_recipient_history
        WHERE history_id = $1
        ORDER BY sent_at ASC, recipient_email ASC
      `, [historyId]);

      res.json({
        success: true,
        recipients: result.rows
      });
    } catch (error) {
      console.error('Error obteniendo historial por destinatario:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo historial por destinatario'
      });
    }
  };
}

module.exports = new GmailController();