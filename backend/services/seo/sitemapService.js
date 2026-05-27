import { Business, Listing, Category } from '../../models/index.js';
import { getEffectiveEntitlementsForBusiness } from '../entitlementsService.js';

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

const toLastMod = (date) => {
  try {
    if (!date) return null;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
};

const ttlMs = () => {
  const n = Number(process.env.SEO_CACHE_TTL_SECONDS || 300);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.max(n, 30), 3600) * 1000;
};

const cache = new Map();

export const invalidateSitemapCache = ({ subdomain } = {}) => {
  const sd = String(subdomain || '').trim().toLowerCase();
  if (sd) {
    cache.delete(`sitemap:subdomain:${sd}`);
  }
  // Root sitemap includes all storefront origins.
  cache.delete('sitemap:root:root');
};

const dedupeBySlugKeepLatest = (items) => {
  const map = new Map();
  for (const it of items || []) {
    const slug = String(it?.slug || '').trim();
    if (!slug) continue;

    const prev = map.get(slug);
    if (!prev) {
      map.set(slug, it);
      continue;
    }

    const prevTs = prev?.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
    const nextTs = it?.updatedAt ? new Date(it.updatedAt).getTime() : 0;
    if (Number.isFinite(nextTs) && nextTs > prevTs) {
      map.set(slug, it);
    }
  }

  return Array.from(map.values()).sort((a, b) => String(a?.slug || '').localeCompare(String(b?.slug || '')));
};

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (!ttlMs()) return null;
  if (Date.now() - entry.ts > ttlMs()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCached = (key, value) => {
  if (!ttlMs()) return;
  cache.set(key, { ts: Date.now(), value });
};

const isBusinessPublic = async (businessDoc) => {
  const business = businessDoc;
  if (!business || business.isActive !== true || business.isVerified !== true) return false;

  const now = new Date();
  const planIsActive = !!business.plan && !!business.planExpiresAt && new Date(business.planExpiresAt) > now;
  if (!planIsActive) return false;

  const effective = await getEffectiveEntitlementsForBusiness(business, { now });
  return effective?.features?.publicShopEnabled === true;
};

const buildUrlEntry = ({ loc, lastmod }) => {
  const lm = toLastMod(lastmod);
  return `<url><loc>${escapeXml(loc)}</loc>${lm ? `<lastmod>${escapeXml(lm)}</lastmod>` : ''}</url>`;
};

export const generateSitemapXml = async ({ scope, rootDomain, hostname, subdomain }) => {
  const key = `sitemap:${scope}:${subdomain || 'root'}`;
  const cached = getCached(key);
  if (cached) return cached;

  const baseHost = hostname || rootDomain;
  const baseOrigin = `https://${baseHost}`;

  const urls = [];

  if (scope === 'subdomain') {
    const business = await Business.findOne({ slug: subdomain, isActive: true, isVerified: true })
      .populate('plan')
      .select('_id slug updatedAt plan planExpiresAt isActive isVerified');

    if (!business) {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>`;
      setCached(key, xml);
      return xml;
    }

    const publicOk = await isBusinessPublic(business);
    if (!publicOk) {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>`;
      setCached(key, xml);
      return xml;
    }

    // Home
    urls.push(buildUrlEntry({ loc: `${baseOrigin}/`, lastmod: business.updatedAt }));

    // Categories (global)
    const categories = dedupeBySlugKeepLatest(await Category.find({ isActive: true }).select('slug updatedAt').lean());
    for (const c of categories) {
      if (!c?.slug) continue;
      urls.push(buildUrlEntry({ loc: `${baseOrigin}/categories/${encodeURIComponent(c.slug)}`, lastmod: c.updatedAt }));
    }

    // Listings
    const listings = await Listing.find({ business: business._id, isActive: true })
      .select('_id slug listingType updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    for (const l of listings || []) {
      const typePath = l.listingType === 'service' ? 'services' : 'products';
      const slugOrId = l.slug ? encodeURIComponent(String(l.slug)) : encodeURIComponent(String(l._id));
      urls.push(buildUrlEntry({ loc: `${baseOrigin}/${typePath}/${slugOrId}`, lastmod: l.updatedAt }));
    }
  } else {
    // Root: include all active public subdomains + root-level pages
    urls.push(buildUrlEntry({ loc: `${baseOrigin}/`, lastmod: new Date() }));
    urls.push(buildUrlEntry({ loc: `${baseOrigin}/all-shops`, lastmod: new Date() }));
    urls.push(buildUrlEntry({ loc: `${baseOrigin}/categories`, lastmod: new Date() }));

    const categories = dedupeBySlugKeepLatest(await Category.find({ isActive: true }).select('slug updatedAt').lean());
    for (const c of categories) {
      if (!c?.slug) continue;
      urls.push(buildUrlEntry({ loc: `${baseOrigin}/categories/${encodeURIComponent(c.slug)}`, lastmod: c.updatedAt }));
    }

    const businesses = await Business.find({
      isActive: true,
      isVerified: true,
      slug: { $exists: true, $ne: null },
      plan: { $ne: null },
      planExpiresAt: { $ne: null },
    })
      .populate('plan')
      .select('_id slug updatedAt plan planExpiresAt isActive isVerified')
      .lean(false);

    // Filter to only public-enabled
    for (const b of businesses || []) {
      if (!b?.slug) continue;
      // `b` is a mongoose doc (not lean) because we need `populate('plan')` object.
      // eslint-disable-next-line no-await-in-loop
      const ok = await isBusinessPublic(b);
      if (!ok) continue;

      const shopOrigin = `https://${b.slug}.${rootDomain}`;
      urls.push(buildUrlEntry({ loc: `${shopOrigin}/`, lastmod: b.updatedAt }));

      // Include only a limited set of listing URLs in root sitemap to keep size reasonable.
      // Detailed listing URLs are available in each shop's own sitemap.
      urls.push(buildUrlEntry({ loc: `${shopOrigin}/sitemap.xml`, lastmod: b.updatedAt }));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
    '\n'
  )}\n</urlset>`;

  setCached(key, xml);
  return xml;
};

export const generateRobotsTxt = ({ rootDomain, hostname }) => {
  const baseHost = hostname || rootDomain;
  const origin = `https://${baseHost}`;

  // Keep it permissive so subdomains are crawlable.
  // Disallow API routes to avoid indexing JSON.
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
};
