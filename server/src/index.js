const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Trust proxy for production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Rate limiting - Configuración más flexible
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 1 * 60 * 1000, // 5 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 1000000, // limit each IP to 2000 requests per windowMs
  message: {
    success: false,
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req, res) => {
    // Skip rate limiting for health checks
    if (req.path === '/api/health') {
      return true;
    }
    return false;
  }
});

// Middleware
//app.use(limiter);
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.CLIENT_URL ?
      process.env.CLIENT_URL.split(',').map(url => url.trim()) :
      ['http://localhost:3000'];

    // --- DEBUG: Logs para depurar CORS ---
    console.log('🌐 Intento de conexión desde:', origin);
    console.log('✅ Orígenes permitidos:', allowedOrigins);
    // -------------------------------------

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS: Origen aceptado');
      callback(null, true);
    } else {
      console.log('❌ CORS: Origen bloqueado ->', origin);
      console.log('💡 Agrega esta URL exacta a CLIENT_URL en tu .env');
      callback(new Error(`CORS bloqueó el origen: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Configuración para UTF-8
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use(express.json({ charset: 'utf-8', limit: '500mb' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8', limit: '500mb' }));

// Serve uploaded files (images, reports, etc.) under /uploads
const path = require('path');
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath, { maxAge: '1d' }));

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const inventoryRoutes = require('./routes/inventory'); // Sistema de inventario con RLS y workflow
const coordinacionesRoutes = require('./routes/coordinaciones');
const employeeRoutes = require('./routes/employee.routes');
const attendanceRoutes = require('./routes/attendanceQuincenal.routes');
const requestRoutes = require('./routes/request.routes');
const technicalFormRoutes = require('./routes/technicalForm.routes');
const fichaTecnicaRoutes = require('./routes/fichaTecnica.routes');
const dependencyRoutes = require('./routes/dependency.routes');
const buildingRoutes = require('./routes/building.routes');
const classroomRoutes = require('./routes/classroom.routes');
const emailRoutes = require('./routes/email.routes');
const gmailRoutes = require('./routes/gmail.routes');
const emailTemplateRoutes = require('./routes/emailTemplate.routes');
const spacesRoutes = require('./routes/spaces.routes');
const nominaRoutes = require('./routes/nomina.routes');
const loadTestRoutes = require('./routes/loadtest.routes');
const importJobRoutes = require('./routes/importJob.routes');
const catalogRoutes = require('./routes/catalog.routes');
const realtimeUtil = require('./utils/realtime');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/coordinaciones', coordinacionesRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/import-jobs', importJobRoutes);
app.use('/api/technical-forms', technicalFormRoutes);
app.use('/api/fichas-tecnicas', fichaTecnicaRoutes);
app.use('/api/dependencies', dependencyRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/nomina', nominaRoutes);
app.use('/api/loadtest', loadTestRoutes);
app.use('/api/catalogs', catalogRoutes);

// SSE endpoint for spaces/audit realtime updates
app.get('/api/realtime/spaces', (req, res) => {
  realtimeUtil.addClient(res);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SIAF API is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📝 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Cliente URL: ${process.env.CLIENT_URL}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('🔒 Ejecutándose en modo PRODUCCIÓN');
  }
});

module.exports = app;
