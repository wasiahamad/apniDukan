import dotenv from 'dotenv';
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '..');
const REPO_ROOT_DIR = path.resolve(BACKEND_DIR, '..');

// Always load backend env first (so MONGO_URI, MONGO_DNS_SERVERS, etc. are present)
dotenv.config({ path: path.join(BACKEND_DIR, '.env'), override: true });

const DEFAULT_BATCH_SIZE = 500;

const normalizeTruthyFlag = (v) => {
  if (typeof v === 'boolean') return v;
  const s = String(v || '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'y';
};

const parseArgs = () => {
  const raw = process.argv.slice(2);

  const args = {
    dryRun: false,
    dropTarget: false,
    rewriteAdmin: true,
    adminEmail: process.env.ADMIN_EMAIL || '',
    sourceUri: process.env.SOURCE_MONGO_URI || process.env.OLD_MONGO_URI || '',
    targetUri: process.env.TARGET_MONGO_URI || process.env.MONGO_URI || '',
    include: new Set(['businesstype', 'plan', 'referraloffer', 'customerreferraloffer']),
  };

  for (let i = 0; i < raw.length; i++) {
    const token = raw[i];

    if (token === '--dry-run' || token === '--dryrun') args.dryRun = true;
    else if (token === '--drop-target' || token === '--dropTarget' || token === '--drop') args.dropTarget = true;
    else if (token === '--no-rewrite-admin') args.rewriteAdmin = false;
    else if (token === '--admin-email') args.adminEmail = String(raw[i + 1] || '').trim(), i++;
    else if (token === '--source') args.sourceUri = String(raw[i + 1] || '').trim(), i++;
    else if (token === '--target') args.targetUri = String(raw[i + 1] || '').trim(), i++;
    else if (token === '--only') {
      const v = String(raw[i + 1] || '');
      i++;
      args.include = new Set(
        v
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      );
    }
  }

  return args;
};

const readEnvValueFromFile = (filePath, key) => {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = String(line || '').trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      const k = trimmed.slice(0, idx).trim();
      if (k !== key) continue;
      let v = trimmed.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return v;
    }
  } catch {
    // ignore
  }
  return '';
};

const resolveDefaultSourceUri = () => {
  // Try repo root `.env` which in this workspace uses MONGODB_URI.
  const candidate = path.join(REPO_ROOT_DIR, '.env');
  const v = readEnvValueFromFile(candidate, 'MONGODB_URI');
  return String(v || '').trim();
};

const redactMongoUri = (uri) => {
  const s = String(uri || '');
  // Hide username/password in mongodb://user:pass@host...
  return s.replace(/\/\/([^:@/]+):([^@/]+)@/g, '//***:***@');
};

const isPrivateIpv4 = (ip) => {
  const parts = String(ip || '').trim().split('.');
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
};

const withTimeout = async (promise, ms, label) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const uriHasDbName = (uri) => {
  try {
    const u = new URL(String(uri || ''));
    const p = String(u.pathname || '');
    return p.length > 1;
  } catch {
    return false;
  }
};

const setUriDbName = (uri, dbName) => {
  const u = new URL(String(uri || ''));
  u.pathname = `/${String(dbName || '').replace(/^\/+/, '')}`;
  return u.toString();
};

