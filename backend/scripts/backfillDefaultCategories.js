import 'dotenv/config';
import mongoose from 'mongoose';

const normalizeExampleCategories = (raw) => {
  if (!Array.isArray(raw)) return [];
  const unique = new Set();
  for (const item of raw) {
    const name = String(item || '').trim();
    if (!name) continue;
    unique.add(name);
  }
  return Array.from(unique);
};

const parseArgs = () => {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has('--dry-run') || args.has('--dryrun'),
  };
};

async function main() {
  const { dryRun } = parseArgs();

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const dbName = mongoose.connection.name;
  console.log(`✅ Connected: ${dbName}`);
  console.log(dryRun ? '🧪 Running in DRY-RUN mode (no writes)' : '✍️  Running in WRITE mode');

  const { default: Business } = await import('../models/Business.js');
  const { default: BusinessType } = await import('../models/BusinessType.js');
  const { default: Category } = await import('../models/Category.js');

  const types = await BusinessType.find({}, { exampleCategories: 1 }).lean();
  const typeMap = new Map(types.map((t) => [String(t._id), normalizeExampleCategories(t.exampleCategories)]));

  const cursor = Business.collection.find(
    { businessType: { $ne: null } },
    { projection: { _id: 1, businessType: 1, name: 1, slug: 1 } }
  );

  let scanned = 0;
  let businessesNeedingBackfill = 0;
  let businessesUpdated = 0;
  let categoriesCreated = 0;

  for await (const doc of cursor) {
    scanned++;
    const businessId = doc._id;
    const businessTypeId = doc.businessType;

    if (!businessId || !businessTypeId) continue;

    const examples = typeMap.get(String(businessTypeId)) || [];
    if (examples.length === 0) continue;

    const existing = await Category.find({ business: businessId }).select('name').lean();
    const existingNameSet = new Set(
      existing
        .map((c) => String(c?.name || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const missing = examples
      .slice(0, 50)
      .filter((name) => {
        const key = String(name || '').trim().toLowerCase();
        return key && !existingNameSet.has(key);
      });

    if (missing.length === 0) continue;
    businessesNeedingBackfill++;

    if (dryRun) {
      categoriesCreated += missing.length;
      continue;
    }

    let createdForThisBusiness = 0;
    for (let i = 0; i < missing.length; i++) {
      const name = missing[i];
      // Keep the order consistent with BusinessType.exampleCategories index
      const order = Math.max(examples.indexOf(name), 0);
      try {
        await Category.create({ business: businessId, name, order });
        createdForThisBusiness++;
      } catch (e) {
        // Ignore duplicates; keep going.
        if (!(e && (e.code === 11000 || String(e?.message || '').includes('E11000')))) {
          console.warn(`⚠️  Failed to create category for business=${doc.slug || doc.name || businessId}: ${e?.message || e}`);
        }
      }
    }

    if (createdForThisBusiness > 0) {
      businessesUpdated++;
      categoriesCreated += createdForThisBusiness;
    }

    if (scanned % 50 === 0) {
      process.stdout.write(
        `...scanned=${scanned} needingBackfill=${businessesNeedingBackfill} businessesUpdated=${businessesUpdated} categoriesCreated=${categoriesCreated}\r`
      );
    }
  }

  console.log('');
  console.log(
    `✅ Done: scanned=${scanned} needingBackfill=${businessesNeedingBackfill} businessesUpdated=${businessesUpdated} categoriesCreated=${categoriesCreated}`
  );

  await mongoose.disconnect();
  console.log('✅ Disconnected');
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
