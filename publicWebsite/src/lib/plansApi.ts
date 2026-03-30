import type { PricingPlan } from "@/data/mockData";
import { API_BASE_URL } from "@/lib/publicShopsApi";

type BackendPlan = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  durationInDays: number;
  description?: string;
  isPopular?: boolean;
  order?: number;
  features?: {
    maxListings?: number;
    publicShopEnabled?: boolean;
    bookingEnabled?: boolean;
    featuredEnabled?: boolean;
    maxFeaturedListings?: number;
    customDomain?: boolean;
    analyticsEnabled?: boolean;
    prioritySupport?: boolean;
    whatsappIntegration?: boolean;
    removeWatermark?: boolean;
    seoTools?: boolean;
    apiAccess?: boolean;
  };
};

type PlansResponse = {
  success: boolean;
  message?: string;
  data?: BackendPlan[];
};

const billingCycleFromDuration = (durationInDays: number, price: number) => {
  if (!Number.isFinite(durationInDays) || durationInDays <= 0) return "month";
  if (price === 0) return "forever";
  if (durationInDays >= 360) return "year";
  if (durationInDays >= 28 && durationInDays <= 31) return "month";
  if (durationInDays >= 7 && durationInDays <= 8) return "week";
  return "days";
};

const featuresToBullets = (plan: BackendPlan): string[] => {
  const f = plan.features || {};
  const bullets: string[] = [];

  // Keep these short + predictable (UI expects a simple bullet list)
  bullets.push("Basic shop listing");

  if (f.whatsappIntegration !== false) bullets.push("WhatsApp button");
  if (f.publicShopEnabled !== false) bullets.push("Public shop page");

  const max = Number(f.maxListings);
  if (Number.isFinite(max)) {
    if (max < 0) bullets.push("Unlimited products/services");
    else bullets.push(`${max} products/services`);
  }

  if (f.featuredEnabled) bullets.push("Featured listing");
  if (f.customDomain) bullets.push("Custom domain");
  if (f.analyticsEnabled) bullets.push("Advanced analytics");
  if (f.apiAccess) bullets.push("API access");
  if (f.prioritySupport) bullets.push("Priority support");

  // If backend provided a description but bullets are still too short, add it as a last bullet.
  if (bullets.length < 4 && plan.description) bullets.push(plan.description);

  return bullets;
};

const planToPricingPlan = (plan: BackendPlan): PricingPlan => {
  const price = Number(plan.price);
  const safePrice = Number.isFinite(price) ? price : 0;

  const name = String(plan.name || "").trim() || "Plan";
  const nameLower = name.toLowerCase();

  const cta = (() => {
    if (safePrice === 0 || nameLower === "free") return "Start Free";
    if (nameLower === "pro") return "Start Pro Trial";
    if (nameLower === "premium" || nameLower === "enterprise") return "Go Premium";
    return `Choose ${name}`;
  })();

  return {
    name,
    price: safePrice,
    billingCycle: billingCycleFromDuration(Number(plan.durationInDays), safePrice),
    features: featuresToBullets(plan),
    cta,
    popular: !!plan.isPopular,
  };
};

export const fetchPublicPlans = async (): Promise<PricingPlan[]> => {
  const response = await fetch(`${API_BASE_URL}/plans`);
  const json = (await response.json()) as PlansResponse;

  if (!response.ok || !json.success) {
    throw new Error(json.message || "Failed to load plans");
  }

  const rows = json.data || [];
  return rows.map(planToPricingPlan);
};