const applyDnsWorkarounds = () => {
  try {
    dns.setDefaultResultOrder?.('ipv4first');
  } catch {
    // ignore
  }

  const servers = String(process.env.MONGO_DNS_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (servers.length === 0) return;

  const force = normalizeTruthyFlag(process.env.FORCE_MONGO_DNS_SERVERS);
  const allPrivate = servers.every((s) => isPrivateIpv4(s));
  const chosenServers = !force && allPrivate ? ['1.1.1.1', '8.8.8.8'] : servers;

  if (!force && allPrivate) {
    console.warn(
      `⚠️  MONGO_DNS_SERVERS looks private/unreachable (${servers.join(', ')}). Using public resolvers (${chosenServers.join(
        ', '
      )}) for this script run.`
    );
  }

  try {
    dns.setServers(chosenServers);
  } catch {
    // ignore
  }
};

const connect = async (uri, name) => {
  if (!uri) throw new Error(`${name} Mongo URI is empty`);
  console.log(`\n🔌 Connecting ${name}... (${redactMongoUri(uri)})`);

  const conn = await withTimeout(
    mongoose
      .createConnection(uri, {
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 20000,
      })
      .asPromise(),
    45000,
    `${name} connect`
  );
  return conn;
};

const toPlainDoc = (doc) => {
  if (!doc) return null;
  // Ensure no mongoose Document methods sneak in.
  return JSON.parse(JSON.stringify(doc));
};

const copyCollection = async ({
  src,
  dst,
  collectionName,
  transformDoc,
  dryRun,
  dropTarget,
}) => {
  const srcCol = src.db.collection(collectionName);
  const dstCol = dst.db.collection(collectionName);

  const total = await srcCol.countDocuments({});
  console.log(`\n▶ ${collectionName}: sourceCount=${total}`);

  if (dropTarget) {
    const dstExists = (await dst.db.listCollections({ name: collectionName }).toArray()).length > 0;
    if (dstExists) {
      if (dryRun) console.log(`🧪 Would drop target collection: ${collectionName}`);
      else {
        await dstCol.drop();
        console.log(`🗑️  Dropped target collection: ${collectionName}`);
      }
    }
  }

  if (total === 0) {
    console.log(`ℹ️  Nothing to copy: ${collectionName}`);
    return { copied: 0, upserted: 0, modified: 0 };
  }

  const cursor = srcCol.find({}).batchSize(DEFAULT_BATCH_SIZE);

  let processed = 0;
  let upserted = 0;
  let modified = 0;

  const ops = [];

  const flush = async () => {
    if (ops.length === 0) return;
    if (dryRun) {
      processed += ops.length;
      ops.length = 0;
      return;
    }

    const res = await dstCol.bulkWrite(ops, { ordered: false });
    processed += ops.length;
    upserted += res.upsertedCount || 0;
    modified += res.modifiedCount || 0;
    ops.length = 0;
  };

  for await (const doc of cursor) {
    const plain = toPlainDoc(doc);
    const transformed = transformDoc ? transformDoc(plain) : plain;
    if (!transformed || !transformed._id) continue;

    ops.push({
      replaceOne: {
        filter: { _id: transformed._id },
        replacement: transformed,
        upsert: true,
      },
    });

    if (ops.length >= DEFAULT_BATCH_SIZE) {
      await flush();
      if (processed % 5000 === 0) {
        process.stdout.write(`...${collectionName}: processed=${processed}/${total}\r`);
      }
    }
  }

  await flush();
  console.log(`✅ ${collectionName}: processed=${processed} upserted=${upserted} modified=${modified}`);

  return { copied: processed, upserted, modified };
};

async function main() {
  const args = parseArgs();

  if (!args.sourceUri) {
    args.sourceUri = resolveDefaultSourceUri();
  }

  if (!args.sourceUri) {
    console.error('❌ SOURCE_MONGO_URI (old DB) not set. Provide via env or `--source`');
    process.exit(1);
  }
  if (!args.targetUri) {
    console.error('❌ MONGO_URI (target DB) not set. Provide via env or `--target`');
    process.exit(1);
  }

  applyDnsWorkarounds();

  console.log(args.dryRun ? '🧪 DRY-RUN (no writes)' : '✍️  WRITE mode');
  console.log(args.dropTarget ? '⚠️  dropTarget=ON' : 'dropTarget=OFF');

  let src = await connect(args.sourceUri, 'SOURCE');
  const dst = await connect(args.targetUri, 'TARGET');

  console.log(`✅ Source DB: ${src.name}`);
  console.log(`✅ Target DB: ${dst.name}`);

  if (src.name === 'test' && !uriHasDbName(args.sourceUri)) {
    console.warn(
      '\n⚠️  SOURCE is connected to database "test". This usually means your SOURCE URI is missing the database name (e.g. it ends with ".net/?...").'
    );
    console.warn('   Fix by setting `SOURCE_MONGO_URI` to include the DB name, e.g. `...mongodb.net/<DB_NAME>?...`, or pass `--source` explicitly.');

    // Best-effort helper for selecting the correct DB.
    try {
      const admin = src.db.admin();
      const dbs = await admin.listDatabases();
      const names = (dbs?.databases || []).map((d) => d?.name).filter(Boolean);
      const candidates = names.filter((n) => !['admin', 'local', 'config'].includes(n));
      if (names.length > 0) {
        console.log(`\nℹ️  Source cluster databases (showing up to 30):`);
        for (const n of names.slice(0, 30)) console.log(`- ${n}`);
        if (names.length > 30) console.log(`...and ${names.length - 30} more`);
      }

      if (candidates.length === 1) {
        const picked = candidates[0];
        console.log(`\n🔁 Auto-selecting source DB: ${picked}`);
        const newUri = setUriDbName(args.sourceUri, picked);
        await src.close();
        src = await connect(newUri, 'SOURCE');
        // Swap for rest of script
        args.sourceUri = newUri;
        console.log(`✅ Source DB (updated): ${src.name}`);
      }
    } catch {
      // ignore (some users/roles can't list dbs)
    }
  }

  let adminId = null;
  if (args.rewriteAdmin) {
    if (!args.adminEmail) {
      console.error('❌ admin email missing. Set ADMIN_EMAIL or pass `--admin-email`');
      process.exit(1);
    }

    const userCol = dst.db.collection('users');
    const admin = await userCol.findOne({ email: args.adminEmail.toLowerCase() }, { projection: { _id: 1, email: 1 } });

    if (!admin?._id) {
      console.error(`❌ Target admin user not found in target DB for email=${args.adminEmail}`);
      console.error('Run `npm run seed:admin` first (backend) then retry.');
      process.exit(1);
    }

    adminId = admin._id;
    console.log(`✅ Using target admin _id for createdBy rewrite (${args.adminEmail})`);
  }

  const tasks = [];

  if (args.include.has('businesstype') || args.include.has('businesstypes')) {
    tasks.push({
      name: 'businesstypes',
      run: () =>
        copyCollection({
          src,
          dst,
          collectionName: 'businesstypes',
          dryRun: args.dryRun,
          dropTarget: args.dropTarget,
        }),
    });
  }

  if (args.include.has('plan') || args.include.has('plans')) {
    tasks.push({
      name: 'plans',
      run: () =>
        copyCollection({
          src,
          dst,
          collectionName: 'plans',
          dryRun: args.dryRun,
          dropTarget: args.dropTarget,
        }),
    });
  }

  if (args.include.has('referraloffer') || args.include.has('referraloffers') || args.include.has('referrals')) {
    tasks.push({
      name: 'referraloffers',
      run: () =>
        copyCollection({
          src,
          dst,
          collectionName: 'referraloffers',
          transformDoc: (doc) => {
            if (!doc) return doc;
            if (!args.rewriteAdmin || !adminId) return doc;
            doc.createdBy = adminId;
            if (doc.updatedBy) doc.updatedBy = adminId;
            return doc;
          },
          dryRun: args.dryRun,
          dropTarget: args.dropTarget,
        }),
    });
  }

  if (args.include.has('customerreferraloffer') || args.include.has('customerreferraloffers') || args.include.has('customer-referral-offer')) {
    tasks.push({
      name: 'customerreferraloffers',
      run: () =>
        copyCollection({
          src,
          dst,
          collectionName: 'customerreferraloffers',
          transformDoc: (doc) => {
            if (!doc) return doc;
            if (!args.rewriteAdmin || !adminId) return doc;
            doc.createdBy = adminId;
            if (doc.updatedBy) doc.updatedBy = adminId;
            return doc;
          },
          dryRun: args.dryRun,
          dropTarget: args.dropTarget,
        }),
    });
  }

  if (tasks.length === 0) {
    console.log('ℹ️  Nothing selected to copy (check `--only` arg).');
  }

  for (const t of tasks) {
    await t.run();
  }

  await src.close();
  await dst.close();
  console.log('\n✅ Done.');
}

main().catch(async (err) => {
  console.error('❌ Failed:', err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
