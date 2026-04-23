import express from 'express';
import { bookingController } from '../controllers/index.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * BOOKING ROUTES
 * Base: /api/bookings
 */

// Public routes
router.get('/available/:businessId', bookingController.getAvailableSlots);
router.get('/available/slug/:slug', bookingController.getAvailableSlotsBySlug);
router.get('/slots/slug/:slug', bookingController.getSlotsBySlug);
router.post('/book/slug/:slug', protect, authorize('customer'), bookingController.bookSlotBySlug);
router.post('/:id/book', protect, authorize('customer'), bookingController.bookSlot);

// Protected routes
router.post('/', protect, bookingController.createBookingSlot);
router.post('/bulk', protect, bookingController.createBulkSlots);
router.post('/templates/replace', protect, bookingController.replaceSlotTemplates);
router.get('/templates/business/:businessId', protect, bookingController.getSlotTemplatesForBusiness);
router.get('/my', protect, bookingController.getMyBookings);
router.get('/business/:businessId', protect, bookingController.getBusinessBookings);
router.get('/business/:businessId/stats', protect, bookingController.getBookingStats);
router.post('/:id/cancel', protect, bookingController.cancelBooking);
router.put('/:id/status', protect, bookingController.updateBookingStatus);

export default router;
