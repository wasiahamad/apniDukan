import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmailEventLog } from '../models/index.js';
import { generateOtpEmailTemplate } from '../templates/otpTemplate.js';
import { generateContactEmailTemplate } from '../templates/contactTemplate.js';
import { generateOrderConfirmationTemplate } from '../templates/orderTemplate.js';
import { generateBookingConfirmationTemplate } from '../templates/bookingTemplate.js';
import { generatePlanExpiryTemplate } from '../templates/planExpiryTemplate.js';
import { generateNearbyShopsTemplate } from '../templates/nearbyShopsTemplate.js';
import { generateReferralTemplate } from '../templates/referralTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backend/.env is loaded even when the process starts from the repo root.
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: false });

const safeTrim = (v) => String(v || '').trim();
const safeKey = (v) => String(v || '').replace(/[\s\r\n]+/g, ' ').trim();

const EMAIL_FROM = safeTrim(process.env.EMAIL_FROM || 'PublicDukan <noreply@publicdukan.com>');
const ADMIN_SUPPORT_EMAIL = safeTrim(process.env.ADMIN_SUPPORT_EMAIL || 'support@publicdukan.com');

const redactEmail = (email) => {
  const e = safeTrim(email);
  const at = e.indexOf('@');
  if (at <= 1) return e ? '***' : '';
  return `${e.slice(0, 1)}***${e.slice(at)}`;
};

const isResendConfigured = () => Boolean(safeTrim(process.env.RESEND_API_KEY));

