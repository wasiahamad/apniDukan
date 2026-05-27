import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import compression from 'compression';
import path from 'path';
import fs from 'fs/promises';

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

import {
  resolvePublicBusinessForSubdomain,
  buildSeoHeadTags,
  injectSeoIntoHtml,
  isBotRequest,
  renderBotHtml,
} from './services/seo/storefrontSeoService.js';

import { getHostInfo } from './services/seo/storefrontHost.js';
import { generateSitemapXml, generateRobotsTxt } from './services/seo/sitemapService.js';
import { generateOgPng } from './services/seo/ogImageService.js';

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

// Gzip/Brotli compression (safe for APIs and storefront HTML)
app.use(compression());

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

const servePublicWebsite = String(process.env.SERVE_PUBLIC_WEBSITE || '').toLowerCase() === 'true';

// Welcome route (API only mode)
if (!servePublicWebsite) {
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
}

// Google Search Console verification (file method)
// Example: GOOGLE_SITE_VERIFICATION_FILE_NAME=google123abc.html
//          GOOGLE_SITE_VERIFICATION_FILE_CONTENT=google-site-verification: google123abc.html
app.get('/:fileName', (req, res, next) => {
  const requested = String(req.params.fileName || '').trim();

  // IndexNow verification: serve the key at /<key>.txt
  const indexNowKey = String(process.env.INDEXNOW_KEY || '').trim();
  if (indexNowKey && requested === `${indexNowKey}.txt`) {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(indexNowKey);
  }

  const expectedName = String(process.env.GOOGLE_SITE_VERIFICATION_FILE_NAME || '').trim();
  if (!expectedName) return next();

  if (requested !== expectedName) return next();

  const content = String(process.env.GOOGLE_SITE_VERIFICATION_FILE_CONTENT || '').trim();
  if (!content) return res.status(404).send('Not found');

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=300');
  return res.status(200).send(content);
});

// robots.txt (dynamic per host)
app.get('/robots.txt', (req, res) => {
  const hostInfo = getHostInfo(req);
  const content = generateRobotsTxt({ rootDomain: hostInfo.rootDomain, hostname: hostInfo.hostname });
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=300');
  return res.status(200).send(content);
});

// sitemap.xml (dynamic per host)
app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const hostInfo = getHostInfo(req);
    const scope = hostInfo.isStorefrontSubdomain ? 'subdomain' : 'root';

    const xml = await generateSitemapXml({
      scope,
      rootDomain: hostInfo.rootDomain,
      hostname: hostInfo.hostname,
      subdomain: hostInfo.subdomain,
    });

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    return res.status(200).send(xml);
  } catch (e) {
    return next(e);
  }
});

// OG image (dynamic)
// - Shop:    /og.png?type=shop&slug=<business-slug>
// - Listing: /og.png?type=listing&id=<listingIdOrSlug>
app.get('/og.png', async (req, res, next) => {
  try {
    const type = String(req.query?.type || 'shop');
    const slug = String(req.query?.slug || '').trim();
    const id = String(req.query?.id || req.query?.listing || '').trim();

    const png = await generateOgPng({
      type,
      slug,
      listingIdOrSlug: id,
    });

    if (!png) {
      return res.status(404).send('Not found');
    }

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.status(200).send(png);
  } catch (e) {
    return next(e);
  }
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
// STOREFRONT (Public Website) + Dynamic SEO
// ========================================

// This is optional: in many deployments the public website is hosted separately.
// When enabled, this server can serve the built Vite app with dynamic SEO tags per subdomain.
if (servePublicWebsite) {
  const distDir = String(process.env.PUBLIC_WEBSITE_DIST_DIR || '').trim();
  const resolvedDist = distDir
    ? path.resolve(distDir)
    : path.resolve(process.cwd(), '../publicWebsite/dist');

  // APK download endpoint (optional)
  // Place the APK at backend/public/apk/PublicDukan.apk (default) or override via PUBLIC_APK_FILE_PATH.
  // This must be registered BEFORE static hosting + SPA fallback, otherwise it will return index.html.
  const defaultApkPath = path.resolve(process.cwd(), 'public/apk/PublicDukan.apk');
  const apkFilePath = String(process.env.PUBLIC_APK_FILE_PATH || '').trim() || defaultApkPath;

  app.get(['/download/publicdukan.apk', '/publicdukan.apk'], async (req, res) => {
    try {
      await fs.stat(apkFilePath);
    } catch {
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.set('Cache-Control', 'no-store');
      return res.status(404).send('APK not available');
    }

    res.set('Content-Type', 'application/vnd.android.package-archive');
    res.set('Content-Disposition', 'attachment; filename="PublicDukan.apk"');
    res.set('Cache-Control', 'public, max-age=3600');
    return res.sendFile(apkFilePath);
  });

  let cachedIndexHtml = null;
  let cachedIndexMtimeMs = null;

  const readIndexHtml = async () => {
    const indexPath = path.join(resolvedDist, 'index.html');
    const stat = await fs.stat(indexPath);
    if (cachedIndexHtml && cachedIndexMtimeMs === stat.mtimeMs) return cachedIndexHtml;
    const raw = await fs.readFile(indexPath, 'utf8');
    cachedIndexHtml = raw;
    cachedIndexMtimeMs = stat.mtimeMs;
    return raw;
  };

  // Static assets
  app.use(
    express.static(resolvedDist, {
      index: false,
      etag: true,
      maxAge: '365d',
      immutable: true,
    })
  );

  // HTML fallback with dynamic SEO injection
  app.get('*', async (req, res, next) => {
    try {
      // Never intercept API routes
      if (req.path.startsWith('/api/')) return next();
      if (req.path.startsWith('/share/')) return next();

      const hostInfo = getHostInfo(req);
      const subdomain = hostInfo?.subdomain;
      const business = subdomain ? await resolvePublicBusinessForSubdomain(subdomain) : null;

      // Unknown storefront subdomain: respond 404 and noindex.
      if (hostInfo.isStorefrontSubdomain && subdomain && !business) {
        res.status(404);
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=60');
        return res.send(`<!doctype html><html><head><meta charset="utf-8" />
    <meta name="robots" content="noindex,nofollow" />
    <title>Shop not found</title></head><body><h1>Shop not found</h1></body></html>`);
      }

      // Bot-friendly minimal SSR snapshot
      const enableBotSsr = String(process.env.ENABLE_STORE_FRONT_BOT_SSR || 'true').toLowerCase() === 'true';
      if (enableBotSsr && business && isBotRequest(req)) {
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=300');
        return res.status(200).send(await renderBotHtml({ req, business }));
      }

      const indexHtml = await readIndexHtml();

      const ogHost = hostInfo.isLocalhost && business
        ? `${business.slug}.${hostInfo.rootDomain}`
        : (hostInfo.hostname || hostInfo.rootDomain);

      const ogImageUrl = business
        ? `https://${ogHost}/og.png?type=shop&slug=${encodeURIComponent(business.slug)}`
        : `https://${hostInfo.rootDomain}/logo-removebg-preview.png`;

      const { tags } = buildSeoHeadTags({ req, business, ogImageUrl });
      const html = injectSeoIntoHtml({ html: indexHtml, headTags: tags });

      res.set('Content-Type', 'text/html; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=120');
      return res.status(200).send(html);
    } catch (e) {
      return next(e);
    }
  });
}

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
