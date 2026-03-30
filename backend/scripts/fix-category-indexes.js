import 'dotenv/config';
import mongoose from 'mongoose';

// One-time fixer:
// Some DBs may have a leftover GLOBAL unique index on categories.slug (slug_1).
// That breaks multi-tenant categories because different businesses need the same slug.
// The correct index is the compound unique { business: 1, slug: 1 }.

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const dbName = mongoose.connection.name;
  console.log(`✅ Connected: ${dbName}`);

  const col = mongoose.connection.db.collection('categories');
  const indexes = await col.indexes();
  const hasSlugUnique = indexes.some((i) => i.name === 'slug_1');

  if (hasSlugUnique) {
    console.log('⏳ Dropping invalid unique index: slug_1');
    await col.dropIndex('slug_1');
    console.log('✅ Dropped: slug_1');
  } else {
    console.log('ℹ️  No slug_1 index found; nothing to drop');
  }

  // Ensure the correct compound unique index exists.
  // (Mongoose will also attempt to create it at runtime, but we ensure explicitly here.)
  console.log('⏳ Ensuring compound unique index: { business: 1, slug: 1 }');
  const idxName = await col.createIndex({ business: 1, slug: 1 }, { unique: true, name: 'business_1_slug_1' });
  console.log(`✅ Ensured: ${idxName}`);

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
