import type { Shop } from "@/data/mockData";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAccessToken = () => {
  try {
    return localStorage.getItem("accessToken");
  } catch {
    return null;
  }
};

export const hasAuthSession = () => Boolean(getAccessToken());

const getAuthHeaders = () => {
  const token = getAccessToken();
  return token ? ({ Authorization: `Bearer ${token}` } as HeadersInit) : undefined;
};

type ReviewSummaryResponse = {
  success: boolean;
  message?: string;
  data?: {
    avgRating: number;
    reviewsCount: number;
  };
};

type NearbyShopsResponse = {
  success: boolean;
  message?: string;
  data?: {
    shops: Array<PublicShopItem & { distanceKm?: number | null }>;
  };
};

type DistanceResponse = {
  success: boolean;
  message?: string;
  data?: { distanceKm: number; durationMins: number; durationSeconds?: number };
};

type RouteResponse = {
  success: boolean;
  message?: string;
  data?: {
    polyline: string;
    distanceText?: string;
    durationText?: string;
    distanceMeters?: number;
    durationSeconds?: number;
    steps?: Array<{ instruction: string; distanceText?: string; durationText?: string }>;
  };
};

type PublicShopItem = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  phone: string;
  whatsapp: string;
  isVerified: boolean;
  isOpen: boolean;
  logo: string;
  coverImage: string;
  businessType: { name: string; slug: string } | null;
  rating?: number;
  reviewCount?: number;
  ordersCount?: number;
  activePlanPrice?: number;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number | null;
    longitude: number | null;
  };
};

