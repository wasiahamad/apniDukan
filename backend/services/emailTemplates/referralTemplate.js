import { createEmailLayout, escapeHtml, formatCurrency } from './emailLayout.js';

export const generateReferralTemplate = (referralData) => {
  const { referrerName, referredName, referralCode, referralLink, rewardAmount, isReferrer } = referralData;
  const safeReferrer = escapeHtml(referrerName || 'Referrer');
  const safeReferred = escapeHtml(referredName || 'User');

  if (isReferrer) {
    const html = createEmailLayout({
      title: 'Referral Reward Earned',
      preheader: 'You earned a reward',
      heroTitle: 'Referral reward credited',
      heroSubtitle: 'A new member joined PublicDukan through your referral.',
      badge: 'Reward',
      heroGradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
      accent: '#d97706',
      bodyHtml: `
        <p class="lead">Hi ${safeReferrer}, great news. ${safeReferred} joined using your referral code.</p>
        <div class="section alt" style="text-align:center; border-left:4px solid #d97706;">
          <div class="section-title">Reward earned</div>
          <div style="font-size:40px; font-weight:900; color:#b45309;">${formatCurrency(rewardAmount)}</div>
          <div class="pill">Referral code: ${escapeHtml(referralCode || '')}</div>
        </div>
        <div class="section">
          <div class="section-title">Keep sharing</div>
          <p class="lead" style="margin-bottom:0;">Aur logon ko invite kijiye aur rewards ka silsila continue rakhiye.</p>
        </div>
        <div style="text-align:center; margin-top: 8px;">
          <a class="button" href="${escapeHtml(referralLink || '#')}" style="background:#d97706;">Share referral link</a>
        </div>
      `,
      footerNote: 'Referral rewards are processed according to active campaign rules.',
    });
    return { html, type: 'referrer_reward' };
  }

  const html = createEmailLayout({
    title: 'Welcome to PublicDukan',
    preheader: 'A friend invited you',
    heroTitle: 'Welcome to PublicDukan',
    heroSubtitle: "You joined through a friend's referral and may be eligible for welcome rewards.",
    badge: 'Welcome',
    bodyHtml: `
      <p class="lead">Hi ${safeReferred}, you were invited by ${safeReferrer}. Welcome to PublicDukan.</p>
      <div class="section alt">
        <div class="section-title">Your referral info</div>
        <div class="kv"><strong>Referred by</strong><span class="muted">${safeReferrer}</span></div>
        <div class="kv"><strong>Referral code</strong><span class="muted">${escapeHtml(referralCode || '—')}</span></div>
      </div>
      <div class="section">
        <div class="section-title">What you can do now</div>
        <p class="lead" style="margin-bottom:0;">Nearby businesses browse kijiye, apni listing start kijiye, aur special offers explore kijiye.</p>
      </div>
      <div style="text-align:center; margin-top: 8px;">
        <a class="button" href="${escapeHtml(referralLink || 'https://publicdukan.com/explore')}">Start exploring</a>
      </div>
    `,
    footerNote: 'Welcome to the PublicDukan community.',
  });

  return { html, type: 'referral_welcome' };
};
