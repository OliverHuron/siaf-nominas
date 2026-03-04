const nodemailer = require('nodemailer');
const db = require('../config/database');

// Configurar transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// Enviar correo
const sendEmail = async (req, res) => {
  try {
    const { to, cc, bcc, subject, html, text } = req.body;
    const userId = req.user.id;

    const transporter = createTransporter();

    // Enviar correo
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
      subject,
      text,
      html: html || text,
      headers: {
        'X-SIAF-Tracking': `${Date.now()}-${userId}`
      }
    });

    // Guardar registro en BD
    await db.query(
      `INSERT INTO email_logs (usuario_id, destinatarios, asunto, estado, message_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, to, subject, 'enviado', info.messageId]
    );

    res.json({
      success: true,
      message: 'Correo enviado exitosamente',
      data: {
        messageId: info.messageId,
        accepted: info.accepted
      }
    });
  } catch (error) {
    console.error('Error en sendEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar correo',
      error: error.message
    });
  }
};

// Enviar correo masivo con control de intervalos
const sendBulkEmail = async (req, res) => {
  try {
    const { recipients, subject, html, text, interval = 5000 } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar una lista de destinatarios'
      });
    }

    const transporter = createTransporter();
    const results = {
      enviados: 0,
      fallidos: 0,
      detalles: []
    };

    // Enviar correos con intervalo
    for (let i = 0; i < recipients.length; i++) {
      try {
        const recipient = recipients[i];
        
        await new Promise(resolve => setTimeout(resolve, i * interval));

        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: recipient,
          subject,
          text,
          html: html || text
        });

        results.enviados++;
        results.detalles.push({
          destinatario: recipient,
          estado: 'enviado',
          messageId: info.messageId
        });

        // Guardar en BD
        await db.query(
          `INSERT INTO email_logs (usuario_id, destinatarios, asunto, estado, message_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, recipient, subject, 'enviado', info.messageId]
        );
      } catch (error) {
        results.fallidos++;
        results.detalles.push({
          destinatario: recipients[i],
          estado: 'fallido',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Proceso de envío masivo completado',
      data: results
    });
  } catch (error) {
    console.error('Error en sendBulkEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Error en envío masivo'
    });
  }
};

// Obtener logs de correos
const getEmailLogs = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT el.*, u.email as usuario_email, u.nombre as usuario_nombre
       FROM email_logs el
       LEFT JOIN usuarios u ON el.usuario_id = u.id
       ORDER BY el.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await db.query('SELECT COUNT(*) FROM email_logs');

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error en getEmailLogs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener logs'
    });
  }
};

module.exports = {
  sendEmail,
  sendBulkEmail,
  getEmailLogs
};
