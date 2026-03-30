import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { BookingSlot, Business, User } from '../models/index.js';
import { createReferralForSignup, ensureReferralCodeForUser } from '../services/referralService.js';
import { sendOtpEmail } from '../services/emailService.js';
import { verifyFacebookAccessToken, verifyGoogleAccessToken, verifyGoogleIdToken } from '../services/socialAuthService.js';

/**
 * AUTH CONTROLLER - Unified authentication
 * Dukandar enhancements:
 * - Email verification with OTP + resend
 * - Forgot/reset password with OTP + resend
 * - Change password for logged-in sellers
 * - Social auth (Google/Facebook)
 */

const OTP_TTL_MINUTES = Number(process.env.AUTH_OTP_TTL_MINUTES || 10);
const RESET_OTP_TTL_MINUTES = Number(process.env.AUTH_RESET_OTP_TTL_MINUTES || 10);
const OTP_MAX_ATTEMPTS = Number(process.env.AUTH_OTP_MAX_ATTEMPTS || 5);

// NOTE:
// We intentionally do NOT create a User document for dukandar until OTP verification succeeds.
// Pending registrations live in-memory (dev-friendly). In production, consider Redis or a DB-backed TTL collection.
const shouldLogOtp = String(process.env.AUTH_LOG_OTP || '').toLowerCase() === 'true' || process.env.NODE_ENV !== 'production';

const pendingRegistrationsByEmail = new Map();

const getPendingRegistration = (email) => {
  const key = normalizeEmail(email);
  if (!key) return null;
  const rec = pendingRegistrationsByEmail.get(key);
  if (!rec) return null;
  if (rec.expiresAt && rec.expiresAt.getTime() < Date.now()) {
    pendingRegistrationsByEmail.delete(key);
    return null;
  }
  return rec;
};

const setPendingRegistration = (email, rec) => {
  const key = normalizeEmail(email);
  pendingRegistrationsByEmail.set(key, rec);
};

const clearPendingRegistration = (email) => {
  const key = normalizeEmail(email);
  pendingRegistrationsByEmail.delete(key);
};

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });

  return { accessToken, refreshToken };
};

const generateImpersonationTokens = (userId, impersonatedBy) => {
  const accessToken = jwt.sign(
    { userId, impersonatedBy: String(impersonatedBy), isImpersonation: true },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_IMPERSONATE_EXPIRE || '1h' }
  );

  const refreshToken = jwt.sign(
    { userId, impersonatedBy: String(impersonatedBy), isImpersonation: true },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_IMPERSONATE_REFRESH_EXPIRE || '1d' }
  );

  return { accessToken, refreshToken };
};

const generateOtp = () => String(crypto.randomInt(100000, 1000000));
const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const randomSocialPassword = () => crypto.randomBytes(24).toString('hex');

const isDukandar = (user) => user?.role === 'business_owner';
const normalizeRequestedRole = (role) => (String(role || '').trim().toLowerCase() === 'customer' ? 'customer' : 'business_owner');

const setEmailVerificationOtp = (user, otp) => {
  user.emailVerificationOtpHash = hashOtp(otp);
  user.emailVerificationOtpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  user.emailVerificationOtpAttempts = 0;
};

const clearEmailVerificationOtp = (user) => {
  user.emailVerificationOtpHash = undefined;
  user.emailVerificationOtpExpiresAt = undefined;
  user.emailVerificationOtpAttempts = 0;
};

const setPasswordResetOtp = (user, otp) => {
  user.passwordResetOtpHash = hashOtp(otp);
  user.passwordResetOtpExpiresAt = new Date(Date.now() + RESET_OTP_TTL_MINUTES * 60 * 1000);
  user.passwordResetOtpAttempts = 0;
};

const clearPasswordResetOtp = (user) => {
  user.passwordResetOtpHash = undefined;
  user.passwordResetOtpExpiresAt = undefined;
  user.passwordResetOtpAttempts = 0;
};

const sendVerificationOtp = async (user, otp) => {
  await sendOtpEmail({
    to: user.email,
    name: user.name,
    otp,
    purpose: 'verification',
    ttlMinutes: OTP_TTL_MINUTES,
  });
};

