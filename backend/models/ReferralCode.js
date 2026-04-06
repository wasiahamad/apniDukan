import mongoose from 'mongoose';

const referralCodeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    stats: {
      totalReferrals: { type: Number, default: 0 },
      validReferrals: { type: Number, default: 0 },
      pendingReferrals: { type: Number, default: 0 },
      invalidReferrals: { type: Number, default: 0 },
    },
    lastUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const ReferralCode = mongoose.model('ReferralCode', referralCodeSchema);

export default ReferralCode;
