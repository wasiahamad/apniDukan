import type { Shop } from "@/data/mockData";
import { groupCitiesFromShops, isSameCity, normalizeCitySlug } from "@/lib/cityGroups";

const ensureApiSuffix = (baseUrl: string) => {
  const raw = String(baseUrl || '').trim();
  if (!raw) return '';
  const withoutTrailing = raw.replace(/\/+$/, '');

  // Allow relative API base (rare, but useful for reverse-proxy setups)
  if (withoutTrailing.startsWith('/')) {
    return withoutTrailing === '/api' || withoutTrailing.startsWith('/api/')
      ? withoutTrailing
      : `${withoutTrailing}/api`;
  }

  const withProtocol = /^https?:\/\//i.test(withoutTrailing) ? withoutTrailing : `https://${withoutTrailing}`;
  try {
    const url = new URL(withProtocol);
    const path = url.pathname.replace(/\/+$/, '');

    if (!path || path === '/') {
      url.pathname = '/api';
    } else if (path === '/api' || path.startsWith('/api/')) {
      url.pathname = path;
    } else {
      url.pathname = `${path}/api`;
    }

    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return withoutTrailing;
  }
};

const isLocalhostUrl = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return false;

  // Relative paths are not localhost.
  if (raw.startsWith('/')) return false;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const u = new URL(withProtocol);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return /localhost|127\.0\.0\.1/i.test(raw);
  }
};

const resolveApiBaseUrl = () => {
  const envValue = String(
    import.meta.env.VITE_API_URL ||
      (import.meta as any).env?.VITE_API_BASE_URL ||
      (import.meta as any).env?.VITE_BACKEND_URL ||
      ''
  ).trim();

  if (envValue && !(import.meta.env.PROD && isLocalhostUrl(envValue))) return ensureApiSuffix(envValue);

  // Dev fallback
  if (import.meta.env.DEV) return 'http://localhost:5000/api';

  // Prod fallback (can be overridden via VITE_API_URL at build time)
  return 'https://apnidukan-vlnw.onrender.com/api';
};

export const API_BASE_URL = resolveApiBaseUrl();
const VIEW_SESSION_KEY = "publicdukan_view_session_id";

const getViewSessionId = () => {
  if (typeof window === "undefined") return null;
  try {
    const existing = sessionStorage.getItem(VIEW_SESSION_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(VIEW_SESSION_KEY, generated);
    return generated;
  } catch {
    return null;
  }
};

export type AiChatRequest = {
  businessId: string;
  userMessage: string;
};

export type AiChatResponse = {
  reply: string;
};

export const chatWithBusinessAI = async (payload: AiChatRequest): Promise<AiChatResponse> => {
  const businessId = String(payload?.businessId || '').trim();
  const userMessage = String(payload?.userMessage || '').trim();
  if (!businessId) throw new Error('businessId is required');
  if (!userMessage) throw new Error('userMessage is required');

  const sid = getViewSessionId();
  const response = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sid ? { 'x-session-id': sid } : {}),
    },
    body: JSON.stringify({ businessId, userMessage }),
  });

  const json = (await response.json().catch(() => ({}))) as any;

  if (!response.ok) {
    const msg = String(json?.error || json?.message || 'AI request failed');
    const err: any = new Error(msg);
    err.status = response.status;
    throw err;
  }

  const reply = String(json?.reply || '').trim();
  return {
    reply: reply || 'Haan ji, aap WhatsApp/call pe contact kar lo. Main help kar dunga.',
  };
};

const getAccessToken = () => {
  try {
    return localStorage.getItem("accessToken");
  } catch {
    return null;
  }
};

export const hasAuthSession = () => Boolean(getAccessToken());

const LANGUAGE_STORAGE_KEY = "publicdukan:lang";
type PreferredLanguage = "en" | "hi";

const getPreferredLanguage = (): PreferredLanguage => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "hi" || stored === "en") return stored;
  } catch {
    // ignore
  }
  return "en";
};

const getLanguageHeaders = () => ({ "Accept-Language": getPreferredLanguage() } as const);

export const hasDevanagari = (value?: string) => /[\u0900-\u097F]/.test(String(value || ""));
const looksLikeHindi = hasDevanagari;

const HI_CITY_LABELS: Record<string, string> = {
  delhi: "दिल्ली",
  mumbai: "मुंबई",
  pune: "पुणे",
  bengaluru: "बेंगलुरु",
  bangalore: "बेंगलुरु",
  jaipur: "जयपुर",
  jodhpur: "जोधपुर",
  kota: "कोटा",
  ajmer: "अजमेर",
  udaipur: "उदयपुर",
  alwar: "अलवर",
  bikaner: "बीकानेर",
  sikar: "सीकर",
};

const HI_STATE_LABELS: Record<string, string> = {
  rajasthan: "राजस्थान",
  "delhi": "दिल्ली",
  "new delhi": "दिल्ली",
  "uttar pradesh": "उत्तर प्रदेश",
  "madhya pradesh": "मध्य प्रदेश",
  "maharashtra": "महाराष्ट्र",
  "karnataka": "कर्नाटक",
  "gujarat": "गुजरात",
  "haryana": "हरियाणा",
  "punjab": "पंजाब",
};

