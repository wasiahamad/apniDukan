import nodemailer from 'nodemailer';
import { EmailEventLog } from '../models/index.js';

let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('Email transport is not configured. Falling back to console logging.');
    console.log(`[Email Fallback] To: ${to} | Subject: ${subject} | Body: ${text}`);
    return { sent: false, fallback: true };
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  return { sent: true, fallback: false };
};

const safeKey = (v) => String(v || '').replace(/[\s\r\n]+/g, ' ').trim();

/**
 * sendEmailOnce({ dedupeKey, type, to, subject, text, html, userId, businessId, meta })
 *
 * - Ensures exactly-once semantics per `dedupeKey` when status is already 'sent'.
 * - Allows retry if previous status is 'failed'.
 */
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

  // Reserve the send slot unless already sent.
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
    // Under concurrency, two upserts may race and one can lose with E11000.
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
      { $set: { status: result?.sent ? 'sent' : 'failed', sentAt: result?.sent ? new Date() : undefined, error: result?.sent ? undefined : 'email_fallback' } }
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

export const sendOtpEmail = async ({ to, name, otp, purpose, ttlMinutes }) => {
  const subject = purpose === 'verification' ? 'Verify your Dukandar account' : 'Reset your Dukandar password';
  const action = purpose === 'verification' ? 'verify your account' : 'reset your password';

  const text = `Hi ${name || 'Dukandar'},\n\nYour OTP is ${otp}. Use this OTP to ${action}. This OTP expires in ${ttlMinutes} minutes.\n\nIf you did not request this, please ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2 style="margin-bottom: 8px;">Hi ${name || 'Dukandar'},</h2>
      <p>Your OTP to ${action} is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0;">${otp}</p>
      <p>This OTP expires in <strong>${ttlMinutes} minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
};
