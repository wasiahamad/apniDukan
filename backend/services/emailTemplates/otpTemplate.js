import { createEmailLayout, escapeHtml } from './emailLayout.js';

export const generateOtpEmailTemplate = (name, otp, ttlMinutes, purpose = 'verification') => {
  const action = purpose === 'verification' ? 'verify your account' : 'reset your password';
  const actionTitle = purpose === 'verification' ? 'Account Verification' : 'Password Reset';
  const safeName = escapeHtml(name || 'Dukandar');
  const safeOtp = escapeHtml(otp);

  const bodyHtml = `
    <p class="lead">Hi ${safeName}, we received a request to ${escapeHtml(action)} on PublicDukan.</p>
    <div class="section alt" style="text-align:center;">
      <div class="section-title">Your OTP Code</div>
      <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#0f766e;margin:10px 0 8px;">${safeOtp}</div>
      <div class="pill">Valid for ${escapeHtml(ttlMinutes)} minutes</div>
    </div>
    <div class="section">
      <div class="section-title">Security notice</div>
      <p class="lead" style="margin-bottom:0;">Never share this OTP with anyone. PublicDukan will never ask for it by phone, chat, or email.</p>
    </div>
    <p class="lead" style="margin-bottom:0;">If you didn't request this, you can safely ignore this email.</p>
  `;

  const html = createEmailLayout({
    title: `PublicDukan - ${actionTitle}`,
    preheader: 'One-time password',
    heroTitle: actionTitle,
    heroSubtitle: `Use this code to ${action}.`,
    badge: 'OTP',
    bodyHtml,
    footerNote: 'This code expires quickly for your security.',
  });

  const text = `Hi ${name || 'Dukandar'},\n\nYour OTP is: ${otp}\n\nUse this OTP to ${action}. This OTP expires in ${ttlMinutes} minutes.\n\nIf you did not request this, please ignore this email.\n\nPublicDukan`;

  return { html, text };
};
