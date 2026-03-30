import { Business, Plan, Referral, ReferralCode, ReferralOffer, ReferralRewardRequest, User } from '../models/index.js';

const LEGACY_PLAN_TO_SLUG = {
  basic: 'starter',
  standard: 'pro',
  premium: 'enterprise',
};

const normalizePlanSlug = (rewardPlan) => {
  const raw = String(rewardPlan || '').toLowerCase();
  return LEGACY_PLAN_TO_SLUG[raw] || raw;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  const m = Number(months || 0);
  d.setMonth(d.getMonth() + m);
  return d;
};

export const ensureReferralCodeForUser = async (user) => {
  if (!user || user.role !== 'business_owner') return null;

  const code = String(user.referralCode || '').toUpperCase().trim();
  if (!code) return null;

  const existing = await ReferralCode.findOne({ user: user._id });
  if (existing) return existing;

  return await ReferralCode.create({
    user: user._id,
    code,
  });
};

export const resolveReferrerByCode = async (referralCodeRaw) => {
  const code = String(referralCodeRaw || '').toUpperCase().trim();
  if (!code) return null;

  const rc = await ReferralCode.findOne({ code }).populate('user');
  if (rc?.user) {
    return { referrer: rc.user, referralCodeDoc: rc };
  }

  // Backward compatibility: older DBs may have only User.referralCode
  const referrer = await User.findOne({ referralCode: code });
  if (!referrer) return null;

  const referralCodeDoc = await ReferralCode.findOne({ user: referrer._id });
  return { referrer, referralCodeDoc };
};

export const createReferralForSignup = async ({
  referredUser,
  referralCode,
  offerId,
  ipAddress,
  userAgent,
}) => {
  if (!referredUser || !referralCode) return null;

  const resolved = await resolveReferrerByCode(referralCode);
  if (!resolved?.referrer) return null;

  const { referrer, referralCodeDoc } = resolved;

  // Self / fraud prevention
  if (String(referrer._id) === String(referredUser._id)) {
    return null;
  }
  if (referrer.email && referredUser.email && referrer.email.toLowerCase() === referredUser.email.toLowerCase()) {
    return null;
  }
  if (referrer.phone && referredUser.phone && String(referrer.phone) === String(referredUser.phone)) {
    return null;
  }

  // Choose offer
  let offer = null;
  if (offerId) {
    offer = await ReferralOffer.findById(offerId);
    if (!offer || !offer.isCurrentlyValid) {
      offer = null;
    }
  }
  if (!offer) {
    offer = await ReferralOffer.getActiveOffer();
  }
  if (!offer) return null;

  // One-referrer-per-user + idempotency
  // If this user was already referred, keep the first referral.
  const existing = await Referral.findOne({
    referredUser: referredUser._id,
  });
  if (existing) return existing;

  const referral = await Referral.create({
    referrer: referrer._id,
    referredUser: referredUser._id,
    offer: offer._id,
    referralCode: String(referralCode).toUpperCase().trim(),
    status: 'pending',
    isValidated: false,
    validatedAt: null,
    referredUserHasPaidPlan: false,
    metadata: {
      referredUserEmail: referredUser.email,
      referredUserName: referredUser.name,
      referredUserPhone: referredUser.phone,
      referredBusinessName: '',
      ipAddress,
      userAgent,
    },
  });

  if (referralCodeDoc) {
    referralCodeDoc.stats.totalReferrals += 1;
    referralCodeDoc.stats.pendingReferrals += 1;
    referralCodeDoc.lastUsedAt = new Date();
    await referralCodeDoc.save();
  }

  await offer.incrementStat('totalReferrals');

  return referral;
};

