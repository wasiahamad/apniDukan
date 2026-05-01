import { createEmailLayout, escapeHtml } from './emailLayout.js';

export const generateContactEmailTemplate = (name, email, message) => {
  const safeName = escapeHtml(name || 'User');
  const safeEmail = escapeHtml(email || '');
  const safeMessage = escapeHtml(message || '').replace(/\n/g, '<br />');

  const adminHtml = createEmailLayout({
    title: 'PublicDukan - New Contact Message',
    preheader: 'New support message',
    heroTitle: 'New contact form submission',
    heroSubtitle: 'A visitor reached out from the public contact form.',
    badge: 'Support',
    bodyHtml: `
      <p class="lead">A new message arrived from the PublicDukan website. Details are below.</p>
      <div class="section">
        <div class="kv"><strong>Name</strong><span class="muted">${safeName}</span></div>
        <div class="kv"><strong>Email</strong><span class="muted"><a href="mailto:${safeEmail}" style="color:#0f766e;text-decoration:none;">${safeEmail}</a></span></div>
      </div>
      <div class="section alt">
        <div class="section-title">Message</div>
        <div class="value-box" style="white-space:normal; line-height:1.75;">${safeMessage}</div>
      </div>
      <p class="lead" style="margin-bottom:0;">Reply directly to the sender using the email address above.</p>
    `,
    footerNote: 'This message was generated from the public contact form.',
  });

  const userHtml = createEmailLayout({
    title: 'PublicDukan - Message Received',
    preheader: 'We got your message',
    heroTitle: 'Thanks for reaching out',
    heroSubtitle: 'Our team has received your message and will respond soon.',
    badge: 'Support',
    heroGradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
    bodyHtml: `
      <p class="lead">Hi ${safeName}, thanks for contacting PublicDukan. We have received your message and our support team will review it shortly.</p>
      <div class="section">
        <div class="section-title">What happens next</div>
        <p class="lead" style="margin-bottom:0;">We usually reply within 24 hours. If your request is urgent, feel free to write again with more details.</p>
      </div>
      <div style="text-align:center; margin-top: 8px;">
        <a class="button" href="https://publicdukan.com">Visit PublicDukan</a>
      </div>
    `,
  });

  return { adminHtml, userHtml };
};