const sendPasswordResetOtp = async (user, otp) => {
  await sendOtpEmail({
    to: user.email,
    name: user.name,
    otp,
    purpose: 'password_reset',
    ttlMinutes: RESET_OTP_TTL_MINUTES,
  });
};

const loginResponse = (user) => {
  const { accessToken, refreshToken } = generateTokens(user._id);
  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken,
  };
};

const shouldRequireVerification = (role) => {
  if (role !== 'business_owner') return false;
  return String(process.env.DUKANDAR_EMAIL_VERIFICATION || 'true').toLowerCase() !== 'false';
};

// 
const socialLoginOrSignup = async ({ provider, providerId, email, name, profileImage, desiredRole = 'business_owner' }) => {
  const lowerEmail = normalizeEmail(email);
  let user = await User.findOne({
    $or: [
      { email: lowerEmail },
      { [`socialIds.${provider}`]: providerId },
    ],
  }).select('+password');

  if (!user) {
    user = await User.create({
      name,
      email: lowerEmail,
      password: randomSocialPassword(),
      role: desiredRole,
      authProvider: provider,
      socialIds: { [provider]: providerId },
      profileImage,
      isEmailVerified: true,
      isActive: true,
    });

    await ensureReferralCodeForUser(user);
  } else {
    user.authProvider = user.authProvider || provider;
    user.socialIds = user.socialIds || {};
    user.socialIds[provider] = providerId;
    user.isEmailVerified = true;
    user.isActive = true;
    if (profileImage && !user.profileImage) user.profileImage = profileImage;
    await user.save();
  }

  return user;
};

// @desc    Register user (dukandar gets OTP verification)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, role, referralCode, offerId } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const targetRole = normalizeRequestedRole(role);

    if ((targetRole === 'business_owner' || targetRole === 'customer') && !phone) {
      return res.status(400).json({
        success: false,
        message: `Phone is required for ${targetRole === 'customer' ? 'customer' : 'business owner'} accounts`,
      });
    }

    const duplicateFilters = [{ email: normalizedEmail }];
    if (phone) duplicateFilters.push({ phone });
    const existingUser = await User.findOne({ $or: duplicateFilters });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists',
      });
    }

    const requiresVerification = shouldRequireVerification(targetRole);

    // Dukandar flow: do not save user until OTP is verified.
    if (requiresVerification) {
      const existingPending = getPendingRegistration(normalizedEmail);
      const otp = generateOtp();

      const pending = {
        name,
        email: normalizedEmail,
        phone,
        password,
        role: targetRole,
        authProvider: 'local',
        referralCode,
        offerId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        otpHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
        attempts: existingPending?.attempts || 0,
        createdAt: existingPending?.createdAt || new Date(),
      };

      setPendingRegistration(normalizedEmail, pending);

      if (shouldLogOtp) {
        console.log(`[AUTH OTP] verification email=${normalizedEmail} otp=${otp} ttlMin=${OTP_TTL_MINUTES}`);
      }

      // Best-effort email send (dev can use terminal OTP).
      try {
        await sendOtpEmail({
          to: pending.email,
          name: pending.name,
          otp,
          purpose: 'verification',
          ttlMinutes: OTP_TTL_MINUTES,
        });
      } catch (e) {
        console.warn('Send verification OTP email failed:', e?.message || e);
      }

      return res.status(201).json({
        success: true,
        message: 'Registration initiated. Verify OTP sent to your email to activate account.',
        data: {
          user: { name: pending.name, email: pending.email, phone: pending.phone, role: pending.role },
          verificationRequired: true,
          otpExpiresInMinutes: OTP_TTL_MINUTES,
        },
      });
    }

    // Non-dukandar / verification-disabled flow: create user immediately.
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password,
      role: targetRole,
      authProvider: 'local',
      isEmailVerified: true,
      isActive: true,
    });

    await ensureReferralCodeForUser(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: loginResponse(user),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error registering user',
    });
  }
};

