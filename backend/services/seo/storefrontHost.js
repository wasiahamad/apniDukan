const DEFAULT_ROOT_DOMAIN = 'publicdukan.com';

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

  return DEFAULT_ROOT_DOMAIN;
};

const parseReservedSubdomains = () => {
  const defaults = ['www', 'seller', 'api', 'admin'];
  const raw = String(process.env.PUBLIC_DUKAN_RESERVED_SUBDOMAINS || '').trim();
  if (!raw) return new Set(defaults);
  return new Set(
    raw
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );
};

export const getHostInfo = (req) => {
  const rootDomain = parseRootDomain();
  const reserved = parseReservedSubdomains();

  const hostHeader = String(req.get('host') || '').trim();
  const hostname = hostHeader
    ? hostHeader
        .replace(/:\d+$/, '')
        .trim()
        .toLowerCase()
    : '';

  // Local dev: treat as storefront (subdomain unknown)
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  let subdomain = null;
  let isStorefrontSubdomain = false;
  let isRootMarketplace = false;

  if (isLocalhost) {
    // Allow ?shop=<slug> for local testing
    const q = String(req.query?.shop || '').trim().toLowerCase();
    if (q && !reserved.has(q)) {
      subdomain = q;
      isStorefrontSubdomain = true;
    }
  } else if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    isRootMarketplace = true;
  } else if (hostname.endsWith(`.${rootDomain}`)) {
    const prefix = hostname.slice(0, -1 * (rootDomain.length + 1));
    const firstLabel = prefix.split('.').filter(Boolean)[0] || null;
    if (firstLabel && !reserved.has(firstLabel)) {
      subdomain = firstLabel;
      isStorefrontSubdomain = true;
    }
  }

  return {
    hostHeader,
    hostname,
    rootDomain,
    isLocalhost,
    isRootMarketplace,
    isStorefrontSubdomain,
    subdomain,
  };
};

export const buildCanonicalUrl = ({ hostInfo, path }) => {
  const cleanPath = String(path || '/').startsWith('/') ? String(path || '/') : `/${String(path || '')}`;

  // Prefer real host in production; for localhost fall back to https://<slug>.<rootDomain>
  if (hostInfo?.isLocalhost && hostInfo?.subdomain) {
    return `https://${hostInfo.subdomain}.${hostInfo.rootDomain}${cleanPath}`;
  }

  const hostname = hostInfo?.hostname || hostInfo?.rootDomain || DEFAULT_ROOT_DOMAIN;
  return `https://${hostname}${cleanPath}`;
};
