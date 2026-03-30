import { Plan } from '../models/index.js';

const DEFAULT_FEATURES = {
  maxListings: 10,
  publicShopEnabled: true,
  bookingEnabled: false,
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

let cachedFallbackPlan = null;
let cachedFallbackPlanAt = 0;

const getFallbackPlan = async () => {
  const now = Date.now();
  if (cachedFallbackPlan && now - cachedFallbackPlanAt < 60_000) {
    return cachedFallbackPlan;
  }

  const free = await Plan.findOne({ slug: 'free', isActive: true }).lean();
  cachedFallbackPlan = free || null;
  cachedFallbackPlanAt = now;
  return cachedFallbackPlan;
};

export const getEffectiveEntitlementsForBusiness = async (businessDoc, options = {}) => {
  const now = options.now ? new Date(options.now) : new Date();

  const planIsActive =
    !!businessDoc?.plan &&
    !!businessDoc?.planExpiresAt &&
    new Date(businessDoc.planExpiresAt) > now;

  let plan = null;
  let source = 'defaults';

  if (planIsActive) {
    plan = businessDoc.plan?.features ? businessDoc.plan : await Plan.findById(businessDoc.plan).lean();
    source = 'plan';
  } else {
    plan = await getFallbackPlan();
    source = plan ? 'fallback' : 'defaults';
  }

  const baseFeatures = plan?.features || DEFAULT_FEATURES;
  const features = mergeFeatures(baseFeatures, businessDoc?.featureOverrides);

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
