import { Business, Listing, Category } from '../../models/index.js';
import { getEffectiveEntitlementsForBusiness } from '../entitlementsService.js';
import { getHostInfo, buildCanonicalUrl } from './storefrontHost.js';

const escapeHtml = (value) =>
  String(value || '').replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return ch;
    }
  });

const truncate = (value, max) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.length <= max) return raw;
  return `${raw.slice(0, Math.max(0, max - 3))}...`;
};

const uniqueStrings = (items) => {
  const out = [];
  const seen = new Set();
  for (const item of items || []) {
    const v = String(item || '').trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
};

const getBusinessGeo = (business) => {
  const geo = {};
  const coords = business?.address?.location?.coordinates;
  if (Array.isArray(coords) && coords.length === 2) {
    const [lng, lat] = coords;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      geo.lat = lat;
      geo.lng = lng;
    }
  }

  const legacy = business?.address?.coordinates;
  if ((!geo.lat || !geo.lng) && legacy && typeof legacy === 'object') {
    const lat = Number(legacy.latitude);
    const lng = Number(legacy.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      geo.lat = lat;
      geo.lng = lng;
    }
  }

  return geo;
};

const buildLocalSeoKeywords = ({ business, businessTypeName, city, state, extra = [] }) => {
  const baseType = String(businessTypeName || '').trim() || 'Local business';
  const shopName = String(business?.name || '').trim();

  const phrases = [];

  if (shopName && city) phrases.push(`${shopName} ${city}`);
  if (baseType && city) phrases.push(`${baseType} in ${city}`);
  if (baseType && city && state) phrases.push(`${baseType} in ${city} ${state}`);
  if (shopName && baseType) phrases.push(`${shopName} ${baseType}`);
  if (city) phrases.push(`nearby ${baseType} ${city}`);
  if (state) phrases.push(`${baseType} ${state}`);

  for (const e of extra || []) phrases.push(e);

  return uniqueStrings(phrases).slice(0, 25);
};

export const resolvePublicBusinessForSubdomain = async (subdomain) => {
  const slug = String(subdomain || '').trim().toLowerCase();
  if (!slug) return null;

  const business = await Business.findOne({ slug, isActive: true, isVerified: true })
    .populate('businessType', 'name nameHi slug')
    .populate('plan');

  if (!business) return null;

  const now = new Date();
  const planIsActive = !!business.plan && !!business.planExpiresAt && new Date(business.planExpiresAt) > now;
  if (!planIsActive) return null;

  const effective = await getEffectiveEntitlementsForBusiness(business, { now });
  if (effective?.features?.publicShopEnabled !== true) return null;

  return business;
};

export const buildLocalBusinessJsonLd = ({ business, canonicalUrl }) => {
  if (!business) return null;

  const geo = getBusinessGeo(business);
  const image = String(business?.coverImage || business?.logo || '').trim();

  const address = {
    '@type': 'PostalAddress',
    streetAddress: business?.address?.street || undefined,
    addressLocality: business?.address?.city || undefined,
    addressRegion: business?.address?.state || undefined,
    postalCode: business?.address?.pincode || undefined,
    addressCountry: 'IN',
  };

  const sameAs = uniqueStrings([
    business?.socialMedia?.facebook,
    business?.socialMedia?.instagram,
    business?.socialMedia?.twitter,
    business?.socialMedia?.youtube,
    ...(Array.isArray(business?.socialMediaCustom) ? business.socialMediaCustom.map((x) => x?.url) : []),
  ]).filter((u) => /^https?:\/\//i.test(u));

  const json = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business?.name,
    url: canonicalUrl,
    image: image || undefined,
    telephone: business?.phone || undefined,
    address,
    geo:
      geo.lat && geo.lng
        ? {
            '@type': 'GeoCoordinates',
            latitude: geo.lat,
            longitude: geo.lng,
          }
        : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };

  return json;
};

