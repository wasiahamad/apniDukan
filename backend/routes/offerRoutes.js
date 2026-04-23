import express from 'express';
import { offerController } from '../controllers/index.js';
import { protect } from '../middleware/auth.js';
import { requireVerifiedBusinessOwnerForWrites } from '../middleware/verificationGate.js';
import { requireOwnerFeature } from '../middleware/entitlements.js';

const router = express.Router();

/**
 * OFFER ROUTES
 * Base: /api/offers
 */

// Public routes
router.get('/public/business/:businessId', offerController.getPublicOffersByBusiness);

// Owner routes
router.get('/my', protect, requireOwnerFeature('offersEnabled'), offerController.getMyOffers);
router.post('/', protect, requireVerifiedBusinessOwnerForWrites, requireOwnerFeature('offersEnabled'), offerController.createOffer);
router.put('/:id', protect, requireVerifiedBusinessOwnerForWrites, requireOwnerFeature('offersEnabled'), offerController.updateOffer);
router.delete('/:id', protect, requireVerifiedBusinessOwnerForWrites, requireOwnerFeature('offersEnabled'), offerController.deleteOffer);

export default router;
