import express from 'express';
import { listingController } from '../controllers/index.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { requireVerifiedBusinessOwnerForWrites } from '../middleware/verificationGate.js';

const router = express.Router();

/**
 * LISTING ROUTES
 * Base: /api/listings
 */

// Public static routes (MUST come before /:id)
router.get('/search', listingController.searchListings);
router.get('/featured', listingController.getFeaturedListings);
router.get('/public/business/:businessId', listingController.getPublicListingsByBusiness);

// Protected static routes (MUST come before /:id)
router.get('/my/listings', protect, listingController.getMyListings);           // user's own listings
router.get('/my/:id', protect, listingController.getMyListingById);            // single listing for owner
router.get('/business/:businessId', protect, listingController.getListingsByBusiness); // owner or admin
router.post('/', protect, requireVerifiedBusinessOwnerForWrites, listingController.createListing);

// Dynamic :id routes LAST
router.get('/:id', listingController.getListingById);
router.put('/:id', protect, requireVerifiedBusinessOwnerForWrites, listingController.updateListing);
router.delete('/:id', protect, requireVerifiedBusinessOwnerForWrites, listingController.deleteListing);

export default router;
