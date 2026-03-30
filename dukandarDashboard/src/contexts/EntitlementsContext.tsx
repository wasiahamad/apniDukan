import { createContext, useContext } from "react";

export type EntitlementFeatures = {
  maxListings: number;
  publicShopEnabled: boolean;
  bookingEnabled: boolean;
  featuredEnabled: boolean;
  maxFeaturedListings: number;
  customDomain: boolean;
  analyticsEnabled: boolean;
  prioritySupport: boolean;
  whatsappIntegration: boolean;
  removeWatermark: boolean;
  seoTools: boolean;
  apiAccess: boolean;

  supportTicketsEnabled: boolean;
  referralsEnabled: boolean;
  invoicesEnabled: boolean;
  brandingEnabled: boolean;
  whatsappSettingsEnabled: boolean;

  ordersEnabled: boolean;
  inquiriesEnabled: boolean;
};

export type BusinessEntitlements = {
  plan?: unknown;
  planIsActive: boolean;
  source: "plan" | "fallback" | "defaults" | string;
  features: EntitlementFeatures;
  expiresAt: string | null;
};

export type EntitlementsContextValue = {
  entitlements: BusinessEntitlements | null;
  loading: boolean;
  error: string;
  suspended?: boolean;
  refresh: () => Promise<void>;
};

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

export const useEntitlements = () => {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) throw new Error("useEntitlements must be used within EntitlementsContext.Provider");
  return ctx;
};

export { EntitlementsContext };
