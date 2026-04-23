import mongoose from 'mongoose';

const customerReferralOfferSchema = new mongoose.Schema(
  {
    offerName: {
      type: String,
      required: [true, 'Offer name is required'],
      trim: true,
      maxlength: [100, 'Offer name cannot exceed 100 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // Commission percentage for customer wallet credits (e.g. 5 => 5%)
    commissionPercent: {
      type: Number,
      required: [true, 'Commission percent is required'],
      min: [0, 'Commission percent cannot be negative'],
      max: [100, 'Commission percent cannot exceed 100'],
    },

    // Status Management
    status: {
      type: String,
      enum: {
        values: ['draft', 'active', 'closed', 'archived'],
        message: '{VALUE} is not a valid status',
      },
      default: 'draft',
      index: true,
    },

    // Validity Period
    validFrom: {
      type: Date,
      default: Date.now,
    },

    validUntil: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Admin Information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

customerReferralOfferSchema.virtual('isCurrentlyValid').get(function () {
  const now = new Date();
  if (this.status !== 'active') return false;
  if (this.validFrom && now < this.validFrom) return false;
  if (this.validUntil && now > this.validUntil) return false;
  if (this.isActive !== true) return false;
  return true;
});

customerReferralOfferSchema.methods.activate = async function () {
  this.status = 'active';
  if (!this.validFrom) this.validFrom = new Date();
  await this.save();
};

customerReferralOfferSchema.methods.close = async function () {
  this.status = 'closed';
  await this.save();
};

customerReferralOfferSchema.statics.getActiveOffer = async function () {
  const now = new Date();
  return await this.findOne({
    status: 'active',
    isActive: true,
    $or: [
      { validFrom: { $lte: now }, validUntil: { $gte: now } },
      { validFrom: { $lte: now }, validUntil: null },
      { validFrom: { $lte: now }, validUntil: { $exists: false } },
    ],
  }).sort({ createdAt: -1 });
};

customerReferralOfferSchema.pre('save', function (next) {
  if (this.validUntil && this.validFrom && this.validUntil < this.validFrom) {
    return next(new Error('validUntil must be after validFrom'));
  }
  next();
});

customerReferralOfferSchema.index({ status: 1, isActive: 1 });
customerReferralOfferSchema.index({ validFrom: 1, validUntil: 1 });
customerReferralOfferSchema.index({ createdAt: -1 });

customerReferralOfferSchema.set('toJSON', { virtuals: true });
customerReferralOfferSchema.set('toObject', { virtuals: true });

const CustomerReferralOffer = mongoose.model('CustomerReferralOffer', customerReferralOfferSchema);

export default CustomerReferralOffer;
