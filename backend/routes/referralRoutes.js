import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { requireOwnerFeature } from '../middleware/entitlements.js';
import {
  getActiveOffer,
  getMyReferralStats,
  setMyActiveReferralOffer,
  createReferral,
  requestReward,
  validateReferralPayment,
  getMyReferralHistory,
} from '../controllers/referralController.js';
import {
  createReferralOffer,
  getAllReferralOffers,
  getReferralOfferById,
  updateReferralOffer,
  activateReferralOffer,
  closeReferralOffer,
  getAllRewardRequests,
  approveRewardRequest,
  rejectRewardRequest,
  fulfillRewardRequest,
  getAllReferralsAdmin,
  getReferralTreeAdmin,
  getReferralDashboardStats,
} from '../controllers/adminReferralController.js';

const router = express.Router();

/**
 * PUBLIC ROUTES
 */
router.get('/offer/active', getActiveOffer);

/**
 * BUSINESS OWNER ROUTES (Protected)
 */
router.use(protect);

// My referral stats and history
router.get('/my/stats', authorize('business_owner'), requireOwnerFeature('referralsEnabled'), getMyReferralStats);
router.put('/my/active-offer', authorize('business_owner'), requireOwnerFeature('referralsEnabled'), setMyActiveReferralOffer);
router.get('/my/history', authorize('business_owner'), requireOwnerFeature('referralsEnabled'), getMyReferralHistory);

// Create referral (when someone uses my code)
router.post('/', authorize('business_owner'), requireOwnerFeature('referralsEnabled'), createReferral);

// Request reward
router.post('/request-reward', authorize('business_owner'), requireOwnerFeature('referralsEnabled'), requestReward);

// Payment validation
router.put('/:id/validate-payment', authorize('admin', 'business_owner'), validateReferralPayment);

/**
 * ADMIN ROUTES
 */
// Offer management
router.post('/admin/offers', authorize('admin'), createReferralOffer);
router.get('/admin/offers', authorize('admin'), getAllReferralOffers);
router.get('/admin/offers/:id', authorize('admin'), getReferralOfferById);
router.put('/admin/offers/:id', authorize('admin'), updateReferralOffer);
router.put('/admin/offers/:id/activate', authorize('admin'), activateReferralOffer);
router.put('/admin/offers/:id/close', authorize('admin'), closeReferralOffer);

// Reward request management
router.get('/admin/requests', authorize('admin'), getAllRewardRequests);
router.put('/admin/requests/:id/approve', authorize('admin'), approveRewardRequest);
router.put('/admin/requests/:id/reject', authorize('admin'), rejectRewardRequest);
router.put('/admin/requests/:id/fulfill', authorize('admin'), fulfillRewardRequest);

// Referrals listing
router.get('/admin/referrals', authorize('admin'), getAllReferralsAdmin);

// Referral tree
router.get('/admin/tree', authorize('admin'), getReferralTreeAdmin);

// Dashboard stats
router.get('/admin/stats', authorize('admin'), getReferralDashboardStats);

export default router;
