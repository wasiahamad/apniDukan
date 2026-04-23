import mongoose from 'mongoose';

const customerReferralSchema = new mongoose.Schema(
  {
    // Customer who referred the business owner
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // The referred business owner (User)
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    referralCode: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['pending', 'active', 'rewarded'],
      default: 'pending',
      index: true,
    },

    commissionEarned: {
      type: Number,
      default: 0,
      min: 0,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      index: true,
    },

    rewardedAt: {
      type: Date,
    },

    // Offer snapshot used when commission was credited
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerReferralOffer',
      index: true,
    },

    commissionPercent: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

// One business owner can have only one customer referrer
customerReferralSchema.index({ referredUser: 1 }, { unique: true });
customerReferralSchema.index({ referrer: 1, status: 1 });

customerReferralSchema.pre('save', function (next) {
  // Prevent self-referral
  if (this.referrer && this.referredUser && String(this.referrer) === String(this.referredUser)) {
    return next(new Error('User cannot refer themselves'));
  }
  next();
});

const CustomerReferral = mongoose.model('CustomerReferral', customerReferralSchema);

export default CustomerReferral;
