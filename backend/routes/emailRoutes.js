import express from 'express';
import {
  sendBookingConfirmation,
  sendContact,
  sendNearbyShops,
  sendOrderConfirmation,
  sendOtp,
  sendPlanNotification,
  sendReferralEmails,
  sendTest,
} from '../controllers/emailController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public endpoint (contact form flow)
router.post('/contact', sendContact);

// Protected endpoints (admin/testing operations)
router.post('/test', protect, authorize('admin'), sendTest);
router.post('/otp', protect, authorize('admin'), sendOtp);
router.post('/order-confirmation', protect, authorize('admin'), sendOrderConfirmation);
router.post('/booking-confirmation', protect, authorize('admin'), sendBookingConfirmation);
router.post('/plan-notification', protect, authorize('admin'), sendPlanNotification);
router.post('/nearby-shops', protect, authorize('admin'), sendNearbyShops);
router.post('/referral', protect, authorize('admin'), sendReferralEmails);

export default router;
