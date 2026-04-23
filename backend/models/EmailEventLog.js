import mongoose from 'mongoose';

const emailEventLogSchema = new mongoose.Schema(
  {
    dedupeKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      maxlength: 240,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      index: true,
    },
    status: {
      type: String,
      enum: ['sending', 'sent', 'failed'],
      default: 'sending',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAttemptAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    error: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true }
);

emailEventLogSchema.index({ type: 1, createdAt: -1 });

const EmailEventLog = mongoose.model('EmailEventLog', emailEventLogSchema);

export default EmailEventLog;
