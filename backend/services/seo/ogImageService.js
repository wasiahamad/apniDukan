import sharp from 'sharp';
import mongoose from 'mongoose';
import { Business, Listing } from '../../models/index.js';

const escapeXml = (value) =>
  String(value || '').replace(/[<>&"']/g, (ch) => {
    switch (ch) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
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

const svgTemplate = ({ title, subtitle, footer }) => {
  const safeTitle = escapeXml(truncate(title, 70));
  const safeSubtitle = escapeXml(truncate(subtitle, 110));
  const safeFooter = escapeXml(truncate(footer, 80));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#22c55e" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)" />

  <rect x="80" y="92" width="1040" height="12" rx="6" fill="url(#accent)" opacity="0.95" />

  <g>
    <text x="80" y="230" fill="#ffffff" font-size="64" font-family="Arial, Helvetica, sans-serif" font-weight="700">
      ${safeTitle}
    </text>
    <text x="80" y="315" fill="#d1d5db" font-size="34" font-family="Arial, Helvetica, sans-serif" font-weight="400">
      ${safeSubtitle}
    </text>
  </g>

  <g>
    <text x="80" y="560" fill="#9ca3af" font-size="26" font-family="Arial, Helvetica, sans-serif">
      ${safeFooter}
    </text>
    <text x="1120" y="560" fill="#ffffff" font-size="26" font-family="Arial, Helvetica, sans-serif" text-anchor="end">
      PublicDukan
    </text>
  </g>
</svg>`;
};

export const generateOgPng = async ({ type, slug, listingIdOrSlug }) => {
  const t = String(type || '').trim().toLowerCase();

  if (t === 'shop') {
    const business = await Business.findOne({ slug: String(slug || '').trim().toLowerCase(), isActive: true })
      .populate('businessType', 'name')
      .select('name address businessType')
      .lean();

    const title = business?.name || 'PublicDukan';
    const subtitleParts = [];
    if (business?.businessType?.name) subtitleParts.push(business.businessType.name);
    if (business?.address?.city) subtitleParts.push(business.address.city);
    if (business?.address?.state) subtitleParts.push(business.address.state);

    const subtitle = subtitleParts.join(' • ') || 'Local shop on PublicDukan';
    const footer = business?.address?.pincode ? `Pincode: ${business.address.pincode}` : 'publicdukan.com';

    const svg = svgTemplate({ title, subtitle, footer });
    return sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();
  }

  if (t === 'listing') {
    const idOrSlug = String(listingIdOrSlug || '').trim();
    if (!idOrSlug) return null;

    const orClauses = [{ slug: idOrSlug }];
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      orClauses.unshift({ _id: idOrSlug });
    }

    const listing = await Listing.findOne({
      $or: orClauses,
      isActive: true,
    })
      .populate('business', 'name address')
      .populate('category', 'name')
      .select('title listingType business category')
      .lean();

    if (!listing) return null;

    const title = listing?.title || 'Listing';
    const subtitleParts = [];
    if (listing?.listingType) subtitleParts.push(listing.listingType);
    if (listing?.category?.name) subtitleParts.push(listing.category.name);
    if (listing?.business?.name) subtitleParts.push(listing.business.name);

    const subtitle = subtitleParts.join(' • ') || 'Available on PublicDukan';
    const footerParts = [];
    if (listing?.business?.address?.city) footerParts.push(listing.business.address.city);
    if (listing?.business?.address?.state) footerParts.push(listing.business.address.state);

    const footer = footerParts.join(', ') || 'publicdukan.com';

    const svg = svgTemplate({ title, subtitle, footer });
    return sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();
  }

  return null;
};
