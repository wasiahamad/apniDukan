import nodemailer from 'nodemailer';
import { EmailEventLog } from '../models/index.js';
import dns from 'dns';

let cachedTransporter = null;

const safeTrim = (v) => String(v || '').trim();
const normalizeSmtpPassword = (v) => String(v || '').replace(/[\s\r\n]+/g, '');

const redactEmail = (email) => {
  const e = safeTrim(email);
  const at = e.indexOf('@');
  if (at <= 1) return e ? '***' : '';
  return `${e.slice(0, 1)}***${e.slice(at)}`;
};

const formatSmtpError = (err) => {
  if (!err) return 'unknown_error';
  const e = err;
  const details = {
    message: safeTrim(e?.message || e),
    code: e?.code,
    command: e?.command,
    responseCode: e?.responseCode,
    response: safeTrim(e?.response),
  };
  return JSON.stringify(details);
};

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const host = safeTrim(process.env.EMAIL_HOST);
  const port = Number(safeTrim(process.env.EMAIL_PORT || 587));
  const user = safeTrim(process.env.EMAIL_USER);
  const pass = normalizeSmtpPassword(process.env.EMAIL_PASS);
  const debug = String(process.env.EMAIL_DEBUG || '').toLowerCase() === 'true';
  const connectionTimeoutMs = Number(safeTrim(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 15000));
  const greetingTimeoutMs = Number(safeTrim(process.env.EMAIL_GREETING_TIMEOUT_MS || 15000));
  const socketTimeoutMs = Number(safeTrim(process.env.EMAIL_SOCKET_TIMEOUT_MS || 30000));

  if (!host || !user || !pass) {
    return null;
  }

  // Some hosts have partial/broken IPv6 egress; prefer IPv4.
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    // ignore
  }

  if (debug || process.env.NODE_ENV !== 'production') {
    console.log(`[SMTP] init host=${host} port=${port} user=${redactEmail(user)} secure=${port === 465}`);
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    ...(port === 587 ? { requireTLS: true } : {}),
    ...(debug ? { logger: true, debug: true } : {}),
    connectionTimeout: connectionTimeoutMs,
    greetingTimeout: greetingTimeoutMs,
    socketTimeout: socketTimeoutMs,
    tls: { minVersion: 'TLSv1.2' },
  });

  return cachedTransporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const smtpUser = safeTrim(process.env.EMAIL_USER);
  const configuredFrom = safeTrim(process.env.EMAIL_FROM);
  const from = configuredFrom || smtpUser;
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('Email transport is not configured. Falling back to console logging.');
    console.log(`[Email Fallback] To: ${to} | Subject: ${subject} | Body: ${text}`);
    return { sent: false, fallback: true };
  }

  const mail = {
    from,
    to,
    subject,
    text,
    html,
  };

  // Gmail commonly rejects spoofed From headers; use replyTo for branding.
  if (
    smtpUser &&
    configuredFrom &&
    configuredFrom.toLowerCase() !== smtpUser.toLowerCase() &&
    /@gmail\.com$/i.test(smtpUser)
  ) {
    mail.from = smtpUser;
    mail.replyTo = configuredFrom;
  }

  try {
    const info = await transporter.sendMail(mail);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Email] sent to=${redactEmail(to)} messageId=${safeTrim(info?.messageId)}`);
    }
    return { sent: true, fallback: false, messageId: safeTrim(info?.messageId) };
  } catch (e) {
    console.error(`[Email] send failed to=${redactEmail(to)} err=${formatSmtpError(e)}`);
    throw e;
  }
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
