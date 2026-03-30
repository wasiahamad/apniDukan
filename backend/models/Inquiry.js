import mongoose from 'mongoose';

/**
 * INQUIRY MODEL - Lightweight replacement for heavy Order logic
 * Purpose: Track WhatsApp/Call/Form-based customer inquiries
 * Multi-tenant: Every inquiry belongs to a business
 * Flexible: Works with or without specific listing reference
 */

const inquirySchema = new mongoose.Schema(
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
      // Optional - inquiry can be general or listing-specific
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    customerEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: ['whatsapp', 'call', 'form', 'chat'],
      required: [true, 'Inquiry type is required'],
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'in_progress', 'converted', 'closed', 'spam'],
      default: 'new',
    },
    // Additional context
    source: {
      type: String,
      enum: ['website', 'mobile_app', 'api', 'manual'],
      default: 'website',
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
      referrer: String,
    },
    notes: [
      {
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        note: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    respondedAt: Date,
    closedAt: Date,
  },
  {
    timestamps: true,
  }
);

// CRITICAL INDEXES for multi-tenant queries
inquirySchema.index({ business: 1, status: 1 });
inquirySchema.index({ business: 1, createdAt: -1 });
inquirySchema.index({ business: 1, type: 1 });
inquirySchema.index({ listing: 1 });
inquirySchema.index({ customerPhone: 1 });
inquirySchema.index({ status: 1, createdAt: -1 });

// Method to add note
inquirySchema.methods.addNote = async function (userId, noteText) {
  this.notes.push({
    addedBy: userId,
    note: noteText,
  });
  await this.save();
};

// Method to update status
inquirySchema.methods.updateStatus = async function (newStatus, userId = null) {
  this.status = newStatus;

  if (newStatus === 'contacted' && !this.respondedAt) {
    this.respondedAt = new Date();
  }

  if (['converted', 'closed', 'spam'].includes(newStatus) && !this.closedAt) {
    this.closedAt = new Date();
  }

  await this.save();
};

// Static method to get inquiries by business (multi-tenant scoped)
inquirySchema.statics.getByBusiness = async function (businessId, filters = {}) {
  const query = { business: businessId, ...filters };
  return await this.find(query)
    .populate('listing', 'title listingType')
    .populate('notes.addedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();
};

// Static method to get inquiry stats
inquirySchema.statics.getStats = async function (businessId) {
  const stats = await this.aggregate([
    { $match: { business: new mongoose.Types.ObjectId(businessId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    new: 0,
    contacted: 0,
    in_progress: 0,
    converted: 0,
    closed: 0,
    spam: 0,
  };

  stats.forEach((stat) => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

const Inquiry = mongoose.model('Inquiry', inquirySchema);

export default Inquiry;