const HI_WORD_MAP: Record<string, string> = {
  // common surnames / shop words (best-effort fallback)
  gupta: "गुप्ता",
  sharma: "शर्मा",
  verma: "वर्मा",
  singh: "सिंह",
  kumar: "कुमार",
  jain: "जैन",
  agrawal: "अग्रवाल",
  agarwal: "अग्रवाल",

  public: "पब्लिक",
  dukan: "दुकान",
  publicdukan: "पब्लिकदुकान",
  whatsapp: "व्हाट्सएप",
  upi: "यूपीआई",

  kirana: "किराना",
  store: "स्टोर",
  shop: "दुकान",
  general: "जनरल",
  medical: "मेडिकल",
  pharmacy: "फार्मेसी",
  clinic: "क्लिनिक",
  hospital: "अस्पताल",
  salon: "सैलून",
  spa: "स्पा",
  gym: "जिम",
  fitness: "फिटनेस",
  restaurant: "रेस्टोरेंट",
  cafe: "कैफ़े",
  bakery: "बेकरी",
  sweets: "मिठाई",
  sweet: "मिठाई",
  electronics: "इलेक्ट्रॉनिक्स",
  mobile: "मोबाइल",
  repair: "रिपेयर",
  service: "सर्विस",
  center: "सेंटर",
  centre: "सेंटर",
  hardware: "हार्डवेयर",
  stationery: "स्टेशनरी",
  garments: "गारमेंट्स",
  garment: "गारमेंट",
  boutique: "बुटीक",
  tailor: "दर्जी",

  and: "और",

  // grocery-ish
  atta: "आटा",
  flour: "आटा",
  rice: "चावल",
  sugar: "चीनी",
  salt: "नमक",
  oil: "तेल",
  ghee: "घी",
  milk: "दूध",
  curd: "दही",
  paneer: "पनीर",
  tea: "चाय",
  coffee: "कॉफी",
  dal: "दाल",
  lentil: "दाल",
  lentils: "दाल",

  // units / packaging
  kg: "किग्रा",
  kgs: "किग्रा",
  gm: "ग्राम",
  g: "ग्राम",
  l: "लीटर",
  litre: "लीटर",
  liters: "लीटर",
  liter: "लीटर",
  ml: "मिलीलीटर",
  pcs: "पीस",
  pc: "पीस",
  piece: "पीस",
  pieces: "पीस",
  pack: "पैक",
  packet: "पैकेट",
  bottle: "बोतल",
};

const normalizeKey = (value: string) => String(value || "").trim().toLowerCase();

export const autoHindiCity = (city: string) => {
  const key = normalizeKey(city);
  return HI_CITY_LABELS[key] || city;
};

export const autoHindiState = (state: string) => {
  const key = normalizeKey(state);
  return HI_STATE_LABELS[key] || state;
};

const VOWEL_KEYS = ["aa", "ai", "au", "ii", "ee", "uu", "oo", "ri", "a", "i", "u", "e", "o"] as const;
const CONS_KEYS = ["ksh", "chh", "kh", "gh", "ch", "jh", "th", "dh", "ph", "bh", "sh", "ng", "ny"] as const;

const DEV_VOWEL_INDEP: Record<string, string> = {
  a: "अ",
  aa: "आ",
  i: "इ",
  ii: "ई",
  ee: "ई",
  u: "उ",
  uu: "ऊ",
  oo: "ऊ",
  e: "ए",
  ai: "ऐ",
  o: "ओ",
  au: "औ",
  ri: "ऋ",
};

const DEV_VOWEL_MATRA: Record<string, string> = {
  a: "",
  aa: "ा",
  i: "ि",
  ii: "ी",
  ee: "ी",
  u: "ु",
  uu: "ू",
  oo: "ू",
  e: "े",
  ai: "ै",
  o: "ो",
  au: "ौ",
  ri: "ृ",
};

const DEV_CONS: Record<string, string> = {
  ksh: "क्ष",
  chh: "छ",
  kh: "ख",
  gh: "घ",
  ch: "च",
  jh: "झ",
  th: "थ",
  dh: "ध",
  ph: "फ",
  bh: "भ",
  sh: "श",
  ng: "ङ",
  ny: "ञ",

  k: "क",
  g: "ग",
  c: "क",
  j: "ज",
  t: "त",
  d: "द",
  n: "न",
  p: "प",
  b: "ब",
  m: "म",
  y: "य",
  r: "र",
  l: "ल",
  v: "व",
  w: "व",
  s: "स",
  h: "ह",
  f: "फ",
  q: "क",
  z: "ज",
  x: "क्स",
};

