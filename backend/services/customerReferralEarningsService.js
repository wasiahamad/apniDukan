import mongoose from 'mongoose';
import { Business, CustomerReferral, CustomerReferralOffer, User, WalletTransaction } from '../models/index.js';

const DEFAULT_MAX_DISTANCE_KM = 25;

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

const DEFAULT_COMMISSION_PERCENT = 5;

const normalizeCode = (raw) => String(raw || '').toUpperCase().trim();

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

const isSelfReferral = (referrer, referredUser) => {
  if (!referrer || !referredUser) return false;
  if (String(referrer._id) === String(referredUser._id)) return true;
  if (referrer.email && referredUser.email && referrer.email.toLowerCase() === referredUser.email.toLowerCase()) return true;
  if (referrer.phone && referredUser.phone && String(referrer.phone) === String(referredUser.phone)) return true;
  return false;
};

export const resolveCustomerReferrerByCode = async (referralCodeRaw) => {
  const code = normalizeCode(referralCodeRaw);
  if (!code) return null;

  const user = await User.findOne({ referralCode: code, role: 'customer', isActive: true }).select('_id name email phone role referralCode');
  if (!user) return null;
  return { referrer: user, code };
};

export const createCustomerReferralForSignup = async ({ referredUser, referralCode }) => {
  if (!referredUser || !referralCode) return null;

  const resolved = await resolveCustomerReferrerByCode(referralCode);
  if (!resolved?.referrer) return null;

  const { referrer, code } = resolved;

  if (isSelfReferral(referrer, referredUser)) {
    return null;
  }

  // One-referrer-per-business-owner
  const existing = await CustomerReferral.findOne({ referredUser: referredUser._id });
  if (existing) {
    // If already linked, keep original referrer.
    return existing;
  }

  // Store referredBy on business owner record (best-effort)
  try {
    await User.updateOne(
      { _id: referredUser._id, referredBy: { $exists: false } },
      { $set: { referredBy: referrer._id } }
    );
  } catch {
    // Non-blocking
  }

  return await CustomerReferral.create({
    referrer: referrer._id,
    referredUser: referredUser._id,
    referralCode: code,
    status: 'pending',
    commissionEarned: 0,
  });
};

export const processCustomerReferralCommission = async ({ referredOwnerId, planId, planPrice }) => {
  const price = Number(planPrice || 0);
  if (!referredOwnerId || !Number.isFinite(price) || price <= 0) return null;

  const activeOffer = await CustomerReferralOffer.getActiveOffer().catch(() => null);
  const commissionPercent = Number(activeOffer?.commissionPercent ?? DEFAULT_COMMISSION_PERCENT);
  if (!Number.isFinite(commissionPercent) || commissionPercent <= 0) return null;

  const referredOwner = await User.findById(referredOwnerId).select('_id referredBy role email phone');
  if (!referredOwner || referredOwner.role !== 'business_owner') return null;

  if (!referredOwner.referredBy) {
    // No customer referrer
    return null;
  }

  const referrer = await User.findById(referredOwner.referredBy).select('_id role isActive walletBalance referralCode currentLocation');
  if (!referrer || referrer.role !== 'customer' || referrer.isActive !== true) return null;
  if (!referrer.referralCode) return null;

  // Geo rule: commission only if the customer is within 25km of the referred owner's shop.
  // NOTE: We don't have a canonical customer-city field yet, so we enforce distance strictly.
  try {
    const maxDistanceKm = Number(process.env.REFERRAL_MAX_DISTANCE_KM || DEFAULT_MAX_DISTANCE_KM);
    const refCoords = coordsFromGeo(referrer.currentLocation);
    if (!refCoords) return null;

    const referredBusiness = await Business.findOne({ owner: referredOwner._id })
      .select('address.location address.city')
      .lean();
    const bizCoords = coordsFromGeo(referredBusiness?.address?.location);
    if (!bizCoords) return null;

    const distanceKm = haversineKm({ lat: refCoords.lat, lng: refCoords.lng }, { lat: bizCoords.lat, lng: bizCoords.lng });
    if (!Number.isFinite(distanceKm) || distanceKm > maxDistanceKm) {
      return null;
    }
  } catch {
    return null;
  }

  // Ensure referral record exists
  const referral = await CustomerReferral.findOneAndUpdate(
    { referredUser: referredOwner._id },
    {
      $setOnInsert: {
        referrer: referrer._id,
        referredUser: referredOwner._id,
        referralCode: String(referrer.referralCode),
        status: 'pending',
        commissionEarned: 0,
      },
    },
    { new: true, upsert: true }
  );

  // Prevent duplicate reward (one-time by default)
  if (referral.status === 'rewarded' && Number(referral.commissionEarned || 0) > 0) {
    return null;
  }

  const commission = round2((price * commissionPercent) / 100);
  if (commission <= 0) return null;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const existingTxn = await WalletTransaction.findOne({
      user: referrer._id,
      source: 'referral',
      type: 'credit',
      referenceId: String(referral._id),
    }).session(session);

    if (existingTxn) {
      await session.commitTransaction();
      return null;
    }

    await User.updateOne(
      { _id: referrer._id },
      { $inc: { walletBalance: commission } },
      { session }
    );

    await WalletTransaction.create(
      [
        {
          user: referrer._id,
          amount: commission,
          type: 'credit',
          source: 'referral',
          status: 'completed',
          referenceId: String(referral._id),
        },
      ],
      { session }
    );

    await CustomerReferral.updateOne(
      { _id: referral._id },
      {
        $set: {
          status: 'rewarded',
          commissionEarned: commission,
          planId: planId || null,
          offerId: activeOffer?._id || null,
          commissionPercent,
          rewardedAt: new Date(),
        },
      },
      { session }
    );

    await session.commitTransaction();

    return { referralId: referral._id, commission };
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
};
