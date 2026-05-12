export type CityFeature = {
  name: string;
  slug: string;
  shops: number;
  accent: string;
  landmark: string;
};

export type CategoryFeature = {
  name: string;
  slug: string;
  icon: string;
  accent: string;
  hint: string;
};

export type StoryFeature = {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: string;
};

export type PlanFeature = {
  name: string;
  price: string;
  highlight: string;
  perks: string[];
  accent: string;
};

export const FEATURED_CITIES: CityFeature[] = [
  { name: "Delhi", slug: "delhi", shops: 8, accent: "#D74E09", landmark: "India Gate" },
  { name: "Mumbai", slug: "mumbai", shops: 7, accent: "#0284C7", landmark: "Gateway of India" },
  { name: "Bangalore", slug: "bangalore", shops: 7, accent: "#059669", landmark: "Vidhana Soudha" },
  { name: "Jaipur", slug: "jaipur", shops: 6, accent: "#C2410C", landmark: "Hawa Mahal" },
  { name: "Pune", slug: "pune", shops: 5, accent: "#7C3AED", landmark: "Shaniwar Wada" },
];

export const FEATURED_CATEGORIES: CategoryFeature[] = [
  { name: "Salon", slug: "salon", icon: "scissors", accent: "#DB2777", hint: "Hair, spa & grooming" },
  { name: "Restaurant", slug: "restaurant", icon: "coffee", accent: "#D97706", hint: "Food, dine-in & delivery" },
  { name: "Grocery", slug: "grocery", icon: "shopping-bag", accent: "#059669", hint: "Daily needs and kirana" },
  { name: "Tailor", slug: "tailor", icon: "tool", accent: "#0284C7", hint: "Stitching & alterations" },
  { name: "Gym", slug: "gym", icon: "activity", accent: "#7C3AED", hint: "Fitness & training" },
  { name: "Medical", slug: "medical", icon: "plus-circle", accent: "#DC2626", hint: "Pharmacy & healthcare" },
];

export const FEATURE_STORIES: StoryFeature[] = [
  { id: "s1", title: "Fresh arrivals", subtitle: "New products from local shops", accent: "#D74E09", icon: "package" },
  { id: "s2", title: "Weekend deals", subtitle: "Offers and coupons near you", accent: "#059669", icon: "tag" },
  { id: "s3", title: "Verified businesses", subtitle: "Trusted shops and service providers", accent: "#0284C7", icon: "shield" },
  { id: "s4", title: "Book instantly", subtitle: "Slots, inquiries and quick chat", accent: "#7C3AED", icon: "calendar" },
];

export const PUBLIC_PLANS: PlanFeature[] = [
  {
    name: "Starter",
    price: "Free",
    highlight: "Perfect to begin",
    perks: ["Basic listing", "Business profile", "Search visibility"],
    accent: "#059669",
  },
  {
    name: "Pro",
    price: "₹499/mo",
    highlight: "More leads and bookings",
    perks: ["Featured placement", "Bookings", "Reviews and chats"],
    accent: "#D74E09",
  },
  {
    name: "Enterprise",
    price: "Custom",
    highlight: "For growing brands",
    perks: ["Team support", "Advanced analytics", "Priority onboarding"],
    accent: "#0F766E",
  },
];

export const PUBLIC_FEATURES = [
  { icon: "map-pin", title: "Browse by city", subtitle: "Discover shops city-wise with landmark images." },
  { icon: "search", title: "Search businesses", subtitle: "Find shops, categories and services fast." },
  { icon: "bookmark", title: "Save and book", subtitle: "Keep track of bookings and nearby businesses." },
  { icon: "gift", title: "Referrals & rewards", subtitle: "Share your code and track earnings." },
  { icon: "dollar-sign", title: "Plans and pricing", subtitle: "Compare plans before upgrading." },
  { icon: "message-circle", title: "Stories and updates", subtitle: "Featured posts and new arrivals." },
];

export const PUBLIC_WALLET = {
  balance: 1240,
  pending: 300,
  withdrawals: 2,
};

export const buildCityArtwork = (cityName: string, accent: string, landmark: string) => {
  const label = String(cityName || "City");
  const safeAccent = accent || "#D74E09";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 680" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${safeAccent}" />
          <stop offset="55%" stop-color="#1f2937" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="36%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="960" height="680" rx="44" fill="url(#g)" />
      <circle cx="740" cy="150" r="100" fill="#fde68a" opacity="0.96" />
      <rect x="0" y="420" width="960" height="260" fill="#0f172a" opacity="0.55" />
      <ellipse cx="480" cy="510" rx="280" ry="80" fill="#000" opacity="0.18" />
      <rect x="150" y="390" width="70" height="160" rx="8" fill="#f8fafc" opacity="0.88" />
      <rect x="240" y="340" width="90" height="210" rx="10" fill="#f8fafc" opacity="0.84" />
      <rect x="360" y="360" width="82" height="190" rx="10" fill="#f8fafc" opacity="0.8" />
      <rect x="472" y="315" width="116" height="235" rx="12" fill="#f8fafc" opacity="0.9" />
      <rect x="618" y="350" width="88" height="200" rx="10" fill="#f8fafc" opacity="0.82" />
      <rect x="734" y="380" width="72" height="170" rx="8" fill="#f8fafc" opacity="0.86" />
      <path d="M210 390 h46 v-58 h-18 v-20 h36 v20 h-18 v58 h18 v22 h-64z" fill="#fef3c7" opacity="0.98" />
      <path d="M500 315 h20 v-56 h34 v56 h20 v28 h-74z" fill="#fde68a" opacity="0.98" />
      <path d="M646 350 h20 v-42 h18 v42 h20 v24 h-58z" fill="#fed7aa" opacity="0.96" />
      <rect x="300" y="250" width="360" height="68" rx="24" fill="#fff7ed" opacity="0.9" />
      <rect x="334" y="210" width="292" height="44" rx="22" fill="#ffffff" opacity="0.92" />
      <ellipse cx="480" cy="190" rx="90" ry="90" fill="url(#glow)" />
      <text x="72" y="104" fill="#ffffff" font-family="Arial, sans-serif" font-size="60" font-weight="700">${label}</text>
      <text x="74" y="152" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="24">${landmark} · local shops and services</text>
      <text x="74" y="622" fill="#f8fafc" font-family="Arial, sans-serif" font-size="22">Explore verified businesses, stories and bookings</text>
    </svg>
  `;

  return svg;
};

export const getCityArtwork = (cityName: string) => {
  const city = FEATURED_CITIES.find((item) => item.name.toLowerCase() === String(cityName || "").toLowerCase());
  const fallback = city || FEATURED_CITIES[0];
  return buildCityArtwork(fallback.name, fallback.accent, fallback.landmark);
};
