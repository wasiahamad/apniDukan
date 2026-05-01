import {
  sendBookingConfirmationEmail,
  sendContactFormEmail,
  sendNearbyShopsEmail,
  sendOrderConfirmationEmail,
  sendOtpEmail,
  sendPlanExpiryEmail,
  sendReferralRewardEmail,
  sendReferralWelcomeEmail,
  sendEmail,
} from '../services/emailService.js';

const asArray = (v) => (Array.isArray(v) ? v : []);
const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export const sendTest = async (req, res) => {
  try {
    const to = String(req.body?.to || req.user?.email || '').trim().toLowerCase();
    if (!to) return res.status(400).json({ success: false, message: 'to is required' });

    const result = await sendEmail({
      to,
      subject: 'PublicDukan Resend Test Email',
      html: '<h2>PublicDukan</h2><p>Resend integration is working.</p>',
      text: 'PublicDukan Resend integration is working.',
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to send test email' });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { to, name, otp, purpose = 'verification', ttlMinutes = 5 } = req.body || {};
    if (!to || !otp) return res.status(400).json({ success: false, message: 'to and otp are required' });

    const result = await sendOtpEmail({ to, name, otp, purpose, ttlMinutes: toNum(ttlMinutes, 5) });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to send OTP email' });
  }
};

export const sendContact = async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'name, email, message are required' });
    }

    const result = await sendContactFormEmail({ name, email, message });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to send contact emails' });
  }
};

export const sendOrderConfirmation = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.to || !payload.orderId) {
      return res.status(400).json({ success: false, message: 'to and orderId are required' });
    }

    const result = await sendOrderConfirmationEmail({
      to: payload.to,
      orderId: payload.orderId,
      customerName: payload.customerName || 'Customer',
      items: asArray(payload.items),
      totalPrice: toNum(payload.totalPrice, 0),
      deliveryDate: payload.deliveryDate || new Date().toISOString(),
      deliveryAddress: payload.deliveryAddress || 'Not provided',
      orderDate: payload.orderDate || new Date().toISOString(),
      userId: req.user?._id,
      businessId: payload.businessId,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to send order confirmation email' });
  }
};

export const sendBookingConfirmation = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.to || !payload.bookingId) {
      return res.status(400).json({ success: false, message: 'to and bookingId are required' });
    }

    const result = await sendBookingConfirmationEmail({
      to: payload.to,
      bookingId: payload.bookingId,
      customerName: payload.customerName || 'Customer',
      serviceName: payload.serviceName || 'Service',
      bookingDate: payload.bookingDate || new Date().toISOString(),
      bookingTime: payload.bookingTime || 'TBD',
      location: payload.location || 'TBD',
      amount: toNum(payload.amount, 0),
      userId: req.user?._id,
      businessId: payload.businessId,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to send booking confirmation email' });
  }
};

export const sendPlanNotification = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.to || !payload.businessName || !payload.planName) {
      return res.status(400).json({ success: false, message: 'to, businessName and planName are required' });
    }

    const result = await sendPlanExpiryEmail({
      to: payload.to,
      businessName: payload.businessName,
      planName: payload.planName,
      expiryDate: payload.expiryDate || new Date().toISOString(),
      daysLeft: toNum(payload.daysLeft, 0),
      renewalLink: payload.renewalLink || process.env.DASHBOARD_URL || 'https://seller.publicdukan.com',
      isExpired: Boolean(payload.isExpired),
      userId: req.user?._id,
      businessId: payload.businessId,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to send plan notification email' });
  }
};

export const sendNearbyShops = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.to || !Array.isArray(payload.shops)) {
      return res.status(400).json({ success: false, message: 'to and shops[] are required' });
    }

    const result = await sendNearbyShopsEmail({
      to: payload.to,
      userName: payload.userName || 'User',
      shops: payload.shops,
      userLocation: payload.userLocation || '',
      radius: toNum(payload.radius, 2),
      userId: req.user?._id,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to send nearby shops email' });
  }
};

export const sendReferralEmails = async (req, res) => {
  try {
    const payload = req.body || {};
    const { referredEmail, referrerEmail, referredName, referrerName, referralCode, referralLink, rewardAmount = 0 } = payload;

    if (!referredEmail || !referrerEmail) {
      return res.status(400).json({ success: false, message: 'referredEmail and referrerEmail are required' });
    }

    const welcome = await sendReferralWelcomeEmail({
      to: referredEmail,
      referredName: referredName || 'User',
      referrerName: referrerName || 'Friend',
      referralLink: referralLink || process.env.PUBLIC_WEBSITE_URL || 'https://publicdukan.com',
    });

    const reward = await sendReferralRewardEmail({
      to: referrerEmail,
      referrerName: referrerName || 'Referrer',
      referredName: referredName || 'User',
      referralCode: referralCode || 'REFCODE',
      referralLink: referralLink || process.env.PUBLIC_WEBSITE_URL || 'https://publicdukan.com',
      rewardAmount: toNum(rewardAmount, 0),
    });

    return res.status(200).json({ success: true, data: { welcome, reward } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to send referral emails' });
  }
};
