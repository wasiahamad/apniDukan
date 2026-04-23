import mongoose from 'mongoose';

/**
 * STORY MODEL
 * - kind: 'story' expires in 24 hours (TTL via expiresAt)
 * - kind: 'reel' does not expire (expiresAt omitted)
 */

const storySchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    kind: {
      type: String,
      enum: ['story', 'reel'],
      default: 'story',
      index: true,
    },
    mediaUrl: {
      type: String,
      required: true,
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
      index: true,
    },
    caption: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    // Optional: duration override for story playback (primarily for image stories)
    durationSec: {
      type: Number,
      min: 1,
      max: 60,
      default: null,
    },
    // Optional: attach a link (shop or product URL)
    linkUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// NOTE: We intentionally do NOT use a MongoDB TTL index for expiresAt.
// Expired stories are hidden via query filtering, but records remain for backup/audit.

// Common feed indexes
storySchema.index({ kind: 1, createdAt: -1 });
storySchema.index({ business: 1, kind: 1, createdAt: -1 });
storySchema.index({ isDeleted: 1, kind: 1, createdAt: -1 });

export default mongoose.model('Story', storySchema);
