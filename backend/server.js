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

// Render and other reverse-proxy hosts need this so secure cookies, IP-based
// rate limiting, and request metadata behave correctly in production.
app.set('trust proxy', 1);

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
const CLIENT_URLS = parseCsv(process.env.CLIENT_URL);
const APP_URLS = [
  ...parseCsv(process.env.FRONTEND_URL),
  ...parseCsv(process.env.DASHBOARD_URL),
  ...parseCsv(process.env.ADMIN_URL),
].filter(Boolean);

const ALLOWED_ORIGINS = new Set([
  ...DEFAULT_ALLOWED_ORIGINS,
  ...EXTRA_ALLOWED_ORIGINS,
  ...CLIENT_URLS,
  ...APP_URLS,
]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    if (ALLOWED_ORIGINS.has(origin)) return true;
    if (hostname.endsWith('.pages.dev')) return true;
    if (hostname.endsWith('.cloudflarepages.com')) return true;
    if (hostname.endsWith('.publicdukan.com')) return true;
    if (hostname.endsWith('.apnidukan.com')) return true;
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
    // Do not throw (which becomes a 500). Just disable CORS for this request.
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'x-session-id', 'X-Requested-With'],
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

const escapeHtml = (value) =>
  String(value || '').replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return ch;
    }
  });

const truncate = (value, max) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.length <= max) return raw;
  return `${raw.slice(0, Math.max(0, max - 3))}...`;
};

const isHttpUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Order summary preview (OG tags) for WhatsApp link previews
app.get('/share/order-summary', (req, res) => {
  const titleRaw = truncate(req.query.title, 120) || 'Order Summary';
  const shopRaw = truncate(req.query.shop, 80);
  const itemRaw = truncate(req.query.item, 80);
  const totalRaw = truncate(req.query.total, 32);
  const currencyRaw = truncate(req.query.currency, 8) || '₹';
  const imageRaw = String(req.query.image || '').trim();

  const descriptionParts = [];
  if (shopRaw) descriptionParts.push(`Shop: ${shopRaw}`);
  if (itemRaw) descriptionParts.push(`Item: ${itemRaw}`);
  if (totalRaw) descriptionParts.push(`Total: ${currencyRaw}${totalRaw}`);

  const descriptionRaw = truncate(descriptionParts.join(' | ') || 'Order summary from PublicDukan.', 240);
  const imageUrl = isHttpUrl(imageRaw)
    ? imageRaw
    : String(process.env.SHARE_DEFAULT_IMAGE_URL || 'https://publicdukan.com/logo-removebg-preview.png');

  const pageUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const title = escapeHtml(titleRaw);
  const description = escapeHtml(descriptionRaw);
  const image = escapeHtml(imageUrl);
  const ogUrl = escapeHtml(pageUrl);

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=300');
  res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${ogUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  </head>
  <body>
    <main style="font-family:Arial, sans-serif; padding:24px;">
      <h1 style="font-size:20px; margin:0 0 8px;">${title}</h1>
      <p style="margin:0; color:#555;">${description}</p>
    </main>
  </body>
</html>`);
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
    if (process.env.RENDER === 'true' || process.env.RENDER_SERVICE_ID || process.env.RENDER_EXTERNAL_URL) {
      console.log('☁️  Render deployment detected');
      if (process.env.RENDER_EXTERNAL_URL) {
        console.log(`🔗 External URL: ${process.env.RENDER_EXTERNAL_URL}`);
      }
    }
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
