import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

// Import database connection
import connectDB from './config/database.js';

// Background jobs
import { startPlanExpiryReminderLoop } from './services/notificationEmailService.js';

// Import routes
import mountRoutes from './routes/index.js';

// Import middleware
import {
  errorHandler,
  notFound,
  handleValidationError,
  handleCastError,
  handleDuplicateKeyError,
} from './middleware/errorHandler.js';

/**
 * ========================================
 * SERVER INITIALIZATION
 * Multi-tenant SaaS Platform Backend
 * ========================================
 */

// Initialize Express app
const app = express();

let server;

// ========================================
// MIDDLEWARE
// ========================================

// Security headers
app.use(helmet());

// CORS configuration
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:8084',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://publicdukan.com',
  'https://www.publicdukan.com',
  'https://publicdukan.pages.dev',
  'https://seller.publicdukan.com',
];

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const EXTRA_ALLOWED_ORIGINS = parseCsv(process.env.CORS_ORIGINS);
const ALLOWED_ORIGINS = new Set([...DEFAULT_ALLOWED_ORIGINS, ...EXTRA_ALLOWED_ORIGINS]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    if (ALLOWED_ORIGINS.has(origin)) return true;
    if (hostname.endsWith('.pages.dev')) return true;
    if (hostname.endsWith('.cloudflarepages.com')) return true;
    if (hostname === 'publicdukan.com' || hostname === 'www.publicdukan.com') return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

    return false;
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'x-session-id'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize data (prevent NoSQL injection)
app.use(mongoSanitize());

// Logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting (disabled in development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { success: false, message: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: req.rateLimit.resetTime
      });
    }
  });

  app.use('/api/', limiter);
  console.log('🛡️  Rate limiting enabled');
} else {
  console.log('⚠️  Rate limiting disabled in development mode');
}

// ========================================
// ROUTES
// ========================================

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Apnidukan Multi-tenant SaaS API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      business: '/api/business',
      listings: '/api/listings',
      inquiries: '/api/inquiries',
      categories: '/api/categories',
      bookings: '/api/bookings',
      plans: '/api/plans',
    },
  });
});

// Mount API routes
mountRoutes(app);

// ========================================
// ERROR HANDLING
// ========================================

// Handle Mongoose errors
app.use(handleValidationError);
app.use(handleCastError);
app.use(handleDuplicateKeyError);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ========================================
// SERVER START
// ========================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Start background reminder loop (best-effort)
  try {
    const job = startPlanExpiryReminderLoop();
    if (job?.started) {
      console.log(`📬 Plan expiry reminder job running (every ~${job.intervalMinutes} min)`);
    }
  } catch (e) {
    console.warn('Plan expiry reminder job failed to start:', e?.message || e);
  }

  server = app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║        🚀 APNIDUKAN MULTI-TENANT SAAS PLATFORM 🚀          ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`⚡ Server running in ${process.env.NODE_ENV} mode`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api`);
    console.log('');
    console.log('📚 Available Routes:');
    console.log('   - Auth:       /api/auth');
    console.log('   - Business:   /api/business');
    console.log('   - Listings:   /api/listings');
    console.log('   - Inquiries:  /api/inquiries');
    console.log('   - Categories: /api/categories');
    console.log('   - Bookings:   /api/bookings');
    console.log('   - Plans:      /api/plans');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('════════════════════════════════════════════════════════════');
  });
};

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

const gracefulShutdown = async (signal) => {
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  } catch {
    // ignore
  }

  try {
    if (mongoose.connection?.readyState) {
      await mongoose.connection.close();
    }
  } catch {
    // ignore
  }

  if (signal === 'SIGUSR2') {
    // Let nodemon trigger a restart after we've released resources.
    process.kill(process.pid, 'SIGUSR2');
  } else {
    process.exit(0);
  }
};

// Support nodemon restarts without leaving the port bound.
process.once('SIGUSR2', () => {
  gracefulShutdown('SIGUSR2');
});

// Support container/process-manager shutdown.
process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

export default app;
