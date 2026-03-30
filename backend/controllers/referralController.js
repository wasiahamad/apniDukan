import { Referral, ReferralCode, ReferralOffer, ReferralRewardRequest, User, Business } from '../models/index.js';

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Number(months || 0));
  return d;
};

const deriveTimelineFromBusinesses = ({ businesses = [], rewardDuration = 1 }) => {
  const now = new Date();
  const timelines = [];

  for (const b of businesses || []) {
    const previousPlanExpiresAt = b?.planExpiresAt ? new Date(b.planExpiresAt) : null;
    const base = previousPlanExpiresAt && previousPlanExpiresAt.getTime() > now.getTime()
      ? previousPlanExpiresAt
      : now;
    const rewardStartsAt = new Date(base);
    const rewardEndsAt = addMonths(base, rewardDuration);

    timelines.push({
      business: b?._id,
      businessName: b?.name,
      previousPlanExpiresAt,
      rewardStartsAt,
      rewardEndsAt,
    });
  }

  const rewardStartsAt = timelines.length
    ? new Date(Math.min(...timelines.map((t) => new Date(t.rewardStartsAt).getTime())))
    : null;
  const rewardEndsAt = timelines.length
    ? new Date(Math.max(...timelines.map((t) => new Date(t.rewardEndsAt).getTime())))
    : null;

  return { timelines, rewardStartsAt, rewardEndsAt };
};

/**
 * REFERRAL CONTROLLER - Manage referral system for dukandars
 * Dukandars can refer other shops and earn rewards
 */

// @desc    Get active referral offer
// @route   GET /api/referrals/offer/active
// @access  Public
export const getActiveOffer = async (req, res) => {
  try {
    const offer = await ReferralOffer.getActiveOffer();
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'No active referral offer available',
      });
    }

    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    console.error('Get active offer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching active offer',
    });
  }
};

// @desc    Get my referral stats and details
// @route   GET /api/referrals/my/stats
// @access  Private (business_owner)
export const getMyReferralStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get active offer
    const activeOffer = await ReferralOffer.getActiveOffer();

    // Get all offers (admin created) for display
    // NOTE: include virtuals (like isCurrentlyValid) so frontend can decide what to show.
    const offers = await ReferralOffer.find({})
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
    
    // Get referral stats
    const stats = await Referral.getReferralStats(userId);
    
    // Get all referrals
    const referrals = await Referral.find({ referrer: userId })
      .populate('referredUser', 'name email phone')
      .populate('offer', 'offerName referralThreshold rewardPlan rewardDuration')
      .sort({ createdAt: -1 })
      .lean();

    // Get pending reward requests
    let pendingRequests = await ReferralRewardRequest.find({
      user: userId,
      status: 'pending'
    })
      .populate('offer', 'offerName rewardPlan rewardDuration')
      .lean();

    // Get approved rewards
    let approvedRewards = await ReferralRewardRequest.find({
      user: userId,
      status: 'approved'
    })
      .populate('offer', 'offerName rewardPlan rewardDuration')
      .lean();

    const userBusinesses = await Business.find({ owner: userId })
      .select('_id name planExpiresAt')
      .lean();

    pendingRequests = (pendingRequests || []).map((reqDoc) => {
      if (reqDoc.rewardStartsAt && reqDoc.rewardEndsAt) return reqDoc;
      const { timelines, rewardStartsAt, rewardEndsAt } = deriveTimelineFromBusinesses({
        businesses: userBusinesses,
        rewardDuration: reqDoc.rewardDuration,
      });
      const fallbackStart = reqDoc.reviewedAt || reqDoc.createdAt || new Date();
      const fallbackEnd = addMonths(fallbackStart, reqDoc.rewardDuration || 1);
      return {
        ...reqDoc,
        rewardStartsAt: reqDoc.rewardStartsAt || rewardStartsAt || fallbackStart,
        rewardEndsAt: reqDoc.rewardEndsAt || rewardEndsAt || fallbackEnd,
        appliedBusinesses: (reqDoc.appliedBusinesses && reqDoc.appliedBusinesses.length > 0)
          ? reqDoc.appliedBusinesses
          : timelines,
      };
    });

    approvedRewards = (approvedRewards || []).map((reqDoc) => {
      if (reqDoc.rewardStartsAt && reqDoc.rewardEndsAt) return reqDoc;
      const { timelines, rewardStartsAt, rewardEndsAt } = deriveTimelineFromBusinesses({
        businesses: userBusinesses,
        rewardDuration: reqDoc.rewardDuration,
      });
      const fallbackStart = reqDoc.reviewedAt || reqDoc.createdAt || new Date();
      const fallbackEnd = addMonths(fallbackStart, reqDoc.rewardDuration || 1);
      return {
        ...reqDoc,
        rewardStartsAt: reqDoc.rewardStartsAt || rewardStartsAt || fallbackStart,
        rewardEndsAt: reqDoc.rewardEndsAt || rewardEndsAt || fallbackEnd,
        appliedBusinesses: (reqDoc.appliedBusinesses && reqDoc.appliedBusinesses.length > 0)
          ? reqDoc.appliedBusinesses
          : timelines,
      };
    });

    // Get user's referral code + active offer selection
    const user = await User.findById(userId)
      .select('referralCode activeReferralOffer activeReferralOfferSelectedAt')
      .populate('activeReferralOffer');

    const referralCodeDoc = await ReferralCode.findOne({ user: userId }).select('code').lean();
    const referralCode = referralCodeDoc?.code || user.referralCode;

    const selectedOfferDoc = user?.activeReferralOffer || null;
    const selectedOfferId = selectedOfferDoc ? String(selectedOfferDoc._id) : null;

    // Determine selected-offer progress.
    // Business rule: valid referral conversions are global for the referrer; selected offer is only reward target.
    let selectedOfferProgress = null;
    const canChangeSelectedOffer = true;

    if (selectedOfferDoc) {
      const validUnusedCount = await Referral.countDocuments({
        referrer: userId,
        status: 'valid',
        isCountedInReward: false,
      });

      const threshold = selectedOfferDoc.referralThreshold || 0;
      const isComplete = threshold > 0 ? validUnusedCount >= threshold : true;

      selectedOfferProgress = {
        valid: validUnusedCount,
        threshold,
        isComplete,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        referralCode,
        stats,
        activeOffer,
        selectedOfferId,
        canChangeSelectedOffer,
        selectedOfferProgress,
        offers,
        referrals,
        pendingRequests,
        approvedRewards,
      },
    });
  } catch (error) {
    console.error('Get my referral stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching referral stats',
    });
  }
};

