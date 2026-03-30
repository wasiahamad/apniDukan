import mongoose from 'mongoose';
import { Business, Review } from '../models/index.js';
import { getEffectiveEntitlementsForBusiness } from '../services/entitlementsService.js';

const DEMO_SHOP_SLUG = 'ram-kirana-store';

const normalizeSlug = (slug) => String(slug || '').toLowerCase().trim();

const getPublicBusinessBySlugOrThrow = async (slug) => {
  const normalizedSlug = normalizeSlug(slug);

  const business = await Business.findOne({ slug: normalizedSlug, isActive: true }).populate('plan');
  if (!business) {
    const error = new Error('Business not found');
    error.statusCode = 404;
    throw error;
  }

  if (normalizedSlug !== DEMO_SHOP_SLUG) {
    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements?.features?.publicShopEnabled !== true) {
      const error = new Error('Shop not available');
      error.statusCode = 404;
      throw error;
    }
  }

  return business;
};

// @desc    Get review summary by business slug
// @route   GET /api/reviews/business/:slug/summary
// @access  Public
export const getReviewSummaryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const business = await getPublicBusinessBySlugOrThrow(slug);

    const stats = await Review.aggregate([
      { $match: { business: new mongoose.Types.ObjectId(business._id) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          reviewsCount: { $sum: 1 },
        },
      },
    ]);

    const avg = Number(stats?.[0]?.avgRating || 0);
    const count = Number(stats?.[0]?.reviewsCount || 0);

    res.status(200).json({
      success: true,
      data: {
        avgRating: Math.round(avg * 10) / 10,
        reviewsCount: count,
      },
    });
  } catch (error) {
    console.error('Get review summary error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching review summary',
    });
  }
};

// @desc    Get reviews list by business slug
// @route   GET /api/reviews/business/:slug
// @access  Public
export const getReviewsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 10 } = req.query;

    const business = await getPublicBusinessBySlugOrThrow(slug);

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const reviews = await Review.find({ business: business._id })
      .select('customerName rating comment createdAt')
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching reviews',
    });
  }
};

// @desc    Create a review for business slug
// @route   POST /api/reviews/business/:slug
// @access  Public
export const createReviewBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const business = await getPublicBusinessBySlugOrThrow(slug);

    const ratingRaw = req.body?.rating;
    const rating = Number(ratingRaw);

    if (!Number.isFinite(rating) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    const customerName = String(req.body?.customerName || '').trim();
    const comment = String(req.body?.comment || '').trim();

    const created = await Review.create({
      business: business._id,
      rating,
      ...(customerName ? { customerName } : {}),
      ...(comment ? { comment } : {}),
      metadata: {
        userAgent: req.get('user-agent') || undefined,
        ipAddress: req.ip || undefined,
      },
    });

    const payload = created.toObject ? created.toObject() : created;

    res.status(201).json({
      success: true,
      message: 'Review submitted',
      data: {
        _id: payload._id,
        customerName: payload.customerName,
        rating: payload.rating,
        comment: payload.comment,
        createdAt: payload.createdAt,
      },
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error creating review',
    });
  }
};