export const applyRewardToUser = async ({
  userId,
  rewardPlan,
  rewardDuration,
}) => {
  const planSlug = normalizePlanSlug(rewardPlan);
  const plan = await Plan.findOne({ slug: planSlug, isActive: true });
  if (!plan) {
    throw new Error(`Reward plan not found: ${planSlug}`);
  }

  const businesses = await Business.find({ owner: userId });
  if (!businesses || businesses.length === 0) {
    throw new Error('No business found for user');
  }

  const now = new Date();
  const updated = [];
  const timelines = [];

  for (const b of businesses) {
    const previousPlanExpiresAt = b.planExpiresAt || null;
    const base = b.planExpiresAt && b.planExpiresAt.getTime() > now.getTime() ? b.planExpiresAt : now;
    const rewardStartsAt = new Date(base);
    const rewardEndsAt = addMonths(base, rewardDuration);

    b.plan = plan._id;
    b.planExpiresAt = rewardEndsAt;
    await b.save();

    timelines.push({
      business: b._id,
      businessName: b.name,
      previousPlanExpiresAt,
      rewardStartsAt,
      rewardEndsAt,
    });

    updated.push(b);
  }

  const rewardStartsAt = timelines.length > 0
    ? new Date(Math.min(...timelines.map((t) => new Date(t.rewardStartsAt).getTime())))
    : null;
  const rewardEndsAt = timelines.length > 0
    ? new Date(Math.max(...timelines.map((t) => new Date(t.rewardEndsAt).getTime())))
    : null;

  return { plan, businesses: updated, timelines, rewardStartsAt, rewardEndsAt };
};

export const tryCreateRewardForOffer = async ({ referrerId, offer }) => {
  if (!referrerId || !offer?._id) return null;

  // Offer rules
  const businesses = await Business.find({ owner: referrerId })
    .select('_id plan')
    .populate('plan', 'price')
    .lean();

  const userHadPaidPlan = (businesses || []).some((b) => Number(b?.plan?.price || 0) > 0);
  if (offer.requiresFirstPaidPlan && !userHadPaidPlan) {
    return null;
  }

  if (offer.firstTimeOnly) {
    const alreadyClaimed = await ReferralRewardRequest.countDocuments({
      user: referrerId,
      offer: offer._id,
      status: { $nin: ['cancelled', 'expired'] },
    });
    if (alreadyClaimed > 0) return null;
  }

  const hasPending = await ReferralRewardRequest.hasPendingRequest(referrerId, offer._id);
  if (hasPending) return null;

  const availableValidReferrals = await Referral.countDocuments({
    referrer: referrerId,
    offer: offer._id,
    status: 'valid',
    isCountedInReward: false,
  });

  if (availableValidReferrals < offer.referralThreshold) return null;

  const referralDocs = await Referral.find({
    referrer: referrerId,
    offer: offer._id,
    status: 'valid',
    isCountedInReward: false,
  })
    .limit(offer.referralThreshold)
    .select('_id');

  const referralIds = referralDocs.map((r) => r._id);
  if (referralIds.length < offer.referralThreshold) return null;

  const totalValidReferrals = await Referral.countDocuments({
    referrer: referrerId,
    offer: offer._id,
    status: 'valid',
  });

  const rewardRequest = await ReferralRewardRequest.create({
    user: referrerId,
    offer: offer._id,
    referralCountSnapshot: referralIds.length,
    totalReferralsSnapshot: totalValidReferrals,
    referrals: referralIds,
    rewardPlan: offer.rewardPlan,
    rewardDuration: offer.rewardDuration,
    rewardValue: 0,
    isFirstTimeRequest: false,
    userHadPaidPlan,
    metadata: {
      autoApproved: offer.autoApprove,
    },
  });

  await Referral.updateMany(
    { _id: { $in: referralIds } },
    { isCountedInReward: true, rewardRequest: rewardRequest._id }
  );

  await offer.incrementStat('totalRewardsRequested');

  if (offer.autoApprove) {
    await rewardRequest.approve(null, 'Auto-approved by system');
    await offer.incrementStat('totalRewardsApproved');

    await applyRewardToUser({
      userId: referrerId,
      rewardPlan: offer.rewardPlan,
      rewardDuration: offer.rewardDuration,
    });

    await rewardRequest.fulfill(null);
  }

  return rewardRequest;
};

export const processReferralValidated = async ({ referral }) => {
  if (!referral || referral.status !== 'valid') return null;

  // Update ReferralCode stats (best-effort)
  const rc = await ReferralCode.findOne({ user: referral.referrer });
  if (rc) {
    rc.stats.validReferrals += 1;
    rc.stats.pendingReferrals = Math.max((rc.stats.pendingReferrals || 0) - 1, 0);
    await rc.save();
  }

  // Reward requests are explicitly initiated by dukandar from referral dashboard.
  return null;
};
