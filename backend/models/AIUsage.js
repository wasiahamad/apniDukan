import mongoose from 'mongoose';

/**
 * AI USAGE MODEL
 * Tracks daily AI usage per identifier (userId or IP) and action.
 */

const aiUsageSchema = new mongoose.Schema(
  {
    actorType: {
      type: String,
      enum: ['public', 'user'],
      required: true,
      index: true,
    },
    identifier: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    dateKey: {
      // IST date string, e.g. 2026-04-19
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['all', 'chat', 'generate', 'insights'],
      required: true,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

aiUsageSchema.index({ actorType: 1, identifier: 1, dateKey: 1, action: 1 }, { unique: true });

const AIUsage = mongoose.model('AIUsage', aiUsageSchema);

export default AIUsage;
