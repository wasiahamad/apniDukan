import { Business } from '../models/index.js';

const DEFAULT_MAX_DISTANCE_KM = 25;

const normalizeCity = (value) => {
  const s = String(value || '').trim().toLowerCase();
  if (!s) return '';
  return s.replace(/\s+/g, ' ');
};

const isFiniteNumber = (n) => typeof n === 'number' && Number.isFinite(n);

const coordsFromGeo = (geo) => {
  const coords = geo?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!isFiniteNumber(lng) || !isFiniteNumber(lat)) return null;
  return { lng, lat };
};

const haversineKm = (a, b) => {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

export const getOwnerBusinessGeo = async (ownerId) => {
  if (!ownerId) return null;
  const b = await Business.findOne({ owner: ownerId })
    .select('address.city address.location')
    .lean();
  if (!b) return null;
  const city = normalizeCity(b?.address?.city);
  const coords = coordsFromGeo(b?.address?.location);
  return { city, coords, business: b };
};

/**
 * Validates eligibility of a referral code based on:
 * - SAME CITY between referrer's shop and referred shop
 * - WITHIN MAX DISTANCE (km) between their Geo coordinates
 *
 * NOTE: This validation is only implemented for business_owner referrers because
 * customer accounts don't currently have a canonical city field in the backend.
 */
export const validateBusinessOwnerReferralEligibility = async ({
  referrerUserId,
  referredOwnerId,
  maxDistanceKm,
}) => {
  const limitKm = Number.isFinite(Number(maxDistanceKm)) ? Number(maxDistanceKm) : DEFAULT_MAX_DISTANCE_KM;

  const [referrerGeo, referredGeo] = await Promise.all([
    getOwnerBusinessGeo(referrerUserId),
    getOwnerBusinessGeo(referredOwnerId),
  ]);

  if (!referredGeo?.business) {
    return {
      ok: false,
      code: 'REFERRED_BUSINESS_MISSING',
      message: 'Please create your shop first to apply a referral code.',
    };
  }

  if (!referredGeo.city) {
    return {
      ok: false,
      code: 'REFERRED_CITY_MISSING',
      message: 'Please set your shop city to apply a referral code.',
    };
  }

  if (!referredGeo.coords) {
    return {
      ok: false,
      code: 'REFERRED_LOCATION_MISSING',
      message: 'Referral code use karne ke liye shop ki live location set karna zaroori hai.',
    };
  }

  if (!referrerGeo?.business) {
    return {
      ok: false,
      code: 'REFERRER_BUSINESS_MISSING',
      message: 'Referral code is not valid (referrer shop not found).',
    };
  }

  if (!referrerGeo.city) {
    return {
      ok: false,
      code: 'REFERRER_CITY_MISSING',
      message: 'Referral code is not valid (referrer city missing).',
    };
  }

  if (referrerGeo.city !== referredGeo.city) {
    return {
      ok: false,
      code: 'CITY_MISMATCH',
      message: 'Referral code sirf same city ke liye valid hai.',
    };
  }

  if (!referrerGeo.coords) {
    return {
      ok: false,
      code: 'REFERRER_LOCATION_MISSING',
      message: 'Referral code is not valid (referrer shop live location missing).',
    };
  }

  const distanceKm = haversineKm(referrerGeo.coords, referredGeo.coords);
  if (!Number.isFinite(distanceKm)) {
    return {
      ok: false,
      code: 'DISTANCE_CALC_FAILED',
      message: 'Could not validate referral distance. Please try again.',
    };
  }

  if (distanceKm > limitKm) {
    return {
      ok: false,
      code: 'DISTANCE_EXCEEDED',
      message: `Referral code sirf ${limitKm}km ke andar valid hai.`,
      distanceKm,
      maxDistanceKm: limitKm,
    };
  }

  return {
    ok: true,
    code: 'OK',
    city: referredGeo.city,
    distanceKm,
    maxDistanceKm: limitKm,
  };
};