const transliterateLatinWordToDevanagari = (input: string) => {
  const w = String(input || "").toLowerCase();
  if (!w) return w;
  let out = "";
  let i = 0;
  let lastWasConsonant = false;

  while (i < w.length) {
    const ch = w[i];
    if (ch < "a" || ch > "z") {
      out += ch;
      lastWasConsonant = false;
      i += 1;
      continue;
    }

    const rest = w.slice(i);

    let cons: string | null = null;
    for (const key of CONS_KEYS) {
      if (rest.startsWith(key)) {
        cons = key;
        break;
      }
    }
    if (cons) {
      out += DEV_CONS[cons] || cons;
      lastWasConsonant = true;
      i += cons.length;
      continue;
    }

    let vowel: string | null = null;
    for (const key of VOWEL_KEYS) {
      if (rest.startsWith(key)) {
        vowel = key;
        break;
      }
    }
    if (vowel) {
      if (lastWasConsonant) {
        out += DEV_VOWEL_MATRA[vowel] ?? "";
      } else {
        out += DEV_VOWEL_INDEP[vowel] ?? "";
      }
      lastWasConsonant = false;
      i += vowel.length;
      continue;
    }

    out += DEV_CONS[ch] || ch;
    lastWasConsonant = true;
    i += 1;
  }

  return out;
};

export const autoHindiText = (input: string) => {
  const raw = String(input || "");
  if (!raw) return raw;

  const parts = raw.match(/([A-Za-z]+|\d+(?:\.\d+)?|[^A-Za-z\d]+)/g);
  if (!parts) return raw;

  return parts
    .map((part) => {
      if (part === "&") return "और";

      if (/^[A-Za-z]+$/.test(part)) {
        const lower = part.toLowerCase();
        const direct = HI_WORD_MAP[lower];
        if (direct) return direct;

        if (lower.endsWith("s")) {
          const singular = lower.slice(0, -1);
          const mapped = HI_WORD_MAP[singular];
          if (mapped) return mapped;
        }

        return transliterateLatinWordToDevanagari(lower);
      }

      return part;
    })
    .join("");
};

// Fallback labels for popular business types when DB doesn't have Hindi content yet.
const HI_BUSINESS_TYPE_LABELS: Record<string, string> = {
  "kirana-store": "किराना स्टोर",
  restaurant: "रेस्टोरेंट",
  "coaching-center": "कोचिंग सेंटर",
  "property-rental": "किराये की प्रॉपर्टी",

  // Common variants (slugs can differ by seed/admin input)
  "salon-spa": "सैलून और स्पा",
  "salon-and-spa": "सैलून और स्पा",

  "clothing-store": "कपड़ों की दुकान",
  "electronics-shop": "इलेक्ट्रॉनिक्स दुकान",
  "medical-store": "मेडिकल स्टोर",

  "gym-fitness": "जिम और फिटनेस",
  "gym-and-fitness": "जिम और फिटनेस",

  "bakery-cafe": "बेकरी और कैफ़े",
  "bakery-and-cafe": "बेकरी और कैफ़े",

  "stationery-shop": "स्टेशनरी शॉप",
  "stationery-store": "स्टेशनरी स्टोर",

  "pet-shop": "पेट शॉप",
  "mobile-repair": "मोबाइल रिपेयर",
  "furniture-store": "फर्नीचर स्टोर",

  "car-bike-service-center": "कार और बाइक सर्विस सेंटर",
  "car-bike-service-centre": "कार और बाइक सर्विस सेंटर",
};

const localizeBusinessTypeName = (slug: string, name: string) => {
  const lang = getPreferredLanguage();
  if (lang !== "hi") return name;
  if (looksLikeHindi(name)) return name;
  const normalized = String(slug || "").toLowerCase();
  if (!/^[a-z0-9-]+$/.test(normalized)) return name;
  return HI_BUSINESS_TYPE_LABELS[normalized] || name;
};

const getAuthHeaders = () => {
  const token = getAccessToken();
  return token ? ({ Authorization: `Bearer ${token}` } as HeadersInit) : undefined;
};

export type PlatformFeedbackStats = {
  avgRating: number;
  totalCount: number;
};

export async function fetchPlatformFeedbackStats(): Promise<PlatformFeedbackStats> {
  const response = await fetch(`${API_BASE_URL}/platform-feedback/stats`, {
    cache: 'no-store',
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.message || 'Failed to load platform rating');
  }
  return (json?.data || { avgRating: 0, totalCount: 0 }) as PlatformFeedbackStats;
}

export type SubmitPlatformFeedbackPayload = {
  rating: number;
  feedback?: string;
  source?: 'publicWebsite';
};

