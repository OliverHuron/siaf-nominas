const express = require('express');
const router = express.Router();
const gmailController = require('../controllers/gmail.controller');

// Rutas de autenticación OAuth2
router.get('/auth/url', gmailController.getAuthUrl);
router.get('/auth/callback', gmailController.handleAuthCallback);
router.get('/auth/status', gmailController.getAuthStatus);
router.post('/auth/logout', gmailController.logout);

// Rutas de gestión de correos
router.post('/send-mass', gmailController.sendMassEmail);
router.get('/user-info', gmailController.getUserInfo);
router.get('/email-lists', gmailController.getEmailLists);
router.get('/email-history', gmailController.getEmailHistory);
router.get('/email-history/:historyId/recipients', gmailController.getEmailRecipientHistory);
router.get('/track/:trackingId/:recipientToken?', gmailController.trackEmailOpen);
router.get('/confirm/:trackingId/:recipientToken?', gmailController.confirmEmail);

module.exports = router;