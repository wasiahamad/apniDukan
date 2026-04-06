import { Plan } from '../models/index.js';

const DEFAULT_FEATURES = {
  maxListings: 10,
  publicShopEnabled: true,
  bookingEnabled: true,
  featuredEnabled: false,
  maxFeaturedListings: 0,
  customDomain: false,
  analyticsEnabled: false,
  prioritySupport: false,
  whatsappIntegration: true,
  removeWatermark: false,
  seoTools: false,
  apiAccess: false,

  supportTicketsEnabled: true,
  referralsEnabled: true,
  invoicesEnabled: true,
  brandingEnabled: true,
  whatsappSettingsEnabled: true,

  ordersEnabled: true,
  inquiriesEnabled: true,
};

// Features exposed when subscription is not active.
// Keep all monetized/service features disabled; dashboard/subscription/support UX
// is handled separately at route/UI level.
const INACTIVE_PLAN_FEATURES = {
  maxListings: 0,
  publicShopEnabled: false,
  bookingEnabled: false,
  featuredEnabled: false,
  maxFeaturedListings: 0,
  customDomain: false,
  analyticsEnabled: false,
  prioritySupport: false,
  whatsappIntegration: false,
  removeWatermark: false,
  seoTools: false,
  apiAccess: false,

  supportTicketsEnabled: false,
  referralsEnabled: false,
  invoicesEnabled: false,
  brandingEnabled: false,
  whatsappSettingsEnabled: false,

  ordersEnabled: false,
  inquiriesEnabled: false,
};

const mergeFeatures = (base, overrides) => {
  // Always start from DEFAULT_FEATURES so older plans missing new keys
  // still inherit expected defaults.
  const result = { ...DEFAULT_FEATURES, ...(base || {}) };
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return result;

  Object.keys(overrides).forEach((key) => {
    if (overrides[key] !== undefined) {
      result[key] = overrides[key];
    }
  });

  return result;
};

export const getEffectiveEntitlementsForBusiness = async (businessDoc, options = {}) => {
  const now = options.now ? new Date(options.now) : new Date();

  const planIsActive =
    !!businessDoc?.plan &&
    !!businessDoc?.planExpiresAt &&
    new Date(businessDoc.planExpiresAt) > now;

  let plan = null;
  let source = 'defaults';
  let features = { ...INACTIVE_PLAN_FEATURES };

  if (planIsActive) {
    plan = businessDoc.plan?.features ? businessDoc.plan : await Plan.findById(businessDoc.plan).lean();
    source = 'plan';
    const baseFeatures = plan?.features || DEFAULT_FEATURES;
    features = mergeFeatures(baseFeatures, businessDoc?.featureOverrides);

    // Business rule: slot booking system is available to all active subscriptions.
    // Keep it disabled only when the plan itself is inactive/expired.
    features.bookingEnabled = true;
  }

  return {
    plan,
    planIsActive,
    source,
    features,
    expiresAt: businessDoc?.planExpiresAt || null,
  };
};

export const isUnlimited = (value) => typeof value === 'number' && value < 0;

export const canUseFeature = (features, key) => {
  if (!features) return false;
  return features[key] === true;
};

export const getDefaultFeatures = () => ({ ...DEFAULT_FEATURES });
