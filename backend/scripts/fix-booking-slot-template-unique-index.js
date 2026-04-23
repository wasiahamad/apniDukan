import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Fix BookingSlotTemplate unique index to support soft-delete history.
// Old: unique(business, startTime, endTime, duration)
// New: unique(business, startTime, endTime, duration, isDeleted)
// Usage:
//   node backend/scripts/fix-booking-slot-template-unique-index.js

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI / MONGODB_URI in env');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);

  const db = mongoose.connection.db;
  const collection = db.collection('bookingslottemplates');

  const indexes = await collection.indexes();

  const old = indexes.find((i) => {
    const k = i?.key;
    return k && k.business === 1 && k.startTime === 1 && k.endTime === 1 && k.duration === 1 && k.isDeleted === undefined;
  });

  if (old) {
    console.log('Dropping old unique index:', old.name);
    await collection.dropIndex(old.name);
  } else {
    console.log('Old unique index not found (ok).');
  }

  const hasNew = indexes.some((i) => {
    const k = i?.key;
    return k && k.business === 1 && k.startTime === 1 && k.endTime === 1 && k.duration === 1 && k.isDeleted === 1;
  });

  if (!hasNew) {
    console.log('Creating new unique index (business,startTime,endTime,duration,isDeleted)...');
    await collection.createIndex(
      { business: 1, startTime: 1, endTime: 1, duration: 1, isDeleted: 1 },
      { unique: true, name: 'uniq_business_time_duration_isDeleted' }
    );
    console.log('Created new index.');
  } else {
    console.log('New unique index already exists (ok).');
  }
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Failed to fix index:', err);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  });
