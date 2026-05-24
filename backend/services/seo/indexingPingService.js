const parseRootDomain = () => {
  const explicit = String(process.env.PUBLIC_DUKAN_ROOT_DOMAIN || '').trim().toLowerCase();
  if (explicit) return explicit;

  const websiteUrl = String(process.env.PUBLIC_WEBSITE_URL || '').trim();
  if (websiteUrl) {
    try {
      const u = new URL(websiteUrl);
      if (u.hostname) return u.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      // ignore
    }
  }

  return 'publicdukan.com';
};

const toShopOrigin = (slug) => `https://${String(slug || '').trim().toLowerCase()}.${parseRootDomain()}`;

const safeFetch = async (url, opts) => {
  try {
    const res = await fetch(url, opts);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
};

export const pingSearchEnginesForSitemap = async (sitemapUrl) => {
  const sitemap = String(sitemapUrl || '').trim();
  if (!sitemap) return;

  const encoded = encodeURIComponent(sitemap);

  // Standard sitemap pings (supported by multiple crawlers)
  await safeFetch(`https://www.google.com/ping?sitemap=${encoded}`);
  await safeFetch(`https://www.bing.com/ping?sitemap=${encoded}`);
};

export const submitIndexNow = async ({ host, urlList }) => {
  const key = String(process.env.INDEXNOW_KEY || '').trim();
  if (!key) return;

  const urls = Array.isArray(urlList) ? urlList.filter(Boolean).slice(0, 10000) : [];
  if (!urls.length) return;

  const payload = {
    host: String(host || '').trim(),
    key,
    keyLocation: process.env.INDEXNOW_KEY_LOCATION || undefined,
    urlList: urls,
  };

  await safeFetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const queueIndexingPingForBusiness = ({ businessSlug }) => {
  const slug = String(businessSlug || '').trim().toLowerCase();
  if (!slug) return;

  const origin = toShopOrigin(slug);
  const sitemapUrl = `${origin}/sitemap.xml`;

  setImmediate(async () => {
    await pingSearchEnginesForSitemap(sitemapUrl);

    // IndexNow (Bing and partners)
    const host = `${slug}.${parseRootDomain()}`;
    await submitIndexNow({ host, urlList: [origin, sitemapUrl] });
  });
};

export const queueIndexingPingForListing = ({ businessSlug, listingType, listingSlugOrId }) => {
  const slug = String(businessSlug || '').trim().toLowerCase();
  const listingKey = String(listingSlugOrId || '').trim();
  if (!slug || !listingKey) return;

  const origin = toShopOrigin(slug);
  const typePath = String(listingType || '').toLowerCase() === 'service' ? 'services' : 'products';
  const listingUrl = `${origin}/${typePath}/${encodeURIComponent(listingKey)}`;
  const sitemapUrl = `${origin}/sitemap.xml`;

  setImmediate(async () => {
    await pingSearchEnginesForSitemap(sitemapUrl);

    const host = `${slug}.${parseRootDomain()}`;
    await submitIndexNow({ host, urlList: [listingUrl] });
  });
};
