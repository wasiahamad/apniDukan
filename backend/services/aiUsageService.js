import { AIUsage, Business } from '../models/index.js';
import { getEffectiveEntitlementsForBusiness } from './entitlementsService.js';

const toPositiveInt = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
};

export const getIstDateKey = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // en-CA yields YYYY-MM-DD
  return formatter.format(date);
};

export const getClientIdentifier = (req) => {
  const session = String(req.headers?.['x-session-id'] || '').trim();
  if (session) return { actorType: 'public', identifier: `sess:${session}` };

  const cf = String(req.headers?.['cf-connecting-ip'] || '').trim();
  if (cf) return { actorType: 'public', identifier: `ip:${cf}` };

  const xff = String(req.headers?.['x-forwarded-for'] || '').trim();
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return { actorType: 'public', identifier: `ip:${first}` };
  }

  const ip = String(req.ip || '').trim();
  return { actorType: 'public', identifier: `ip:${ip || 'unknown'}` };
};

export const resolveDailyAiLimit = async ({ req, actorType, user, action }) => {
  // Admin: unlimited
  if (user?.role === 'admin') return { unlimited: true, limit: null, tier: 'admin' };

  const envPublic = toPositiveInt(process.env.AI_LIMIT_PUBLIC, 5);
  const envFreeOwner = toPositiveInt(process.env.AI_LIMIT_OWNER_FREE, 5);
  const envPremiumOwner = toPositiveInt(process.env.AI_LIMIT_OWNER_PREMIUM, 50);

  if (actorType === 'public') {
    return { unlimited: false, limit: envPublic, tier: 'public' };
  }

  // Authenticated user
  if (!user) {
    // Shouldn't happen for actorType='user'
    return { unlimited: false, limit: envPublic, tier: 'public' };
  }

  if (user.role === 'business_owner') {
    const business = await Business.findOne({ owner: user._id, isActive: true }).populate('plan');
    const entitlements = business ? await getEffectiveEntitlementsForBusiness(business) : null;
    const dukandarAiEnabled = entitlements?.features?.aiDukandarAgentEnabled === true;

    return {
      unlimited: false,
      // Requirement: when dukandar AI tools are enabled, cap at 50/day.
      // If disabled, keep a small default (though requests are usually 403'd earlier).
      limit: dukandarAiEnabled ? envPremiumOwner : envFreeOwner,
      tier: dukandarAiEnabled ? 'premium_owner' : 'free_owner',
      businessId: business?._id || null,
      planIsActive: entitlements?.planIsActive === true,
    };
  }

  // Customer/staff: treat like public by default.
  return { unlimited: false, limit: envPublic, tier: user.role || 'user' };
};

export const enforceDailyAiLimit = async ({ actorType, identifier, user, action }) => {
  const dateKey = getIstDateKey(new Date());
  const limitInfo = await resolveDailyAiLimit({ actorType, user, action });

  if (limitInfo.unlimited) {
    return { allowed: true, dateKey, limitInfo, remaining: null };
  }

  const limit = limitInfo.limit;

  const totalKey = { actorType, identifier, dateKey, action: 'all' };

  // Step 1: ensure the counter doc exists (no increment here).
  // This avoids the bug where an upsert with a count<limit filter can insert a fresh doc
  // after the limit is reached (effectively resetting the counter if the unique index
  // isn't present in Mongo).
  try {
    await AIUsage.updateOne(
      totalKey,
      {
        $setOnInsert: { ...totalKey, count: 0 },
      },
      { upsert: true }
    );
  } catch (e) {
    // Under concurrency, two requests may try to upsert the same document at once.
    // With the unique index, one can lose the race and get E11000; that's safe to ignore.
    if (String(e?.code) !== '11000') throw e;
  }

  // Step 2: increment only if under the limit.
  const updated = await AIUsage.findOneAndUpdate(
    { ...totalKey, count: { $lt: limit } },
    { $inc: { count: 1 } },
    { new: true }
  ).lean();

  if (!updated) {
    return {
      allowed: false,
      dateKey,
      limitInfo,
      remaining: 0,
      error: 'Daily AI limit reached. Upgrade your plan for more usage.',
    };
  }

  // Best-effort: increment action counter separately.
  try {
    await AIUsage.updateOne(
      { actorType, identifier, dateKey, action },
      {
        $inc: { count: 1 },
        // Do not include `count` here; `$inc` will create it on insert.
        $setOnInsert: { actorType, identifier, dateKey, action },
      },
      { upsert: true }
    );
  } catch {
    // ignore
  }

  const remaining = Math.max(0, limit - Number(updated.count || 0));
  return { allowed: true, dateKey, limitInfo, remaining };
};
