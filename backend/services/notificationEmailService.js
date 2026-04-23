import { Business, Plan, User } from '../models/index.js';
import { sendEmailOnce } from './emailService.js';
import { getIstDateKey } from './aiUsageService.js';

const MS_DAY = 24 * 60 * 60 * 1000;

const coerceString = (v) => (v === null || v === undefined ? '' : String(v)).trim();

const getPublicWebsiteBaseUrl = () => {
  const direct = coerceString(process.env.PUBLIC_WEBSITE_URL);
  if (direct) return direct.replace(/\/+$/, '');

  const client = coerceString(process.env.CLIENT_URL);
  if (client) {
    const first = client.split(',')[0]?.trim();
    if (first) return first.replace(/\/+$/, '');
  }

  return 'http://localhost:5173';
};

const getDashboardBaseUrl = () => {
  const direct = coerceString(process.env.DASHBOARD_URL);
  if (direct) return direct.replace(/\/+$/, '');

  const client = coerceString(process.env.CLIENT_URL);
  if (client) {
    const first = client.split(',')[0]?.trim();
    if (first) return first.replace(/\/+$/, '');
  }

  return 'http://localhost:8080';
};

const formatDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return '';
  }
};

const coordsFromUser = (user) => {
  const coords = user?.currentLocation?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
};

const findNearbyBusinesses = async ({ lng, lat, limit = 10, maxDistanceKm = 10 }) => {
  const maxDistanceMeters = Math.max(1, Number(maxDistanceKm) || 10) * 1000;
  const docs = await Business.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        key: 'address.location',
        spherical: true,
        distanceField: 'distanceMeters',
        maxDistance: maxDistanceMeters,
        query: { isActive: true, isVerified: true },
      },
    },
    { $sort: { distanceMeters: 1 } },
    { $limit: Math.max(1, Math.min(20, Number(limit) || 10)) },
    {
      $project: {
        _id: 1,
        owner: 1,
        name: 1,
        slug: 1,
        phone: 1,
        whatsapp: 1,
        email: 1,
        distanceMeters: 1,
        address: { city: '$address.city', state: '$address.state' },
      },
    },
  ]);

  return Array.isArray(docs) ? docs : [];
};

