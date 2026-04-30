import mongoose from 'mongoose';

const PendingRegistrationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      unique: true,
    },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    password: { type: String },
    role: { type: String, default: 'business_owner' },
    authProvider: { type: String, default: 'local' },

    referralCode: { type: String, trim: true },
    offerId: { type: mongoose.Schema.Types.ObjectId },

    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    currentLocation: { type: Object },

    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Auto-delete documents after expiry.
PendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PendingRegistration', PendingRegistrationSchema);
