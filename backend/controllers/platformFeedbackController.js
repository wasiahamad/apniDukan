import mongoose from 'mongoose';
import { Business, PlatformFeedback } from '../models/index.js';

const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// @desc    Submit platform rating/feedback
// @route   POST /api/platform-feedback
// @access  Private (customer, business_owner)
export const createPlatformFeedback = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Login required',
      });
    }

    const role = String(req.user?.role || '').trim();
    if (role !== 'customer' && role !== 'business_owner') {
      return res.status(403).json({
        success: false,
        message: 'Only customer or dukandar can submit platform feedback',
      });
    }

    const ratingRaw = req.body?.rating;
    const rating = Number(ratingRaw);

    if (!Number.isFinite(rating) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    const feedback = String(req.body?.feedback || '').trim();

    const sourceRaw = String(req.body?.source || '').trim();
    const source = ['publicWebsite', 'dukandarDashboard'].includes(sourceRaw) ? sourceRaw : 'unknown';

    const created = await PlatformFeedback.create({
      user: req.user._id,
      userRole: role,
      rating,
      feedback,
      metadata: {
        userAgent: req.get('user-agent') || undefined,
        ipAddress: req.ip || undefined,
        source,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted',
      data: {
        _id: created._id,
        rating: created.rating,
        feedback: created.feedback,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    console.error('Create platform feedback error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error submitting feedback',
    });
  }
};

// @desc    Get platform rating stats
// @route   GET /api/platform-feedback/stats
// @access  Public
export const getPlatformFeedbackStats = async (req, res) => {
  try {
    const stats = await PlatformFeedback.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalCount: { $sum: 1 },
        },
      },
    ]);

    const avg = Number(stats?.[0]?.avgRating || 0);
    const count = Number(stats?.[0]?.totalCount || 0);

    res.status(200).json({
      success: true,
      data: {
        avgRating: Math.round(avg * 10) / 10,
        totalCount: count,
      },
    });
  } catch (error) {
    console.error('Get platform feedback stats error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching platform feedback stats',
    });
  }
};

// @desc    Admin list platform feedback
// @route   GET /api/platform-feedback/admin
// @access  Private (admin)
export const adminListPlatformFeedback = async (req, res) => {
  try {
    const pageNum = Math.max(parsePositiveInt(req.query?.page, 1), 1);
    const limitNum = Math.min(Math.max(parsePositiveInt(req.query?.limit, 50), 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [rows, total] = await Promise.all([
      PlatformFeedback.find({})
        .populate('user', 'name email phone role isActive createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PlatformFeedback.countDocuments({}),
    ]);

    const ownerIds = (rows || [])
      .map((row) => row?.user)
      .filter((u) => u && typeof u === 'object' && String(u?.role) === 'business_owner')
      .map((u) => String(u?._id))
      .filter(Boolean);

    const uniqueOwnerIds = Array.from(new Set(ownerIds));

    const businesses = uniqueOwnerIds.length
      ? await Business.find({ owner: { $in: uniqueOwnerIds.map((id) => new mongoose.Types.ObjectId(id)) } })
          .select('_id owner name slug isActive')
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const businessByOwner = new Map();
    for (const b of businesses) {
      const key = String(b?.owner);
      if (!key) continue;
      if (!businessByOwner.has(key)) {
        businessByOwner.set(key, {
          _id: b?._id,
          name: b?.name,
          slug: b?.slug,
          isActive: b?.isActive,
        });
      }
    }

    const enriched = (rows || []).map((row) => {
      const u = row?.user;
      const ownerKey = u && typeof u === 'object' ? String(u?._id) : '';
      const business = ownerKey ? businessByOwner.get(ownerKey) : undefined;
      return {
        ...row,
        ...(business ? { business } : {}),
      };
    });

    res.status(200).json({
      success: true,
      data: {
        feedback: enriched,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error('Admin list platform feedback error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching platform feedback',
    });
  }
};