export const sendCustomerNearbyShopEmails = async ({ userId, trigger = 'location_update' }) => {
  const user = await User.findById(userId).select('_id name email role referralCode currentLocation isActive');
  if (!user || user.isActive === false) return { ok: false, error: 'User not found' };
  if (user.role !== 'customer') return { ok: false, error: 'Not a customer' };

  const coords = coordsFromUser(user);
  const dateKey = getIstDateKey(new Date());

  const publicBase = getPublicWebsiteBaseUrl();

  // Always send a welcome email once (even if no location), but nearby shops need coords.
  const welcomeKey = `customer_welcome:${String(user._id)}`;
  await sendEmailOnce({
    dedupeKey: welcomeKey,
    type: 'customer_welcome',
    to: user.email,
    userId: user._id,
    subject: 'Welcome to ApniDukan',
    text: `Hi ${user.name || 'Customer'},\n\nWelcome to ApniDukan.\n\nYour referral code: ${user.referralCode || '-'}\n\nYou can explore shops here: ${publicBase}\n`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin: 0 0 12px;">Welcome, ${user.name || 'Customer'}!</h2>
        <p>Thanks for signing up on <strong>ApniDukan</strong>.</p>
        <p style="margin: 12px 0;"><strong>Your referral code:</strong> ${user.referralCode || '-'}</p>
        <p>Browse shops: <a href="${publicBase}" target="_blank" rel="noreferrer">${publicBase}</a></p>
      </div>
    `,
    meta: { trigger },
  }).catch(() => null);

  if (!coords) return { ok: true, nearbySent: false, reason: 'no_location' };

  const maxDistanceKm = Number(process.env.NEARBY_SHOPS_MAX_DISTANCE_KM || 10);
  const near = await findNearbyBusinesses({ lng: coords.lng, lat: coords.lat, limit: 10, maxDistanceKm });
  if (!near.length) return { ok: true, nearbySent: false, reason: 'no_shops' };

  const lines = near.map((b, idx) => {
    const url = `${publicBase}/${encodeURIComponent(String(b.slug))}`;
    const km = Number(b.distanceMeters || 0) / 1000;
    const dist = Number.isFinite(km) ? `${km.toFixed(1)} km` : '';
    return `${idx + 1}. ${b.name}${dist ? ` (${dist})` : ''} - ${url}`;
  });

  const customerKey = `customer_nearby_shops:${String(user._id)}:${dateKey}`;
  await sendEmailOnce({
    dedupeKey: customerKey,
    type: 'customer_nearby_shops',
    to: user.email,
    userId: user._id,
    subject: 'Shops near you on ApniDukan',
    text: `Hi ${user.name || 'Customer'},\n\nHere are some verified shops near you:\n\n${lines.join('\n')}\n\nExplore more: ${publicBase}\n`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin: 0 0 12px;">Shops near you</h2>
        <p>Here are some <strong>verified</strong> shops near your location:</p>
        <ol>
          ${near
            .map((b) => {
              const url = `${publicBase}/${encodeURIComponent(String(b.slug))}`;
              const km = Number(b.distanceMeters || 0) / 1000;
              const dist = Number.isFinite(km) ? `${km.toFixed(1)} km` : '';
              return `<li><a href="${url}" target="_blank" rel="noreferrer">${b.name}</a>${dist ? ` <span style="color:#6b7280">(${dist})</span>` : ''}</li>`;
            })
            .join('')}
        </ol>
        <p>Explore more: <a href="${publicBase}" target="_blank" rel="noreferrer">${publicBase}</a></p>
      </div>
    `,
    meta: { trigger, dateKey, maxDistanceKm },
  }).catch(() => null);

  // Notify shop owners (best-effort, capped)
  const ownerIds = near.map((b) => String(b.owner)).filter(Boolean);
  const owners = await User.find({ _id: { $in: ownerIds } }).select('_id name email isActive role');
  const ownerById = new Map(owners.map((o) => [String(o._id), o]));

  const notifyCap = Math.min(5, near.length);
  for (let i = 0; i < notifyCap; i += 1) {
    const b = near[i];
    const owner = ownerById.get(String(b.owner));
    if (!owner || owner.isActive === false) continue;
    if (!owner.email) continue;

    const shopUrl = `${publicBase}/${encodeURIComponent(String(b.slug))}`;
    const key = `lead_customer_signup:${String(user._id)}:${String(b._id)}`;

    // Don't send twice for the same customer->shop.
    // If you want daily reminders, include dateKey in dedupeKey.
    await sendEmailOnce({
      dedupeKey: key,
      type: 'lead_customer_signup',
      to: owner.email,
      userId: user._id,
      businessId: b._id,
      subject: 'New nearby customer on ApniDukan',
      text: `Hi ${owner.name || 'Dukandar'},\n\nA new customer registered near your area on ApniDukan.\nYour shop link: ${shopUrl}\n\nTip: keep your listings updated for more leads.\n`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h3 style="margin:0 0 8px;">New nearby customer</h3>
          <p>A new customer registered near your area on <strong>ApniDukan</strong>.</p>
          <p>Your shop link: <a href="${shopUrl}" target="_blank" rel="noreferrer">${shopUrl}</a></p>
          <p style="color:#6b7280; font-size: 12px;">(This is an automated notification.)</p>
        </div>
      `,
      meta: { trigger, customerId: String(user._id), businessId: String(b._id) },
    }).catch(() => null);
  }

  return { ok: true, nearbySent: true, count: near.length };
};

export const sendPlanActivatedEmails = async ({ businessId, planId, expiresAt, paymentId }) => {
  const business = await Business.findById(businessId).select('_id name slug owner planExpiresAt isActive').populate('owner', 'name email isActive role');
  if (!business || business.isActive === false) return { ok: false, error: 'Business not found' };

  const owner = business.owner;
  if (!owner || owner.isActive === false || !owner.email) return { ok: false, error: 'Owner email missing' };

  const plan = planId ? await Plan.findById(planId).select('_id name slug price durationInDays') : null;

  const dashboardBase = getDashboardBaseUrl();
  const publicBase = getPublicWebsiteBaseUrl();
  const shopUrl = business.slug ? `${publicBase}/${encodeURIComponent(String(business.slug))}` : publicBase;

  const exp = expiresAt || business.planExpiresAt;
  const expLabel = exp ? formatDate(exp) : '';

  const key = `plan_activated:${String(business._id)}:${String(planId || business.plan || 'unknown')}:${String(paymentId || 'free')}`;

  await sendEmailOnce({
    dedupeKey: key,
    type: 'plan_activated',
    to: owner.email,
    userId: owner._id,
    businessId: business._id,
    subject: 'Your plan is active on ApniDukan',
    text: `Hi ${owner.name || 'Dukandar'},\n\nYour plan is active for ${business.name}.\nPlan: ${plan?.name || 'Activated'}\nExpires on: ${expLabel || '-'}\n\nDashboard: ${dashboardBase}\nShop link: ${shopUrl}\n${paymentId ? `\nPayment: ${paymentId}\n` : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin:0 0 12px;">Plan activated</h2>
        <p>Your plan is now active for <strong>${business.name}</strong>.</p>
        <p><strong>Plan:</strong> ${plan?.name || 'Activated'}</p>
        <p><strong>Expires on:</strong> ${expLabel || '-'}</p>
        <p>
          <a href="${dashboardBase}" target="_blank" rel="noreferrer">Open Dashboard</a>
          &nbsp;|&nbsp;
          <a href="${shopUrl}" target="_blank" rel="noreferrer">View Shop</a>
        </p>
      </div>
    `,
    meta: { planId: String(plan?._id || planId || ''), paymentId: paymentId || null },
  }).catch(() => null);

  // Optional: notify admin
  const adminEmail = coerceString(process.env.ADMIN_EMAIL);
  if (adminEmail) {
    await sendEmailOnce({
      dedupeKey: `${key}:admin`,
      type: 'plan_activated_admin',
      to: adminEmail,
      userId: owner._id,
      businessId: business._id,
      subject: `Plan activated: ${business.name}`,
      text: `Business: ${business.name}\nOwner: ${owner.email}\nPlan: ${plan?.name || planId || ''}\nExpires: ${expLabel}\nPayment: ${paymentId || 'free'}\nShop: ${shopUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h3 style="margin:0 0 8px;">Plan activated</h3>
          <p><strong>Business:</strong> ${business.name}</p>
          <p><strong>Owner:</strong> ${owner.email}</p>
          <p><strong>Plan:</strong> ${plan?.name || planId || ''}</p>
          <p><strong>Expires:</strong> ${expLabel}</p>
          <p><strong>Payment:</strong> ${paymentId || 'free'}</p>
          <p><a href="${shopUrl}" target="_blank" rel="noreferrer">Shop link</a></p>
        </div>
      `,
    }).catch(() => null);
  }

  return { ok: true };
};

export const sendPlanExpiryReminders = async ({ daysBefore = 5 } = {}) => {
  const now = new Date();
  const horizon = new Date(now.getTime() + Math.max(0, Number(daysBefore) || 5) * MS_DAY);
  const dateKey = getIstDateKey(now);

  const businesses = await Business.find({
    isActive: true,
    plan: { $ne: null },
    planExpiresAt: { $ne: null, $gte: now, $lte: horizon },
  })
    .select('_id name slug owner plan planExpiresAt')
    .populate('owner', 'name email isActive role')
    .populate('plan', 'name slug')
    .lean();

  const publicBase = getPublicWebsiteBaseUrl();
  const dashboardBase = getDashboardBaseUrl();

  let sentCount = 0;

  for (const b of businesses) {
    const owner = b?.owner;
    if (!owner || owner.isActive === false || owner.role !== 'business_owner') continue;
    if (!owner.email) continue;

    const expiresAt = b.planExpiresAt ? new Date(b.planExpiresAt) : null;
    if (!expiresAt) continue;

    const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / MS_DAY));
    const expLabel = formatDate(expiresAt);
    const shopUrl = b.slug ? `${publicBase}/${encodeURIComponent(String(b.slug))}` : publicBase;

    // One reminder per business per day.
    const key = `plan_expiry_reminder:${String(b._id)}:${dateKey}`;

    await sendEmailOnce({
      dedupeKey: key,
      type: 'plan_expiry_reminder',
      to: owner.email,
      userId: owner._id,
      businessId: b._id,
      subject: `Your plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      text: `Hi ${owner.name || 'Dukandar'},\n\nYour plan for ${b.name} will expire on ${expLabel}.\nDays left: ${daysLeft}\n\nRenew/upgrade from your dashboard: ${dashboardBase}\nShop link: ${shopUrl}\n`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin:0 0 12px;">Plan expiry reminder</h2>
          <p>Your plan for <strong>${b.name}</strong> will expire on <strong>${expLabel}</strong>.</p>
          <p><strong>Days left:</strong> ${daysLeft}</p>
          <p>
            <a href="${dashboardBase}" target="_blank" rel="noreferrer">Renew from Dashboard</a>
            &nbsp;|&nbsp;
            <a href="${shopUrl}" target="_blank" rel="noreferrer">View Shop</a>
          </p>
        </div>
      `,
      meta: { dateKey, daysLeft, expiresAt: expiresAt.toISOString() },
    }).then((r) => {
      if (r?.sent) sentCount += 1;
    }).catch(() => null);
  }

  return { ok: true, sentCount, checked: businesses.length, dateKey };
};

export const startPlanExpiryReminderLoop = () => {
  const enabled = String(process.env.EMAIL_NOTIFICATIONS_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) return { started: false, reason: 'disabled' };

  const intervalMinutes = Math.max(30, Number(process.env.PLAN_EXPIRY_REMINDER_INTERVAL_MINUTES || 360));

  const run = async () => {
    try {
      await sendPlanExpiryReminders({ daysBefore: Number(process.env.PLAN_EXPIRY_REMINDER_DAYS_BEFORE || 5) });
    } catch (e) {
      console.warn('Plan expiry reminder job failed:', e?.message || e);
    }
  };

  // Fire once shortly after boot (avoid startup spike)
  setTimeout(run, 20_000);
  setInterval(run, intervalMinutes * 60 * 1000);

  return { started: true, intervalMinutes };
};
