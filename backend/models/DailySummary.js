import mongoose from 'mongoose';

/**
 * DAILY SUMMARY MODEL
 * Stores generated AI insights for a business per day.
 */

const dailySummarySchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    dateKey: {
      // IST date string, e.g. 2026-04-19
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    summaryHi: {
      type: String,
      trim: true,
      maxlength: [4000, 'Summary cannot exceed 4000 characters'],
    },
    insights: {
      type: [String],
      default: [],
    },
    suggestions: {
      type: [String],
      default: [],
    },
    important: {
      type: Boolean,
      default: false,
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    inputSnapshot: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

dailySummarySchema.index({ business: 1, dateKey: 1 }, { unique: true });

const DailySummary = mongoose.model('DailySummary', dailySummarySchema);

export default DailySummary;
