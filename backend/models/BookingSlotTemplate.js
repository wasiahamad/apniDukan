import mongoose from 'mongoose';

/**
 * BOOKING SLOT TEMPLATE MODEL
 * Stores recurring daily timings (no date) for a business.
 * Customers choose a date; slots are generated from templates for that day.
 */

const bookingSlotTemplateSchema = new mongoose.Schema(
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
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      // Format: "HH:MM" (24-hour)
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      // Format: "HH:MM" (24-hour)
    },
    duration: {
      type: Number,
      required: [true, 'Slot duration is required'],
      min: 1,
    },
    price: {
      type: Number,
      min: 0,
    },
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

bookingSlotTemplateSchema.index({ business: 1, isActive: 1 });
bookingSlotTemplateSchema.index({ business: 1, startTime: 1, endTime: 1, duration: 1 }, { unique: true });

const BookingSlotTemplate = mongoose.model('BookingSlotTemplate', bookingSlotTemplateSchema);

export default BookingSlotTemplate;
