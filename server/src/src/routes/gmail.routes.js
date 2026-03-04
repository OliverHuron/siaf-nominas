const express = require('express');
const router = express.Router();
const gmailController = require('../controllers/gmail.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Auth routes — getAuthUrl requires login to know who is authenticating
router.get('/auth/url', authenticateToken, gmailController.getAuthUrl);
router.get('/auth/status', authenticateToken, gmailController.getAuthStatus);
router.post('/auth/logout', authenticateToken, gmailController.logout);

// Google redirects here — no JWT (Google doesn't send it).
// User ID is encoded in the 'state' param by getAuthUrl.
router.get('/auth/callback', gmailController.handleAuthCallback);

// Protected routes
router.post('/send-mass', authenticateToken, gmailController.sendMassEmail);
router.get('/user-info', authenticateToken, gmailController.getUserInfo);
router.get('/email-lists', authenticateToken, gmailController.getEmailLists);
router.get('/email-history', authenticateToken, gmailController.getEmailHistory);
router.get('/email-history/:historyId/recipients', authenticateToken, gmailController.getEmailRecipientHistory);

// Public tracking/confirmation endpoints (emails are opened externally, no auth)
router.get('/track/:trackingId/:recipientToken?', gmailController.trackEmailOpen);
router.get('/confirm/:trackingId/:recipientToken?', gmailController.confirmEmail);

module.exports = router;