// @desc    Verify dukandar email OTP
// @route   POST /api/auth/verify-email-otp
// @access  Public
export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    // Backward-compat: if a user exists (old flow), verify against stored OTP.
    const existingUser = await User.findOne({ email: normalizedEmail })
      .select('+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationOtpAttempts');

    if (existingUser) {
      if (existingUser.isEmailVerified) {
        return res.status(200).json({
          success: true,
          message: 'Email already verified',
          data: loginResponse(existingUser),
        });
      }

      if (!existingUser.emailVerificationOtpHash || !existingUser.emailVerificationOtpExpiresAt) {
        return res.status(400).json({ success: false, message: 'OTP not found. Please resend OTP.' });
      }

      if (existingUser.emailVerificationOtpAttempts >= OTP_MAX_ATTEMPTS) {
        return res.status(429).json({ success: false, message: 'Maximum OTP attempts exceeded. Please resend OTP.' });
      }

      if (existingUser.emailVerificationOtpExpiresAt.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: 'OTP expired. Please resend OTP.' });
      }

      if (existingUser.emailVerificationOtpHash !== hashOtp(otp)) {
        existingUser.emailVerificationOtpAttempts += 1;
        await existingUser.save();
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
      }

      existingUser.isEmailVerified = true;
      existingUser.isActive = true;
      clearEmailVerificationOtp(existingUser);
      existingUser.lastLogin = new Date();
      await existingUser.save();

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: loginResponse(existingUser),
      });
    }

    // New flow: pending registration must exist.
    const pending = getPendingRegistration(normalizedEmail);
    if (!pending) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // If someone else registered this email/phone while OTP was pending, fail cleanly.
    const duplicateFilters = [{ email: pending.email }];
    if (pending.phone) duplicateFilters.push({ phone: pending.phone });
    const duplicate = await User.findOne({ $or: duplicateFilters });
    if (duplicate) {
      clearPendingRegistration(normalizedEmail);
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists',
      });
    }

    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ success: false, message: 'Maximum OTP attempts exceeded. Please resend OTP.' });
    }

    if (pending.expiresAt.getTime() < Date.now()) {
      clearPendingRegistration(normalizedEmail);
      return res.status(400).json({ success: false, message: 'OTP expired. Please resend OTP.' });
    }

    if (pending.otpHash !== hashOtp(otp)) {
      pending.attempts += 1;
      setPendingRegistration(normalizedEmail, pending);
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Create the user only AFTER OTP verification
    const user = await User.create({
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      password: pending.password,
      role: pending.role || 'business_owner',
      authProvider: 'local',
      isEmailVerified: true,
      isActive: true,
      lastLogin: new Date(),
    });

    await ensureReferralCodeForUser(user);

    if (pending.referralCode && user.role === 'business_owner') {
      try {
        await createReferralForSignup({
          referredUser: user,
          referralCode: pending.referralCode,
          offerId: pending.offerId,
          ipAddress: pending.ipAddress,
          userAgent: pending.userAgent,
        });
      } catch (e) {
        console.warn('Referral creation on signup failed:', e?.message || e);
      }
    }

    clearPendingRegistration(normalizedEmail);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: loginResponse(user),
    });
  } catch (error) {
    console.error('Verify email OTP error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error verifying email OTP' });
  }
};

// @desc    Resend email verification OTP
// @route   POST /api/auth/resend-email-otp
// @access  Public
export const resendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    // Backward-compat: resend for old flow user
    const user = await User.findOne({ email: normalizedEmail })
      .select('+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationOtpAttempts');

    if (user) {
      if (user.isEmailVerified) {
        return res.status(400).json({ success: false, message: 'Email is already verified' });
      }

      const otp = generateOtp();
      setEmailVerificationOtp(user, otp);
      await user.save();

      if (shouldLogOtp) {
        console.log(`[AUTH OTP] resend email=${normalizedEmail} otp=${otp} ttlMin=${OTP_TTL_MINUTES}`);
      }

      try {
        await sendVerificationOtp(user, otp);
      } catch (e) {
        console.warn('Send verification OTP email failed:', e?.message || e);
      }

      return res.status(200).json({
        success: true,
        message: 'OTP resent successfully',
        data: { otpExpiresInMinutes: OTP_TTL_MINUTES },
      });
    }

    // New flow: resend for pending registration
    const pending = getPendingRegistration(normalizedEmail);
    if (!pending) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const otp = generateOtp();
    pending.otpHash = hashOtp(otp);
    pending.expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    pending.attempts = 0;
    setPendingRegistration(normalizedEmail, pending);

    if (shouldLogOtp) {
      console.log(`[AUTH OTP] resend email=${normalizedEmail} otp=${otp} ttlMin=${OTP_TTL_MINUTES}`);
    }

    try {
      await sendOtpEmail({
        to: pending.email,
        name: pending.name,
        otp,
        purpose: 'verification',
        ttlMinutes: OTP_TTL_MINUTES,
      });
    } catch (e) {
      console.warn('Send verification OTP email failed:', e?.message || e);
    }

    return res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: { otpExpiresInMinutes: OTP_TTL_MINUTES },
    });
  } catch (error) {
    console.error('Resend email OTP error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error resending OTP' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: normalizeEmail(email) }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (isDukandar(user) && !user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please verify OTP first.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: loginResponse(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error logging in',
    });
  }
};

