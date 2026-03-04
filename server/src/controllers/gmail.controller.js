const { google } = require('googleapis');
const db = require('../config/database');

class GmailController {
  constructor() {
    // No singleton state — each request builds its own oauth2Client
    this.redirectUri = process.env.GMAIL_REDIRECT_URI ||
      `${process.env.SERVER_URL || 'http://localhost:5000'}/api/gmail/auth/callback`;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  _buildOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      this.redirectUri
    );
  }

  async _getClientForUser(userId) {
    const result = await db.query(
      'SELECT * FROM user_gmail_tokens WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const client = this._buildOAuth2Client();
    client.setCredentials({
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      token_type: row.token_type,
      expiry_date: row.expiry_date
    });

    // Auto-refresh and persist updated tokens
    client.on('tokens', async (tokens) => {
      const updates = {};
      if (tokens.access_token) updates.access_token = tokens.access_token;
      if (tokens.expiry_date) updates.expiry_date = tokens.expiry_date;
      if (Object.keys(updates).length > 0) {
        await db.query(
          `UPDATE user_gmail_tokens
           SET access_token = COALESCE($1, access_token),
               expiry_date  = COALESCE($2, expiry_date),
               updated_at   = NOW()
           WHERE user_id = $3`,
          [updates.access_token || null, updates.expiry_date || null, userId]
        );
      }
    });

    return client;
  }

  async _saveTokensForUser(userId, tokens, gmailEmail) {
    await db.query(
      `INSERT INTO user_gmail_tokens
         (user_id, access_token, refresh_token, token_type, expiry_date, gmail_email)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE
         SET access_token  = EXCLUDED.access_token,
             refresh_token = COALESCE(EXCLUDED.refresh_token, user_gmail_tokens.refresh_token),
             token_type    = EXCLUDED.token_type,
             expiry_date   = EXCLUDED.expiry_date,
             gmail_email   = COALESCE(EXCLUDED.gmail_email, user_gmail_tokens.gmail_email),
             updated_at    = NOW()`,
      [
        userId,
        tokens.access_token,
        tokens.refresh_token || null,
        tokens.token_type || 'Bearer',
        tokens.expiry_date || null,
        gmailEmail || null
      ]
    );
  }

  // ─── Auth Endpoints ──────────────────────────────────────────────────────────

  // Paso 1: Generar URL de autorización (requiere auth para saber el userId)
  getAuthUrl = (req, res) => {
    try {
      const client = this._buildOAuth2Client();
      const scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.insert',
        'https://www.googleapis.com/auth/gmail.labels',
        'https://www.googleapis.com/auth/userinfo.email'
      ];

      // Encode userId in state so callback knows who to save tokens for
      const state = Buffer.from(String(req.user.id)).toString('base64');

      const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state
      });

      res.json({ success: true, authUrl });
    } catch (error) {
      console.error('Error generando URL de autorización:', error);
      res.status(500).json({ success: false, message: 'Error generando URL de autorización' });
    }
  };

  // Paso 2: Callback de Google (no requiere auth JWT — Google redirige aquí)
  handleAuthCallback = async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(`${process.env.CLIENT_URL.split(',')[0]}/emails?error=auth_denied`);
      }
      if (!code || !state) {
        return res.redirect(`${process.env.CLIENT_URL.split(',')[0]}/emails?error=no_code`);
      }

      // Decode userId from state
      const userId = parseInt(Buffer.from(state, 'base64').toString('utf8'), 10);
      if (!userId || isNaN(userId)) {
        return res.redirect(`${process.env.CLIENT_URL.split(',')[0]}/emails?error=invalid_state`);
      }

      const client = this._buildOAuth2Client();
      const { tokens } = await client.getToken(code);

      // Get the Gmail email address so we can display it
      client.setCredentials(tokens);
      let gmailEmail = null;
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: client });
        const userInfo = await oauth2.userinfo.get();
        gmailEmail = userInfo.data.email;
      } catch (e) {
        console.warn('No se pudo obtener email de Gmail:', e.message);
      }

      await this._saveTokensForUser(userId, tokens, gmailEmail);
      console.log(`✅ Gmail vinculado para usuario ${userId}: ${gmailEmail}`);

      res.redirect(`${process.env.CLIENT_URL.split(',')[0]}/emails?success=true`);
    } catch (error) {
      console.error('Error en callback de autorización:', error);
      res.redirect(`${process.env.CLIENT_URL.split(',')[0]}/emails?error=auth_failed`);
    }
  };

  // Verificar estado de autenticación del usuario actual
  getAuthStatus = async (req, res) => {
    try {
      const result = await db.query(
        'SELECT gmail_email, updated_at FROM user_gmail_tokens WHERE user_id = $1',
        [req.user.id]
      );
      const isAuthenticated = result.rows.length > 0;
      res.json({
        success: true,
        isAuthenticated,
        gmailEmail: isAuthenticated ? result.rows[0].gmail_email : null,
        linkedAt: isAuthenticated ? result.rows[0].updated_at : null,
        message: isAuthenticated ? 'Gmail vinculado' : 'Sin Gmail vinculado'
      });
    } catch (error) {
      console.error('Error verificando estado Gmail:', error);
      res.status(500).json({ success: false, message: 'Error verificando estado' });
    }
  };

  // Cerrar sesión / desvincular Gmail del usuario actual
  logout = async (req, res) => {
    try {
      await db.query('DELETE FROM user_gmail_tokens WHERE user_id = $1', [req.user.id]);
      console.log(`🔓 Gmail desvinculado para usuario ${req.user.id}`);
      res.json({ success: true, message: 'Gmail desvinculado exitosamente' });
    } catch (error) {
      console.error('Error desvinculando Gmail:', error);
      res.status(500).json({ success: false, message: 'Error desvinculando Gmail' });
    }
  };

  // Obtener información del usuario de Gmail (cuenta del usuario actual)
  getUserInfo = async (req, res) => {
    try {
      const client = await this._getClientForUser(req.user.id);
      if (!client) {
        return res.status(401).json({ success: false, message: 'Gmail no vinculado. Vincula tu correo primero.' });
      }
      const gmail = google.gmail({ version: 'v1', auth: client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
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
      res.status(500).json({ success: false, message: 'Error obteniendo información del usuario' });
    }
  };

  // ─── Email Sending ────────────────────────────────────────────────────────────

  sendMassEmail = async (req, res) => {
    try {
      const client = await this._getClientForUser(req.user.id);
      if (!client) {
        return res.status(401).json({
          success: false,
          message: 'No tienes Gmail vinculado. Ve a Correos y vincula tu cuenta de Gmail.'
        });
      }
      const gmail = google.gmail({ version: 'v1', auth: client });

      const {
        recipients,
        subject,
        message: emailBody,
        senderName = '',
        delayBetweenEmails = 2000,
        useTemplate = false,
        templateId = null,
        recipientType = 'to',
        includeConfirmation = false
      } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, message: 'Lista de destinatarios requerida' });
      }

      console.log(`📧 Iniciando envío masivo a ${recipients.length} destinatarios (usuario ${req.user.id})`);

      // Guardar en historial
      const historyRecord = await this.saveToHistory({
        subject, message: emailBody, senderName,
        recipientsCount: recipients.length, recipientsData: recipients,
        sentCount: 0, failedCount: 0, failedEmails: [], templateId,
        usedVariables: useTemplate, userId: req.user.id
      });
      const trackingId = historyRecord?.trackingId;
      const historyId = historyRecord?.id;

      const sentMessageIds = [];
      const failedEmails = [];
      const baseUrl = process.env.SERVER_URL || 'http://localhost:5000';
      const { randomUUID } = require('crypto');

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        try {
          console.log(`📤 Enviando ${i + 1}/${recipients.length} a: ${recipient.email || recipient}`);

          let personalizedSubject = subject;
          let personalizedMessage = emailBody;

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
              ano_actual: new Date().getFullYear()
            };
            Object.keys(variables).forEach(key => {
              const regex = new RegExp(`{${key}}`, 'g');
              personalizedSubject = personalizedSubject.replace(regex, variables[key]);
              personalizedMessage = personalizedMessage.replace(regex, variables[key]);
            });
          }

          const recipientToken = randomUUID();
          if (trackingId) {
            const trackingPixel = `<img src="${baseUrl}/api/gmail/track/${trackingId}/${recipientToken}" width="1" height="1" style="display:none;" />`;
            personalizedMessage = personalizedMessage + trackingPixel;
          }
          if (includeConfirmation && trackingId) {
            const confirmationUrl = `${baseUrl}/api/gmail/confirm/${trackingId}/${recipientToken}`;
            personalizedMessage += `\n<div style="margin-top:16px;"><a href="${confirmationUrl}" style="background-color:#28a745;color:#ffffff;padding:10px 18px;border-radius:4px;text-decoration:none;display:inline-block;font-weight:bold;">Confirmar recepción</a></div>`;
          }

          const msgId = await this._sendIndividualEmail(gmail, recipient.email || recipient, personalizedSubject, personalizedMessage, senderName, recipientType);
          sentMessageIds.push(msgId);

          if (historyId) {
            await db.query(
              `INSERT INTO email_recipient_history (history_id, recipient_email, recipient_name, status, tracking_token)
               VALUES ($1, $2, $3, $4, $5)`,
              [historyId, recipient.email || recipient,
                recipient.nombre ? `${recipient.nombre} ${recipient.apellido_paterno || ''} ${recipient.apellido_materno || ''}`.trim() : null,
                'enviado', recipientToken]
            );
          }

          if (i < recipients.length - 1) {
            await this._delay(delayBetweenEmails);
          }
        } catch (error) {
          console.error(`❌ Error enviando a ${recipient.email || recipient}:`, error);
          failedEmails.push({ email: recipient.email || recipient, error: error.message });
          if (historyId) {
            await db.query(
              `INSERT INTO email_recipient_history (history_id, recipient_email, recipient_name, status, error_message)
               VALUES ($1, $2, $3, $4, $5)`,
              [historyId, recipient.email || recipient,
                recipient.nombre ? `${recipient.nombre} ${recipient.apellido_paterno || ''} ${recipient.apellido_materno || ''}`.trim() : null,
                'fallido', error.message || null]
            );
          }
        }
      }

      console.log(`✅ Enviados: ${sentMessageIds.length}, Fallidos: ${failedEmails.length}`);

      if (sentMessageIds.length > 0) {
        console.log('🧹 Limpiando bandeja de enviados...');
        await this._cleanSentFolder(gmail, sentMessageIds);
      }

      console.log('📝 Creando evidencia...');
      const emailList = recipients.map(r => r.email || r);
      const evidenceId = await this._createEvidenceEmail(gmail, emailList, subject, emailBody, senderName, recipientType);

      if (evidenceId) {
        const labelName = `SIAF/${new Date().getFullYear()}`;
        const labelId = await this._getOrCreateLabel(gmail, labelName);
        if (labelId) await this._applyLabelToMessage(gmail, evidenceId, labelId);
      }

      if (trackingId) {
        await this.updateHistoryStats(trackingId, sentMessageIds.length, failedEmails.length, failedEmails);
      }

      res.json({
        success: true,
        message: 'Correo masivo enviado exitosamente',
        stats: {
          total: recipients.length, sent: sentMessageIds.length, failed: failedEmails.length,
          failedEmails: failedEmails.length > 0 ? failedEmails : undefined
        }
      });
    } catch (error) {
      console.error('❌ Error en envío masivo:', error);
      res.status(500).json({ success: false, message: 'Error interno en envío masivo' });
    }
  };

  // ─── Private helpers (use injected gmail instance) ─────────────────────────

  async _sendIndividualEmail(gmail, recipient, subject, body, senderName, recipientType = 'to') {
    const email = this._createEmailMessage(recipient, subject, body, senderName, recipientType);
    const result = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: email } });
    return result.data.id;
  }

  async _cleanSentFolder(gmail, messageIds) {
    try {
      const batchSize = 1000;
      for (let i = 0; i < messageIds.length; i += batchSize) {
        await gmail.users.messages.batchDelete({ userId: 'me', requestBody: { ids: messageIds.slice(i, i + batchSize) } });
      }
      console.log(`🗑️ ${messageIds.length} mensajes eliminados de Enviados`);
    } catch (error) {
      console.error('❌ Error limpiando bandeja:', error);
    }
  }

  async _createEvidenceEmail(gmail, recipients, subject, body, senderName, recipientType = 'bcc') {
    try {
      let primaryRecipient = 'me', ccList = [], bccList = [];
      if (recipientType === 'to') { primaryRecipient = recipients[0]; bccList = recipients.slice(1); }
      else if (recipientType === 'cc') { ccList = recipients; }
      else { bccList = recipients; }

      const evidenceEmail = this._createEvidenceMessage(primaryRecipient, ccList, bccList, subject, body, senderName);
      const result = await gmail.users.messages.insert({ userId: 'me', requestBody: { raw: evidenceEmail, labelIds: ['SENT'] } });
      console.log('📋 Evidencia creada en bandeja de enviados');
      return result.data.id;
    } catch (error) {
      console.error('❌ Error creando evidencia:', error);
      return null;
    }
  }

  async _getOrCreateLabel(gmail, labelName) {
    try {
      const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
      const existing = labelsResponse.data.labels.find(l => l.name === labelName);
      if (existing) return existing.id;
      const newLabel = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName, labelListVisibility: 'labelShow', messageListVisibility: 'show',
          color: { backgroundColor: '#764ba2', textColor: '#ffffff' }
        }
      });
      return newLabel.data.id;
    } catch (error) {
      console.error('❌ Error gestionando label:', error);
      return null;
    }
  }

  async _applyLabelToMessage(gmail, messageId, labelId) {
    try {
      await gmail.users.messages.modify({ userId: 'me', id: messageId, requestBody: { addLabelIds: [labelId] } });
    } catch (error) {
      console.error('❌ Error aplicando label:', error);
    }
  }

  _createEmailMessage(to, subject, body, senderName = '', recipientType = 'to') {
    const from = senderName ? `${senderName} <me>` : 'me';
    let email = [`From: ${from}`, `Subject: ${subject}`, 'Content-Type: text/html; charset=utf-8', ''];
    if (recipientType === 'to') email.splice(1, 0, `To: ${to}`);
    else if (recipientType === 'cc') { email.splice(1, 0, 'To: me'); email.splice(2, 0, `Cc: ${to}`); }
    else if (recipientType === 'bcc') { email.splice(1, 0, 'To: me'); email.splice(2, 0, `Bcc: ${to}`); }
    email.push(body);
    return Buffer.from(email.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }

  _createEvidenceMessage(to, ccList = [], bccList = [], subject, body, senderName = '') {
    const from = senderName ? `${senderName} <me>` : 'me';
    const email = [
      `From: ${from}`, `To: ${to}`,
      ccList.length > 0 ? `Cc: ${ccList.join(', ')}` : '',
      bccList.length > 0 ? `Bcc: ${bccList.join(', ')}` : '',
      `Subject: ${subject}`, 'Content-Type: text/html; charset=utf-8', '', body
    ].filter(l => l !== '').join('\n');
    return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }

  _delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  // ─── Lists / History ──────────────────────────────────────────────────────────

  getEmailLists = async (req, res) => {
    try {
      const allEmployees = await db.query(`
        SELECT id, nombre, apellido_paterno, apellido_materno, email, tipo
        FROM empleados 
        WHERE email IS NOT NULL AND email != '' AND activo = true
        ORDER BY apellido_paterno, apellido_materno, nombre
      `);
      const active = allEmployees.rows;
      const admins = active.filter(e => e.tipo === 'administrativo');
      const teachers = active.filter(e => e.tipo === 'docente');

      const withDebtsResult = await db.query(`
        SELECT DISTINCT e.id, e.nombre, e.apellido_paterno, e.apellido_materno, e.email, e.tipo
        FROM empleados e
        INNER JOIN asistencias_quincenales aq ON e.id = aq.empleado_id
        WHERE e.email IS NOT NULL AND e.email != '' AND e.activo = true
        AND (
          aq.enero_q1 = 'F' OR aq.enero_q2 = 'F' OR aq.febrero_q1 = 'F' OR aq.febrero_q2 = 'F' OR
          aq.marzo_q1 = 'F' OR aq.marzo_q2 = 'F' OR aq.abril_q1 = 'F' OR aq.abril_q2 = 'F' OR
          aq.mayo_q1 = 'F' OR aq.mayo_q2 = 'F' OR aq.junio_q1 = 'F' OR aq.junio_q2 = 'F' OR
          aq.julio_q1 = 'F' OR aq.julio_q2 = 'F' OR aq.agosto_q1 = 'F' OR aq.agosto_q2 = 'F' OR
          aq.septiembre_q1 = 'F' OR aq.septiembre_q2 = 'F' OR aq.octubre_q1 = 'F' OR aq.octubre_q2 = 'F' OR
          aq.noviembre_q1 = 'F' OR aq.noviembre_q2 = 'F' OR aq.diciembre_q1 = 'F' OR aq.diciembre_q2 = 'F'
        )
        ORDER BY e.apellido_paterno, e.apellido_materno, e.nombre
      `);

      const mapEmployee = e => ({ id: e.id, email: e.email, nombre: e.nombre, apellido_paterno: e.apellido_paterno, apellido_materno: e.apellido_materno, tipo: e.tipo });
      const lists = [
        { id: 'all', name: 'Todos los empleados', count: active.length, description: 'Todos los empleados activos con email', emails: active.map(mapEmployee) },
        { id: 'admins', name: 'Administrativos', count: admins.length, description: 'Personal administrativo', emails: admins.map(mapEmployee) },
        { id: 'teachers', name: 'Docentes', count: teachers.length, description: 'Personal docente', emails: teachers.map(mapEmployee) },
        { id: 'debts', name: 'Deben quincenas', count: withDebtsResult.rows.length, description: 'Empleados activos que tienen faltas pendientes', emails: withDebtsResult.rows.map(mapEmployee) }
      ];
      res.json({ success: true, lists });
    } catch (error) {
      console.error('Error obteniendo listas de correos:', error);
      res.status(500).json({ success: false, message: 'Error obteniendo listas de correos' });
    }
  };

  async saveToHistory(data) {
    try {
      const result = await db.query(`
        INSERT INTO email_history
          (subject, message, sender_name, recipients_count, recipients_data,
           sent_count, failed_count, failed_emails, template_id, used_variables)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, tracking_id
      `, [data.subject, data.message, data.senderName, data.recipientsCount,
      JSON.stringify(data.recipientsData), data.sentCount, data.failedCount,
      JSON.stringify(data.failedEmails), data.templateId || null, data.usedVariables || false]);
      const row = result.rows[0];
      return { id: row.id, trackingId: row.tracking_id };
    } catch (error) {
      console.error('❌ Error guardando historial:', error);
      return null;
    }
  }

  async updateHistoryStats(trackingId, sentCount, failedCount, failedEmails) {
    try {
      await db.query(
        `UPDATE email_history SET sent_count = $1, failed_count = $2, failed_emails = $3 WHERE tracking_id = $4`,
        [sentCount, failedCount, JSON.stringify(failedEmails), trackingId]
      );
    } catch (error) {
      console.error('❌ Error actualizando estadísticas:', error);
    }
  }

  trackEmailOpen = async (req, res) => {
    try {
      const { trackingId, recipientToken } = req.params;
      await db.query(`
        UPDATE email_history
        SET opened_count = opened_count + 1,
            first_opened_at = COALESCE(first_opened_at, NOW()),
            last_opened_at = NOW()
        WHERE tracking_id = $1
      `, [trackingId]);
      if (recipientToken) {
        await db.query(`
          UPDATE email_recipient_history
          SET status = CASE WHEN status = 'enviado' THEN 'abierto' ELSE status END,
              opened_at = COALESCE(opened_at, NOW())
          WHERE tracking_token = $1
        `, [recipientToken]);
      }
      const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': pixel.length, 'Cache-Control': 'no-store' });
      res.end(pixel);
    } catch (error) {
      console.error('❌ Error en tracking:', error);
      res.status(200).end();
    }
  };

  confirmEmail = async (req, res) => {
    try {
      const { trackingId, recipientToken } = req.params;
      await db.query(`
        UPDATE email_history
        SET confirmed_count = confirmed_count + 1,
            first_confirmed_at = COALESCE(first_confirmed_at, NOW()),
            last_confirmed_at = NOW()
        WHERE tracking_id = $1
      `, [trackingId]);
      if (recipientToken) {
        await db.query(`
          UPDATE email_recipient_history
          SET status = 'confirmado', confirmed_at = COALESCE(confirmed_at, NOW())
          WHERE tracking_token = $1
        `, [recipientToken]);
      }
      res.redirect(`${process.env.CLIENT_URL.split(',')[0]}/confirmation`);
    } catch (error) {
      console.error('❌ Error en confirmacion:', error);
      res.send('Gracias, tu confirmacion fue recibida.');
    }
  };

  getEmailHistory = async (req, res) => {
    try {
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
      res.json({ success: true, history: result.rows });
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      res.status(500).json({ success: false, message: 'Error obteniendo historial de correos' });
    }
  };

  getEmailRecipientHistory = async (req, res) => {
    try {
      const { historyId } = req.params;
      const result = await db.query(`
        SELECT id, recipient_email, recipient_name, status, sent_at, opened_at, confirmed_at, error_message
        FROM email_recipient_history
        WHERE history_id = $1
        ORDER BY sent_at ASC, recipient_email ASC
      `, [historyId]);
      res.json({ success: true, recipients: result.rows });
    } catch (error) {
      console.error('Error obteniendo historial por destinatario:', error);
      res.status(500).json({ success: false, message: 'Error obteniendo historial por destinatario' });
    }
  };
}

module.exports = new GmailController();