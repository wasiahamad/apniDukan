export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderLinks = (links = []) =>
  links
    .filter(Boolean)
    .map((link) => `<a href="${escapeHtml(link.href)}" style="color:#0f766e;text-decoration:none;font-weight:600;">${escapeHtml(link.label)}</a>`)
    .join(' <span style="color:#94a3b8;">|</span> ');

export const publicDukanBrand = {
  name: 'PublicDukan',
  tagline: 'Local commerce, beautifully connected',
  homepage: 'https://publicdukan.com',
  supportEmail: 'support@publicdukan.com',
};

export const formatCurrency = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const formatDateIn = (value) => {
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return '';
  }
};

export const createEmailLayout = ({
  title,
  preheader = '',
  heroTitle = '',
  heroSubtitle = '',
  accent = '#0f766e',
  heroGradient = 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
  bodyHtml = '',
  footerLinks = [],
  footerNote = 'You are receiving this email because you have an active PublicDukan account or interaction.',
  badge = '',
}) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title || publicDukanBrand.name)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #eef2f7;
        font-family: Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
      }
      .wrapper {
        width: 100%;
        padding: 32px 16px;
        background:
          radial-gradient(circle at top left, rgba(20, 184, 166, 0.12), transparent 28%),
          radial-gradient(circle at top right, rgba(14, 165, 233, 0.10), transparent 32%),
          #eef2f7;
      }
      .card {
        max-width: 680px;
        margin: 0 auto;
        border-radius: 28px;
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
        border: 1px solid rgba(148, 163, 184, 0.18);
      }
      .hero {
        padding: 40px 36px 36px;
        color: #fff;
        background: ${heroGradient};
      }
      .brand-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 28px;
      }
      .brand {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 0.3px;
      }
      .badge {
        display: inline-block;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      }
      .hero h1 {
        margin: 0;
        font-size: 32px;
        line-height: 1.18;
        letter-spacing: -0.02em;
      }
      .hero p {
        margin: 12px 0 0;
        font-size: 15px;
        line-height: 1.7;
        color: rgba(255, 255, 255, 0.92);
        max-width: 560px;
      }
      .content {
        padding: 36px;
        background: #fff;
      }
      .eyebrow {
        display: inline-block;
        margin-bottom: 16px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(15, 118, 110, 0.10);
        color: ${accent};
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .lead {
        font-size: 16px;
        line-height: 1.75;
        color: #334155;
        margin: 0 0 20px;
      }
      .section {
        margin: 22px 0;
        padding: 18px;
        border-radius: 20px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }
      .section.alt {
        background: #fff;
      }
      .section-title {
        margin: 0 0 10px;
        font-size: 15px;
        font-weight: 800;
        color: #0f172a;
      }
      .kv {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        padding: 10px 0;
        border-bottom: 1px solid #e2e8f0;
      }
      .kv:last-child { border-bottom: 0; }
      .kv strong { color: #0f172a; }
      .muted { color: #64748b; }
      .value-box {
        padding: 18px;
        border-radius: 18px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        border: 1px solid #e2e8f0;
      }
      .button {
        display: inline-block;
        padding: 14px 22px;
        border-radius: 14px;
        background: ${accent};
        color: #fff !important;
        text-decoration: none;
        font-weight: 800;
        font-size: 14px;
        box-shadow: 0 10px 24px rgba(15, 118, 110, 0.22);
      }
      .button.secondary {
        background: transparent;
        color: ${accent} !important;
        border: 1px solid rgba(15, 118, 110, 0.25);
        box-shadow: none;
      }
      .pill {
        display: inline-block;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(15, 118, 110, 0.10);
        color: ${accent};
        font-size: 12px;
        font-weight: 700;
      }
      .note {
        margin-top: 18px;
        padding: 14px 16px;
        border-radius: 16px;
        background: #fff7ed;
        border: 1px solid #fdba74;
        color: #9a3412;
        font-size: 13px;
        line-height: 1.6;
      }
      .footer {
        padding: 24px 36px 34px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
      }
      .footer p {
        margin: 0 0 10px;
        color: #64748b;
        font-size: 12px;
        line-height: 1.6;
      }
      .footer .links {
        margin-top: 8px;
      }
      @media (max-width: 640px) {
        .wrapper { padding: 18px 8px; }
        .hero, .content, .footer { padding-left: 18px; padding-right: 18px; }
        .hero h1 { font-size: 26px; }
        .brand-row { flex-direction: column; align-items: flex-start; }
        .kv { flex-direction: column; }
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="card">
        <div class="hero">
          <div class="brand-row">
            <div class="brand">PublicDukan</div>
            ${badge ? `<div class="badge">${escapeHtml(badge)}</div>` : ''}
          </div>
          ${heroTitle ? `<h1>${escapeHtml(heroTitle)}</h1>` : ''}
          ${heroSubtitle ? `<p>${escapeHtml(heroSubtitle)}</p>` : ''}
        </div>
        <div class="content">
          ${preheader ? `<div class="eyebrow">${escapeHtml(preheader)}</div>` : ''}
          ${bodyHtml}
        </div>
        <div class="footer">
          <p><strong>PublicDukan</strong> · ${escapeHtml(publicDukanBrand.tagline)}</p>
          <p>${escapeHtml(footerNote)}</p>
          <p class="links">${renderLinks([
            { label: 'Website', href: publicDukanBrand.homepage },
            { label: 'Support', href: `mailto:${publicDukanBrand.supportEmail}` },
            ...footerLinks,
          ])}</p>
        </div>
      </div>
    </div>
  </body>
</html>
`;

export const createTextSection = (lines = []) => lines.filter(Boolean).join('\n');
