import type { Plan } from "@/lib/api/plan";

type PlanFeatureMap = Plan["features"];

const FEATURE_LABELS: Record<string, string> = {
  publicShopEnabled: "Public shop",
  bookingEnabled: "Bookings enabled",
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

export const buildPlanFeatureSummary = (features: PlanFeatureMap): string[] => {
  const items: string[] = [];

  if (typeof features.maxListings === "number") {
    items.push(`Max listings: ${features.maxListings}`);
  }

  if (features.featuredEnabled) {
    items.push(`Featured listings: ${features.maxFeaturedListings || 0}`);
  }

  for (const [key, value] of Object.entries(features)) {
    if (key === "maxListings" || key === "featuredEnabled" || key === "maxFeaturedListings") {
      continue;
    }

    if (typeof value === "boolean") {
      if (value) {
        items.push(FEATURE_LABELS[key] || prettifyKey(key));
      }
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      items.push(`${FEATURE_LABELS[key] || prettifyKey(key)}: ${value}`);
    }
  }

  return items;
};