export const buildSeoHeadTags = ({ req, business, routeTitle, routeDescription, ogImageUrl }) => {
  const hostInfo = getHostInfo(req);
  const canonicalUrl = buildCanonicalUrl({ hostInfo, path: req.originalUrl?.split('?')?.[0] || '/' });

  const city = String(business?.address?.city || '').trim();
  const state = String(business?.address?.state || '').trim();
  const businessTypeName = String(business?.businessType?.name || '').trim();

  const titleRaw = truncate(
    routeTitle ||
      (business
        ? `${business.name}${businessTypeName ? ` | ${businessTypeName}` : ''}${city ? ` | ${city}` : ''}${state ? `, ${state}` : ''}`
        : 'PublicDukan - Local Shops & Services'),
    70
  );

  const descriptionRaw = truncate(
    routeDescription ||
      (business
        ? business.description || `${businessTypeName || 'Local shop'} in ${city || 'your city'} — contact, location, products & services.`
        : 'PublicDukan — local shops & services discovery.'),
    160
  );

  const geo = business ? getBusinessGeo(business) : {};

  const keywords = buildLocalSeoKeywords({
    business,
    businessTypeName,
    city,
    state,
  });

  const googleVerification = String(process.env.GOOGLE_SITE_VERIFICATION || '').trim();

  const jsonLd = business ? buildLocalBusinessJsonLd({ business, canonicalUrl }) : null;

  const tags = [];

  tags.push(`<title>${escapeHtml(titleRaw)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(descriptionRaw)}" />`);
  tags.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);

  // Indexing
  tags.push(`<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />`);

  // OG
  tags.push(`<meta property="og:title" content="${escapeHtml(titleRaw)}" />`);
  tags.push(`<meta property="og:description" content="${escapeHtml(descriptionRaw)}" />`);
  tags.push(`<meta property="og:type" content="website" />`);
  tags.push(`<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
  if (ogImageUrl) tags.push(`<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />`);

  // Twitter
  tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(titleRaw)}" />`);
  tags.push(`<meta name="twitter:description" content="${escapeHtml(descriptionRaw)}" />`);
  if (ogImageUrl) tags.push(`<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />`);

  // Local meta
  if (city) tags.push(`<meta name="geo.placename" content="${escapeHtml(city)}" />`);
  // We don't currently store ISO-3166-2 codes, so expose a readable region.
  if (state) tags.push(`<meta name="geo.region" content="${escapeHtml(state)}" />`);
  if (geo.lat && geo.lng) {
    tags.push(`<meta name="geo.position" content="${escapeHtml(`${geo.lat};${geo.lng}`)}" />`);
    tags.push(`<meta name="ICBM" content="${escapeHtml(`${geo.lat}, ${geo.lng}`)}" />`);
    tags.push(`<meta property="place:location:latitude" content="${escapeHtml(geo.lat)}" />`);
    tags.push(`<meta property="place:location:longitude" content="${escapeHtml(geo.lng)}" />`);
  }

  if (businessTypeName) tags.push(`<meta name="category" content="${escapeHtml(businessTypeName)}" />`);
  if (keywords.length) tags.push(`<meta name="keywords" content="${escapeHtml(keywords.join(', '))}" />`);

  if (googleVerification) {
    tags.push(`<meta name="google-site-verification" content="${escapeHtml(googleVerification)}" />`);
  }

  if (jsonLd) {
    // Keep valid JSON (do not HTML-escape quotes). Only escape '<' to avoid accidentally forming tags.
    const safeJson = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
    tags.push(`<script type="application/ld+json">${safeJson}</script>`);
  }

  return { tags: tags.join('\n    '), canonicalUrl, title: titleRaw, description: descriptionRaw };
};

