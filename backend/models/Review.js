import mongoose from 'mongoose';

/**
 * REVIEW MODEL
 * Public customer reviews for a Business storefront.
 */

const reviewSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business reference is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    customerName: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    metadata: {
      userAgent: { type: String },
      ipAddress: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ business: 1, createdAt: -1 });
reviewSchema.index({ business: 1, rating: -1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
