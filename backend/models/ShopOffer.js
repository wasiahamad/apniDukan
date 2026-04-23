import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      trim: true,
    },
    linkUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const bogoSchema = new mongoose.Schema(
  {
    buyQty: {
      type: Number,
      min: 1,
      default: 1,
    },
    getQty: {
      type: Number,
      min: 1,
      default: 1,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    labelHi: {
      type: String,
      trim: true,
      maxlength: 120,
    },
  },
  { _id: false }
);

const shopOfferSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Offer title is required'],
      trim: true,
      maxlength: 120,
    },
    titleHi: {
      type: String,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 600,
    },
    descriptionHi: {
      type: String,
      trim: true,
      maxlength: 600,
    },

    type: {
      type: String,
      enum: ['bogo', 'discount_percent', 'discount_flat', 'custom'],
      default: 'custom',
      index: true,
    },

    percentOff: {
      type: Number,
      min: 0,
      max: 100,
    },
    amountOff: {
      type: Number,
      min: 0,
    },

    bogo: {
      type: bogoSchema,
    },

    banner: {
      type: bannerSchema,
    },

    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
      index: true,
    },

    validFrom: {
      type: Date,
    },
    validUntil: {
      type: Date,
    },

    appliesToAllBusinesses: {
      type: Boolean,
      default: true,
    },

    businessIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Business',
      default: undefined,
    },

    // Optional: tie offer to a specific listing (product/service/etc.)
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: undefined,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

shopOfferSchema.virtual('isCurrentlyValid').get(function () {
  if (this.isActive !== true) return false;
  if (this.status !== 'active') return false;

  const now = new Date();
  if (this.validFrom && now < this.validFrom) return false;
  if (this.validUntil && now > this.validUntil) return false;
  return true;
});

shopOfferSchema.pre('save', function (next) {
  if (this.validUntil && this.validFrom && this.validUntil < this.validFrom) {
    return next(new Error('validUntil must be after validFrom'));
  }

  if (this.type === 'discount_percent' && typeof this.percentOff !== 'number') {
    return next(new Error('percentOff is required for discount_percent offers'));
  }

  if (this.type === 'discount_flat' && typeof this.amountOff !== 'number') {
    return next(new Error('amountOff is required for discount_flat offers'));
  }

  if (this.type === 'bogo') {
    if (!this.bogo) {
      this.bogo = { buyQty: 1, getQty: 1 };
    }
    if (!this.bogo.buyQty) this.bogo.buyQty = 1;
    if (!this.bogo.getQty) this.bogo.getQty = 1;
  }

  return next();
});

shopOfferSchema.index({ owner: 1, isActive: 1, status: 1, validFrom: 1, validUntil: 1 });
shopOfferSchema.index({ createdAt: -1 });

shopOfferSchema.set('toJSON', { virtuals: true });
shopOfferSchema.set('toObject', { virtuals: true });

const ShopOffer = mongoose.model('ShopOffer', shopOfferSchema);

export default ShopOffer;
