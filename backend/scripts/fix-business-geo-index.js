import 'dotenv/config';
import mongoose from 'mongoose';

// One-time fixer for geoNear failures:
// - cleans invalid Business.address.location values
// - attempts to recover coordinates from legacy fields
// - creates required 2dsphere index on address.location

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const isFiniteNumber = (n) => typeof n === 'number' && Number.isFinite(n);
const isValidLat = (n) => isFiniteNumber(n) && n >= -90 && n <= 90;
const isValidLng = (n) => isFiniteNumber(n) && n >= -180 && n <= 180;

const coerceNumber = (v) => {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const normalizeCoords = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  let a = coerceNumber(coords[0]);
  let b = coerceNumber(coords[1]);
  if (a == null || b == null) return null;

  // Heuristic: detect [lat,lng] vs [lng,lat]
  // - if first looks like lat (<=90) and second looks like lng (>90 sometimes), swap.
  const absA = Math.abs(a);
  const absB = Math.abs(b);
  if (absA <= 90 && absB > 90 && absB <= 180) {
    const lat = clamp(a, -90, 90);
    const lng = clamp(b, -180, 180);
    return [lng, lat];
  }

  // assume [lng,lat]
  const lng = clamp(a, -180, 180);
  const lat = clamp(b, -90, 90);
  if (!isValidLng(lng) || !isValidLat(lat)) return null;
  return [lng, lat];
};

const extractLegacyCoords = (doc) => {
  // Try the current GeoJSON path first
  const geo = doc?.address?.location;
  if (geo && typeof geo === 'object') {
    const coords = normalizeCoords(geo.coordinates);
    if (coords) return coords;
  }

  // Legacy pattern seen in dashboard: address.coordinates.{latitude,longitude}
  const legacyCoords = doc?.address?.coordinates;
  if (legacyCoords && typeof legacyCoords === 'object') {
    const lat = coerceNumber(legacyCoords.latitude);
    const lng = coerceNumber(legacyCoords.longitude);
    if (isValidLat(lat) && isValidLng(lng)) return [lng, lat];
  }

  // Other possible legacy fields
  const lat = coerceNumber(doc?.address?.latitude ?? doc?.latitude);
  const lng = coerceNumber(doc?.address?.longitude ?? doc?.longitude);
  if (isValidLat(lat) && isValidLng(lng)) return [lng, lat];

  return null;
};

const isValidGeoJSONPoint = (loc) => {
  if (!loc || typeof loc !== 'object') return false;
  if (loc.type !== 'Point') return false;
  const coords = normalizeCoords(loc.coordinates);
  return !!coords;
};

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const dbName = mongoose.connection.name;
  console.log(`✅ Connected: ${dbName}`);

  // Use the same model as the app.
  const { default: Business } = await import('../models/Business.js');

  const cursor = Business.collection.find(
    { 'address.location': { $exists: true } },
    { projection: { _id: 1, address: 1 } }
  );

  let scanned = 0;
  let fixed = 0;
  let removed = 0;
  const bulk = [];

  for await (const doc of cursor) {
    scanned++;

    const loc = doc?.address?.location;
    if (isValidGeoJSONPoint(loc)) {
      // Normalize coordinates order if needed (lat/lng swapped case)
      const coords = normalizeCoords(loc.coordinates);
      if (coords && Array.isArray(loc.coordinates) && (loc.coordinates[0] !== coords[0] || loc.coordinates[1] !== coords[1])) {
        bulk.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { 'address.location': { type: 'Point', coordinates: coords } } },
          },
        });
        fixed++;
      }
    } else {
      const coords = extractLegacyCoords(doc);
      if (coords) {
        bulk.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { 'address.location': { type: 'Point', coordinates: coords } } },
          },
        });
        fixed++;
      } else {
        // Unset invalid location so index can be created.
        bulk.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $unset: { 'address.location': "" } },
          },
        });
        removed++;
      }
    }

    if (bulk.length >= 500) {
      await Business.collection.bulkWrite(bulk, { ordered: false });
      bulk.length = 0;
      process.stdout.write(`...scanned=${scanned} fixed=${fixed} removed=${removed}\r`);
    }
  }

  if (bulk.length) {
    await Business.collection.bulkWrite(bulk, { ordered: false });
  }

  console.log('');
  console.log(`✅ Done cleanup: scanned=${scanned} fixed=${fixed} removed=${removed}`);

  // Create index after cleanup.
  console.log('⏳ Creating 2dsphere index on address.location ...');
  const idxName = await Business.collection.createIndex({ 'address.location': '2dsphere' });
  console.log(`✅ Index ensured: ${idxName}`);

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
