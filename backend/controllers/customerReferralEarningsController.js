import { CustomerReferral, CustomerReferralOffer, User } from '../models/index.js';

const ensureCustomerReferralCode = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;
  if (!user.referralCode && user.role === 'customer') {
    // triggers User pre-save hook which generates referralCode
    await user.save();
  }
  return user;
};

// @desc    Customer: referral summary (code + totals + recent)
// @route   GET /api/customer-referrals/me/summary
// @access  Private (customer)
export const getMyCustomerReferralSummary = async (req, res) => {
  try {
    const me = await ensureCustomerReferralCode(req.user._id);
    if (!me) return res.status(404).json({ success: false, message: 'User not found' });

    if (me.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can access referrals' });
    }

    const [activeOffer, totalReferrals, earningsAgg, recent] = await Promise.all([
      CustomerReferralOffer.getActiveOffer().catch(() => null),
      CustomerReferral.countDocuments({ referrer: me._id }),
      CustomerReferral.aggregate([
        { $match: { referrer: me._id, status: 'rewarded' } },
        { $group: { _id: null, total: { $sum: '$commissionEarned' } } },
      ]),
      CustomerReferral.find({ referrer: me._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('referredUser', 'name email phone role')
        .populate('planId', 'name slug price')
        .lean(),
    ]);

    const totalEarnings = earningsAgg?.[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: {
        referralCode: me.referralCode || '',
        walletBalance: Number(me.walletBalance || 0),
        activeOffer: activeOffer
          ? {
              _id: activeOffer._id,
              offerName: activeOffer.offerName,
              description: activeOffer.description || '',
              commissionPercent: Number(activeOffer.commissionPercent || 0),
              status: activeOffer.status,
              validFrom: activeOffer.validFrom,
              validUntil: activeOffer.validUntil || null,
            }
          : null,
        totalReferrals,
        totalEarnings,
        recentReferrals: recent || [],
      },
    });
  } catch (error) {
    console.error('Get customer referral summary error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching referral summary' });
  }
};

// -----------------------------
// Admin: Customer Referral Offers
// -----------------------------

// @desc    Admin: create customer referral offer (commission %)
// @route   POST /api/customer-referrals/admin/offers
// @access  Private (admin)
export const adminCreateCustomerReferralOffer = async (req, res) => {
  try {
    const { offerName, description, commissionPercent, validFrom, validUntil, isActive } = req.body || {};

    if (!String(offerName || '').trim()) {
      return res.status(400).json({ success: false, message: 'offerName is required' });
    }

    const percent = Number(commissionPercent);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      return res.status(400).json({ success: false, message: 'commissionPercent must be between 0 and 100' });
    }

    const offer = await CustomerReferralOffer.create({
      offerName: String(offerName).trim(),
      description: description ? String(description).trim() : undefined,
      commissionPercent: percent,
      status: 'draft',
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, data: offer, message: 'Customer referral offer created' });
  } catch (error) {
    console.error('Admin create customer referral offer error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error creating offer' });
  }
};

// @desc    Admin: list customer referral offers
// @route   GET /api/customer-referrals/admin/offers
// @access  Private (admin)
export const adminListCustomerReferralOffers = async (req, res) => {
  try {
    const rows = await CustomerReferralOffer.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Admin list customer referral offers error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching offers' });
  }
};

// @desc    Admin: update customer referral offer fields
// @route   PUT /api/customer-referrals/admin/offers/:id
// @access  Private (admin)
export const adminUpdateCustomerReferralOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { offerName, description, commissionPercent, validFrom, validUntil, status, isActive } = req.body || {};

    const update = { updatedBy: req.user._id };

    if (offerName !== undefined) update.offerName = String(offerName).trim();
    if (description !== undefined) update.description = description ? String(description).trim() : '';
    if (commissionPercent !== undefined) {
      const percent = Number(commissionPercent);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        return res.status(400).json({ success: false, message: 'commissionPercent must be between 0 and 100' });
      }
      update.commissionPercent = percent;
    }
    if (validFrom !== undefined) update.validFrom = validFrom ? new Date(validFrom) : null;
    if (validUntil !== undefined) update.validUntil = validUntil ? new Date(validUntil) : null;
    if (typeof isActive === 'boolean') update.isActive = isActive;
    if (status && ['draft', 'active', 'closed', 'archived'].includes(String(status))) update.status = String(status);

    const offer = await CustomerReferralOffer.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    return res.status(200).json({ success: true, data: offer, message: 'Offer updated' });
  } catch (error) {
    console.error('Admin update customer referral offer error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error updating offer' });
  }
};

// @desc    Admin: activate customer referral offer
// @route   PUT /api/customer-referrals/admin/offers/:id/activate
// @access  Private (admin)
export const adminActivateCustomerReferralOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await CustomerReferralOffer.findById(id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    offer.updatedBy = req.user._id;
    await offer.activate();
    return res.status(200).json({ success: true, data: offer, message: 'Offer activated' });
  } catch (error) {
    console.error('Admin activate customer referral offer error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error activating offer' });
  }
};

// @desc    Admin: close customer referral offer
// @route   PUT /api/customer-referrals/admin/offers/:id/close
// @access  Private (admin)
export const adminCloseCustomerReferralOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await CustomerReferralOffer.findById(id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    offer.updatedBy = req.user._id;
    await offer.close();
    return res.status(200).json({ success: true, data: offer, message: 'Offer closed' });
  } catch (error) {
    console.error('Admin close customer referral offer error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error closing offer' });
  }
};

// @desc    Admin: metrics for customer referral earnings
// @route   GET /api/customer-referrals/admin/metrics
// @access  Private (admin)
export const adminCustomerReferralMetrics = async (req, res) => {
  try {
    const [totalReferrals, earningsAgg] = await Promise.all([
      CustomerReferral.countDocuments({}),
      CustomerReferral.aggregate([
        { $match: { status: 'rewarded' } },
        { $group: { _id: null, total: { $sum: '$commissionEarned' } } },
      ]),
    ]);

    const totalEarningsPaid = earningsAgg?.[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalReferrals,
        totalEarningsPaid,
      },
    });
  } catch (error) {
    console.error('Admin customer referral metrics error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching referral metrics' });
  }
};

// @desc    Admin: list customer referral records
// @route   GET /api/customer-referrals/admin
// @access  Private (admin)
export const adminListCustomerReferrals = async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status && ['pending', 'active', 'rewarded'].includes(String(status))) {
      query.status = String(status);
    }

    const rows = await CustomerReferral.find(query)
      .sort({ createdAt: -1 })
      .populate('referrer', 'name email phone role referralCode walletBalance')
      .populate('referredUser', 'name email phone role referredBy')
      .populate('planId', 'name slug price')
      .lean();

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Admin list customer referrals error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching referrals' });
  }
};
