require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression= require('compression');
const rateLimit  = require('express-rate-limit');
const cron       = require('node-cron');
const path       = require('path');
const fs         = require('fs');

const logger = require('./utils/logger');
const { sequelize } = require('./models');
const { releaseExpiredLocks } = require('./utils/slotEngine');
const routes = require('./routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Trust proxy for Railway/production ────────────────────────────────────────
app.set('trust proxy', 1);

// Uploads dir
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:3000',              // local development
  'https://frontendmedicarehospitaldemo-production.up.railway.app', // production frontend
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));
app.options('*', cors());               // handle preflight for all routes

// ── Rate limiting ──────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/send-otp', rateLimit({ windowMs: 60*1000, max: 10 }));

// ── Body & compression ────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// logging — skip in test
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Static ────────────────────────────────────────────────────────────────────
app.use('/uploads', express.static(uploadsDir));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'OK', service: 'MediCare API', version: '1.0.0',
  timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development',
}));

// ── API ───────────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `Not found: ${req.method} ${req.path}` }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error('Unhandled:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Cron: release expired slot locks ─────────────────────────────────────────
cron.schedule('* * * * *', async () => {
  try { await releaseExpiredLocks(); } catch(e) { logger.error('cron error:', e); }
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connected');
    await sequelize.sync({ force: false, alter: false });
    logger.info('✅ Database ready');
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    logger.error('❌ Startup failed:', err);
    process.exit(1);
  }
}
start();
module.exports = app;
