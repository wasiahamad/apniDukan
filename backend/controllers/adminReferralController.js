import { Business, ReferralOffer, Referral, ReferralRewardRequest, User } from '../models/index.js';
import { applyRewardToUser } from '../services/referralService.js';

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
 * ADMIN REFERRAL CONTROLLER - Admin management of referral system
 * Only admins can create offers and manage reward requests
 */

// @desc    Create referral offer
// @route   POST /api/referrals/admin/offers
// @access  Private (admin only)
export const createReferralOffer = async (req, res) => {
  try {
    const {
      offerName,
      description,
      referralThreshold,
      rewardPlan,
      rewardDuration,
      firstTimeOnly,
      requiresFirstPaidPlan,
      validFrom,
      validUntil,
      terms,
      autoApprove,
    } = req.body;

    const offer = await ReferralOffer.create({
      offerName,
      description,
      referralThreshold,
      rewardPlan,
      rewardDuration,
      firstTimeOnly: firstTimeOnly || false,
      requiresFirstPaidPlan: requiresFirstPaidPlan !== false,
      validFrom: validFrom || new Date(),
      validUntil,
      terms,
      autoApprove: autoApprove || false,
      createdBy: req.user._id,
      status: 'draft',
    });

    res.status(201).json({
      success: true,
      message: 'Referral offer created successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Create referral offer error:', error);
    const status = error?.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Error creating referral offer',
    });
  }
};

// @desc    Get all referral offers
// @route   GET /api/referrals/admin/offers
// @access  Private (admin only)
export const getAllReferralOffers = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [offers, total] = await Promise.all([
      ReferralOffer.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ReferralOffer.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        offers,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get all offers error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching offers',
    });
  }
};

// @desc    Get single referral offer
// @route   GET /api/referrals/admin/offers/:id
// @access  Private (admin only)
export const getReferralOfferById = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await ReferralOffer.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    // Get statistics for this offer
    const totalReferrals = await Referral.countDocuments({ offer: id });
    const validReferrals = await Referral.countDocuments({ offer: id, status: 'valid' });
    const pendingReferrals = await Referral.countDocuments({ offer: id, status: 'pending' });

    res.status(200).json({
      success: true,
      data: {
        ...offer.toObject(),
        realTimeStats: {
          totalReferrals,
          validReferrals,
          pendingReferrals,
        },
      },
    });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching offer',
    });
  }
};

// @desc    Update referral offer
// @route   PUT /api/referrals/admin/offers/:id
// @access  Private (admin only)
export const updateReferralOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updatedBy: req.user._id };

    const offer = await ReferralOffer.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Update offer error:', error);
    const status = error?.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Error updating offer',
    });
  }
};

// @desc    Activate referral offer
// @route   PUT /api/referrals/admin/offers/:id/activate
// @access  Private (admin only)
export const activateReferralOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await ReferralOffer.findById(id);
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    await offer.activate();

    res.status(200).json({
      success: true,
      message: 'Offer activated successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Activate offer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error activating offer',
    });
  }
};

// @desc    Close referral offer
// @route   PUT /api/referrals/admin/offers/:id/close
// @access  Private (admin only)
export const closeReferralOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await ReferralOffer.findById(id);
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    await offer.close();

    res.status(200).json({
      success: true,
      message: 'Offer closed successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Close offer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error closing offer',
    });
  }
};

