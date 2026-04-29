import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'dns';

dotenv.config({ override: true });

const getArgValue = (name) => {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) return undefined;
  return value;
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

const pick = (...values) => values.find((v) => typeof v === 'string' && v.trim());

const redactMongoUri = (uri) => {
  const s = String(uri || '');
  // mongodb+srv://user:pass@host/db -> mongodb+srv://***:***@host/db
  return s.replace(/(mongodb\+srv:\/\/)([^@]+)@/i, (_, p1) => `${p1}***:***@`);
};

const cloneIndexSpec = (spec) => {
  const allowed = [
    'key',
    'name',
    'unique',
    'sparse',
    'expireAfterSeconds',
    'partialFilterExpression',
    'collation',
    'weights',
    'default_language',
    'language_override',
    'textIndexVersion',
    '2dsphereIndexVersion',
    'bits',
    'min',
    'max',
    'bucketSize',
  ];
  const out = {};
  for (const k of allowed) {
    if (spec && Object.prototype.hasOwnProperty.call(spec, k)) out[k] = spec[k];
  }
  return out;
};

const setupMongoDnsFallback = async (uris = []) => {
  // Prefer IPv4 results first (Windows/IPv6 resolver edge-cases).
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    // Ignore if not supported
  }

  const parseSrvName = (mongoUri) => {
    const uri = String(mongoUri || '').trim();
    if (!uri.startsWith('mongodb+srv://')) return null;
    const hostMatch = uri.match(/mongodb\+srv:\/\/(?:[^@]+@)?([^/?]+)/i);
    const clusterHost = hostMatch?.[1];
    if (!clusterHost) return null;
    return `_mongodb._tcp.${clusterHost}`;
  };

  const srvNames = uris.map(parseSrvName).filter(Boolean);
  if (srvNames.length === 0) return;

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

  const tryResolveAll = async () => {
    const dnsTimeoutMs = Number(process.env.MONGO_DNS_TIMEOUT_MS || 2500);
    for (const name of srvNames) {
      await withTimeout(dns.promises.resolveSrv(name), dnsTimeoutMs);
    }
  };

  const applyDnsServers = (servers, label) => {
    dns.setServers(servers);
    console.log(`🧭 Using ${label} DNS servers for Node: ${servers.join(', ')}`);
  };

  const dnsServersRaw = process.env.MONGO_DNS_SERVERS;
  if (!dnsServersRaw || typeof dnsServersRaw !== 'string') return;

  const customServers = dnsServersRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (customServers.length === 0) return;

  try {
    applyDnsServers(customServers, 'custom');
    try {
      await tryResolveAll();
    } catch {
      const fallbackServers = ['1.1.1.1', '8.8.8.8'];
      applyDnsServers(fallbackServers, 'public fallback');
      try {
        await tryResolveAll();
      } catch (e2) {
        console.warn(`⚠️  SRV lookup still failing after DNS fallback: ${e2?.code || ''} ${e2?.message || e2}`);
      }
    }
  } catch (e) {
    console.warn('⚠️  Failed to set custom DNS servers:', e?.message || e);
  }
};

const main = async () => {
  const sourceUri = pick(getArgValue('source'), process.env.SOURCE_MONGO_URI, process.env.MONGO_URI_OLD);
  const targetUri = pick(getArgValue('target'), process.env.TARGET_MONGO_URI, process.env.MONGO_URI);

  if (!sourceUri) {
    console.error('❌ Missing source Mongo URI. Provide --source or set SOURCE_MONGO_URI');
    process.exit(1);
  }

  if (!targetUri) {
    console.error('❌ Missing target Mongo URI. Provide --target or set TARGET_MONGO_URI or MONGO_URI');
    process.exit(1);
  }

  const dropTarget = hasFlag('dropTarget');

  // Apply DNS resolver overrides/fallback to reduce MongoDB Atlas SRV lookup failures.
  await setupMongoDnsFallback([sourceUri, targetUri]);

  console.log('🔁 Starting DB migration');
  console.log(`   Source: ${redactMongoUri(sourceUri)}`);
  console.log(`   Target: ${redactMongoUri(targetUri)}`);
  console.log(`   Mode:   ${dropTarget ? 'dropTarget + full copy' : 'append copy (no drops)'}`);

  const sourceConn = await mongoose.createConnection(String(sourceUri).trim(), {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
    socketTimeoutMS: 45000,
    family: 4,
  }).asPromise();

  const targetConn = await mongoose.createConnection(String(targetUri).trim(), {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
    socketTimeoutMS: 45000,
    family: 4,
  }).asPromise();

  try {
    const sourceCollections = await sourceConn.db.listCollections().toArray();
    const names = sourceCollections
      .map((c) => c.name)
      .filter((n) => !!n && !n.startsWith('system.'))
      .sort();

    if (names.length === 0) {
      console.log('ℹ️  No collections found in source DB. Nothing to migrate.');
      return;
    }

    for (const name of names) {
      const sourceCol = sourceConn.db.collection(name);
      const targetCol = targetConn.db.collection(name);

      const sourceCount = await sourceCol.estimatedDocumentCount();
      console.log(`\n📦 ${name} (${sourceCount} docs)`);

      if (dropTarget) {
        const exists = (await targetConn.db.listCollections({ name }).toArray()).length > 0;
        if (exists) {
          await targetCol.drop();
          console.log('   🗑️  Dropped target collection');
        }
      }

      if (sourceCount > 0) {
        const cursor = sourceCol.find({}).batchSize(1000);
        let batch = [];
        let inserted = 0;

        for await (const doc of cursor) {
          batch.push(doc);
          if (batch.length >= 1000) {
            await targetCol.insertMany(batch, { ordered: false });
            inserted += batch.length;
            batch = [];
            process.stdout.write(`   ⬆️  Copied ${inserted}/${sourceCount}\r`);
          }
        }

        if (batch.length > 0) {
          await targetCol.insertMany(batch, { ordered: false });
          inserted += batch.length;
          batch = [];
        }

        console.log(`   ✅ Copied ${inserted} docs`);
      } else {
        console.log('   ✅ No docs to copy');
      }

      // Copy indexes (best-effort)
      try {
        const idx = await sourceCol.indexes();
        const toCreate = idx
          .filter((i) => i && i.name && i.name !== '_id_')
          .map(cloneIndexSpec);

        if (toCreate.length > 0) {
          await targetCol.createIndexes(toCreate);
          console.log(`   🧱 Copied ${toCreate.length} indexes`);
        }
      } catch (e) {
        console.warn(`   ⚠️  Failed to copy indexes for ${name}:`, e?.message || e);
      }
    }

    console.log('\n✅ Migration complete');
  } finally {
    await Promise.allSettled([sourceConn.close(), targetConn.close()]);
  }
};

main().catch((err) => {
  console.error('❌ migrateDatabase failed:', err?.message || err);
  process.exit(1);
});
