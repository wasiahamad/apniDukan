// Subscription helpers (billing cycle → validity)

const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'];

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

export const normalizeBillingCycle = (value) => {
  const v = String(value || '').toLowerCase().trim();
  return BILLING_CYCLES.includes(v) ? v : null;
};

export const inferBillingCycleFromDurationInDays = (durationInDays) => {
  const days = Number(durationInDays);
  if (!Number.isFinite(days) || days <= 0) return null;

  // Heuristics for legacy plans stored as days.
  // NOTE: product requirement treats "quarterly" as 4 months.
  if (days >= 360) return 'yearly';
  if (days >= 85) return 'quarterly';
  if (days >= 28 && days <= 31) return 'monthly';
  return null;
};

export const addBillingCycle = (baseDate, billingCycle) => {
  const base = isValidDate(baseDate) ? new Date(baseDate) : new Date();
  const cycle = normalizeBillingCycle(billingCycle);

  if (!cycle) return base;

  if (cycle === 'monthly') {
    base.setMonth(base.getMonth() + 1);
    return base;
  }

  if (cycle === 'quarterly') {
    // Requirement: quarterly = 4 months validity.
    base.setMonth(base.getMonth() + 4);
    return base;
  }

  if (cycle === 'yearly') {
    base.setFullYear(base.getFullYear() + 1);
    return base;
  }

  return base;
};

export const addDays = (baseDate, daysToAdd) => {
  const base = isValidDate(baseDate) ? new Date(baseDate) : new Date();
  const days = Number(daysToAdd);
  if (!Number.isFinite(days) || days <= 0) return base;
  base.setDate(base.getDate() + days);
  return base;
};

/**
 * Calculate plan expiry date for a business subscription.
 * - Uses billing cycle when available (monthly/quarterly/yearly)
 * - Falls back to days (legacy)
 * - If baseDate is not provided, uses now
 */
export const calculatePlanExpiryDate = ({ plan, baseDate, durationInDaysOverride, billingCycleOverride } = {}) => {
  const now = new Date();
  const base = isValidDate(baseDate) ? new Date(baseDate) : now;

  const overrideCycle = normalizeBillingCycle(billingCycleOverride);
  if (overrideCycle) return addBillingCycle(base, overrideCycle);

  const planCycle = normalizeBillingCycle(plan?.billingCycle);
  if (planCycle) return addBillingCycle(base, planCycle);

  const inferred = inferBillingCycleFromDurationInDays(plan?.durationInDays);
  if (inferred) return addBillingCycle(base, inferred);

  const overrideDays = Number(durationInDaysOverride);
  if (Number.isFinite(overrideDays) && overrideDays > 0) return addDays(base, overrideDays);

  return addDays(base, plan?.durationInDays);
};