type PublicShopsResponse = {
  success: boolean;
  message?: string;
  data?: {
    shops: PublicShopItem[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
};

type BusinessTypeResponse = {
  success: boolean;
  message?: string;
  data?: Array<{
    _id: string;
    name: string;
    slug: string;
    icon?: string;
    suggestedListingType?: string;
  }>;
};

export type PublicBusinessType = {
  id: string;
  name: string;
  slug: string;
  icon: string;
};

type PublicBusinessBySlugResponse = {
  success: boolean;
  message?: string;
  data?: {
    _id: string;
    name: string;
    slug: string;
    phone?: string;
    whatsapp?: string;
    description?: string;
    logo?: string;
    coverImage?: string;
    isVerified?: boolean;
    businessType?: { name?: string; slug?: string; suggestedListingType?: "product" | "service" | "food" | "course" | "rental" };
    address?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
      location?: { coordinates?: number[] };
    };
    workingHours?: Record<string, { open?: string; close?: string; isOpen?: boolean }>;
    openStatusMode?: 'auto' | 'open' | 'closed';
    isOpen?: boolean;
  };
};

type PublicListingsResponse = {
  success: boolean;
  message?: string;
  data?: {
    listings?: Array<{
      _id: string;
      title: string;
      description?: string;
      price: number;
      listingType?: "product" | "service" | "course" | "food" | "rental";
      images?: Array<{ url?: string }>;
      pricingOptions?: Array<{ label?: string; price?: number }>;
      attributes?: Array<{ name: string; value: string | number }>;
    }>;
  };
};

const fallbackCover = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop";
const fallbackLogo = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop";
const fallbackProduct = "https://images.unsplash.com/photo-1604719312566-8912e9c8a213?w=400&h=400&fit=crop";
const fallbackTypeIcon = "🏪";

const toTitle = (value: string) => {
  if (!value) return "General";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const mapPublicShopToCardShop = (item: PublicShopItem): Shop => {
  const categoryName = item.businessType?.name || "General";
  const categorySlug = item.businessType?.slug || "general";
  const cityName = item.address.city || "Unknown";
  const area = item.address.street || cityName || "Local Area";

  const rating = Number((item as any)?.rating);
  const reviewCount = Number((item as any)?.reviewCount);
  const activePlanPrice = Number((item as any)?.activePlanPrice);

  return {
    id: item._id,
    name: item.name,
    slug: item.slug,
    category: categoryName,
    categorySlug,
    city: cityName,
    citySlug: cityName.toLowerCase().replace(/\s+/g, "-"),
    area,
    address: [item.address.street, item.address.city, item.address.state, item.address.pincode]
      .filter(Boolean)
      .join(", "),
    rating: Number.isFinite(rating) ? rating : 0,
    reviewCount: Number.isFinite(reviewCount) ? reviewCount : 0,
    activePlanPrice: Number.isFinite(activePlanPrice) && activePlanPrice >= 0 ? activePlanPrice : undefined,
    isOpen: item.isOpen,
    openingTime: "09:00 AM",
    closingTime: "09:00 PM",
    weeklyOff: "N/A",
    whatsapp: item.whatsapp,
    phone: item.phone,
    description: item.description || `${item.name} - ${toTitle(categorySlug)} store`,
    coverImage: item.coverImage || fallbackCover,
    logo: item.logo || fallbackLogo,
    paymentMethods: ["Cash", "UPI"],
    products: [],
    latitude: item.address.latitude ?? 0,
    longitude: item.address.longitude ?? 0,
    verified: item.isVerified,
  };
};

const slugToText = (slug: string) =>
  String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

const parseMinutes = (value?: string) => {
  if (!value) return null;
  const [h, m] = String(value).split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const computeOpenStatus = (
  workingHours?: Record<string, { open?: string; close?: string; isOpen?: boolean }>,
  mode?: 'auto' | 'open' | 'closed'
) => {
  if (mode === 'open') return true;
  if (mode === 'closed') return false;
  if (!workingHours) return true;
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  const day = dayKeys[new Date().getDay()];
  const slot = workingHours[day];
  if (!slot) return true;
  if (slot.isOpen === false) return false;

  const openAt = parseMinutes(slot.open);
  const closeAt = parseMinutes(slot.close);
  if (openAt === null || closeAt === null) return true;
  const now = nowMinutes();
  return now >= openAt && now <= closeAt;
};

const format12h = (value?: string, fallback = "09:00 AM") => {
  if (!value) return fallback;
  const [h, m] = String(value).split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return fallback;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
};

const getTodaySlot = (workingHours?: Record<string, { open?: string; close?: string; isOpen?: boolean }>) => {
  if (!workingHours) return null;
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  const day = dayKeys[new Date().getDay()];
  return workingHours[day] || null;
};

export const fetchPublicShops = async (params?: { city?: string; category?: string; search?: string; lat?: number; lng?: number }): Promise<Shop[]> => {
  const q = new URLSearchParams();
  q.set("limit", "100");
  q.set('includeAll', '1');
  if (params?.city) q.set("city", params.city);
  if (params?.category) q.set("category", params.category);
  if (params?.search) q.set("search", params.search);
  if (params?.lat != null && Number.isFinite(params.lat)) q.set('lat', String(params.lat));
  if (params?.lng != null && Number.isFinite(params.lng)) q.set('lng', String(params.lng));

  const response = await fetch(`${API_BASE_URL}/business/public/shops?${q.toString()}`);
  const json = (await response.json()) as PublicShopsResponse;

  if (!response.ok || !json.success) {
    throw new Error(json.message || "Failed to load shops");
  }

  const rows = json.data?.shops || [];
  return rows.map(mapPublicShopToCardShop);
};

export const fetchNearbyPublicShops = async (params?: { lat?: number; lng?: number; radiusKm?: number; limit?: number }): Promise<Shop[]> => {
  const q = new URLSearchParams();
  if (params?.lat != null && Number.isFinite(params.lat)) q.set('lat', String(params.lat));
  if (params?.lng != null && Number.isFinite(params.lng)) q.set('lng', String(params.lng));
  q.set('radiusKm', String(params?.radiusKm ?? 25));
  q.set('limit', String(params?.limit ?? 1000));
  q.set('includeAll', '1');

  const response = await fetch(`${API_BASE_URL}/business/nearby?${q.toString()}`, {
    headers: getAuthHeaders(),
  });
  const json = (await response.json()) as NearbyShopsResponse;
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to load nearby shops');
  }

  const rows = json.data?.shops || [];
  const base = rows.map(mapPublicShopToCardShop);
  // Attach backend-computed distance when available
  return base.map((s, idx) => ({
    ...s,
    distanceKm: (() => {
      const raw = Number((rows[idx] as any)?.distanceKm);
      return Number.isFinite(raw) && raw >= 0 ? raw : undefined;
    })(),
  })) as any;
};

export const fetchBusinessDistance = async (businessId: string, params: { lat: number; lng: number }) => {
  const q = new URLSearchParams();
  q.set('lat', String(params.lat));
  q.set('lng', String(params.lng));
  const response = await fetch(`${API_BASE_URL}/business/${encodeURIComponent(businessId)}/distance?${q.toString()}`);
  const json = (await response.json()) as DistanceResponse;
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.message || 'Failed to fetch distance');
  }
  return json.data;
};

export const fetchRoute = async (params: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number } }) => {
  const q = new URLSearchParams();
  q.set('origin', `${params.origin.lat},${params.origin.lng}`);
  q.set('destination', `${params.destination.lat},${params.destination.lng}`);
  const response = await fetch(`${API_BASE_URL}/maps/route?${q.toString()}`);
  const json = (await response.json()) as (RouteResponse & { code?: string });
  if (!response.ok || !json.success || !json.data) {
    const code = (json as any)?.code;
    const msg = json.message || 'Failed to fetch route';
    throw new Error(code ? `${code}: ${msg}` : msg);
  }
  return json.data;
};