export async function submitPlatformFeedback(payload: SubmitPlatformFeedbackPayload) {
  const response = await fetch(`${API_BASE_URL}/platform-feedback`, {
    method: 'POST',
    headers: {
      ...(getAuthHeaders() || {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rating: payload?.rating,
      feedback: payload?.feedback,
      source: payload?.source || 'publicWebsite',
    }),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.message || 'Failed to submit feedback');
  }
  return json;
}

export type ContactSettings = {
  whatsappNumber: string;
  email: string;
  officeAddress: string;
};

export async function fetchContactSettings(): Promise<ContactSettings> {
  const response = await fetch(`${API_BASE_URL}/contact/settings`, {
    cache: 'no-store',
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.message || 'Failed to load contact settings');
  }
  return (json?.data || { whatsappNumber: '', email: '', officeAddress: '' }) as ContactSettings;
}

export type SubmitContactMessagePayload = {
  name: string;
  email: string;
  message: string;
};

export async function submitContactMessage(payload: SubmitContactMessagePayload) {
  const response = await fetch(`${API_BASE_URL}/contact/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: payload?.name,
      email: payload?.email,
      message: payload?.message,
    }),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.message || 'Failed to submit message');
  }
  return json;
}

export type AboutPageContent = {
  heading: string;
  intro: string;
  cards: Array<{ title: string; desc: string }>;
  body: string;
  closing: string;
};

export async function fetchAboutPageContent(lang?: string): Promise<AboutPageContent> {
  const url = new URL(`${API_BASE_URL}/about`);
  if (lang) url.searchParams.set('lang', lang);

  const response = await fetch(url.toString(), {
    cache: 'no-store',
    headers: lang ? { 'Accept-Language': lang } : undefined,
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.message || 'Failed to load about content');
  }
  return (json?.data || {
    heading: '',
    intro: '',
    cards: [],
    body: '',
    closing: '',
  }) as AboutPageContent;
}

type CustomerReferralSummaryResponse = {
  success: boolean;
  message?: string;
  data?: {
    referralCode: string;
    walletBalance: number;
    activeOffer?: {
      _id: string;
      offerName: string;
      description?: string;
      commissionPercent: number;
      status: string;
      validFrom?: string;
      validUntil?: string | null;
    } | null;
    totalReferrals: number;
    totalEarnings: number;
    recentReferrals: Array<any>;
  };
};

export async function fetchMyCustomerReferralSummary(): Promise<NonNullable<CustomerReferralSummaryResponse['data']>> {
  const response = await fetch(`${API_BASE_URL}/customer-referrals/me/summary`, {
    cache: 'no-store',
    headers: getAuthHeaders(),
  });
  const json = (await response.json()) as CustomerReferralSummaryResponse;
  if (!response.ok) {
    throw new Error(json?.message || 'Failed to load referral summary');
  }
  return (json?.data || {
    referralCode: '',
    walletBalance: 0,
    activeOffer: null,
    totalReferrals: 0,
    totalEarnings: 0,
    recentReferrals: [],
  }) as any;
}

type WalletTransactionsResponse = {
  success: boolean;
  message?: string;
  data?: Array<{
    _id: string;
    amount: number;
    type: 'credit' | 'debit';
    source: 'referral' | 'withdrawal';
    status: 'pending' | 'completed' | 'rejected';
    referenceId?: string;
    createdAt: string;
  }>;
};

export async function fetchMyWalletTransactions() {
  const response = await fetch(`${API_BASE_URL}/wallet/transactions`, {
    cache: 'no-store',
    headers: getAuthHeaders(),
  });
  const json = (await response.json()) as WalletTransactionsResponse;
  if (!response.ok) {
    throw new Error(json?.message || 'Failed to load wallet transactions');
  }
  return json?.data || [];
}

type WithdrawalsResponse = {
  success: boolean;
  message?: string;
  data?: Array<{
    _id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    bankDetails?: {
      accountHolderName?: string;
      bankName?: string;
      accountNumber?: string;
      ifsc?: string;
    };
    rejectionReason?: string;
    processedAt?: string;
    createdAt: string;
  }>;
};

export async function fetchMyWithdrawals() {
  const response = await fetch(`${API_BASE_URL}/wallet/withdrawals`, {
    cache: 'no-store',
    headers: getAuthHeaders(),
  });
  const json = (await response.json()) as WithdrawalsResponse;
  if (!response.ok) {
    throw new Error(json?.message || 'Failed to load withdrawals');
  }
  return json?.data || [];
}

type WithdrawRequestBody = {
  amount: number;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
};

type WithdrawRequestResponse = {
  success: boolean;
  message?: string;
  data?: any;
};

export async function requestWalletWithdrawal(body: WithdrawRequestBody) {
  const response = await fetch(`${API_BASE_URL}/wallet/withdraw`, {
    method: 'POST',
    headers: {
      ...(getAuthHeaders() || {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as WithdrawRequestResponse;
  if (!response.ok) {
    throw new Error(json?.message || 'Failed to create withdrawal request');
  }
  return json;
}

export type PublicStoryItem = {
  _id: string;
  businessId: string;
  business?: { _id: string; name: string; logo: string | null; slug: string | null } | null;
  kind: 'story' | 'reel';
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  durationSec?: number | null;
  linkUrl?: string | null;
  createdAt: string;
  expiresAt: string | null;
};

export async function fetchActiveStories(kind: 'story' | 'reel' = 'story', businessId?: string): Promise<PublicStoryItem[]> {
  const usp = new URLSearchParams();
  if (kind) usp.set('kind', kind);
  if (businessId) usp.set('businessId', businessId);
  const qs = usp.toString();

  const response = await fetch(`${API_BASE_URL}/stories${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
    headers: getAuthHeaders(),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.message || 'Failed to load stories');
  }
  const rows = (json?.data || []) as PublicStoryItem[];

  // Sanitize user-provided media URLs to prevent mixed-content + localhost leaks.
  return rows
    .map((s) => {
      const safeMediaUrl = toSafePublicImageUrl(s.mediaUrl, '');
      const business = s.business;
      const safeBusinessLogo = business?.logo
        ? (toSafePublicImageUrl(business.logo, '') || null)
        : business?.logo ?? null;

      return {
        ...s,
        mediaUrl: safeMediaUrl,
        business: business
          ? {
              ...business,
              logo: safeBusinessLogo,
            }
          : business,
      };
    })
    .filter((s) => Boolean(String(s.mediaUrl || '').trim()));
}

export async function markStoryViewed(storyId: string): Promise<void> {
  if (!storyId) return;
  const response = await fetch(`${API_BASE_URL}/stories/${encodeURIComponent(storyId)}/view`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  // If unauthorized, let route guard handle it.
  if (response.status === 401) return;
  if (!response.ok) {
    // Non-blocking: view tracking should never break UX
    return;
  }
}

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
  nameHi?: string;
  slug: string;
  description: string;
  descriptionHi?: string;
  phone: string;
  whatsapp: string;
  isVerified: boolean;
  isOpen: boolean;
  logo: string;
  coverImage: string;
  businessType: { name: string; nameHi?: string; slug: string; description?: string; descriptionHi?: string } | null;
  rating?: number;
  reviewCount?: number;
  ordersCount?: number;
  activePlanPrice?: number;
  address: {
    street: string;
    streetHi?: string;
    city: string;
    cityHi?: string;
    state: string;
    stateHi?: string;
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
    nameHi?: string;
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
    nameHi?: string;
    slug: string;
    owner?: { name?: string; phone?: string; email?: string };
    phone?: string;
    whatsapp?: string;
    description?: string;
    descriptionHi?: string;
    logo?: string;
    coverImage?: string;
    isVerified?: boolean;
    businessType?: {
      name?: string;
      nameHi?: string;
      slug?: string;
      description?: string;
      descriptionHi?: string;
      suggestedListingType?: "product" | "service" | "food" | "course" | "rental";
    };
    address?: {
      street?: string;
      streetHi?: string;
      city?: string;
      cityHi?: string;
      state?: string;
      stateHi?: string;
      pincode?: string;
      location?: { coordinates?: number[] };
    };
    workingHours?: Record<string, { open?: string; close?: string; isOpen?: boolean }>;
    openStatusMode?: 'auto' | 'open' | 'closed';
    isOpen?: boolean;

    // Directory/stores fields
    publicShopEnabled?: boolean;
    subdomainActive?: boolean;
  };
};

type PublicListingsResponse = {
  success: boolean;
  message?: string;
  data?: {
    listings?: Array<{
      _id: string;
      title: string;
      titleHi?: string;
      description?: string;
      descriptionHi?: string;
      price: number;
      listingType?: "product" | "service" | "course" | "food" | "rental";
      images?: Array<{ url?: string }>;
      pricingOptions?: Array<{ label?: string; labelHi?: string; price?: number }>;
      attributes?: Array<{ name: string; value: string | number }>;
    }>;
  };
};

const fallbackCover = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop";
const fallbackLogo = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop";
const fallbackProduct = "https://images.unsplash.com/photo-1604719312566-8912e9c8a213?w=400&h=400&fit=crop";
const fallbackTypeIcon = "🏪";

const getApiOrigin = () => {
  const base = String(API_BASE_URL || '').trim();
  if (!base) return '';

  if (base.startsWith('/')) {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }

  try {
    return new URL(base).origin;
  } catch {
    return '';
  }
};

const getStorefrontOrigin = () => {
  if (typeof window === 'undefined') return '';
  return String(window.location.origin || '').trim();
};

export function toSafePublicImageUrl(value: unknown, fallback: string) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  // Never allow localhost-style URLs to leak into production storefront.
  if (isLocalhostUrl(raw)) return fallback;

  // Allow data/blob (used by some upload previews).
  if (/^(data:|blob:)/i.test(raw)) return raw;

  // Protocol-relative URLs inherit https on production.
  if (raw.startsWith('//')) return raw;

  // Backend might return relative paths; resolve them against backend origin.
  if (raw.startsWith('/')) {
    // Prefer storefront origin so assets like `/logo-removebg-preview.png` work on subdomains.
    const origin = getStorefrontOrigin() || getApiOrigin();
    return origin ? `${origin}${raw}` : fallback;
  }

  try {
    const url = new URL(raw);
    if (url.protocol === 'http:') {
      // Avoid mixed content by best-effort upgrading to https.
      url.protocol = 'https:';
    }
    const normalized = url.toString();
    return isLocalhostUrl(normalized) ? fallback : normalized;
  } catch {
    return fallback;
  }
}

