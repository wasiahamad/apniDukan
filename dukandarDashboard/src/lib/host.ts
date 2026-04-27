const PUBLICDUKAN_SUFFIX = ".publicdukan.com";

const RESERVED_SUBDOMAINS = new Set(["www", "seller", "admin", "api"]);

export const getHostnameLower = () => {
  if (typeof window === "undefined") return "";
  return String(window.location.hostname || "").toLowerCase();
};

export const isSellerHostname = (hostname: string) => hostname === "seller.publicdukan.com";

export const getShopSlugFromHostname = (hostname: string) => {
  const h = String(hostname || "").toLowerCase();
  if (!h) return null;
  if (isSellerHostname(h)) return null;
  if (!h.endsWith(PUBLICDUKAN_SUFFIX)) return null;

  const sub = h.slice(0, -PUBLICDUKAN_SUFFIX.length);
  const shopSlug = (sub.split(".")[0] || "").trim();
  if (!shopSlug) return null;
  if (RESERVED_SUBDOMAINS.has(shopSlug)) return null;
  return shopSlug;
};

export const isShopHostname = (hostname: string) => !!getShopSlugFromHostname(hostname);
