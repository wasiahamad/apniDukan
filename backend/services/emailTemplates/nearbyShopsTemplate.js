import { createEmailLayout, escapeHtml } from './emailLayout.js';

export const generateNearbyShopsTemplate = (userData) => {
  const { userName, shops, userLocation, radius } = userData;
  const safeUser = escapeHtml(userName || 'Customer');
  const safeLocation = escapeHtml(userLocation || 'your area');
  const safeRadius = escapeHtml(radius || 2);
  const shopCount = Array.isArray(shops) ? shops.length : 0;

  const shopsList = (shops || [])
    .map(
      (shop, idx) => `
        <div class="section alt" style="margin-bottom:14px;">
          <div class="kv">
            <div>
              <strong>${idx + 1}. ${escapeHtml(shop.name || 'Shop')}</strong>
              <div class="muted">${escapeHtml(shop.category || 'Local business')}</div>
            </div>
            <div class="pill">${escapeHtml(shop.distance || '')} km</div>
          </div>
          <div class="muted" style="line-height:1.7; margin-top: 8px;">
            ${shop.location ? `<div><strong>Location:</strong> ${escapeHtml(shop.location)}</div>` : ''}
            ${shop.description ? `<div><strong>About:</strong> ${escapeHtml(shop.description)}</div>` : ''}
          </div>
        </div>
      `
    )
    .join('');

  const html = createEmailLayout({
    title: 'New Shops Near You',
    preheader: 'Nearby shop alert',
    heroTitle: 'New shops near you',
    heroSubtitle: `We found ${shopCount} new shop(s) within ${safeRadius} km of ${safeLocation}.`,
    badge: 'Nearby',
    heroGradient: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
    accent: '#1d4ed8',
    bodyHtml: `
      <p class="lead">Hi ${safeUser}, abhi ke abhi local businesses discover kijiye jo aapke paas aaye hain.</p>
      <div class="section">
        <div class="section-title">Nearby listings</div>
        ${shopsList || '<p class="lead" style="margin-bottom:0;">No nearby shops found right now.</p>'}
      </div>
      <div style="text-align:center; margin-top: 8px;">
        <a class="button" href="https://publicdukan.com/explore">Explore all shops</a>
      </div>
    `,
    footerNote: 'Discover local businesses, compare options, and support your community with PublicDukan.',
  });

  return { html };
};
