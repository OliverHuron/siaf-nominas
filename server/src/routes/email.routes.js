const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth.middleware');
const { sendEmail, sendBulkEmail, getEmailLogs } = require('../controllers/email.controller');

router.use(authMiddleware);

router.post('/send', sendEmail);
router.post('/send-bulk', authorize('admin', 'coordinador'), sendBulkEmail);
router.get('/logs', authorize('admin', 'coordinador'), getEmailLogs);

module.exports = router;
