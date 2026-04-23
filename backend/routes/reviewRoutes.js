import express from 'express';
import { reviewController } from '../controllers/index.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * REVIEW ROUTES
 * Base: /api/reviews
 */

router.get('/business/:slug/summary', reviewController.getReviewSummaryBySlug);
router.get('/business/:slug', reviewController.getReviewsBySlug);
router.post('/business/:slug', protect, authorize('customer'), reviewController.createReviewBySlug);

export default router;
