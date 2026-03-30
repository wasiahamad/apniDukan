import mongoose from 'mongoose';

const referralOfferSchema = new mongoose.Schema({
  // Offer Details
  offerName: {
    type: String,
    required: [true, 'Offer name is required'],
    trim: true,
    maxlength: [100, 'Offer name cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Referral Threshold
  referralThreshold: {
    type: Number,
    required: [true, 'Referral threshold is required'],
    min: [1, 'Threshold must be at least 1'],
    max: [100, 'Threshold cannot exceed 100']
  },
  
  // Reward Configuration
  rewardPlan: {
    type: String,
    required: [true, 'Reward plan is required'],
    enum: {
      values: ['free', 'starter', 'pro', 'business', 'enterprise', 'basic', 'standard', 'premium'],
      message: '{VALUE} is not a valid plan'
    }
  },
  
  rewardDuration: {
    type: Number,
    required: [true, 'Reward duration is required'],
    min: [1, 'Duration must be at least 1 month'],
    max: [12, 'Duration cannot exceed 12 months'],
    default: 1
  },
  
  // Offer Rules
  firstTimeOnly: {
    type: Boolean,
    default: false,
    description: 'If true, dukandar can only claim this offer once'
  },
  
  requiresFirstPaidPlan: {
    type: Boolean,
    default: true,
    description: 'Dukandar must have purchased at least one paid plan'
  },
  
  // Status Management
  status: {
    type: String,
    enum: {
      values: ['draft', 'active', 'closed', 'archived'],
      message: '{VALUE} is not a valid status'
    },
    default: 'draft',
    index: true
  },
  
  // Validity Period
  validFrom: {
    type: Date,
    default: Date.now
  },
  
  validUntil: {
    type: Date
  },
  
  // Statistics
  stats: {
    totalReferrals: {
      type: Number,
      default: 0
    },
    totalRewardsRequested: {
      type: Number,
      default: 0
    },
    totalRewardsApproved: {
      type: Number,
      default: 0
    },
    totalRewardsRejected: {
      type: Number,
      default: 0
    },
    totalDukandarsParticipating: {
      type: Number,
      default: 0
    }
  },
  
  // Admin Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional Configuration
  terms: {
    type: String,
    trim: true
  },
  
  autoApprove: {
    type: Boolean,
    default: false,
    description: 'Automatically approve reward requests'
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
  
}, {
  timestamps: true
});

// Virtual to check if offer is currently valid
referralOfferSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  
  if (this.status !== 'active') return false;
  if (this.validFrom && now < this.validFrom) return false;
  if (this.validUntil && now > this.validUntil) return false;
  
  return true;
});

// Method to activate offer
referralOfferSchema.methods.activate = async function() {
  this.status = 'active';
  if (!this.validFrom) {
    this.validFrom = new Date();
  }
  await this.save();
};

// Method to close offer
referralOfferSchema.methods.close = async function() {
  this.status = 'closed';
  await this.save();
};

// Method to increment stats
referralOfferSchema.methods.incrementStat = async function(statName) {
  if (this.stats.hasOwnProperty(statName)) {
    this.stats[statName] += 1;
    await this.save();
  }
};

// Static method to get active offer
referralOfferSchema.statics.getActiveOffer = async function() {
  const now = new Date();
  
  return await this.findOne({
    status: 'active',
    isActive: true,
    $or: [
      { validFrom: { $lte: now }, validUntil: { $gte: now } },
      { validFrom: { $lte: now }, validUntil: null }
    ]
  }).sort({ createdAt: -1 });
};

// Pre-save middleware to validate dates
referralOfferSchema.pre('save', function(next) {
  if (this.validUntil && this.validFrom && this.validUntil < this.validFrom) {
    next(new Error('validUntil must be after validFrom'));
  }
  next();
});

// Indexes for performance
referralOfferSchema.index({ status: 1, isActive: 1 });
referralOfferSchema.index({ validFrom: 1, validUntil: 1 });
referralOfferSchema.index({ createdAt: -1 });

// Ensure virtuals are included in JSON
referralOfferSchema.set('toJSON', { virtuals: true });
referralOfferSchema.set('toObject', { virtuals: true });

const ReferralOffer = mongoose.model('ReferralOffer', referralOfferSchema);

export default ReferralOffer;
