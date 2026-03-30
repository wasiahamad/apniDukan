import 'dotenv/config';
import mongoose from 'mongoose';

const normalizeWhyChooseUsTemplates = (raw) => {
  if (!Array.isArray(raw)) return [];
  const unique = new Set();
  const result = [];

  for (const item of raw) {
    const title = String(item?.title || '').trim();
    const desc = String(item?.desc || '').trim();
    const iconName = String(item?.iconName || '').trim();
    if (!title && !desc) continue;

    const key = `${title.toLowerCase()}|${desc.toLowerCase()}|${iconName.toLowerCase()}`;
    if (unique.has(key)) continue;
    unique.add(key);

    result.push({
      title: title.slice(0, 80),
      desc: desc.slice(0, 180),
      ...(iconName ? { iconName: iconName.slice(0, 80) } : {}),
    });
  }

  return result;
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

  const types = await BusinessType.find({}, { whyChooseUsTemplates: 1 }).lean();
  const typeMap = new Map(
    types.map((t) => [String(t._id), normalizeWhyChooseUsTemplates(t.whyChooseUsTemplates).slice(0, 12)])
  );

  const cursor = Business.collection.find(
    { businessType: { $ne: null } },
    { projection: { _id: 1, businessType: 1, name: 1, slug: 1, whyChooseUs: 1 } }
  );

  let scanned = 0;
  let businessesNeedingBackfill = 0;
  let businessesUpdated = 0;

  for await (const doc of cursor) {
    scanned++;
    const businessId = doc._id;
    const businessTypeId = doc.businessType;

    if (!businessId || !businessTypeId) continue;

    const templates = typeMap.get(String(businessTypeId)) || [];
    if (templates.length === 0) continue;

    const existing = Array.isArray(doc.whyChooseUs) ? doc.whyChooseUs : [];
    if (existing.length > 0) continue;

    businessesNeedingBackfill++;
    if (dryRun) continue;

    const res = await Business.updateOne(
      { _id: businessId, $or: [{ whyChooseUs: { $exists: false } }, { whyChooseUs: { $size: 0 } }] },
      { $set: { whyChooseUs: templates } }
    );

    if (res && (res.modifiedCount || res.nModified)) {
      businessesUpdated++;
    }

    if (scanned % 50 === 0) {
      process.stdout.write(
        `...scanned=${scanned} needingBackfill=${businessesNeedingBackfill} businessesUpdated=${businessesUpdated}\r`
      );
    }
  }

  console.log('');
  console.log(`✅ Done: scanned=${scanned} needingBackfill=${businessesNeedingBackfill} businessesUpdated=${businessesUpdated}`);

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