// @desc    Login customer only
// @route   POST /api/auth/login/customer
// @access  Public
export const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: normalizeEmail(email) }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Only customer accounts are allowed here',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Customer login successful',
      data: loginResponse(user),
    });
  } catch (error) {
    console.error('Customer login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error logging in customer',
    });
  }
};

// @desc    Google social login/signup for dukandar
// @route   POST /api/auth/social/google
// @access  Public
export const googleLogin = async (req, res) => {
  try {
    const { idToken, accessToken, role } = req.body;
    const targetRole = normalizeRequestedRole(role);

    let identity = null;
    if (accessToken) {
      try {
        identity = await verifyGoogleAccessToken(accessToken);
      } catch {
        if (!idToken) throw new Error('Invalid Google token');
      }
    }

    if (!identity) {
      identity = await verifyGoogleIdToken(idToken);
    }

    const user = await socialLoginOrSignup({
      provider: 'google',
      providerId: identity.providerId,
      email: identity.email,
      name: identity.name,
      profileImage: identity.profileImage,
      desiredRole: targetRole,
    });

    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Google login successful',
      data: loginResponse(user),
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Google login failed',
    });
  }
};

// @desc    Facebook social login/signup for dukandar
// @route   POST /api/auth/social/facebook
// @access  Public
export const facebookLogin = async (req, res) => {
  try {
    const { accessToken, role } = req.body;
    const targetRole = normalizeRequestedRole(role);
    const identity = await verifyFacebookAccessToken(accessToken);

    const user = await socialLoginOrSignup({
      provider: 'facebook',
      providerId: identity.providerId,
      email: identity.email,
      name: identity.name,
      profileImage: identity.profileImage,
      desiredRole: targetRole,
    });

    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Facebook login successful',
      data: loginResponse(user),
    });
  } catch (error) {
    console.error('Facebook login error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Facebook login failed',
    });
  }
};

// @desc    Forgot password (send reset OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) })
      .select('+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts');

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If this email exists, a reset OTP has been sent.',
      });
    }

    const otp = generateOtp();
    setPasswordResetOtp(user, otp);
    await user.save();
    await sendPasswordResetOtp(user, otp);

    return res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to your email',
      data: { otpExpiresInMinutes: RESET_OTP_TTL_MINUTES },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing forgot password request',
    });
  }
};

// @desc    Resend password reset OTP
// @route   POST /api/auth/resend-reset-otp
// @access  Public
export const resendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) })
      .select('+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const otp = generateOtp();
    setPasswordResetOtp(user, otp);
    await user.save();
    await sendPasswordResetOtp(user, otp);

    return res.status(200).json({
      success: true,
      message: 'Password reset OTP resent',
      data: { otpExpiresInMinutes: RESET_OTP_TTL_MINUTES },
    });
  } catch (error) {
    console.error('Resend reset OTP error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error resending reset OTP' });
  }
};

// @desc    Reset password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) })
      .select('+password +passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      return res.status(400).json({ success: false, message: 'Reset OTP not found. Request a new OTP.' });
    }

    if (user.passwordResetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ success: false, message: 'Maximum OTP attempts exceeded. Please resend OTP.' });
    }

    if (user.passwordResetOtpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please resend OTP.' });
    }

    if (user.passwordResetOtpHash !== hashOtp(otp)) {
      user.passwordResetOtpAttempts += 1;
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    user.password = newPassword;
    user.isEmailVerified = true;
    user.isActive = true;
    clearPasswordResetOtp(user);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: loginResponse(user),
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error resetting password',
    });
  }
};