const getResendClient = () => {
  const apiKey = safeTrim(process.env.RESEND_API_KEY);
  if (!apiKey) return null;
  return new Resend(apiKey);
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const recipient = safeTrim(to);
  const sub = safeTrim(subject);

  if (!recipient) throw new Error('to is required');
  if (!sub) throw new Error('subject is required');

  if (!isResendConfigured()) {
    console.warn('RESEND_API_KEY is not configured. Email send skipped.');
    console.log(`[Email Fallback] To: ${recipient} | Subject: ${sub}`);
    return { sent: false, fallback: true };
  }

  const resendClient = getResendClient();
  if (!resendClient) {
    console.warn('RESEND_API_KEY is not configured. Email send skipped.');
    return { sent: false, fallback: true };
  }

  const payload = {
    from: EMAIL_FROM,
    to: recipient,
    subject: sub,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
  };

  try {
    const { data, error } = await resendClient.emails.send(payload);
    if (error) throw new Error(error.message || 'Resend send failed');

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Email] sent to=${redactEmail(recipient)} id=${safeTrim(data?.id)}`);
    }

    return { sent: true, fallback: false, messageId: safeTrim(data?.id) };
  } catch (e) {
    console.error(`[Email] send failed to=${redactEmail(recipient)} err=${safeTrim(e?.message || e)}`);
    throw e;
  }
};

export const sendEmailOnce = async ({
  dedupeKey,
  type,
  to,
  subject,
  text,
  html,
  userId,
  businessId,
  meta,
}) => {
  const key = safeKey(dedupeKey);
  const emailTo = safeKey(to).toLowerCase();
  if (!key) throw new Error('dedupeKey is required');
  if (!emailTo) throw new Error('to is required');

  let reserved;
  try {
    reserved = await EmailEventLog.findOneAndUpdate(
      { dedupeKey: key, status: { $ne: 'sent' } },
      {
        $setOnInsert: {
          dedupeKey: key,
          type: safeKey(type) || 'email',
          to: emailTo,
          ...(userId ? { user: userId } : {}),
          ...(businessId ? { business: businessId } : {}),
        },
        $set: {
          lastAttemptAt: new Date(),
          status: 'sending',
          ...(meta ? { meta } : {}),
        },
        $inc: { attempts: 1 },
      },
      { new: true, upsert: true }
    ).lean();
  } catch (e) {
    if (String(e?.code) === '11000') {
      return { sent: false, skipped: true, reason: 'dedupe_race' };
    }
    throw e;
  }

  if (!reserved) {
    return { sent: false, skipped: true, reason: 'already_sent' };
  }

  try {
    const result = await sendEmail({ to: emailTo, subject, text, html });
    await EmailEventLog.updateOne(
      { dedupeKey: key },
      {
        $set: {
          status: result?.sent ? 'sent' : 'failed',
          sentAt: result?.sent ? new Date() : undefined,
          error: result?.sent ? undefined : 'email_fallback',
        },
      }
    );
    return { ...result, skipped: false };
  } catch (e) {
    await EmailEventLog.updateOne(
      { dedupeKey: key },
      { $set: { status: 'failed', error: safeKey(e?.message || e) } }
    );
    throw e;
  }
};

export const sendOtpEmail = async ({ to, name, otp, purpose = 'verification', ttlMinutes = 5 }) => {
  const { html, text } = generateOtpEmailTemplate(name, otp, ttlMinutes, purpose);
  return sendEmail({
    to,
    subject: 'Your OTP Code',
    text,
    html,
  });
};

export const sendContactFormEmail = async ({ name, email, message }) => {
  const { adminHtml, userHtml } = generateContactEmailTemplate(name, email, message);

  const now = Date.now();

  await sendEmailOnce({
    dedupeKey: `contact_admin:${safeKey(email)}:${now}`,
    type: 'contact_form_admin',
    to: ADMIN_SUPPORT_EMAIL,
    subject: 'New Contact Form Submission',
    html: adminHtml,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    meta: { name, email },
  });

  await sendEmailOnce({
    dedupeKey: `contact_user:${safeKey(email)}:${now}`,
    type: 'contact_form_user_confirm',
    to: email,
    subject: 'We received your message',
    html: userHtml,
    text: `Hi ${name}, we have received your message and our team will contact you soon.`,
    meta: { name },
  });

  return { sent: true };
};

export const sendOrderConfirmationEmail = async ({
  to,
  orderId,
  customerName,
  items,
  totalPrice,
  deliveryDate,
  deliveryAddress,
  orderDate,
  userId,
  businessId,
}) => {
  const { html } = generateOrderConfirmationTemplate({
    orderId,
    customerName,
    items,
    totalPrice,
    deliveryDate,
    deliveryAddress,
    orderDate,
  });

  return sendEmailOnce({
    dedupeKey: `order_confirmation:${safeKey(orderId)}`,
    type: 'order_confirmation',
    to,
    subject: `Order Confirmation - ${orderId}`,
    html,
    text: `Your order ${orderId} is confirmed. Total: INR ${totalPrice}.`,
    userId,
    businessId,
    meta: { orderId },
  });
};

export const sendBookingConfirmationEmail = async ({
  to,
  bookingId,
  customerName,
  serviceName,
  bookingDate,
  bookingTime,
  location,
  amount,
  userId,
  businessId,
}) => {
  const { html } = generateBookingConfirmationTemplate({
    bookingId,
    customerName,
    serviceName,
    bookingDate,
    bookingTime,
    location,
    amount,
  });

  return sendEmailOnce({
    dedupeKey: `booking_confirmation:${safeKey(bookingId)}`,
    type: 'booking_confirmation',
    to,
    subject: `Booking Confirmation - ${bookingId}`,
    html,
    text: `Your booking ${bookingId} is confirmed for ${bookingDate} ${bookingTime}.`,
    userId,
    businessId,
    meta: { bookingId },
  });
};

export const sendPlanExpiryEmail = async ({
  to,
  businessName,
  planName,
  expiryDate,
  daysLeft,
  renewalLink,
  isExpired,
  userId,
  businessId,
}) => {
  const { html } = generatePlanExpiryTemplate({
    businessName,
    planName,
    expiryDate,
    daysLeft,
    renewalLink,
    isExpired,
  });

  const kind = isExpired ? 'plan_expired' : 'plan_expiry_warning';
  const keySuffix = isExpired ? 'expired' : `${Math.max(0, Number(daysLeft) || 0)}d`;

  return sendEmailOnce({
    dedupeKey: `plan_notice:${safeKey(businessId || businessName)}:${keySuffix}:${safeKey(to)}`,
    type: kind,
    to,
    subject: isExpired ? 'Your plan has expired' : `Plan expires in ${daysLeft} day(s)`,
    html,
    text: isExpired
      ? `Your ${planName} plan has expired. Renew now: ${renewalLink}`
      : `Your ${planName} plan expires in ${daysLeft} day(s). Renew now: ${renewalLink}`,
    userId,
    businessId,
    meta: { planName, expiryDate, daysLeft, isExpired },
  });
};

export const sendNearbyShopsEmail = async ({
  to,
  userName,
  shops,
  userLocation,
  radius,
  userId,
}) => {
  const normalizedShops = Array.isArray(shops) ? shops : [];
  if (!normalizedShops.length) return { sent: false, skipped: true, reason: 'no_shops' };

  const { html } = generateNearbyShopsTemplate({
    userName,
    shops: normalizedShops,
    userLocation,
    radius,
  });

  return sendEmailOnce({
    dedupeKey: `nearby_shops:${safeKey(userId || to)}:${new Date().toISOString().slice(0, 10)}`,
    type: 'nearby_shops',
    to,
    subject: `New shops opened near you (${normalizedShops.length})`,
    html,
    text: `We found ${normalizedShops.length} new shop(s) near your area.`,
    userId,
    meta: { shopsCount: normalizedShops.length, radius },
  });
};

export const sendReferralWelcomeEmail = async ({ to, referredName, referrerName, referralLink }) => {
  const { html } = generateReferralTemplate({
    referredName,
    referrerName,
    referralLink,
    isReferrer: false,
  });

  return sendEmailOnce({
    dedupeKey: `referral_welcome:${safeKey(to)}:${safeKey(referrerName)}`,
    type: 'referral_welcome',
    to,
    subject: `You've been invited to PublicDukan by ${referrerName || 'your friend'}`,
    html,
    text: `Hi ${referredName || ''}, you were referred by ${referrerName || 'your friend'}. Join here: ${referralLink || ''}`,
    meta: { referrerName },
  });
};

export const sendReferralRewardEmail = async ({
  to,
  referrerName,
  referredName,
  referralCode,
  referralLink,
  rewardAmount,
}) => {
  const { html } = generateReferralTemplate({
    referrerName,
    referredName,
    referralCode,
    referralLink,
    rewardAmount,
    isReferrer: true,
  });

  return sendEmailOnce({
    dedupeKey: `referral_reward:${safeKey(to)}:${safeKey(referralCode || referredName)}`,
    type: 'referral_reward',
    to,
    subject: 'Referral Reward Confirmation',
    html,
    text: `Hi ${referrerName || ''}, referral reward of INR ${rewardAmount || 0} has been confirmed.`,
    meta: { referredName, referralCode, rewardAmount },
  });
};