const toTitle = (value: string) => {
  if (!value) return "General";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const mapPublicShopToCardShop = (item: PublicShopItem): Shop => {
  const lang = getPreferredLanguage();

  const rawCategoryName = lang === 'hi'
    ? item.businessType?.nameHi || item.businessType?.name || "General"
    : item.businessType?.name || "General";

  const categorySlug = item.businessType?.slug || "general";
  const categoryName = localizeBusinessTypeName(categorySlug, rawCategoryName);
  const citySource = item.address.city || "Unknown";
  const cityName = lang === 'hi'
    ? String(item.address.cityHi || '').trim() || autoHindiCity(citySource)
    : citySource;

  const streetSource = item.address.street || "";
  const area = lang === 'hi'
    ? String(item.address.streetHi || '').trim() || streetSource || cityName || "Local Area"
    : streetSource || cityName || "Local Area";

  const resolvedName = lang === 'hi'
    ? String(item.nameHi || '').trim() || (looksLikeHindi(item.name) ? item.name : autoHindiText(item.name))
    : item.name;

  const resolvedDescription = lang === 'hi'
    ? String(item.descriptionHi || '').trim() || item.description
    : item.description;

  const rating = Number((item as any)?.rating);
  const reviewCount = Number((item as any)?.reviewCount);
  const activePlanPrice = Number((item as any)?.activePlanPrice);

  return {
    id: item._id,
    name: resolvedName,
    slug: item.slug,
    category: categoryName,
    categorySlug,
    city: cityName,
    citySlug: normalizeCitySlug(citySource),
    area,
    address: [
      lang === 'hi' ? (String(item.address.streetHi || '').trim() || item.address.street) : item.address.street,
      lang === 'hi'
        ? (String(item.address.cityHi || '').trim() || autoHindiCity(String(item.address.city || '').trim()))
        : item.address.city,
      lang === 'hi'
        ? (String(item.address.stateHi || '').trim() || autoHindiState(String(item.address.state || '').trim()))
        : item.address.state,
      item.address.pincode,
    ]
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
    description:
      resolvedDescription ||
      `${resolvedName} - ${categoryName} ${lang === "hi" ? "दुकान" : "store"}`,
    coverImage: toSafePublicImageUrl(item.coverImage, fallbackCover),
    logo: toSafePublicImageUrl(item.logo, fallbackLogo),
    paymentMethods: lang === "hi" ? ["नकद", "UPI"] : ["Cash", "UPI"],
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
  q.set("lang", getPreferredLanguage());
  if (params?.city) q.set("city", params.city);
  if (params?.category) q.set("category", params.category);
  if (params?.search) q.set("search", params.search);
  if (params?.lat != null && Number.isFinite(params.lat)) q.set('lat', String(params.lat));
  if (params?.lng != null && Number.isFinite(params.lng)) q.set('lng', String(params.lng));

  const response = await fetch(`${API_BASE_URL}/business/public/shops?${q.toString()}`, {
    headers: getLanguageHeaders(),
  });
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
  q.set('lang', getPreferredLanguage());

  const response = await fetch(`${API_BASE_URL}/business/nearby?${q.toString()}`, {
    headers: {
      ...(getAuthHeaders() || {}),
      ...getLanguageHeaders(),
    },
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
  const sid = getViewSessionId();
  const shopUrl = new URL(`${API_BASE_URL}/business/directory/${encodeURIComponent(slug)}`);
  shopUrl.searchParams.set("lang", getPreferredLanguage());
  if (sid) {
    shopUrl.searchParams.set("sid", sid);
  }

  const response = await fetch(shopUrl.toString(),
    {
      headers: {
        ...(getAuthHeaders() || {}),
        ...getLanguageHeaders(),
      },
    }
  );
  const json = (await response.json()) as PublicBusinessBySlugResponse;

  if (response.status === 404) return null;
  if (response.status === 401) {
    const err: any = new Error(json.message || 'Login required');
    err.status = 401;
    throw err;
  }
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.message || "Failed to load shop");
  }

  const business = json.data;
  const lang = getPreferredLanguage();

  const resolvedBusinessName = lang === 'hi'
    ? String(business.nameHi || '').trim() || (looksLikeHindi(business.name) ? business.name : autoHindiText(business.name))
    : business.name;

  const resolvedBusinessDescription = lang === 'hi'
    ? String(business.descriptionHi || '').trim() || business.description
    : business.description;

  const rawBusinessTypeName = lang === 'hi'
    ? business.businessType?.nameHi || business.businessType?.name || "General"
    : business.businessType?.name || "General";

  const citySource = business.address?.city || "Unknown";
  const cityName = lang === 'hi'
    ? String(business.address?.cityHi || '').trim() || autoHindiCity(citySource)
    : citySource;

  const streetSource = business.address?.street || '';
  const area = lang === 'hi'
    ? String(business.address?.streetHi || '').trim() || streetSource || cityName || "Local Area"
    : streetSource || cityName || "Local Area";

  const coords = business.address?.location?.coordinates;
  const hasCoords = Array.isArray(coords) && coords.length === 2;
  const todaySlot = getTodaySlot(business.workingHours);

  // Review summary (best-effort; never fail shop page if this fails)
  let rating = 0;
  let reviewCount = 0;
  try {
    const r = await fetch(`${API_BASE_URL}/reviews/business/${encodeURIComponent(business.slug)}/summary`, {
      headers: getLanguageHeaders(),
    });
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
    name: resolvedBusinessName,
    slug: business.slug,
    ownerName: business.owner?.name || undefined,
    ownerPhone: business.owner?.phone || undefined,
    ownerEmail: business.owner?.email || undefined,
    category: localizeBusinessTypeName(
      business.businessType?.slug || "general",
      rawBusinessTypeName
    ),
    categorySlug: business.businessType?.slug || "general",
    suggestedListingType: business.businessType?.suggestedListingType,
    city: cityName,
    citySlug: normalizeCitySlug(citySource),
    area,
    address: [
      lang === 'hi' ? (String(business.address?.streetHi || '').trim() || business.address?.street) : business.address?.street,
      lang === 'hi'
        ? (String(business.address?.cityHi || '').trim() || autoHindiCity(String(business.address?.city || '').trim()))
        : business.address?.city,
      lang === 'hi'
        ? (String(business.address?.stateHi || '').trim() || autoHindiState(String(business.address?.state || '').trim()))
        : business.address?.state,
      business.address?.pincode,
    ]
      .filter(Boolean)
      .join(", "),
    rating,
    reviewCount,
    isOpen: typeof business.isOpen === 'boolean'
      ? business.isOpen
      : computeOpenStatus(business.workingHours, business.openStatusMode),
    openingTime: format12h(todaySlot?.open, "09:00 AM"),
    closingTime: format12h(todaySlot?.close, "09:00 PM"),
    weeklyOff: lang === "hi" ? "लागू नहीं" : "N/A",
    whatsapp: business.whatsapp || business.phone || "",
    phone: business.phone || "",
    description:
      resolvedBusinessDescription ||
      `${resolvedBusinessName} ${lang === "hi" ? "स्थानीय दुकान" : "local store"}`,
    coverImage: toSafePublicImageUrl(business.coverImage, fallbackCover),
    logo: toSafePublicImageUrl(business.logo, fallbackLogo),
    paymentMethods: lang === "hi" ? ["नकद", "UPI"] : ["Cash", "UPI"],
    products: [],
    latitude: hasCoords ? (coords?.[1] as number) : 0,
    longitude: hasCoords ? (coords?.[0] as number) : 0,
    verified: !!business.isVerified,
    publicShopEnabled: typeof (business as any)?.publicShopEnabled === 'boolean' ? !!(business as any).publicShopEnabled : undefined,
    subdomainActive: typeof (business as any)?.subdomainActive === 'boolean' ? !!(business as any).subdomainActive : undefined,
  };
};

export const fetchPublicListingsForShop = async (businessId: string) => {
  const lang = getPreferredLanguage();
  const q = new URLSearchParams();
  q.set('limit', '100');
  q.set('lang', lang);

  const response = await fetch(
    `${API_BASE_URL}/listings/public/business/${encodeURIComponent(businessId)}?${q.toString()}`,
    { headers: getLanguageHeaders() }
  );
  const json = (await response.json()) as PublicListingsResponse;

  if (!response.ok || !json.success) {
    throw new Error(json.message || "Failed to load listings");
  }

  const listings = json.data?.listings || [];
  return listings.map((item) => {
    const imageUrls = Array.isArray(item.images)
      ? item.images.map((img) => String(img?.url || "").trim()).filter(Boolean)
      : [];

    const resolvedTitle = lang === 'hi'
      ? String(item.titleHi || '').trim() || (looksLikeHindi(item.title) ? item.title : autoHindiText(item.title))
      : item.title;

    const resolvedDescription = lang === 'hi'
      ? String(item.descriptionHi || '').trim() || (looksLikeHindi(item.description) ? String(item.description || "") : autoHindiText(String(item.description || "")))
      : item.description;

    const pricingOptions = Array.isArray(item.pricingOptions)
      ? item.pricingOptions
          .map((o) => {
            const rawLabel = String((lang === 'hi' ? o?.labelHi : o?.label) || o?.label || "").trim();
            const label = lang === 'hi' && rawLabel && !looksLikeHindi(rawLabel) ? autoHindiText(rawLabel) : rawLabel;
            return {
              label,
              price: Number(o?.price),
              oldPrice: (() => {
                const raw = Number((o as any)?.oldPrice);
                return Number.isFinite(raw) && raw > 0 ? raw : undefined;
              })(),
              discountPercent: (() => {
                const raw = Number((o as any)?.discountPercent);
                return Number.isFinite(raw) && raw > 0 ? raw : undefined;
              })(),
            };
          })
          .filter((o) => o.label && Number.isFinite(o.price) && o.price >= 0)
      : [];

    return {
      id: item._id,
      name: resolvedTitle,
      price: item.price,
      oldPrice: (() => {
        const raw = Number((item as any)?.oldPrice);
        return Number.isFinite(raw) && raw > 0 ? raw : undefined;
      })(),
      discountPercent: (() => {
        const raw = Number((item as any)?.discountPercent);
        return Number.isFinite(raw) && raw > 0 ? raw : undefined;
      })(),
      image: toSafePublicImageUrl(imageUrls[0], fallbackProduct),
      images: imageUrls.length > 0 ? imageUrls.map((u) => toSafePublicImageUrl(u, fallbackProduct)) : undefined,
      pricingOptions: pricingOptions.length > 0 ? pricingOptions : undefined,
      description: resolvedDescription || "",
      type: item.listingType || "product",
      isFeatured: !!(item as any)?.isFeatured,
      attributes: Array.isArray(item.attributes)
        ? item.attributes
            .filter((a) => a && typeof a.name === "string" && a.name.trim().length > 0)
            .map((a) => ({ name: a.name, value: a.value }))
        : [],
    };
  });
};

type PublicShopOffersResponse = {
  success: boolean;
  message?: string;
  data?: {
    offers?: Array<{
      _id: string;
      listingId?: string;
      title: string;
      titleHi?: string;
      description?: string;
      descriptionHi?: string;
      type?: 'bogo' | 'discount_percent' | 'discount_flat' | 'custom';
      percentOff?: number;
      amountOff?: number;
      bogo?: { buyQty?: number; getQty?: number; label?: string; labelHi?: string };
      banner?: { imageUrl?: string; linkUrl?: string };
      status?: 'draft' | 'active' | 'paused' | 'archived';
      validFrom?: string;
      validUntil?: string;
    }>;
  };
};

export const fetchPublicOffersForBusiness = async (businessId: string) => {
  const lang = getPreferredLanguage();
  const q = new URLSearchParams();
  q.set('lang', lang);

  const response = await fetch(`${API_BASE_URL}/offers/public/business/${encodeURIComponent(businessId)}?${q.toString()}`,
    { headers: getLanguageHeaders() }
  );
  const json = (await response.json()) as PublicShopOffersResponse;

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to load offers');
  }

  return json.data?.offers || [];
};

export const looksLikeCitySlug = async (slug: string) => {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (!normalizedSlug) return false;

  const shops = await fetchPublicShops();
  const cities = groupCitiesFromShops(shops);
  return (
    cities.some((city) => city.slug === normalizedSlug || normalizeCitySlug(city.name) === normalizedSlug) ||
    shops.some((shop) => isSameCity(shop.city, slugToText(normalizedSlug)))
  );
};

export const fetchBusinessTypes = async (): Promise<PublicBusinessType[]> => {
  const q = new URLSearchParams();
  q.set("lang", getPreferredLanguage());
  const response = await fetch(`${API_BASE_URL}/business-types?${q.toString()}`, {
    headers: getLanguageHeaders(),
  });
  const json = (await response.json()) as BusinessTypeResponse;

  if (!response.ok || !json.success) {
    throw new Error(json.message || "Failed to load business types");
  }

  const lang = getPreferredLanguage();
  const items = json.data || [];
  return items.map((item) => {
    const rawName = lang === 'hi'
      ? String(item.nameHi || '').trim() || item.name
      : item.name;

    return {
      id: item._id,
      name: localizeBusinessTypeName(item.slug, rawName),
      slug: item.slug,
      icon: item.icon || fallbackTypeIcon,
    };
  });
};

export type PublicBookingSlot = {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  status: string;
  duration?: number;
};

type PublicBookingSlotsResponse = {
  success: boolean;
  message?: string;
  data?: PublicBookingSlot[];
};

type BookSlotResponse = {
  success: boolean;
  message?: string;
  data?: any;
};

export const fetchBookingSlotsBySlug = async (slug: string, date: string) => {
  const q = new URLSearchParams({ date });
  const response = await fetch(
    `${API_BASE_URL}/bookings/slots/slug/${encodeURIComponent(slug)}?${q.toString()}`
  );
  const json = (await response.json()) as PublicBookingSlotsResponse;
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Failed to load slots");
  }
  return json.data || [];
};

