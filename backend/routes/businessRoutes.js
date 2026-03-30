import express from 'express';
import { businessController } from '../controllers/index.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import { requireVerifiedBusinessOwnerForWrites } from '../middleware/verificationGate.js';

const router = express.Router();

/**
 * BUSINESS ROUTES
 * Base: /api/business
 */

// Public routes
router.get('/slug/:slug', businessController.getBusinessBySlug);
router.post('/slug/:slug/track', businessController.trackBusinessAction);
router.get('/public/shops', businessController.getPublicShops);
router.get('/nearby', optionalAuth, businessController.getNearbyBusinesses);

// Protected static routes (MUST come before /:id)
router.post('/', protect, authorize('business_owner', 'admin'), businessController.createBusiness);
router.get('/my/businesses', protect, businessController.getMyBusinesses);
router.put('/location', protect, authorize('business_owner', 'admin'), businessController.saveMyBusinessLocation);

// Admin: create owner + business
router.post('/admin/create', protect, authorize('admin'), businessController.adminCreateBusinessWithOwner);

// Admin: business details + status controls
router.get('/admin/:id', protect, authorize('admin'), businessController.adminGetBusinessById);
router.patch('/admin/:id/status', protect, authorize('admin'), businessController.adminUpdateBusinessStatus);
router.patch('/admin/:id/plan', protect, authorize('admin'), businessController.adminUpdateBusinessPlan);

// Admin only - see ALL businesses
router.get('/', protect, authorize('admin'), businessController.getAllBusinesses);

// Dynamic :id routes (must be LAST to avoid swallowing static paths)
router.get('/:id/stats', protect, businessController.getBusinessStats);
router.get('/:id/entitlements', protect, businessController.getBusinessEntitlements);
router.get('/:id/distance', businessController.getBusinessDistance);
router.get('/:id', businessController.getBusinessById);
router.put('/:id', protect, requireVerifiedBusinessOwnerForWrites, businessController.updateBusiness);
router.delete('/:id', protect, requireVerifiedBusinessOwnerForWrites, businessController.deleteBusiness);

export default router;
