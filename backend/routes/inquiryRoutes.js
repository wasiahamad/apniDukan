import express from 'express';
import { inquiryController } from '../controllers/index.js';
import { protect } from '../middleware/auth.js';
import { requireBusinessFeatureByIdParam, requireOwnerFeature } from '../middleware/entitlements.js';

const router = express.Router();

/**
 * INQUIRY ROUTES
 * Base: /api/inquiries
 */

// Public routes
router.post('/', inquiryController.createInquiry);

// Protected routes
router.get(
	'/business/:businessId',
	protect,
	requireBusinessFeatureByIdParam('businessId', 'inquiriesEnabled'),
	inquiryController.getInquiriesByBusiness
);
router.get(
	'/business/:businessId/stats',
	protect,
	requireBusinessFeatureByIdParam('businessId', 'inquiriesEnabled'),
	inquiryController.getInquiryStats
);
router.get('/:id', protect, requireOwnerFeature('inquiriesEnabled'), inquiryController.getInquiryById);
router.put(
	'/:id/status',
	protect,
	requireOwnerFeature('inquiriesEnabled'),
	inquiryController.updateInquiryStatus
);
router.post(
	'/:id/notes',
	protect,
	requireOwnerFeature('inquiriesEnabled'),
	inquiryController.addInquiryNote
);
router.delete(
	'/:id',
	protect,
	requireOwnerFeature('inquiriesEnabled'),
	inquiryController.deleteInquiry
);

export default router;