const stripExistingSeoTags = (html) => {
  if (!html) return html;

  let out = html;
  // Remove common SEO tags to prevent duplicates.
  out = out.replace(/<title>[\s\S]*?<\/title>/gi, '');
  out = out.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
  out = out.replace(/<meta\s+name=["']keywords["'][^>]*>/gi, '');
  out = out.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');

  out = out.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '');
  out = out.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');
  out = out.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '');

  out = out.replace(/<meta\s+name=["']geo\.[^"']+["'][^>]*>/gi, '');
  out = out.replace(/<meta\s+name=["']ICBM["'][^>]*>/gi, '');
  out = out.replace(/<meta\s+property=["']place:location:[^"']+["'][^>]*>/gi, '');
  out = out.replace(/<meta\s+name=["']google-site-verification["'][^>]*>/gi, '');

  // Remove LocalBusiness JSON-LD injected earlier
  out = out.replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');

  return out;
};

export const injectSeoIntoHtml = ({ html, headTags }) => {
  const safe = stripExistingSeoTags(html);
  const needle = '</head>';
  const idx = safe.toLowerCase().lastIndexOf(needle);
  if (idx === -1) return safe;

  return `${safe.slice(0, idx)}\n    ${headTags}\n  ${safe.slice(idx)}`;
};

export const isBotRequest = (req) => {
  const ua = String(req.get('user-agent') || '').toLowerCase();
  if (!ua) return false;
  return /googlebot|bingbot|yandexbot|duckduckbot|baiduspider|slurp|facebookexternalhit|twitterbot|linkedinbot|embedly|pinterest|whatsapp|telegrambot/i.test(
    ua
  );
};

export const renderBotHtml = async ({ req, business }) => {
  const hostInfo = getHostInfo(req);
  const canonicalUrl = buildCanonicalUrl({ hostInfo, path: req.originalUrl?.split('?')?.[0] || '/' });

  const listings = await Listing.find({ business: business._id, isActive: true })
    .select('_id slug title listingType category')
    .populate('category', 'name slug')
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(120)
    .lean();

  const categories = await Category.find({ isActive: true })
    .select('name slug')
    .sort({ name: 1 })
    .limit(200)
    .lean();

  const uniqueCategories = [];
  const seenCategorySlugs = new Set();
  for (const c of categories || []) {
    const slug = String(c?.slug || '').trim();
    if (!slug) continue;
    if (seenCategorySlugs.has(slug)) continue;
    seenCategorySlugs.add(slug);
    uniqueCategories.push(c);
  }

  const products = listings.filter((l) => l.listingType === 'product');
  const services = listings.filter((l) => l.listingType === 'service');

  const buildLinks = (arr, basePath) =>
    arr
      .slice(0, 50)
      .map((l) => {
        const slugOrId = l.slug || l._id;
        return `<li><a href="${escapeHtml(`${basePath}/${encodeURIComponent(String(slugOrId))}`)}">${escapeHtml(l.title)}</a></li>`;
      })
      .join('');

  const catLinks = uniqueCategories
    .slice(0, 40)
    .map((c) => `<li><a href="/categories/${escapeHtml(encodeURIComponent(c.slug))}">${escapeHtml(c.name)}</a></li>`)
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta name="robots" content="index,follow" />
    <title>${escapeHtml(truncate(`${business.name} | ${business.address?.city || ''}`, 70))}</title>
    <meta name="description" content="${escapeHtml(truncate(business.description || `Visit ${business.name} on PublicDukan.`, 160))}" />
  </head>
  <body>
    <h1>${escapeHtml(business.name)}</h1>
    <p>${escapeHtml([business.address?.street, business.address?.city, business.address?.state, business.address?.pincode].filter(Boolean).join(', '))}</p>

    ${products.length ? `<h2>Products</h2><ul>${buildLinks(products, '/products')}</ul>` : ''}
    ${services.length ? `<h2>Services</h2><ul>${buildLinks(services, '/services')}</ul>` : ''}

    ${catLinks ? `<h2>Categories</h2><ul>${catLinks}</ul>` : ''}

    <p><a href="/">Open full website</a></p>
  </body>
</html>`;
};
