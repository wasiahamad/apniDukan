import mongoose from 'mongoose';

/**
 * CONTACT MESSAGE MODEL
 * Messages submitted from public contact form.
 */

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, 'Name is required'],
      maxlength: 120,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: [true, 'Email is required'],
      maxlength: 120,
    },
    message: {
      type: String,
      trim: true,
      required: [true, 'Message is required'],
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
      index: true,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      userAgent: { type: String, trim: true, maxlength: 400 },
      ipAddress: { type: String, trim: true, maxlength: 120 },
      source: {
        type: String,
        enum: ['publicWebsite', 'unknown'],
        default: 'publicWebsite',
      },
    },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

export default ContactMessage;
