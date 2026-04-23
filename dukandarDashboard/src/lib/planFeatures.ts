import type { Plan } from "@/lib/api/plan";

type PlanFeatureMap = Plan["features"];

const FEATURE_LABELS: Record<string, string> = {
  publicShopEnabled: "Public shop",
  bookingEnabled: "Bookings enabled",
  storiesEnabled: "Stories & Reels",
  listingStoriesEnabled: "Listing → Stories/Reels",
  ratingsEnabled: "Ratings",
  locationEnabled: "Location",
  customDomain: "Custom domain",
  analyticsEnabled: "Analytics",
  prioritySupport: "Priority support",
  whatsappIntegration: "WhatsApp integration",
  removeWatermark: "Remove watermark",
  seoTools: "SEO tools",
  apiAccess: "API access",
  supportTicketsEnabled: "Support tickets",
  referralsEnabled: "Referrals",
  invoicesEnabled: "Invoices",
  brandingEnabled: "Branding",
  whatsappSettingsEnabled: "WhatsApp settings",
  ordersEnabled: "Orders",
  inquiriesEnabled: "Inquiries",
};

const prettifyKey = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const buildPlanFeatureSummary = (
  features: PlanFeatureMap,
  t?: (key: string, options?: Record<string, any>) => string
): string[] => {
  const items: string[] = [];

  const tr = (key: string, fallback: string, options?: Record<string, any>) => {
    try {
      return t ? t(key, options) : fallback;
    } catch {
      return fallback;
    }
  };

  if (typeof features.maxListings === "number") {
    items.push(tr("planFeatures.maxListings", `Max listings: ${features.maxListings}`, { count: features.maxListings }));
  }

  if (features.featuredEnabled) {
    const count = features.maxFeaturedListings || 0;
    items.push(tr("planFeatures.featuredListings", `Featured listings: ${count}`, { count }));
  }

  for (const [key, value] of Object.entries(features)) {
    if (key === "maxListings" || key === "featuredEnabled" || key === "maxFeaturedListings") {
      continue;
    }

    if (typeof value === "boolean") {
      if (value) {
        const fallback = FEATURE_LABELS[key] || prettifyKey(key);
        items.push(tr(`planFeatures.labels.${key}`, fallback));
      }
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      const labelFallback = FEATURE_LABELS[key] || prettifyKey(key);
      const label = tr(`planFeatures.labels.${key}`, labelFallback);
      items.push(tr("planFeatures.numeric", `${labelFallback}: ${value}`, { label, value }));
    }
  }

  return items;
};
