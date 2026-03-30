import mongoose from 'mongoose';

const referralRewardRequestSchema = new mongoose.Schema({
  // Dukandar Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  
  // Offer Information
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferralOffer',
    required: [true, 'Offer is required'],
    index: true
  },
  
  // Request Details
  requestNumber: {
    type: String,
    unique: true,
    uppercase: true
  },
  
  // Referral Snapshot at time of request
  referralCountSnapshot: {
    type: Number,
    required: [true, 'Referral count snapshot is required'],
    min: 0
  },
  
  totalReferralsSnapshot: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Associated Referrals
  referrals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral'
  }],
  
  // Status Management
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected', 'cancelled', 'expired'],
      message: '{VALUE} is not a valid status'
    },
    default: 'pending',
    index: true
  },
  
  // Approval/Rejection Information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  reviewedAt: {
    type: Date
  },
  
  approvalNotes: {
    type: String,
    trim: true
  },
  
  rejectionReason: {
    type: String,
    trim: true
  },
  
  // Reward Details
  rewardPlan: {
    type: String,
    enum: ['free', 'starter', 'pro', 'business', 'enterprise', 'basic', 'standard', 'premium']
  },
  
  rewardDuration: {
    type: Number,
    min: 1,
    default: 1
  },
  
  rewardValue: {
    type: Number,
    min: 0
  },

  // Reward schedule (captured at approval time)
  rewardStartsAt: {
    type: Date
  },

  rewardEndsAt: {
    type: Date
  },
  
  // Fulfillment
  isRewardFulfilled: {
    type: Boolean,
    default: false
  },
  
  fulfilledAt: {
    type: Date
  },
  
  fulfilledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  appliedBusinesses: [{
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    },
    businessName: String,
    previousPlanExpiresAt: Date,
    rewardStartsAt: Date,
    rewardEndsAt: Date
  }],
  
  // Expiration
  expiresAt: {
    type: Date
  },
  
  // Validation Flags
  isFirstTimeRequest: {
    type: Boolean,
    default: false
  },
  
  userHadPaidPlan: {
    type: Boolean,
    required: true
  },
  
  // Metadata
  metadata: {
    userCurrentPlan: String,
    userEmail: String,
    userName: String,
    userBusinessName: String,
    requestIpAddress: String,
    autoApproved: Boolean
  },
  
  // Additional Notes
  internalNotes: {
    type: String,
    trim: true
  }
  
}, {
  timestamps: true
});

// Generate unique request number before saving
referralRewardRequestSchema.pre('save', async function(next) {
  if (!this.requestNumber) {
    this.requestNumber = await generateRequestNumber();
  }
  
  // Set expiration (30 days from creation if not set)
  if (!this.expiresAt && this.status === 'pending') {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    this.expiresAt = expiryDate;
  }
  
  next();
});

// Method to approve request
referralRewardRequestSchema.methods.approve = async function(adminId, notes = '') {
  this.status = 'approved';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.approvalNotes = notes;
  await this.save();
};

// Method to reject request
referralRewardRequestSchema.methods.reject = async function(adminId, reason) {
  this.status = 'rejected';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.rejectionReason = reason;
  await this.save();
};

// Method to mark as fulfilled
referralRewardRequestSchema.methods.fulfill = async function(adminId) {
  this.isRewardFulfilled = true;
  this.fulfilledAt = new Date();
  this.fulfilledBy = adminId;
  await this.save();
};

// Method to cancel request
referralRewardRequestSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  await this.save();
};

// Static method to check for pending request
referralRewardRequestSchema.statics.hasPendingRequest = async function(userId, offerId) {
  const request = await this.findOne({
    user: userId,
    offer: offerId,
    status: 'pending'
  });
  
  return !!request;
};

// Static method to count requests by status
referralRewardRequestSchema.statics.countByStatus = async function(userId, status) {
  return await this.countDocuments({
    user: userId,
    status: status
  });
};

// Static method to get request statistics
referralRewardRequestSchema.statics.getRequestStats = async function(filters = {}) {
  const stats = await this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRewardValue: { $sum: '$rewardValue' }
      }
    }
  ]);
  
  return stats;
};

// Generate unique request number
async function generateRequestNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const count = await mongoose.model('ReferralRewardRequest').countDocuments();
  const sequence = String(count + 1).padStart(5, '0');
  
  return `RR${year}${month}${sequence}`;
}

// Indexes for performance
referralRewardRequestSchema.index({ user: 1, offer: 1 });
referralRewardRequestSchema.index({ status: 1, createdAt: -1 });
referralRewardRequestSchema.index({ expiresAt: 1 });

const ReferralRewardRequest = mongoose.model('ReferralRewardRequest', referralRewardRequestSchema);

export default ReferralRewardRequest;
