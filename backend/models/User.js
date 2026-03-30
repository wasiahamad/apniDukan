import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * USER MODEL - Single unified account system
 * Replaces separate Vendor model
 * Handles: admin, business_owner, staff roles
 * Uses: email/password authentication
 */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    phone: {
      type: String,
      required: function () {
        return this.authProvider === 'local';
      },
      unique: true,
      sparse: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === 'local';
      },
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
    socialIds: {
      google: {
        type: String,
        sparse: true,
      },
      facebook: {
        type: String,
        sparse: true,
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
    },
    emailVerificationOtpHash: {
      type: String,
      select: false,
    },
    emailVerificationOtpExpiresAt: {
      type: Date,
      select: false,
    },
    emailVerificationOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    passwordResetOtpHash: {
      type: String,
      select: false,
    },
    passwordResetOtpExpiresAt: {
      type: Date,
      select: false,
    },
    passwordResetOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'business_owner', 'staff', 'customer'],
      default: 'business_owner',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    profileImage: {
      type: String,
    },
    currentLocation: {
      type: new mongoose.Schema(
        {
          type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
            validate: {
              validator: (v) =>
                !v ||
                (Array.isArray(v) &&
                  v.length === 2 &&
                  v.every((n) => typeof n === 'number' && Number.isFinite(n))),
              message: 'currentLocation.coordinates must be [lng,lat] numbers',
            },
          },
          accuracy: {
            type: Number,
            min: 0,
          },
          capturedAt: {
            type: Date,
            default: Date.now,
          },
        },
        { _id: false }
      ),
      default: undefined,
    },
    referralCode: {
      type: String,
      unique: true,
      uppercase: true,
      sparse: true, // Allow null values
    },

    // Referral offer selection (dukandar works on one offer at a time)
    activeReferralOffer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReferralOffer',
    },
    activeReferralOfferSelectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Index for faster queries - email/phone indexes created automatically by unique:true above
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ currentLocation: '2dsphere' });

// Generate referral code if not set
userSchema.pre('save', async function (next) {
  if (!this.referralCode && this.role === 'business_owner') {
    this.referralCode = await generateReferralCode(this.name, this._id);
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get safe user object (without password)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationOtpHash;
  delete obj.emailVerificationOtpExpiresAt;
  delete obj.emailVerificationOtpAttempts;
  delete obj.passwordResetOtpHash;
  delete obj.passwordResetOtpExpiresAt;
  delete obj.passwordResetOtpAttempts;
  return obj;
};

// Helper function to generate unique referral code
async function generateReferralCode(name, userId) {
  const namePart = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3);
  
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const userIdPart = userId.toString().slice(-4).toUpperCase();
  
  let code = `${namePart}${randomPart}${userIdPart}`;
  
  // Check uniqueness
  let counter = 1;
  while (await mongoose.model('User').findOne({ referralCode: code })) {
    code = `${namePart}${randomPart}${counter}`;
    counter++;
  }
  
  return code;
}

const User = mongoose.model('User', userSchema);

export default User;
