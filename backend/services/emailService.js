import nodemailer from 'nodemailer';

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
