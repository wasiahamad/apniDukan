import express from 'express';
import { orderController } from '../controllers/index.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import { requireOwnerFeature } from '../middleware/entitlements.js';

const router = express.Router();

// Public storefront order create
router.post('/public', optionalAuth, orderController.createPublicOrder);

// Public storefront: order count for a business (for public shop pages)
router.get('/public/business/:businessId/count', orderController.getPublicOrderCountByBusiness);

// Customer orders
router.get('/me', protect, authorize('customer'), orderController.getMyCustomerOrders);

// Owner orders
router.get(
	'/my/summary',
	protect,
	authorize('business_owner', 'admin'),
	requireOwnerFeature('ordersEnabled'),
	orderController.getMyOrdersSummary
);

// Owner orders list
router.get(
	'/my',
	protect,
	authorize('business_owner', 'admin'),
	requireOwnerFeature('ordersEnabled'),
	orderController.getMyOrders
);

// Admin orders list
router.get('/', protect, authorize('admin'), orderController.adminListOrders);

// Status update (owner/admin)
router.patch(
	'/:id/status',
	protect,
	authorize('business_owner', 'admin'),
	requireOwnerFeature('ordersEnabled'),
	orderController.updateOrderStatus
);

export default router;
