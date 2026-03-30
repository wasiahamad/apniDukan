import { BookingSlot, Business } from '../models/index.js';
import { getEffectiveEntitlementsForBusiness } from '../services/entitlementsService.js';

/**
 * BOOKING CONTROLLER - Appointment/slot management
 * For: Salons, Coaching, Doctors, Consultations, Rental visits
 * CRITICAL: Multi-tenant scoped
 */

// @desc    Create booking slot(s)
// @route   POST /api/bookings
// @access  Private (business owner)
export const createBookingSlot = async (req, res) => {
  try {
    const { businessId, listing, date, startTime, endTime, duration, price, notes } = req.body;

    // Verify business ownership
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create slots for this business',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not enabled in your plan. Please upgrade.',
      });
    }

    const slot = await BookingSlot.create({
      business: businessId,
      listing,
      date,
      startTime,
      endTime,
      duration,
      price,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Booking slot created successfully',
      data: slot,
    });
  } catch (error) {
    console.error('Create booking slot error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating booking slot',
    });
  }
};

// @desc    Create multiple slots for a day
// @route   POST /api/bookings/bulk
// @access  Private (business owner)
export const createBulkSlots = async (req, res) => {
  try {
    const { businessId, date, startTime, endTime, slotDuration } = req.body;

    // Verify business ownership
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create slots for this business',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not enabled in your plan. Please upgrade.',
      });
    }

    const slots = await BookingSlot.createDaySlots(businessId, date, startTime, endTime, slotDuration);

    res.status(201).json({
      success: true,
      message: `${slots.length} slots created successfully`,
      data: slots,
    });
  } catch (error) {
    console.error('Create bulk slots error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating bulk slots',
    });
  }
};

// @desc    Get available slots for a business on a date
// @route   GET /api/bookings/available/:businessId
// @access  Public
export const getAvailableSlots = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    const business = await Business.findById(businessId);
    if (!business || !business.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not available for this business',
      });
    }

    const slots = await BookingSlot.getAvailableSlots(businessId, date);

    res.status(200).json({
      success: true,
      data: slots,
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching available slots',
    });
  }
};

// @desc    Book a slot
// @route   POST /api/bookings/:id/book
// @access  Public (or Private for logged-in users)
export const bookSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, customerPhone, customerEmail, customerNotes } = req.body;

    const resolvedCustomerName = customerName || req.user?.name;
    const resolvedCustomerPhone = customerPhone || req.user?.phone;
    const resolvedCustomerEmail = customerEmail || req.user?.email;

    if (!resolvedCustomerName) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required',
      });
    }
    if (!resolvedCustomerPhone && !resolvedCustomerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Customer phone or email is required',
      });
    }

    const slot = await BookingSlot.findById(id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found',
      });
    }

    const business = await Business.findById(slot.business);
    if (!business || !business.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not available for this business',
      });
    }

    // Book the slot using model method
    await slot.book(
      {
        name: resolvedCustomerName,
        phone: resolvedCustomerPhone,
        email: resolvedCustomerEmail,
        notes: customerNotes,
      },
      req.user?._id // Optional user ID if logged in
    );

    const bookedSlot = await BookingSlot.findById(id).populate('business', 'name phone whatsapp');

    res.status(200).json({
      success: true,
      message: 'Slot booked successfully',
      data: bookedSlot,
    });
  } catch (error) {
    console.error('Book slot error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error booking slot',
    });
  }
};

// @desc    Get logged-in user's bookings (customer view)
// @route   GET /api/bookings/my
// @access  Private
export const getMyBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const filters = [{ bookedBy: req.user._id }];
    if (req.user.email) filters.push({ customerEmail: req.user.email });
    if (req.user.phone) filters.push({ customerPhone: req.user.phone });

    const query = { $or: filters };
    if (status) query.status = status;

    const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      BookingSlot.find(query)
        .populate('business', 'name slug phone whatsapp logo')
        .populate('listing', 'title price')
        .sort({ date: -1, startTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BookingSlot.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching my bookings',
    });
  }
};

// @desc    Cancel booking
// @route   POST /api/bookings/:id/cancel
// @access  Private (owner or admin)
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const slot = await BookingSlot.findById(id).populate('business', 'owner');
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check ownership
    if (
      slot.business.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking',
      });
    }

    const businessId = slot.business?._id || slot.business;
    const business = await Business.findById(businessId);
    if (!business || !business.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not enabled in your plan. Please upgrade.',
      });
    }

    await slot.cancel();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: slot,
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error cancelling booking',
    });
  }
};

// @desc    Get all bookings for a business
// @route   GET /api/bookings/business/:businessId
// @access  Private (owner only)
export const getBusinessBookings = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date, status, page = 1, limit = 50 } = req.query;

    // Verify business ownership
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view bookings',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not enabled in your plan. Please upgrade.',
      });
    }

    // Build query
    const query = { business: businessId };
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      BookingSlot.find(query)
        .populate('listing', 'title')
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      BookingSlot.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get business bookings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching bookings',
    });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private (owner only)
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const slot = await BookingSlot.findById(id).populate('business', 'owner');
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check ownership
    if (
      slot.business.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking',
      });
    }

    const businessId = slot.business?._id || slot.business;
    const business = await Business.findById(businessId);
    if (!business || !business.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not enabled in your plan. Please upgrade.',
      });
    }

    slot.status = status;
    await slot.save();

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      data: slot,
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating booking status',
    });
  }
};

// @desc    Get booking stats
// @route   GET /api/bookings/business/:businessId/stats
// @access  Private (owner only)
export const getBookingStats = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify business ownership
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view stats',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not enabled in your plan. Please upgrade.',
      });
    }

    const stats = await BookingSlot.getStats(businessId, startDate, endDate);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching booking stats',
    });
  }
};
