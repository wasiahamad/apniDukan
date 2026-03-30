import mongoose from 'mongoose';
import dns from 'dns';

/**
 * DATABASE CONNECTION
 * MongoDB connection with proper settings and error handling
 */

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri || !String(mongoUri).trim()) {
      throw new Error('MONGO_URI not set');
    }

    const isSrv = String(mongoUri).startsWith('mongodb+srv://');
    const hostMatch = isSrv ? String(mongoUri).match(/mongodb\+srv:\/\/(?:[^@]+@)?([^/?]+)/i) : null;
    const clusterHost = hostMatch?.[1];
    const srvName = clusterHost ? `_mongodb._tcp.${clusterHost}` : null;

    const tryResolveSrv = async () => {
      if (!srvName) return { ok: true };
      try {
        await dns.promises.resolveSrv(srvName);
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          code: e?.code,
          message: e?.message || String(e),
        };
      }
    };

    const applyDnsServers = (servers, label) => {
      dns.setServers(servers);
      console.log(`🧭 Using ${label} DNS servers for Node: ${servers.join(', ')}`);
    };

    const dnsServersRaw = process.env.MONGO_DNS_SERVERS;
    if (dnsServersRaw && typeof dnsServersRaw === 'string') {
      const servers = dnsServersRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (servers.length > 0) {
        try {
          applyDnsServers(servers, 'custom');

          // If the configured DNS cannot resolve SRV (timeout/refused), fall back to public resolvers.
          if (isSrv) {
            const firstTry = await tryResolveSrv();
            if (!firstTry.ok && ['ECONNREFUSED', 'ETIMEOUT', 'SERVFAIL', 'REFUSED'].includes(String(firstTry.code || '').toUpperCase())) {
              const fallbackDns = ['1.1.1.1', '8.8.8.8'];
              applyDnsServers(fallbackDns, 'public fallback');
              const secondTry = await tryResolveSrv();
              if (!secondTry.ok) {
                console.warn(`⚠️  SRV lookup still failing after DNS fallback: ${secondTry.code || ''} ${secondTry.message}`);
              }
            }
          }
        } catch (e) {
          console.warn('⚠️  Failed to set custom DNS servers:', e?.message || e);
        }
      }
    } else if (process.env.NODE_ENV === 'development' && isSrv) {
      // If Node is using a local DNS proxy (often 127.0.0.1) that refuses SRV, Atlas will fail.
      // Auto-switch to public resolvers (best-effort) to keep dev environment running.
      try {
        const current = dns.getServers();
        const isLocalOnly =
          current.length === 1 &&
          (current[0] === '127.0.0.1' || current[0] === '::1');

        if (isLocalOnly) {
          const fallbackDns = ['1.1.1.1', '8.8.8.8'];
          applyDnsServers(fallbackDns, 'public fallback');
        }
      } catch (e) {
        console.warn('⚠️  Atlas DNS auto-fix failed:', e?.message || e);
      }
    }

    const conn = await mongoose.connect(String(mongoUri).trim(), {
      // Mongoose 6+ no longer requires these options:
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Log additional connection info in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📦 Database: ${conn.connection.name}`);
      console.log(`🔌 Port: ${conn.connection.port}`);
    }

    // Ensure geo indexes exist for $geoNear queries.
    // In many deployments autoIndex is disabled, so the index may never be created.
    try {
      const { default: Business } = await import('../models/Business.js');
      await Business.collection.createIndex({ 'address.location': '2dsphere' });
      console.log('📍 Ensured geo index: businesses(address.location) 2dsphere');
    } catch (e) {
      console.warn('⚠️  Failed to ensure geo index for Business.address.location:', e?.message || e);
    }

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔴 Mongoose disconnected from MongoDB');
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔴 MongoDB connection closed due to app termination');
  process.exit(0);
});

export default connectDB;
