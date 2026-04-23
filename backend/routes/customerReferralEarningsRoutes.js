import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { customerReferralEarningsController } from '../controllers/index.js';

const router = express.Router();

// Customer
router.get('/me/summary', protect, authorize('customer'), customerReferralEarningsController.getMyCustomerReferralSummary);

// Admin
router.get('/admin/metrics', protect, authorize('admin'), customerReferralEarningsController.adminCustomerReferralMetrics);
router.get('/admin', protect, authorize('admin'), customerReferralEarningsController.adminListCustomerReferrals);

// Admin: Offers (commission %)
router.get('/admin/offers', protect, authorize('admin'), customerReferralEarningsController.adminListCustomerReferralOffers);
router.post('/admin/offers', protect, authorize('admin'), customerReferralEarningsController.adminCreateCustomerReferralOffer);
router.put('/admin/offers/:id', protect, authorize('admin'), customerReferralEarningsController.adminUpdateCustomerReferralOffer);
router.put('/admin/offers/:id/activate', protect, authorize('admin'), customerReferralEarningsController.adminActivateCustomerReferralOffer);
router.put('/admin/offers/:id/close', protect, authorize('admin'), customerReferralEarningsController.adminCloseCustomerReferralOffer);

export default router;