export const bookPublicSlot = async (
  slotId: string,
  payload: { customerNotes?: string }
) => {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(slotId)}/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const json = (await response.json()) as BookSlotResponse;
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Failed to book slot");
  }
  return json.data;
};

export const bookPublicSlotBySlug = async (
  slug: string,
  input: {
    date: string;
    startTime: string;
    customerNotes?: string;
    listingId?: string;
  }
) => {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/bookings/book/slug/${encodeURIComponent(slug)}` , {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });
  const json = (await response.json()) as BookSlotResponse;
  if (!response.ok || !json.success) {
    throw new Error(json.message || "Failed to book slot");
  }
  return json.data;
};

export const fetchCityImage = async (cityName: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/public/cities/${encodeURIComponent(cityName)}/image`);
    const json = (await response.json()) as { success: boolean; data?: { imageUrl: string } };
    if (response.ok && json.success && json.data?.imageUrl) {
      return json.data.imageUrl;
    }
  } catch (error) {
    console.error(`Error fetching image for city ${cityName}:`, error);
  }
  // Fallback placeholder
  return `https://via.placeholder.com/400x300?text=${encodeURIComponent(cityName)}`;
};

export const fetchCityImages = async (cities: string[]): Promise<Record<string, string>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/public/cities/images/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cities }),
    });
    const json = (await response.json()) as { success: boolean; data?: Array<{ cityName: string; imageUrl: string }> };
    if (response.ok && json.success && json.data) {
      const imageMap: Record<string, string> = {};
      json.data.forEach(({ cityName, imageUrl }) => {
        imageMap[cityName] = imageUrl;
      });
      return imageMap;
    }
  } catch (error) {
    console.error("Error fetching city images batch:", error);
  }
  // Fallback: return placeholder for each city
  const fallback: Record<string, string> = {};
  cities.forEach((city) => {
    fallback[city] = `https://via.placeholder.com/400x300?text=${encodeURIComponent(city)}`;
  });
  return fallback;
};

