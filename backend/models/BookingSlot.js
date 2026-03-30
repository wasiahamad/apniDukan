import mongoose from 'mongoose';

/**
 * BOOKING SLOT MODEL - For appointment-based businesses
 * Use cases: Salon, Coaching, Doctor, Consultation, Rental visits
 * Multi-tenant: Every booking belongs to a business
 */

const bookingSlotSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business reference is required'],
      index: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      // Optional - for service/course specific bookings
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      // Format: "HH:MM" (24-hour format)
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      // Format: "HH:MM" (24-hour format)
    },
    isBooked: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Customer details (if booked)
    customerName: String,
    customerPhone: String,
    customerEmail: String,
    customerNotes: String,
    // Booking details
    bookedAt: Date,
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'completed', 'cancelled', 'no_show'],
      default: 'available',
    },
    // Additional metadata
    price: {
      type: Number,
      min: 0,
    },
    duration: {
      type: Number, // in minutes
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// CRITICAL INDEXES
bookingSlotSchema.index({ business: 1, date: 1, isBooked: 1 });
bookingSlotSchema.index({ business: 1, status: 1 });
bookingSlotSchema.index({ date: 1, startTime: 1 });
bookingSlotSchema.index({ customerPhone: 1 });

// Compound index for finding available slots
bookingSlotSchema.index({
  business: 1,
  date: 1,
  isBooked: 1,
  status: 1,
});

// Method to book a slot
bookingSlotSchema.methods.book = async function (customerData, userId = null) {
  if (this.isBooked) {
    throw new Error('This slot is already booked');
  }

  this.isBooked = true;
  this.status = 'booked';
  this.customerName = customerData.name;
  this.customerPhone = customerData.phone;
  this.customerEmail = customerData.email || null;
  this.customerNotes = customerData.notes || null;
  this.bookedAt = new Date();
  this.bookedBy = userId;

  await this.save();
  return this;
};

// Method to cancel booking
bookingSlotSchema.methods.cancel = async function () {
  if (!this.isBooked) {
    throw new Error('This slot is not booked');
  }

  this.isBooked = false;
  this.status = 'available';
  this.customerName = null;
  this.customerPhone = null;
  this.customerEmail = null;
  this.customerNotes = null;
  this.bookedAt = null;
  this.bookedBy = null;

  await this.save();
  return this;
};

// Static method to get available slots for a business on a specific date
bookingSlotSchema.statics.getAvailableSlots = async function (businessId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await this.find({
    business: businessId,
    date: { $gte: startOfDay, $lte: endOfDay },
    isBooked: false,
    status: 'available',
  })
    .sort({ startTime: 1 })
    .lean();
};

// Static method to create multiple slots for a day
bookingSlotSchema.statics.createDaySlots = async function (
  businessId,
  date,
  startTime,
  endTime,
  slotDuration
) {
  const slots = [];
  let current = startTime;

  while (current < endTime) {
    const [hours, minutes] = current.split(':').map(Number);
    const nextHours = hours + Math.floor((minutes + slotDuration) / 60);
    const nextMinutes = (minutes + slotDuration) % 60;
    const next = `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;

    if (next <= endTime) {
      slots.push({
        business: businessId,
        date: new Date(date),
        startTime: current,
        endTime: next,
        duration: slotDuration,
      });
    }

    current = next;
  }

  return await this.insertMany(slots);
};

// Static method to get booking stats
bookingSlotSchema.statics.getStats = async function (businessId, startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        business: new mongoose.Types.ObjectId(businessId),
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$price' },
      },
    },
  ]);

  return stats;
};

const BookingSlot = mongoose.model('BookingSlot', bookingSlotSchema);

export default BookingSlot;
