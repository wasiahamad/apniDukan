import mongoose from 'mongoose';

/**
 * PLATFORM FEEDBACK MODEL
 * Platform-level rating & feedback (customer + dukandar/business_owner)
 */

const platformFeedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      enum: ['customer', 'business_owner'],
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5'],
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [2000, 'Feedback cannot exceed 2000 characters'],
      default: '',
    },
    metadata: {
      userAgent: { type: String, trim: true, maxlength: 400 },
      ipAddress: { type: String, trim: true, maxlength: 120 },
      source: {
        type: String,
        enum: ['publicWebsite', 'dukandarDashboard', 'unknown'],
        default: 'unknown',
      },
    },
  },
  {
    timestamps: true,
  }
);

platformFeedbackSchema.index({ createdAt: -1 });

const PlatformFeedback = mongoose.model('PlatformFeedback', platformFeedbackSchema);

export default PlatformFeedback;
