import type { City, Shop } from "@/data/mockData";

export type CityGroup = {
  id: string;
  name: string;
  slug: string;
  totalShops: number;
  image: string;
};

const FALLBACK_CITY_IMAGE = "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=400&h=300&fit=crop";

const CITY_LANDMARK_IMAGES: Record<string, string> = {
  delhi: "https://upload.wikimedia.org/wikipedia/commons/1/17/India_Gate_from_Rajpath.jpg",
  mumbai: "https://upload.wikimedia.org/wikipedia/commons/f/fb/Gateway_of_India_Beautiful.jpg",
  bangalore: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Lighting_of_Vidhana_Soudha.jpg",
  bengaluru: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Lighting_of_Vidhana_Soudha.jpg",
  jaipur: "https://upload.wikimedia.org/wikipedia/commons/a/ac/East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_03.jpg",
  pune: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Shaniwar_Wada_during_sunset.jpg",
  gogri: "/cities/gogri.svg",
};

const CITY_ALIASES: Record<string, string> = {
  "gogri jamalpur": "gogri",
  "new delhi": "delhi",
  bengaluru: "bangalore",
  bombay: "mumbai",
};

const PREFIX_MODIFIERS = new Set([
  "new",
  "old",
  "greater",
  "lower",
  "upper",
  "central",
  "metro",
  "north",
  "south",
  "east",
  "west",
]);

const normalizeCityText = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[.,/\\_-]+/g, " ")
    .replace(/\s+/g, " ");

const cityKey = (value: string) => {
  const normalized = normalizeCityText(value);
  return CITY_ALIASES[normalized] || normalized;
};

export const isSameCity = (left: string, right: string) => {
  const a = cityKey(left);
  const b = cityKey(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const aTokens = a.split(" ").filter(Boolean);
  const bTokens = b.split(" ").filter(Boolean);
  if (!aTokens.length || !bTokens.length) return false;

  const aFirst = aTokens[0];
  const bFirst = bTokens[0];
  if (aFirst === bFirst) return true;

  const aLast = aTokens[aTokens.length - 1];
  const bLast = bTokens[bTokens.length - 1];
  if (PREFIX_MODIFIERS.has(aFirst) && aTokens.slice(1).join(" ") === b) return true;
  if (PREFIX_MODIFIERS.has(bFirst) && bTokens.slice(1).join(" ") === a) return true;
  if (aLast === bLast && aTokens.length <= 2 && bTokens.length <= 2) return true;

  return false;
};

const isBetterDisplayName = (candidate: string, current: string) => {
  const a = normalizeCityText(candidate);
  const b = normalizeCityText(current);
  if (!b) return true;
  if (!a) return false;

  const aTokens = a.split(" ").filter(Boolean).length;
  const bTokens = b.split(" ").filter(Boolean).length;
  if (aTokens !== bTokens) return aTokens < bTokens;
  return a.length < b.length;
};

const toSlug = (value: string) => cityKey(value).replace(/\s+/g, "-") || "unknown";

const isValidImage = (value: string) => /^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("/");

const buildFallbackSvg = (cityName: string) => {
  const label = String(cityName || "City").trim() || "City";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="50%" stop-color="#1d4ed8" />
          <stop offset="100%" stop-color="#f97316" />
        </linearGradient>
        <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fde68a" />
          <stop offset="100%" stop-color="#fb7185" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#bg)" />
      <circle cx="640" cy="130" r="68" fill="url(#sun)" opacity="0.95" />
      <path d="M0 435 C120 390, 230 470, 340 430 C470 382, 550 355, 660 404 C720 430, 760 452, 800 438 L800 600 L0 600 Z" fill="#0f172a" opacity="0.65" />
      <path d="M85 455 L145 455 L145 370 L175 370 L175 455 L235 455 L235 340 L260 340 L260 455 L320 455 L320 410 L350 410 L350 455 L415 455 L415 355 L445 355 L445 455 L510 455 L510 385 L540 385 L540 455 L605 455 L605 325 L630 325 L630 455 L700 455 L700 395 L730 395 L730 455 L770 455" fill="none" stroke="#f8fafc" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />
      <text x="52" y="135" fill="#ffffff" font-family="Arial, sans-serif" font-size="48" font-weight="700">${label}</text>
      <text x="52" y="182" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="22">Explore local shops by city</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s{2,}/g, " ").trim())}`;
};

export const getCityFallbackImage = (cityName: string) => buildFallbackSvg(cityName);

const resolveCityImage = (cityName: string, shopImage?: string) => {
  const normalized = cityKey(cityName);

  const landmarkImage = CITY_LANDMARK_IMAGES[normalized];
  if (landmarkImage) return landmarkImage;

  if (shopImage && isValidImage(shopImage)) return shopImage;

  const fallback = fallbackCities.find((city) => city.slug === normalized || city.slug === normalized.replace(/\s+/g, "-"));
  if (fallback?.image && isValidImage(fallback.image)) return fallback.image;

  return getCityFallbackImage(cityName) || FALLBACK_CITY_IMAGE;
};

export const groupCitiesFromShops = (shops: Shop[], fallbackCities: City[] = []): CityGroup[] => {
  if (!shops.length) {
    return fallbackCities.map((city) => ({
      id: city.slug,
      name: city.name,
      slug: city.slug,
      totalShops: city.totalShops,
      image: resolveCityImage(city.name, city.image),
    }));
  }

  const groups: Array<CityGroup & { aliases: string[] }> = [];

  for (const shop of shops) {
    const rawCity = String(shop.city || "").trim();
    if (!rawCity) continue;

    const citySlug = toSlug(rawCity);
    const existing = groups.find((group) => isSameCity(group.name, rawCity) || group.aliases.some((alias) => isSameCity(alias, rawCity)));

    if (existing) {
      existing.totalShops += 1;
      existing.aliases.push(rawCity);
      if (isBetterDisplayName(rawCity, existing.name)) {
        existing.name = rawCity;
        existing.slug = citySlug;
      }
      if (!existing.image && shop.coverImage) {
        existing.image = shop.coverImage;
      }
      continue;
    }

    groups.push({
      id: citySlug,
      name: rawCity,
      slug: citySlug,
      totalShops: 1,
      image: resolveCityImage(rawCity, shop.coverImage),
      aliases: [rawCity],
    });
  }

  return groups
    .map(({ aliases, ...group }) => group)
    .sort((a, b) => b.totalShops - a.totalShops || a.name.localeCompare(b.name));
};

export const normalizeCitySlug = (city: string) => toSlug(city);