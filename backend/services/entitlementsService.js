import { Plan, BusinessType } from '../models/index.js';

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

  // Social/engagement modules
  storiesEnabled: false,
  listingStoriesEnabled: false,
  ratingsEnabled: true,
  locationEnabled: true,

  supportTicketsEnabled: true,
  referralsEnabled: true,
  invoicesEnabled: true,
  brandingEnabled: true,
  whatsappSettingsEnabled: true,

  ordersEnabled: true,
  inquiriesEnabled: true,

  offersEnabled: false,

  // AI modules (plan controlled)
  aiCustomerChatEnabled: true,
  aiDukandarAgentEnabled: false,
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

  // Social/engagement modules
  storiesEnabled: false,
  listingStoriesEnabled: false,
  ratingsEnabled: false,
  locationEnabled: false,

  supportTicketsEnabled: false,
  referralsEnabled: false,
  invoicesEnabled: false,
  brandingEnabled: false,
  whatsappSettingsEnabled: false,

  ordersEnabled: false,
  inquiriesEnabled: false,

  offersEnabled: false,

  // AI modules (plan controlled)
  aiCustomerChatEnabled: false,
  aiDukandarAgentEnabled: false,
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

const hasBookingOverride = (businessDoc) => {
  const overrides = businessDoc?.featureOverrides;
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return false;
  return Object.prototype.hasOwnProperty.call(overrides, 'bookingEnabled') && typeof overrides.bookingEnabled === 'boolean';
};

const resolveBusinessTypeDefaultBookingEnabled = async (businessDoc) => {
  const raw = businessDoc?.businessType;
  if (!raw) return true;

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    if (typeof raw.defaultBookingEnabled === 'boolean') {
      return raw.defaultBookingEnabled;
    }
    if (raw._id) {
      const doc = await BusinessType.findById(raw._id).select('defaultBookingEnabled').lean();
      return doc?.defaultBookingEnabled !== false;
    }
  }

  const doc = await BusinessType.findById(raw).select('defaultBookingEnabled').lean();
  return doc?.defaultBookingEnabled !== false;
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

    // Booking module default comes from business type when there is no explicit per-business override.
    if (!hasBookingOverride(businessDoc)) {
      const bookingAllowedByType = await resolveBusinessTypeDefaultBookingEnabled(businessDoc);
      features.bookingEnabled = features.bookingEnabled === true && bookingAllowedByType;
    }
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