// @desc    Change password for logged-in user
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isCurrentValid = await user.comparePassword(currentPassword);
    if (!isCurrentValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error changing password',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, profileImage } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (profileImage) user.profileImage = profileImage;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating profile',
    });
  }
};

// @desc    Register customer account (role enforced)
// @route   POST /api/auth/register/customer
// @access  Public
export const registerCustomer = async (req, res) => {
  req.body = { ...(req.body || {}), role: 'customer' };
  return register(req, res);
};

// @desc    Google social login/signup for customer
// @route   POST /api/auth/social/google/customer
// @access  Public
export const googleCustomerLogin = async (req, res) => {
  req.body = { ...(req.body || {}), role: 'customer' };
  return googleLogin(req, res);
};

// @desc    Facebook social login/signup for customer
// @route   POST /api/auth/social/facebook/customer
// @access  Public
export const facebookCustomerLogin = async (req, res) => {
  req.body = { ...(req.body || {}), role: 'customer' };
  return facebookLogin(req, res);
};

// @desc    Update current user live location
// @route   PUT /api/auth/location
// @access  Private
export const updateMyLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body || {};
    const lat = Number(latitude);
    const lng = Number(longitude);
    const acc = Number(accuracy);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: 'Invalid latitude' });
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Invalid longitude' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.currentLocation = {
      type: 'Point',
      coordinates: [lng, lat],
      ...(Number.isFinite(acc) && acc >= 0 ? { accuracy: acc } : {}),
      capturedAt: new Date(),
    };
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Live location updated',
      data: {
        currentLocation: user.currentLocation,
      },
    });
  } catch (error) {
    console.error('Update my location error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error updating location' });
  }
};

// @desc    Admin: List customer profiles with location + booking stats
// @route   GET /api/auth/admin/customers
// @access  Private (admin)
export const adminListCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const filter = { role: 'customer' };
    const searchText = String(search || '').trim();
    if (searchText) {
      filter.$or = [
        { name: { $regex: searchText, $options: 'i' } },
        { email: { $regex: searchText, $options: 'i' } },
        { phone: { $regex: searchText, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    const customerIds = customers.map((c) => c._id);
    const bookingStats = customerIds.length
      ? await BookingSlot.aggregate([
          { $match: { bookedBy: { $in: customerIds } } },
          {
            $group: {
              _id: '$bookedBy',
              totalBookings: { $sum: 1 },
              activeBookings: {
                $sum: {
                  $cond: [{ $in: ['$status', ['booked']] }, 1, 0],
                },
              },
              completedBookings: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
                },
              },
            },
          },
        ])
      : [];

    const statsByCustomerId = new Map(
      bookingStats.map((s) => [String(s._id), {
        totalBookings: Number(s.totalBookings || 0),
        activeBookings: Number(s.activeBookings || 0),
        completedBookings: Number(s.completedBookings || 0),
      }])
    );

    const rows = customers.map((c) => {
      const stats = statsByCustomerId.get(String(c._id)) || {
        totalBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
      };

      return {
        _id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone || null,
        role: c.role,
        isActive: c.isActive,
        isEmailVerified: c.isEmailVerified,
        lastLogin: c.lastLogin || null,
        currentLocation: c.currentLocation || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        bookingStats: stats,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        customers: rows,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error('Admin list customers error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching customers',
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    });

    res.status(200).json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
};

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error logging out',
    });
  }
};

// @desc    Admin: Impersonate a business owner (dukandar)
// @route   POST /api/auth/admin/impersonate
// @access  Private (admin only)
export const adminImpersonate = async (req, res) => {
  try {
    const { userId, businessId } = req.body || {};

    if (!userId && !businessId) {
      return res.status(400).json({
        success: false,
        message: 'Provide userId or businessId',
      });
    }

    let targetUserId = userId;
    if (!targetUserId && businessId) {
      const business = await Business.findById(businessId).select('owner');
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found',
        });
      }
      targetUserId = business.owner;
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'business_owner') {
      return res.status(400).json({
        success: false,
        message: 'Only business_owner accounts can be impersonated',
      });
    }

    const { accessToken, refreshToken } = generateImpersonationTokens(user._id, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Impersonation token issued',
      data: {
        user: user.toSafeObject(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Admin impersonate error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error issuing impersonation token',
    });
  }
};
