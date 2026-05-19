import express from 'express';
import { reviewController } from '../controllers/index.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * REVIEW ROUTES
 * Base: /api/reviews
 */

router.get('/business/:slug/summary', reviewController.getReviewSummaryBySlug);
router.get('/business/:slug', reviewController.getReviewsBySlug);
// Storefront subdomains allow guest reviews; marketplace still requires customer login (enforced in controller).
router.post('/business/:slug', optionalAuth, reviewController.createReviewBySlug);

export default router;
