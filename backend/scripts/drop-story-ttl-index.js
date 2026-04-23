import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Drops the old TTL index on Story.expiresAt, if it exists.
// Why: We now keep expired stories for backup/audit, and hide via queries.
// Usage:
//   node backend/scripts/drop-story-ttl-index.js

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI / MONGODB_URI in env');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);

  const db = mongoose.connection.db;
  const collection = db.collection('stories');

  const indexes = await collection.indexes();
  const ttl = indexes.find((i) => i?.key?.expiresAt === 1);

  if (!ttl) {
    console.log('No expiresAt TTL index found on stories collection. Nothing to do.');
    return;
  }

  console.log('Found expiresAt index:', ttl.name);
  await collection.dropIndex(ttl.name);
  console.log('Dropped index:', ttl.name);
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Failed to drop TTL index:', err);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  });
