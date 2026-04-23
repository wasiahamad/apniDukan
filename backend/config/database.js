import mongoose from 'mongoose';
import dns from 'dns';

/**
 * DATABASE CONNECTION
 * MongoDB connection with proper settings and error handling
 */

const connectDB = async () => {
  try {
    // Prefer IPv4 results first. This avoids some Windows/IPv6 resolver edge-cases
    // that can manifest as SRV lookup timeouts for MongoDB Atlas.
    try {
      dns.setDefaultResultOrder('ipv4first');
    } catch {
      // Ignore if not supported in current Node version
    }

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri || !String(mongoUri).trim()) {
      throw new Error('MONGO_URI not set');
    }

    const isSrv = String(mongoUri).startsWith('mongodb+srv://');
    const hostMatch = isSrv ? String(mongoUri).match(/mongodb\+srv:\/\/(?:[^@]+@)?([^/?]+)/i) : null;
    const clusterHost = hostMatch?.[1];
    const srvName = clusterHost ? `_mongodb._tcp.${clusterHost}` : null;

    const withTimeout = async (promise, ms) => {
      let timeoutHandle;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          const err = new Error(`Timed out after ${ms}ms`);
          err.code = 'ETIMEOUT';
          reject(err);
        }, ms);
      });

      try {
        return await Promise.race([promise, timeoutPromise]);
      } finally {
        clearTimeout(timeoutHandle);
      }
    };

    const tryResolveSrv = async () => {
      if (!srvName) return { ok: true };
      try {
        // Some DNS servers (especially on corporate/VPN networks) can hang
        // on SRV lookup without returning an error. Add a short timeout so
        // we can safely fall back to public resolvers.
        const dnsTimeoutMs = Number(process.env.MONGO_DNS_TIMEOUT_MS || 2500);
        await withTimeout(dns.promises.resolveSrv(srvName), dnsTimeoutMs);
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
            if (!firstTry.ok) {
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
    }

    console.log(`🔌 Connecting to MongoDB (${isSrv ? clusterHost : 'direct URI'})...`);

    const conn = await mongoose.connect(String(mongoUri).trim(), {
      // Fail fast with a clear error instead of hanging indefinitely.
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 20000),
      connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 20000),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
      // Prefer IPv4 at the driver level as well (in addition to dns.setDefaultResultOrder).
      family: 4,
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

    // Ensure unique index for AI usage counters (required for correct daily-limit behavior).
    try {
      const { default: AIUsage } = await import('../models/AIUsage.js');
      await AIUsage.collection.createIndex(
        { actorType: 1, identifier: 1, dateKey: 1, action: 1 },
        { unique: true }
      );
      console.log('🤖 Ensured unique index: aiusages(actorType,identifier,dateKey,action)');
    } catch (e) {
      console.warn('⚠️  Failed to ensure unique index for AIUsage counters:', e?.message || e);
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
