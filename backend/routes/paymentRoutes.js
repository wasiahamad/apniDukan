import express from 'express';
import { paymentController } from '../controllers/index.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * PAYMENT ROUTES
 * Base: /api/payments
 */

// Razorpay (public key)
router.get('/razorpay/key', paymentController.getRazorpayKey);

// Razorpay order + verification
router.post('/razorpay/order', protect, authorize('business_owner', 'admin'), paymentController.createRazorpayOrder);
router.post(
  '/razorpay/verify',
  protect,
  authorize('business_owner', 'admin'),
  paymentController.verifyRazorpayPaymentAndActivatePlan,
);

// Admin revenue analytics (subscription invoices)
router.get('/admin/revenue', protect, authorize('admin'), paymentController.getAdminRevenueSummary);

export default router;
