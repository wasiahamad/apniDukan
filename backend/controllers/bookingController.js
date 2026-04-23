import mongoose from 'mongoose';
import { BookingSlot, BookingSlotTemplate, Business, BusinessType, Listing } from '../models/index.js';
import { getEffectiveEntitlementsForBusiness } from '../services/entitlementsService.js';

/**
 * BOOKING CONTROLLER - Appointment/slot management
 * For: Salons, Coaching, Doctors, Consultations, Rental visits
 * CRITICAL: Multi-tenant scoped
 */

const generateSlotsFromTemplate = ({ startTime, endTime, duration }) => {
  const slotDuration = Number(duration);
  if (!startTime || !endTime || !Number.isFinite(slotDuration) || slotDuration <= 0) return [];

  const slots = [];
  let current = startTime;
  while (current < endTime) {
    const [hours, minutes] = current.split(':').map(Number);
    const nextHours = hours + Math.floor((minutes + slotDuration) / 60);
    const nextMinutes = (minutes + slotDuration) % 60;
    const next = `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;

    if (next <= endTime) {
      slots.push({ startTime: current, endTime: next, duration: slotDuration });
    }
    current = next;
  }
  return slots;
};

const getDayBounds = (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return { startOfDay, endOfDay };
};

const resolveCustomerLocationFromUser = (user) => {
  const coords = user?.currentLocation?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { type: 'Point', coordinates: [lng, lat] };
};

const resolveDefaultTimings = async (business) => {
  const globalDefault = { startTime: '10:00', endTime: '18:00', duration: 30 };
  if (!business?.businessType) return globalDefault;
  const bt = await BusinessType.findById(business.businessType)
    .select('defaultBookingTimings ownerCanEditBookingTimings')
    .lean();
  const t = bt?.defaultBookingTimings || {};
  const startTime = String(t?.startTime || '').trim() || globalDefault.startTime;
  const endTime = String(t?.endTime || '').trim() || globalDefault.endTime;
  const duration = Number(t?.duration);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : globalDefault.duration;
  return {
    startTime,
    endTime,
    duration: safeDuration,
    ownerCanEditBookingTimings: bt?.ownerCanEditBookingTimings === true,
  };
};

// @desc    Replace slot templates for a business (recurring timings, no date)
// @route   POST /api/bookings/templates/replace
// @access  Private (business owner)
export const replaceSlotTemplates = async (req, res) => {
  try {
    const { businessId, listing, startTime, endTime, slotDuration, duration, price, notes } = req.body;

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update templates for this business' });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (req.user?.role !== 'admin' && entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({ success: false, message: 'Bookings are not enabled for this business' });
    }
    if (entitlements.planIsActive !== true) {
      return res.status(403).json({ success: false, message: 'Your subscription is not active. Please renew to use bookings.' });
    }

    // Permission: admin can always set; owners need businessType permission or admin-granted override.
    if (req.user?.role !== 'admin') {
      const defaults = await resolveDefaultTimings(business);
      const canEditByType = defaults.ownerCanEditBookingTimings === true;
      const canEditByOverride = business.bookingTimingsOverrideEnabled === true;
      if (!canEditByType && !canEditByOverride) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to change booking timings. Please contact support.',
        });
      }
    }

    const resolvedDuration = Number(slotDuration ?? duration);
    if (!startTime || !endTime || !Number.isFinite(resolvedDuration) || resolvedDuration <= 0) {
      return res.status(400).json({ success: false, message: 'startTime, endTime and slotDuration are required' });
    }
    if (String(startTime) >= String(endTime)) {
      return res.status(400).json({ success: false, message: 'startTime must be before endTime' });
    }

    // Soft delete existing templates for backup/audit.
    await BookingSlotTemplate.updateMany(
      { business: businessId, isDeleted: { $ne: true } },
      {
        $set: {
          isActive: false,
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user?._id || null,
        },
      }
    );
    const tpl = await BookingSlotTemplate.create({
      business: businessId,
      listing: listing || undefined,
      startTime,
      endTime,
      duration: resolvedDuration,
      price: Number.isFinite(Number(price)) ? Number(price) : undefined,
      notes: notes || undefined,
      isActive: true,
      isDeleted: false,
    });

    return res.status(200).json({ success: true, message: 'Slot timings saved', data: [tpl] });
  } catch (error) {
    console.error('Replace slot templates error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error saving slot timings' });
  }
};

// @desc    Get slot templates for a business
// @route   GET /api/bookings/templates/business/:businessId
// @access  Private (business owner)
export const getSlotTemplatesForBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view templates for this business' });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (req.user?.role !== 'admin' && entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({ success: false, message: 'Bookings are not enabled for this business' });
    }

    const templates = await BookingSlotTemplate.find({ business: businessId, isActive: true, isDeleted: { $ne: true } })
      .select('_id startTime endTime duration price notes')
      .sort({ startTime: 1 })
      .lean();

    return res.status(200).json({ success: true, data: templates });
  } catch (error) {
    console.error('Get slot templates error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching templates' });
  }
};

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
    if (req.user?.role !== 'admin' && entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not enabled for this business',
      });
    }
    if (entitlements.planIsActive !== true) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please renew to use bookings.',
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
    if (req.user?.role !== 'admin' && entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not enabled for this business',
      });
    }
    if (entitlements.planIsActive !== true) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please renew to use bookings.',
      });
    }

    // Prevent accidental duplicate generation for the same day.
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const existingCount = await BookingSlot.countDocuments({
      business: businessId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });
    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Slots already exist for this date. Please choose another date.',
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
    if (!business || !business.isActive || business.isVerified === false) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not available for this business',
      });
    }
    if (entitlements.planIsActive !== true) {
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

// @desc    Get available slots for a business on a date (by slug)
// @route   GET /api/bookings/available/slug/:slug
// @access  Public
export const getAvailableSlotsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    const business = await Business.findOne({ slug }).lean();
    if (!business || !business.isActive || business.isVerified === false) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not available for this business',
      });
    }
    if (entitlements.planIsActive !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not available for this business',
      });
    }

    const slots = await BookingSlot.getAvailableSlots(business._id, date);
    return res.status(200).json({
      success: true,
      data: slots,
    });
  } catch (error) {
    console.error('Get available slots by slug error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching available slots',
    });
  }
};

// @desc    Get all slots (available + booked) for a business on a date (by slug)
//          NOTE: Does not expose customer PII.
// @route   GET /api/bookings/slots/slug/:slug
// @access  Public
export const getSlotsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    const business = await Business.findOne({ slug }).lean();
    if (!business || !business.isActive || business.isVerified === false) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not available for this business',
      });
    }
    if (entitlements.planIsActive !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not available for this business',
      });
    }

    const { startOfDay, endOfDay } = getDayBounds(date);

    // If templates exist, generate slots for the requested date.
    const templates = await BookingSlotTemplate.find({ business: business._id, isActive: true })
      .select('_id startTime endTime duration')
      .sort({ startTime: 1 })
      .lean();

    const existing = await BookingSlot.find({
      business: business._id,
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .select('_id date startTime endTime isBooked status duration')
      .sort({ startTime: 1 })
      .lean();

    // Fallback to businessType defaults when no templates exist.
    const hasTemplates = templates && templates.length > 0;
    const defaultTimings = !hasTemplates ? await resolveDefaultTimings(business) : null;
    const sources = hasTemplates
      ? templates.map((t) => ({ startTime: t.startTime, endTime: t.endTime, duration: t.duration }))
      : [{ startTime: defaultTimings.startTime, endTime: defaultTimings.endTime, duration: defaultTimings.duration }];

    const byWindow = new Map();
    existing.forEach((s) => byWindow.set(`${s.startTime}-${s.endTime}`, s));

    const computed = [];
    sources.forEach((t) => {
      const gen = generateSlotsFromTemplate({ startTime: t.startTime, endTime: t.endTime, duration: t.duration });
      gen.forEach((g) => {
        const key = `${g.startTime}-${g.endTime}`;
        const found = byWindow.get(key);
        const isBooked = !!found?.isBooked || String(found?.status || '') === 'booked';
        computed.push({
          _id: String(found?._id || key),
          date: found?.date || startOfDay,
          startTime: g.startTime,
          endTime: g.endTime,
          duration: g.duration,
          isBooked,
          status: isBooked ? 'booked' : 'available',
        });
      });
    });

    computed.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
    return res.status(200).json({ success: true, data: computed });
  } catch (error) {
    console.error('Get slots by slug error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching slots',
    });
  }
};

// @desc    Book a slot by business slug + date + startTime (template-based)
// @route   POST /api/bookings/book/slug/:slug
// @access  Private (customer)
export const bookSlotBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { date, startTime, customerNotes, listingId, listing } = req.body;

    const parseLocalDateTime = (dateStr, timeStr) => {
      const ds = String(dateStr || '').trim();
      const ts = String(timeStr || '').trim();
      const [yy, mm, dd] = ds.split('-').map((n) => Number(n));
      const [hh, mi] = ts.split(':').map((n) => Number(n));
      if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
      if (!Number.isFinite(hh) || !Number.isFinite(mi)) return null;
      return new Date(yy, mm - 1, dd, hh, mi, 0, 0);
    };

    const resolvedCustomerName = String(req.user?.name || '').trim();
    const resolvedCustomerPhone = String(req.user?.phone || '').trim();
    const resolvedCustomerEmail = String(req.user?.email || '').trim();

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }
    if (!startTime) {
      return res.status(400).json({ success: false, message: 'Start time is required' });
    }
    if (!resolvedCustomerName) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }
    if (!resolvedCustomerPhone && !resolvedCustomerEmail) {
      return res.status(400).json({ success: false, message: 'Customer phone or email is required' });
    }

    const business = await Business.findOne({ slug });
    if (!business || !business.isActive || business.isVerified === false) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const requestedListingId = String(listingId || listing || '').trim();
    let requestedListingDoc = null;
    if (requestedListingId) {
      if (!mongoose.Types.ObjectId.isValid(requestedListingId)) {
        return res.status(400).json({ success: false, message: 'Invalid item selected' });
      }
      requestedListingDoc = await Listing.findOne({ _id: requestedListingId, business: business._id })
        .select('_id')
        .lean();
      if (!requestedListingDoc) {
        return res.status(400).json({ success: false, message: 'Invalid item selected' });
      }
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({ success: false, message: 'Bookings are not available for this business' });
    }
    if (entitlements.planIsActive !== true) {
      return res.status(403).json({ success: false, message: 'Bookings are not available for this business' });
    }

    const templates = await BookingSlotTemplate.find({ business: business._id, isActive: true })
      .select('startTime endTime duration listing price notes')
      .sort({ startTime: 1 })
      .lean();

    const hasTemplates = templates && templates.length > 0;
    const defaultTimings = !hasTemplates ? await resolveDefaultTimings(business) : null;

    // Find the matching slot window from templates or defaults.
    let match = null;
    if (hasTemplates) {
      for (const t of templates) {
        const generated = generateSlotsFromTemplate({ startTime: t.startTime, endTime: t.endTime, duration: t.duration });
        const found = generated.find((g) => g.startTime === startTime);
        if (found) {
          match = { ...found, listing: t.listing, price: t.price, notes: t.notes };
          break;
        }
      }
    } else {
      const generated = generateSlotsFromTemplate({
        startTime: defaultTimings.startTime,
        endTime: defaultTimings.endTime,
        duration: defaultTimings.duration,
      });
      const found = generated.find((g) => g.startTime === startTime);
      if (found) {
        match = { ...found, listing: null, price: null, notes: null };
      }
    }

    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid slot time for this business' });
    }

    const slotStart = parseLocalDateTime(date, match.startTime);
    if (slotStart && slotStart.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'This time slot has already passed' });
    }

    const { startOfDay, endOfDay } = getDayBounds(date);

    const customerLocation = resolveCustomerLocationFromUser(req.user);

    // Try to book an existing available slot for this day/time (supports legacy pre-generated slots).
    const updated = await BookingSlot.findOneAndUpdate(
      {
        business: business._id,
        date: { $gte: startOfDay, $lte: endOfDay },
        startTime: match.startTime,
        endTime: match.endTime,
        isBooked: false,
        status: 'available',
      },
      {
        $set: {
          isBooked: true,
          status: 'booked',
          customerName: resolvedCustomerName,
          customerPhone: resolvedCustomerPhone,
          customerEmail: resolvedCustomerEmail || null,
          customerNotes: customerNotes || null,
          ...(customerLocation ? { customerLocation } : {}),
          bookedAt: new Date(),
          bookedBy: req.user?._id || null,
          duration: match.duration,
          listing: requestedListingDoc?._id || match.listing || undefined,
          price: match.price,
          notes: match.notes,
        },
      },
      { new: true }
    );

    if (updated) {
      return res.status(200).json({ success: true, message: 'Slot booked successfully', data: updated });
    }

    // Otherwise create a booked slot record for this day/time.
    const slotDate = new Date(date);
    const created = await BookingSlot.create({
      business: business._id,
      listing: requestedListingDoc?._id || match.listing || undefined,
      date: slotDate,
      startTime: match.startTime,
      endTime: match.endTime,
      duration: match.duration,
      isBooked: true,
      status: 'booked',
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      customerEmail: resolvedCustomerEmail || null,
      customerNotes: customerNotes || null,
      ...(customerLocation ? { customerLocation } : {}),
      bookedAt: new Date(),
      bookedBy: req.user?._id || null,
      price: match.price,
      notes: match.notes,
    });

    return res.status(200).json({ success: true, message: 'Slot booked successfully', data: created });
  } catch (error) {
    // Duplicate means already booked for that day/time window.
    if (String(error?.code) === '11000') {
      return res.status(409).json({ success: false, message: 'This slot has already been booked' });
    }
    console.error('Book slot by slug error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error booking slot' });
  }
};

// @desc    Book a slot
// @route   POST /api/bookings/:id/book
// @access  Private (customer)
export const bookSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerNotes } = req.body;

    const resolvedCustomerName = String(req.user?.name || '').trim();
    const resolvedCustomerPhone = String(req.user?.phone || '').trim();
    const resolvedCustomerEmail = String(req.user?.email || '').trim();

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

    const slot = await BookingSlot.findById(id).lean();
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found',
      });
    }

    const business = await Business.findById(slot.business);
    if (!business || !business.isActive || business.isVerified === false) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not available for this business',
      });
    }
    if (entitlements.planIsActive !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not available for this business',
      });
    }

    const customerLocation = resolveCustomerLocationFromUser(req.user);

    // Atomic booking: prevent double booking under concurrency.
    const bookedSlot = await BookingSlot.findOneAndUpdate(
      { _id: id, isBooked: false, status: 'available' },
      {
        $set: {
          isBooked: true,
          status: 'booked',
          customerName: resolvedCustomerName,
          customerPhone: resolvedCustomerPhone,
          customerEmail: resolvedCustomerEmail || null,
          customerNotes: customerNotes || null,
          ...(customerLocation ? { customerLocation } : {}),
          bookedAt: new Date(),
          bookedBy: req.user?._id || null,
        },
      },
      { new: true }
    ).populate('business', 'name phone whatsapp');

    if (!bookedSlot) {
      return res.status(409).json({
        success: false,
        message: 'This slot has already been booked',
      });
    }

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
    if (req.user?.role !== 'admin' && entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not enabled for this business',
      });
    }
    if (entitlements.planIsActive !== true) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please renew to use bookings.',
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
    if (req.user?.role !== 'admin' && entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not enabled for this business',
      });
    }
    if (entitlements.planIsActive !== true) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please renew to use bookings.',
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
        .populate('bookedBy', 'name email phone')
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
    if (req.user?.role !== 'admin' && entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not enabled for this business',
      });
    }
    if (entitlements.planIsActive !== true) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please renew to use bookings.',
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
    if (req.user?.role !== 'admin' && entitlements?.features?.bookingEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Bookings are not enabled for this business',
      });
    }
    if (entitlements.planIsActive !== true) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please renew to use bookings.',
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
