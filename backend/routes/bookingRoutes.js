import express from 'express';
import { bookingController } from '../controllers/index.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * BOOKING ROUTES
 * Base: /api/bookings
 */

// Public routes
router.get('/available/:businessId', bookingController.getAvailableSlots);
router.post('/:id/book', optionalAuth, bookingController.bookSlot);

// Protected routes
router.post('/', protect, bookingController.createBookingSlot);
router.post('/bulk', protect, bookingController.createBulkSlots);
router.get('/my', protect, bookingController.getMyBookings);
router.get('/business/:businessId', protect, bookingController.getBusinessBookings);
router.get('/business/:businessId/stats', protect, bookingController.getBookingStats);
router.post('/:id/cancel', protect, bookingController.cancelBooking);
router.put('/:id/status', protect, bookingController.updateBookingStatus);

export default router;