// @desc    Set my active referral offer (dukandar can work on only one offer until completion)
// @route   PUT /api/referrals/my/active-offer
// @access  Private (business_owner)
export const setMyActiveReferralOffer = async (req, res) => {
  try {
    const userId = req.user._id;
    const { offerId } = req.body;

    if (!offerId) {
      return res.status(400).json({
        success: false,
        message: 'offerId is required',
      });
    }

    const offer = await ReferralOffer.findById(offerId);
    if (!offer || !offer.isCurrentlyValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive offer',
      });
    }

    const user = await User.findById(userId).populate('activeReferralOffer');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.activeReferralOffer = offer._id;
    user.activeReferralOfferSelectedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Active referral offer updated',
      data: {
        selectedOfferId: String(offer._id),
      },
    });
  } catch (error) {
    console.error('Set active referral offer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error setting active offer',
    });
  }
};

// @desc    Create a referral (when someone signs up using referral code)
// @route   POST /api/referrals
// @access  Private (business_owner)
export const createReferral = async (req, res) => {
  try {
    const { referralCode, offerId } = req.body;
    const referredUserId = req.user._id;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required',
      });
    }

    // Find referrer by referral code (preferred: ReferralCode model, fallback: User.referralCode)
    const code = referralCode.toUpperCase().trim();
    const referralCodeDoc = await ReferralCode.findOne({ code }).populate('user');
    const referrer = referralCodeDoc?.user || (await User.findOne({ referralCode: code }));

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code',
      });
    }

    // Check if user is trying to refer themselves
    if (referrer._id.toString() === referredUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot refer yourself',
      });
    }

    // Basic anti-abuse: prevent referral between same email/phone accounts
    if (
      referrer.email &&
      req.user.email &&
      String(referrer.email).toLowerCase() === String(req.user.email).toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid referral',
      });
    }
    if (referrer.phone && req.user.phone && String(referrer.phone) === String(req.user.phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid referral',
      });
    }

    // Pick offer: allow user to select one (offerId), else fallback to latest active
    let offer = null;
    if (offerId) {
      offer = await ReferralOffer.findById(offerId);
      if (!offer || !offer.isCurrentlyValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive offer',
        });
      }
    } else {
      offer = await ReferralOffer.getActiveOffer();
      if (!offer) {
        return res.status(400).json({
          success: false,
          message: 'No active referral offer available',
        });
      }
    }

    // Enforce one-referrer-per-user: if this user was already referred, keep the first referral.
    const existingReferral = await Referral.findOne({
      referredUser: referredUserId,
    });

    if (existingReferral) {
      // Idempotency: repeated submissions should not block onboarding.
      // If the user selected a different offer and the referral isn't already used in a reward,
      // allow updating the offer.
      const isSameReferrer = String(existingReferral.referrer) === String(referrer._id);
      const selectedOfferId = offer?._id ? String(offer._id) : null;
      const currentOfferId = existingReferral.offer ? String(existingReferral.offer) : null;
      const canUpdateOffer =
        !!selectedOfferId &&
        !!currentOfferId &&
        selectedOfferId !== currentOfferId &&
        isSameReferrer &&
        !existingReferral.isCountedInReward &&
        !existingReferral.rewardRequest;

      if (canUpdateOffer) {
        existingReferral.offer = offer._id;
        existingReferral.referralCode = referralCode.toUpperCase();
        await existingReferral.save();
      }

      return res.status(200).json({
        success: true,
        message: 'Referral already exists',
        data: existingReferral,
      });
    }

    // Get referred user's business info
    const referredBusiness = await Business.findOne({ owner: referredUserId });
    
    // Get referred user's business info (if exists yet)
    const referral = await Referral.create({
      referrer: referrer._id,
      referredUser: referredUserId,
      offer: offer._id,
      referralCode: code,
      status: 'pending',
      isValidated: false,
      validatedAt: null,
      metadata: {
        referredUserEmail: req.user.email,
        referredUserName: req.user.name,
        referredUserPhone: req.user.phone,
        referredBusinessName: referredBusiness?.name || '',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    // Update ReferralCode analytics counters (best-effort)
    if (referralCodeDoc) {
      referralCodeDoc.stats.totalReferrals += 1;
      referralCodeDoc.stats.pendingReferrals += 1;
      referralCodeDoc.lastUsedAt = new Date();
      await referralCodeDoc.save();
    }

    // Increment offer stats
    await offer.incrementStat('totalReferrals');

    res.status(201).json({
      success: true,
      message: 'Referral created successfully (pending until first payment)',
      data: referral,
    });
  } catch (error) {
    console.error('Create referral error:', error);
    // If two requests race, Mongo can throw duplicate key on the unique index.
    // Treat it as idempotent success to avoid blocking onboarding.
    if (error?.code === 11000) {
      const referredUserId = req.user?._id;
      const existingReferral = referredUserId
        ? await Referral.findOne({ referredUser: referredUserId })
            .populate('referredUser', 'name email phone')
            .populate('offer', 'offerName referralThreshold rewardPlan rewardDuration')
            .lean()
        : null;

      return res.status(200).json({
        success: true,
        message: 'Referral already exists',
        data: existingReferral || undefined,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Error creating referral',
    });
  }
};

// @desc    Request reward (when threshold is reached)
// @route   POST /api/referrals/request-reward
// @access  Private (business_owner)
export const requestReward = async (req, res) => {
  try {
    const userId = req.user._id;
    const { offerId } = req.body;

    if (!offerId) {
      return res.status(400).json({
        success: false,
        message: 'offerId is required',
      });
    }

    const offer = await ReferralOffer.findById(offerId);

    if (!offer || !offer.isCurrentlyValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive offer',
      });
    }

    const hasPending = await ReferralRewardRequest.hasPendingRequest(userId, offerId);

    if (hasPending) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending reward request for this offer',
      });
    }

    // Enforce offer rules (server-side)
    if (offer.firstTimeOnly) {
      const alreadyClaimed = await ReferralRewardRequest.countDocuments({
        user: userId,
        offer: offerId,
        status: { $nin: ['cancelled', 'expired'] },
      });

      if (alreadyClaimed > 0) {
        return res.status(400).json({
          success: false,
          message: 'This offer can only be claimed once',
        });
      }
    }

    const businesses = await Business.find({ owner: userId })
      .select('_id name plan planExpiresAt')
      .populate('plan', 'slug name price')
      .lean();

    const primaryBusiness = businesses?.[0] || null;
    const userHadPaidPlan = (businesses || []).some((b) => {
      const p = b?.plan;
      return !!p && Number(p.price || 0) > 0;
    });

    if (offer.requiresFirstPaidPlan && !userHadPaidPlan) {
      return res.status(400).json({
        success: false,
        message: 'This offer requires an existing paid plan',
      });
    }

    const [totalValidReferralCount, availableValidReferralCount] = await Promise.all([
      Referral.countValidReferrals(userId),
      Referral.countDocuments({
        referrer: userId,
        status: 'valid',
        isCountedInReward: false,
      }),
    ]);

    if (availableValidReferralCount < offer.referralThreshold) {
      return res.status(400).json({
        success: false,
        message: `You need ${offer.referralThreshold} unused valid referrals. You currently have ${availableValidReferralCount}.`,
      });
    }

    const validReferrals = await Referral.find({
      referrer: userId,
      status: 'valid',
      isCountedInReward: false,
    })
      .sort({ validatedAt: 1, createdAt: 1 })
      .limit(offer.referralThreshold)
      .select('_id');

    const referralIds = validReferrals.map((r) => r._id);

    const previousRequests = await ReferralRewardRequest.countDocuments({
      user: userId,
      status: { $in: ['approved', 'rejected'] },
    });

    const isFirstTimeRequest = previousRequests === 0;

    if (referralIds.length < offer.referralThreshold) {
      return res.status(400).json({
        success: false,
        message: 'Not enough unused valid referrals available for reward request',
      });
    }

    const projectedTimeline = deriveTimelineFromBusinesses({
      businesses,
      rewardDuration: offer.rewardDuration,
    });

    const rewardRequest = await ReferralRewardRequest.create({
      user: userId,
      offer: offerId,
      referralCountSnapshot: referralIds.length,
      totalReferralsSnapshot: totalValidReferralCount,
      referrals: referralIds,
      rewardPlan: offer.rewardPlan,
      rewardDuration: offer.rewardDuration,
      rewardStartsAt: projectedTimeline.rewardStartsAt,
      rewardEndsAt: projectedTimeline.rewardEndsAt,
      appliedBusinesses: projectedTimeline.timelines,
      rewardValue: 0,
      isFirstTimeRequest,
      userHadPaidPlan,
      metadata: {
        userCurrentPlan: primaryBusiness?.plan?.slug || 'free',
        userEmail: req.user.email,
        userName: req.user.name,
        userBusinessName: primaryBusiness?.name || '',
        requestIpAddress: req.ip,
      },
    });

    await Referral.updateMany(
      { _id: { $in: referralIds } },
      { isCountedInReward: true, rewardRequest: rewardRequest._id }
    );

    return res.status(201).json({
      success: true,
      message: 'Reward request submitted successfully',
      data: rewardRequest,
    });
  } catch (error) {
    console.error('Request reward error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error requesting reward',
    });
  }
};

// @desc    Validate referral payment (called when referred user makes first payment)
// @route   PUT /api/referrals/:id/validate-payment
// @access  Private (admin or system)
export const validateReferralPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { hasPaid, paymentDate } = req.body;

    const referral = await Referral.findById(id);
    
    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found',
      });
    }

    await referral.updatePaymentStatus(hasPaid, paymentDate ? new Date(paymentDate) : new Date());

    return res.status(200).json({
      success: true,
      message: 'Referral payment status updated',
      data: referral,
    });
  } catch (error) {
    console.error('Validate referral payment error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error validating payment',
    });
  }
};

// @desc    Get my referral history
// @route   GET /api/referrals/my/history
// @access  Private (business_owner)
export const getMyReferralHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, status } = req.query;

    const query = { referrer: userId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    
    const [referrals, total] = await Promise.all([
      Referral.find(query)
        .populate('referredUser', 'name email phone')
        .populate('offer', 'offerName referralThreshold')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Referral.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        referrals,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get referral history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching referral history',
    });
  }
};