// @desc    Get all reward requests
// @route   GET /api/referrals/admin/requests
// @access  Private (admin only)
export const getAllRewardRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [rawRequests, total] = await Promise.all([
      ReferralRewardRequest.find(query)
        .populate('user', 'name email phone')
        .populate('offer', 'offerName referralThreshold rewardPlan rewardDuration')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ReferralRewardRequest.countDocuments(query),
    ]);

    const userIds = Array.from(new Set(
      (rawRequests || [])
        .map((r) => r?.user?._id ? String(r.user._id) : null)
        .filter(Boolean)
    ));

    const businesses = userIds.length > 0
      ? await Business.find({ owner: { $in: userIds } })
          .select('_id owner name planExpiresAt')
          .lean()
      : [];

    const businessesByOwner = new Map();
    for (const b of businesses || []) {
      const ownerId = String(b.owner);
      if (!businessesByOwner.has(ownerId)) {
        businessesByOwner.set(ownerId, []);
      }
      businessesByOwner.get(ownerId).push(b);
    }

    const requests = (rawRequests || []).map((reqDoc) => {
      if (reqDoc.rewardStartsAt && reqDoc.rewardEndsAt) return reqDoc;
      const ownerId = reqDoc?.user?._id ? String(reqDoc.user._id) : null;
      if (!ownerId) {
        const fallbackStart = reqDoc.reviewedAt || reqDoc.createdAt || new Date();
        const fallbackEnd = addMonths(fallbackStart, reqDoc.rewardDuration || 1);
        return {
          ...reqDoc,
          rewardStartsAt: reqDoc.rewardStartsAt || fallbackStart,
          rewardEndsAt: reqDoc.rewardEndsAt || fallbackEnd,
        };
      }

      const ownerBusinesses = businessesByOwner.get(ownerId) || [];
      const { timelines, rewardStartsAt, rewardEndsAt } = deriveTimelineFromBusinesses({
        businesses: ownerBusinesses,
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

    res.status(200).json({
      success: true,
      data: {
        requests,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get reward requests error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching reward requests',
    });
  }
};

// @desc    Approve reward request
// @route   PUT /api/referrals/admin/requests/:id/approve
// @access  Private (admin only)
export const approveRewardRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const request = await ReferralRewardRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    const wasPending = request.status === 'pending';

    if (!wasPending && request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request in ${request.status} state`,
      });
    }

    if (wasPending) {
      await request.approve(req.user._id, notes || '');
    }

    if (!request.isRewardFulfilled) {
      const rewardApplication = await applyRewardToUser({
        userId: request.user,
        rewardPlan: request.rewardPlan,
        rewardDuration: request.rewardDuration,
      });

      request.rewardStartsAt = rewardApplication?.rewardStartsAt || null;
      request.rewardEndsAt = rewardApplication?.rewardEndsAt || null;
      request.appliedBusinesses = (rewardApplication?.timelines || []).map((t) => ({
        business: t.business,
        businessName: t.businessName,
        previousPlanExpiresAt: t.previousPlanExpiresAt || null,
        rewardStartsAt: t.rewardStartsAt,
        rewardEndsAt: t.rewardEndsAt,
      }));

      await request.fulfill(req.user._id);
    }

    // Update offer stats
    const offer = await ReferralOffer.findById(request.offer);
    if (offer) {
      if (wasPending) {
        await offer.incrementStat('totalRewardsApproved');
      }
    }

    res.status(200).json({
      success: true,
      message: 'Reward request approved and fulfilled successfully',
      data: request,
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error approving request',
    });
  }
};

// @desc    Reject reward request
// @route   PUT /api/referrals/admin/requests/:id/reject
// @access  Private (admin only)
export const rejectRewardRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const request = await ReferralRewardRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    await request.reject(req.user._id, reason);

    // Update offer stats
    const offer = await ReferralOffer.findById(request.offer);
    if (offer) {
      await offer.incrementStat('totalRewardsRejected');
    }

    res.status(200).json({
      success: true,
      message: 'Reward request rejected',
      data: request,
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error rejecting request',
    });
  }
};

// @desc    Mark reward as fulfilled
// @route   PUT /api/referrals/admin/requests/:id/fulfill
// @access  Private (admin only)
export const fulfillRewardRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await ReferralRewardRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved requests can be fulfilled',
      });
    }

    if (request.isRewardFulfilled) {
      return res.status(200).json({
        success: true,
        message: 'Reward already fulfilled',
        data: request,
      });
    }

    await applyRewardToUser({
      userId: request.user,
      rewardPlan: request.rewardPlan,
      rewardDuration: request.rewardDuration,
    });

    await request.fulfill(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Reward marked as fulfilled',
      data: request,
    });
  } catch (error) {
    console.error('Fulfill request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fulfilling request',
    });
  }
};

// @desc    Get referral system dashboard stats
// @route   GET /api/referrals/admin/stats
// @access  Private (admin only)
export const getReferralDashboardStats = async (req, res) => {
  try {
    const [
      totalOffers,
      activeOffers,
      totalReferrals,
      validReferrals,
      pendingRequests,
      approvedRequests,
      totalUsers,
    ] = await Promise.all([
      ReferralOffer.countDocuments(),
      ReferralOffer.countDocuments({ status: 'active' }),
      Referral.countDocuments(),
      Referral.countDocuments({ status: 'valid' }),
      ReferralRewardRequest.countDocuments({ status: 'pending' }),
      ReferralRewardRequest.countDocuments({ status: 'approved' }),
      User.countDocuments({ role: 'business_owner' }),
    ]);

    // Get top referrers (valid referrals)
    const topReferrersRaw = await Referral.aggregate([
      { $match: { status: 'valid' } },
      {
        $group: {
          _id: '$referrer',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$user._id',
          name: '$user.name',
          email: '$user.email',
          phone: '$user.phone',
          referralCount: '$count',
        },
      },
    ]);

    const topUserIds = (topReferrersRaw || [])
      .map((r) => r.userId)
      .filter(Boolean);

    const [users, businesses, validUnusedCountsByReferrer] = await Promise.all([
      User.find({ _id: { $in: topUserIds } })
        .select('_id activeReferralOffer activeReferralOfferSelectedAt')
        .populate('activeReferralOffer', 'offerName referralThreshold rewardPlan rewardDuration status isActive validFrom validUntil')
        .lean(),
      Business.find({ owner: { $in: topUserIds } })
        .select('_id owner name')
        .sort({ createdAt: 1 })
        .lean(),
      Referral.aggregate([
        {
          $match: {
            status: 'valid',
            referrer: { $in: topUserIds },
            isCountedInReward: false,
          },
        },
        {
          $group: {
            _id: '$referrer',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const userById = new Map((users || []).map((u) => [String(u._id), u]));
    const businessNameByOwnerId = new Map();
    for (const b of businesses || []) {
      const ownerId = String(b.owner);
      if (!businessNameByOwnerId.has(ownerId)) {
        businessNameByOwnerId.set(ownerId, b.name);
      }
    }

    const validUnusedCountMap = new Map();
    for (const row of validUnusedCountsByReferrer || []) {
      const referrerId = String(row?._id);
      validUnusedCountMap.set(referrerId, Number(row?.count || 0));
    }

    const topReferrers = (topReferrersRaw || []).map((r) => {
      const id = String(r.userId);
      const user = userById.get(id);
      const selectedOffer = user?.activeReferralOffer || null;

      const threshold = selectedOffer?.referralThreshold || 0;
      const validForSelected = selectedOffer ? (validUnusedCountMap.get(id) || 0) : 0;

      return {
        ...r,
        businessName: businessNameByOwnerId.get(id) || null,
        selectedOffer: selectedOffer
          ? {
              _id: String(selectedOffer._id),
              offerName: selectedOffer.offerName,
              referralThreshold: selectedOffer.referralThreshold,
              rewardPlan: selectedOffer.rewardPlan,
              rewardDuration: selectedOffer.rewardDuration,
              status: selectedOffer.status,
              isActive: selectedOffer.isActive,
              validFrom: selectedOffer.validFrom,
              validUntil: selectedOffer.validUntil,
            }
          : null,
        selectedOfferProgress: selectedOffer
          ? {
              valid: validForSelected,
              threshold,
              remaining: Math.max(threshold - validForSelected, 0),
            }
          : null,
        selectedOfferSelectedAt: user?.activeReferralOfferSelectedAt || null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalOffers,
        activeOffers,
        totalReferrals,
        validReferrals,
        pendingRequests,
        approvedRequests,
        totalUsers,
        topReferrers,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching dashboard stats',
    });
  }
};

// @desc    Get all referrals (admin)
// @route   GET /api/referrals/admin/referrals
// @access  Private (admin only)
export const getAllReferralsAdmin = async (req, res) => {
  try {
    const { status, page = 1, limit = 25 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [referrals, total] = await Promise.all([
      Referral.find(query)
        .populate('referrer', 'name email phone activeReferralOffer activeReferralOfferSelectedAt')
        .populate('referredUser', 'name email phone')
        .populate('offer', 'offerName referralThreshold rewardPlan rewardDuration')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Referral.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        referrals,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get all referrals admin error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching referrals',
    });
  }
};

// @desc    Get referral tree (admin)
// @route   GET /api/referrals/admin/tree
// @access  Private (admin only)
export const getReferralTreeAdmin = async (req, res) => {
  try {
    const { status, depth = 3 } = req.query;
    const maxDepth = Math.max(1, Math.min(Number(depth) || 3, 6));

    const query = {};
    if (status) query.status = status;

    const referrals = await Referral.find(query)
      .populate('referrer', '_id name email phone')
      .populate('referredUser', '_id name email phone')
      .populate('offer', '_id offerName')
      .sort({ createdAt: -1 })
      .lean();

    const userIds = new Set();
    for (const r of referrals || []) {
      if (r?.referrer?._id) userIds.add(String(r.referrer._id));
      if (r?.referredUser?._id) userIds.add(String(r.referredUser._id));
    }

    const businesses = await Business.find({ owner: { $in: Array.from(userIds) } })
      .select('owner name')
      .sort({ createdAt: 1 })
      .lean();

    const businessNameByOwnerId = new Map();
    for (const b of businesses || []) {
      const ownerId = String(b.owner);
      if (!businessNameByOwnerId.has(ownerId)) {
        businessNameByOwnerId.set(ownerId, b.name);
      }
    }

    const nodes = new Map();
    const childrenByReferrerId = new Map();

    for (const r of referrals || []) {
      const referrerId = r?.referrer?._id ? String(r.referrer._id) : null;
      const referredId = r?.referredUser?._id ? String(r.referredUser._id) : null;
      if (!referrerId || !referredId) continue;

      if (!nodes.has(referrerId)) {
        nodes.set(referrerId, {
          _id: referrerId,
          name: r.referrer?.name || '',
          email: r.referrer?.email || '',
          phone: r.referrer?.phone || '',
          businessName: businessNameByOwnerId.get(referrerId) || null,
        });
      }
      if (!nodes.has(referredId)) {
        nodes.set(referredId, {
          _id: referredId,
          name: r.referredUser?.name || '',
          email: r.referredUser?.email || '',
          phone: r.referredUser?.phone || '',
          businessName: businessNameByOwnerId.get(referredId) || null,
        });
      }

      if (!childrenByReferrerId.has(referrerId)) {
        childrenByReferrerId.set(referrerId, []);
      }

      childrenByReferrerId.get(referrerId).push({
        referralId: String(r._id),
        referredUserId: referredId,
        status: r.status,
        offer: r.offer
          ? {
              _id: String(r.offer._id),
              offerName: r.offer.offerName,
            }
          : null,
        createdAt: r.createdAt,
      });
    }

    const referrerIds = new Set(Array.from(childrenByReferrerId.keys()));
    const referredIds = new Set();
    for (const kids of childrenByReferrerId.values()) {
      for (const k of kids) referredIds.add(String(k.referredUserId));
    }

    // Roots: users who referred someone, but were never referred.
    let rootIds = Array.from(referrerIds).filter((id) => !referredIds.has(id));
    if (rootIds.length === 0) {
      rootIds = Array.from(referrerIds);
    }

    const build = (userId, depthLeft, visiting) => {
      const node = nodes.get(userId) || { _id: userId, name: '', email: '', phone: '', businessName: null };
      if (depthLeft <= 0) {
        return { ...node, referrals: [] };
      }

      if (visiting.has(userId)) {
        return { ...node, referrals: [] };
      }

      const nextVisiting = new Set(visiting);
      nextVisiting.add(userId);

      const children = childrenByReferrerId.get(userId) || [];
      const referralsNested = children.map((edge) => ({
        ...edge,
        referredUser: build(edge.referredUserId, depthLeft - 1, nextVisiting),
      }));

      return { ...node, referrals: referralsNested };
    };

    const roots = rootIds.map((id) => build(id, maxDepth, new Set()));

    res.status(200).json({
      success: true,
      data: {
        roots,
        depth: maxDepth,
        totalReferrals: referrals.length,
      },
    });
  } catch (error) {
    console.error('Get referral tree admin error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching referral tree',
    });
  }
};
