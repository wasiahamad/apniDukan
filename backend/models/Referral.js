import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  // Referrer Information (User who refers)
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Referrer is required'],
    index: true
  },
  
  // Referred User Information
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Referred user is required'],
    index: true
  },
  
  // Offer Information
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferralOffer',
    required: [true, 'Offer is required'],
    index: true
  },
  
  // Referral Code Used
  referralCode: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: {
      values: ['pending', 'valid', 'invalid', 'cancelled'],
      message: '{VALUE} is not a valid status'
    },
    default: 'pending',
    index: true
  },
  
  // Validation Information
  isValidated: {
    type: Boolean,
    default: false
  },
  
  validatedAt: {
    type: Date
  },
  
  invalidReason: {
    type: String,
    trim: true
  },
  
  // Payment Verification (check if referred user has paid plan)
  referredUserHasPaidPlan: {
    type: Boolean,
    default: false
  },
  
  referredUserFirstPaymentDate: {
    type: Date
  },
  
  // Reward Association
  rewardRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferralRewardRequest'
  },
  
  isCountedInReward: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  metadata: {
    referredUserEmail: String,
    referredUserName: String,
    referredUserPhone: String,
    referredBusinessName: String,
    ipAddress: String,
    userAgent: String
  },
  
  // Notes
  notes: {
    type: String,
    trim: true
  }
  
}, {
  timestamps: true
});

// Compound index to prevent duplicate referrals
referralSchema.index({ referrer: 1, referredUser: 1 }, { unique: true });
referralSchema.index({ offer: 1, status: 1 });
referralSchema.index({ createdAt: -1 });

// Method to mark as valid
referralSchema.methods.markAsValid = async function() {
  this.status = 'valid';
  this.isValidated = true;
  this.validatedAt = new Date();
  await this.save();
};

// Method to mark as invalid
referralSchema.methods.markAsInvalid = async function(reason) {
  this.status = 'invalid';
  this.isValidated = true;
  this.validatedAt = new Date();
  this.invalidReason = reason;
  await this.save();
};

// Method to update payment status
referralSchema.methods.updatePaymentStatus = async function(hasPaid, paymentDate = null) {
  this.referredUserHasPaidPlan = hasPaid;
  if (hasPaid && paymentDate) {
    this.referredUserFirstPaymentDate = paymentDate;
    // Automatically mark as valid if payment is confirmed
    if (this.status === 'pending') {
      await this.markAsValid();
    }
  }
  await this.save();
};

// Static method to count valid referrals for a user
referralSchema.statics.countValidReferrals = async function(userId, offerId = null) {
  const query = {
    referrer: userId,
    status: 'valid'
  };
  
  if (offerId) {
    query.offer = offerId;
  }
  
  return await this.countDocuments(query);
};

// Static method to get referral statistics
referralSchema.statics.getReferralStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { referrer: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    total: 0,
    valid: 0,
    pending: 0,
    invalid: 0,
    cancelled: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

// Pre-save validation
referralSchema.pre('save', function(next) {
  // Prevent self-referral
  if (this.referrer.equals(this.referredUser)) {
    next(new Error('User cannot refer themselves'));
  }
  next();
});

const Referral = mongoose.model('Referral', referralSchema);

export default Referral;