export const fetchPublicShopBySlug = async (slug: string): Promise<Shop | null> => {
  const response = await fetch(`${API_BASE_URL}/business/slug/${encodeURIComponent(slug)}?includeAll=1`);
  const json = (await response.json()) as PublicBusinessBySlugResponse;

  if (response.status === 404) return null;
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.message || "Failed to load shop");
  }

  const business = json.data;
  const coords = business.address?.location?.coordinates;
  const hasCoords = Array.isArray(coords) && coords.length === 2;
  const todaySlot = getTodaySlot(business.workingHours);

  // Review summary (best-effort; never fail shop page if this fails)
  let rating = 0;
  let reviewCount = 0;
  try {
    const r = await fetch(`${API_BASE_URL}/reviews/business/${encodeURIComponent(business.slug)}/summary`);
    const rjson = (await r.json()) as ReviewSummaryResponse;
    if (r.ok && rjson?.success && rjson.data) {
      rating = Number(rjson.data.avgRating) || 0;
      reviewCount = Number(rjson.data.reviewsCount) || 0;
    }
  } catch {
    // ignore
  }

  return {
    id: business._id,
    name: business.name,
    slug: business.slug,
    category: business.businessType?.name || "General",
    categorySlug: business.businessType?.slug || "general",
    suggestedListingType: business.businessType?.suggestedListingType,
    city: business.address?.city || "Unknown",
    citySlug: String(business.address?.city || "unknown").toLowerCase().replace(/\s+/g, "-"),
    area: business.address?.street || business.address?.city || "Local Area",
    address: [business.address?.street, business.address?.city, business.address?.state, business.address?.pincode]
      .filter(Boolean)
      .join(", "),
    rating,
    reviewCount,
    isOpen: typeof business.isOpen === 'boolean'
      ? business.isOpen
      : computeOpenStatus(business.workingHours, business.openStatusMode),
    openingTime: format12h(todaySlot?.open, "09:00 AM"),
    closingTime: format12h(todaySlot?.close, "09:00 PM"),
    weeklyOff: "N/A",
    whatsapp: business.whatsapp || business.phone || "",
    phone: business.phone || "",
    description: business.description || `${business.name} local store`,
    coverImage: business.coverImage || fallbackCover,
    logo: business.logo || fallbackLogo,
    paymentMethods: ["Cash", "UPI"],
    products: [],
    latitude: hasCoords ? (coords?.[1] as number) : 0,
    longitude: hasCoords ? (coords?.[0] as number) : 0,
    verified: !!business.isVerified,
  };
};

export const fetchPublicListingsForShop = async (businessId: string) => {
  const response = await fetch(`${API_BASE_URL}/listings/public/business/${encodeURIComponent(businessId)}?limit=100`);
  const json = (await response.json()) as PublicListingsResponse;

  if (!response.ok || !json.success) {
    throw new Error(json.message || "Failed to load listings");
  }

  const listings = json.data?.listings || [];
  return listings.map((item) => {
    const imageUrls = Array.isArray(item.images)
      ? item.images.map((img) => String(img?.url || "").trim()).filter(Boolean)
      : [];

    const pricingOptions = Array.isArray(item.pricingOptions)
      ? item.pricingOptions
          .map((o) => ({
            label: String(o?.label || "").trim(),
            price: Number(o?.price),
          }))
          .filter((o) => o.label && Number.isFinite(o.price) && o.price >= 0)
      : [];

    return {
      id: item._id,
      name: item.title,
      price: item.price,
      image: imageUrls[0] || fallbackProduct,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      pricingOptions: pricingOptions.length > 0 ? pricingOptions : undefined,
      description: item.description || "",
      type: item.listingType || "product",
      attributes: Array.isArray(item.attributes)
        ? item.attributes
            .filter((a) => a && typeof a.name === "string" && a.name.trim().length > 0)
            .map((a) => ({ name: a.name, value: a.value }))
        : [],
    };
  });
};

export const looksLikeCitySlug = async (slug: string) => {
  const cityText = slugToText(slug).toLowerCase();
  const shops = await fetchPublicShops({ city: cityText });
  return shops.length > 0;
};

export const fetchBusinessTypes = async (): Promise<PublicBusinessType[]> => {
  const response = await fetch(`${API_BASE_URL}/business-types`);
  const json = (await response.json()) as BusinessTypeResponse;

  if (!response.ok || !json.success) {
    throw new Error(json.message || "Failed to load business types");
  }

  const items = json.data || [];
  return items.map((item) => ({
    id: item._id,
    name: item.name,
    slug: item.slug,
    icon: item.icon || fallbackTypeIcon,
  }));
};
