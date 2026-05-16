import { FEATURED_CATEGORIES, FEATURED_CITIES } from "@/utils/publicCatalog";
import { apiRequest } from "@/utils/apiClient";

export type PublicShopLite = {
  address?: { city?: string | null } | null;
  businessType?: { name?: string | null; slug?: string | null } | null;
  coverImage?: string | null;
};

export type DynamicCity = {
  name: string;
  slug: string;
  shops: number;
  accent: string;
  landmark: string;
  imageUrl?: string | null;
};

export type DynamicCategory = {
  name: string;
  slug: string;
  icon: string;
  accent: string;
  hint: string;
  count: number;
};

const toSlug = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "") || "unknown";

const fallbackCityMeta = (slug: string) => {
  const fallback = FEATURED_CITIES.find((c) => c.slug === slug) || FEATURED_CITIES[0];
  return {
    accent: fallback?.accent || "#D74E09",
    landmark: fallback?.landmark || "Landmark",
  };
};

export const groupCitiesFromShops = (shops: PublicShopLite[], fallback = FEATURED_CITIES): DynamicCity[] => {
  if (!Array.isArray(shops) || shops.length === 0) {
    return fallback.map((c) => ({ ...c }));
  }

  const counter = new Map<string, { name: string; count: number }>();
  shops.forEach((shop) => {
    const raw = String(shop?.address?.city || "").trim();
    if (!raw) return;
    const slug = toSlug(raw);
    const existing = counter.get(slug);
    if (existing) {
      existing.count += 1;
    } else {
      counter.set(slug, { name: raw, count: 1 });
    }
  });

  const items = Array.from(counter.entries())
    .map(([slug, entry]) => {
      const meta = fallbackCityMeta(slug);
      return {
        name: entry.name,
        slug,
        shops: entry.count,
        accent: meta.accent,
        landmark: meta.landmark,
      };
    })
    .sort((a, b) => b.shops - a.shops);

  return items.length > 0 ? items : fallback.map((c) => ({ ...c }));
};

export const groupCategoriesFromShops = (shops: PublicShopLite[], fallback = FEATURED_CATEGORIES): DynamicCategory[] => {
  if (!Array.isArray(shops) || shops.length === 0) {
    return fallback.map((c) => ({ ...c, count: 0, hint: c.hint }));
  }

  const metaBySlug = new Map(
    fallback.map((c) => [c.slug, { icon: c.icon, accent: c.accent, hint: c.hint, name: c.name }])
  );
  const counter = new Map<string, { name: string; count: number }>();

  shops.forEach((shop) => {
    const slug = String(shop?.businessType?.slug || "").trim().toLowerCase();
    const name = String(shop?.businessType?.name || slug || "Other").trim();
    if (!slug) return;
    const existing = counter.get(slug);
    if (existing) {
      existing.count += 1;
    } else {
      counter.set(slug, { name, count: 1 });
    }
  });

  const items = Array.from(counter.entries())
    .map(([slug, entry]) => {
      const meta = metaBySlug.get(slug);
      return {
        name: meta?.name || entry.name || slug,
        slug,
        icon: meta?.icon || "briefcase",
        accent: meta?.accent || "#0284C7",
        hint: meta?.hint || `${entry.count} shops`,
        count: entry.count,
      };
    })
    .sort((a, b) => b.count - a.count);

  return items.length > 0 ? items : fallback.map((c) => ({ ...c, count: 0, hint: c.hint }));
};

export const fetchCityImages = async (cityNames: string[]) => {
  if (!Array.isArray(cityNames) || cityNames.length === 0) return [] as Array<{ cityName: string; imageUrl: string }>;
  return apiRequest<Array<{ cityName: string; imageUrl: string }>>("/public/cities/images/batch", {
    method: "POST",
    body: JSON.stringify({ cities: cityNames }),
  });
};
