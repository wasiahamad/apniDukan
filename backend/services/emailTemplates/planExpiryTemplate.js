import { createEmailLayout, escapeHtml, formatDateIn } from './emailLayout.js';

export const generatePlanExpiryTemplate = (planData) => {
  const { businessName, planName, expiryDate, daysLeft, renewalLink, isExpired } = planData;
  const safeBusiness = escapeHtml(businessName || 'Business');
  const safePlan = escapeHtml(planName || 'Plan');
  const safeDate = formatDateIn(expiryDate);
  const accent = isExpired ? '#dc2626' : '#d97706';
  const gradient = isExpired
    ? 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)'
    : 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)';

  const bodyHtml = isExpired
    ? `
      <p class="lead">Hi ${safeBusiness}, your ${safePlan} plan has expired and your business may be missing active visibility.</p>
      <div class="section alt" style="border-left:4px solid #dc2626;">
        <div class="section-title">Expired plan</div>
        <div class="kv"><strong>Plan</strong><span class="muted">${safePlan}</span></div>
        <div class="kv"><strong>Expired on</strong><span class="muted">${safeDate}</span></div>
        <div class="kv"><strong>Status</strong><span class="muted">Inactive until renewed</span></div>
      </div>
      <p class="lead">Renew now to restore business visibility, leads, and customer access.</p>
      <div style="text-align:center; margin-top:8px;">
        <a class="button" href="${escapeHtml(renewalLink || '#')}" style="background:${accent};">Renew Plan</a>
      </div>
    `
    : `
      <p class="lead">Hi ${safeBusiness}, your ${safePlan} plan is approaching expiry. Renewing now keeps your business active without interruption.</p>
      <div class="section alt" style="border-left:4px solid #f59e0b;">
        <div class="section-title">Plan status</div>
        <div class="kv"><strong>Plan</strong><span class="muted">${safePlan}</span></div>
        <div class="kv"><strong>Expires on</strong><span class="muted">${safeDate}</span></div>
        <div class="kv"><strong>Days left</strong><span class="muted">${escapeHtml(daysLeft)}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Why renew now</div>
        <p class="lead" style="margin-bottom:0;">Keep your listing active, continue receiving leads, and avoid service interruptions.</p>
      </div>
      <div style="text-align:center; margin-top:8px;">
        <a class="button" href="${escapeHtml(renewalLink || '#')}" style="background:${accent};">Renew Your Plan</a>
      </div>
    `;

  const html = createEmailLayout({
    title: isExpired ? 'Plan Expired' : 'Plan Expiring Soon',
    preheader: isExpired ? 'Action required' : 'Renew before expiry',
    heroTitle: isExpired ? 'Plan expired' : 'Plan expiring soon',
    heroSubtitle: isExpired
      ? 'Renew now to restore visibility and keep your shop active.'
      : `Only ${escapeHtml(daysLeft)} day(s) left before expiry.`,
    badge: isExpired ? 'Expired' : 'Reminder',
    heroGradient: gradient,
    accent,
    bodyHtml,
    footerNote: 'Renewing on time helps keep your business active and visible to customers.',
  });

  return { html };
};
