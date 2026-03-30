import { Business } from '../models/index.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Restrict unverified dukandar to support-only actions for mutating endpoints.
export const requireVerifiedBusinessOwnerForWrites = async (req, res, next) => {
  try {
    if (!MUTATING_METHODS.has(String(req.method || '').toUpperCase())) return next();
    if (!req.user || req.user.role !== 'business_owner') return next();

    // Support remains accessible while verification is pending.
    if (req.baseUrl?.startsWith('/api/support')) return next();

    // Allow owners with no business yet (onboarding flow).
    const ownerBusiness = await Business.findOne({ owner: req.user._id })
      .select('_id isVerified isActive')
      .lean();
    if (!ownerBusiness) return next();

    if (!ownerBusiness.isVerified || ownerBusiness.isActive === false) {
      return res.status(403).json({
        success: false,
        code: 'BUSINESS_NOT_VERIFIED',
        message: 'Business verification pending. Only support access is allowed until admin verification.',
      });
    }

    return next();
  } catch (error) {
    console.error('Verification gate middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating business verification',
    });
  }
};
