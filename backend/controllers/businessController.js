import { Business, User, Plan, Category } from '../models/index.js';
import slugify from 'slugify';
import { getEffectiveEntitlementsForBusiness } from '../services/entitlementsService.js';

const DEMO_SHOP_SLUG = 'wasi-kirana-store';

const BUSINESS_TIME_ZONE = process.env.BUSINESS_TIME_ZONE || process.env.TZ || 'Asia/Kolkata';
const DEFAULT_WORKING_OPEN = process.env.DEFAULT_WORKING_OPEN || '09:00';
const DEFAULT_WORKING_CLOSE = process.env.DEFAULT_WORKING_CLOSE || '20:00';

const getNowInTimeZone = (timeZone) => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = String(parts.find((p) => p.type === 'weekday')?.value || '').toLowerCase();
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value);

  return {
    dayKey: weekday,
    minutes: (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0),
  };
};

const toMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const isBusinessOpenNow = (workingHours) => {
  if (!workingHours || typeof workingHours !== 'object') return false;

  const { dayKey, minutes: nowMinutes } = getNowInTimeZone(BUSINESS_TIME_ZONE);

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNames.indexOf(dayKey);
  if (dayIndex === -1) return false;

  const yesterdayKey = dayNames[(dayIndex + 6) % 7];
  const todaySlot = workingHours?.[dayKey];
  const yesterdaySlot = workingHours?.[yesterdayKey];

  // 1) Overnight spill from yesterday (e.g. yesterday 22:00 -> 02:00 and now is 01:00)
  if (yesterdaySlot && yesterdaySlot.isOpen !== false) {
    const yOpenAt = toMinutes(yesterdaySlot.open);
    const yCloseAt = toMinutes(yesterdaySlot.close);
    const yIsValid = yOpenAt !== null && yCloseAt !== null;
    const yIsOvernight = yIsValid && yCloseAt < yOpenAt;
    if (yIsOvernight && nowMinutes < yCloseAt) {
      return true;
    }
  }

  // 2) Evaluate today's slot
  if (!todaySlot) return false;
  if (todaySlot.isOpen === false) return false;

  let openAt = toMinutes(todaySlot.open);
  let closeAt = toMinutes(todaySlot.close);

  // Backward compatibility: older records may only have `isOpen` (no open/close times)
  // If the shop is marked open for the day, assume default business hours.
  if (openAt === null || closeAt === null) {
    if (todaySlot.isOpen === true) {
      openAt = toMinutes(DEFAULT_WORKING_OPEN);
      closeAt = toMinutes(DEFAULT_WORKING_CLOSE);
    }
  }

  if (openAt === null || closeAt === null) return false;

  // Interpret same open/close as 24h open (common convention)
  if (openAt === closeAt) return true;

  // Normal range: 09:00 -> 20:00
  if (closeAt > openAt) {
    return nowMinutes >= openAt && nowMinutes < closeAt;
  }

  // Overnight range starting today: 22:00 -> 02:00 (open only after 22:00 today)
  return nowMinutes >= openAt;
};

const resolveBusinessIsOpen = (business) => {
  const mode = String(business?.openStatusMode || 'auto').toLowerCase();
  if (mode === 'open') return true;
  if (mode === 'closed') return false;
  return isBusinessOpenNow(business?.workingHours);
};

const normalizeExampleCategories = (raw) => {
  if (!Array.isArray(raw)) return [];
  const unique = new Set();
  for (const item of raw) {
    const name = String(item || '').trim();
    if (!name) continue;
    unique.add(name);
  }
  return Array.from(unique);
};

const normalizeWhyChooseUsTemplates = (raw) => {
  if (!Array.isArray(raw)) return [];
  const unique = new Set();
  const result = [];

  for (const item of raw) {
    const title = String(item?.title || '').trim();
    const desc = String(item?.desc || '').trim();
    const iconName = String(item?.iconName || '').trim();
    if (!title && !desc) continue;

    const key = `${title.toLowerCase()}|${desc.toLowerCase()}|${iconName.toLowerCase()}`;
    if (unique.has(key)) continue;
    unique.add(key);

    result.push({
      title: title.slice(0, 80),
      desc: desc.slice(0, 180),
      ...(iconName ? { iconName: iconName.slice(0, 80) } : {}),
    });
  }

  return result;
};

const ensureDefaultCategoriesForBusiness = async ({ businessId, businessTypeDoc }) => {
  if (!businessId) return;

  const exampleCategories = normalizeExampleCategories(businessTypeDoc?.exampleCategories).slice(0, 50);
  if (exampleCategories.length === 0) return;

  const existing = await Category.find({ business: businessId })
    .select('name')
    .lean();
  const existingNameSet = new Set(
    existing
      .map((c) => String(c?.name || '').trim().toLowerCase())
      .filter(Boolean)
  );

  const creations = [];
  for (let i = 0; i < exampleCategories.length; i++) {
    const name = exampleCategories[i];
    const key = name.trim().toLowerCase();
    if (!key || existingNameSet.has(key)) continue;
    creations.push(Category.create({ business: businessId, name, order: i }));
  }

  if (creations.length === 0) return;

  const results = await Promise.allSettled(creations);
  // Best-effort: ignore duplicates/validation errors; business creation should not fail
  const rejected = results.filter((r) => r.status === 'rejected');
  if (rejected.length > 0) {
    const nonDup = rejected
      .map((r) => r.reason)
      .filter((e) => !(e && (e.code === 11000 || String(e?.message || '').includes('E11000'))));
    if (nonDup.length > 0) {
      console.warn('Default category creation had failures:', nonDup.map((e) => e?.message || String(e)));
    }
  }
};

const ensureDefaultWhyChooseUsForBusiness = async ({ businessId, businessTypeDoc, mutateDoc }) => {
  if (!businessId) return;

  const templates = normalizeWhyChooseUsTemplates(businessTypeDoc?.whyChooseUsTemplates).slice(0, 12);
  if (templates.length === 0) return;

  const res = await Business.updateOne(
    {
      _id: businessId,
      $or: [{ whyChooseUs: { $exists: false } }, { whyChooseUs: { $size: 0 } }],
    },
    {
      $set: { whyChooseUs: templates },
    }
  );

  if (mutateDoc && res && (res.modifiedCount || res.nModified)) {
    mutateDoc.whyChooseUs = templates;
  }
};

const normalizeImageList = (raw, { limit = 12 } = {}) => {
  if (!Array.isArray(raw)) return [];
  const unique = new Set();
  const out = [];
  for (const item of raw) {
    const url = String(item || '').trim();
    if (!url) continue;
    const key = url.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    out.push(url.slice(0, 500));
    if (out.length >= limit) break;
  }
  return out;
};

const ensureDefaultMediaForBusiness = async ({ businessId, businessTypeDoc, mutateDoc }) => {
  if (!businessId) return;

  const defaultCoverImage = String(businessTypeDoc?.defaultCoverImage || '').trim();
  const defaultImages = normalizeImageList(businessTypeDoc?.defaultImages).slice(0, 12);

  // Apply cover only when empty
  if (defaultCoverImage) {
    const resCover = await Business.updateOne(
      {
        _id: businessId,
        $or: [{ coverImage: { $exists: false } }, { coverImage: null }, { coverImage: '' }],
      },
      { $set: { coverImage: defaultCoverImage } }
    );
    if (mutateDoc && resCover && (resCover.modifiedCount || resCover.nModified)) {
      mutateDoc.coverImage = defaultCoverImage;
    }
  }

  // Apply gallery only when empty
  if (defaultImages.length > 0) {
    const resImages = await Business.updateOne(
      {
        _id: businessId,
        $or: [{ images: { $exists: false } }, { images: { $size: 0 } }],
      },
      { $set: { images: defaultImages } }
    );
    if (mutateDoc && resImages && (resImages.modifiedCount || resImages.nModified)) {
      mutateDoc.images = defaultImages;
    }
  }
};

/**
 * BUSINESS CONTROLLER - Multi-tenant business management
 * CRITICAL: All queries are scoped by business ownership
 * Handles: CRUD operations for businesses (slug-based routing ready)
 */

// @desc    Create new business
// @route   POST /api/business
// @access  Private (business_owner)
export const createBusiness = async (req, res) => {
  try {
    const {
      name,
      slug,
      businessType,
      phone,
      whatsapp,
      email,
      address,
      description,
      workingHours,
    } = req.body;

    const safeAddress = (() => {
      const next = address && typeof address === 'object' ? { ...address } : address;
      if (!next || typeof next !== 'object') return next;
      const loc = next.location;
      const coords = loc?.coordinates;
      const hasValidCoords =
        Array.isArray(coords) &&
        coords.length === 2 &&
        coords.every((n) => typeof n === 'number' && Number.isFinite(n));
      if (!hasValidCoords) {
        // Avoid invalid GeoJSON docs that break 2dsphere indexes
        delete next.location;
      }
      return next;
    })();

    // Check if user already has a business (optional - remove if multiple businesses allowed)
    const existingBusiness = await Business.findOne({ owner: req.user._id });
    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        message: 'You already have a business. Please upgrade your plan for multiple businesses.',
      });
    }

    // Check if slug is already taken (if provided)
    if (slug) {
      const slugExists = await Business.findOne({ slug });
      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: 'This business slug is already taken',
        });
      }
    }

    // Validate businessType exists
    const { BusinessType } = await import('../models/index.js');
    const businessTypeDoc = await BusinessType.findById(businessType);
    if (!businessTypeDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid business type. Please select a valid business type.',
      });
    }

    // Create business
    const business = await Business.create({
      owner: req.user._id,
      name,
      slug,
      businessType,
      phone,
      whatsapp: whatsapp || phone,
      email,
      address: safeAddress,
      description,
      workingHours,
    });

    // Auto-create default categories based on business type (best-effort)
    try {
      await ensureDefaultCategoriesForBusiness({ businessId: business._id, businessTypeDoc });
    } catch (e) {
      console.warn('Default category creation error:', e?.message || e);
    }

    // Auto-apply default cover/images (best-effort)
    try {
      await ensureDefaultMediaForBusiness({ businessId: business._id, businessTypeDoc, mutateDoc: business });
    } catch (e) {
      console.warn('Default media creation error:', e?.message || e);
    }

    await business.populate('businessType', 'name slug description suggestedListingType exampleCategories whyChooseUsTemplates defaultCoverImage defaultImages');

    res.status(201).json({
      success: true,
      message: 'Business created successfully',
      data: business,
    });
  } catch (error) {
    console.error('Create business error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating business',
    });
  }
};

// @desc    Admin: Create owner user + business
// @route   POST /api/business/admin/create
// @access  Private (admin only)
export const adminCreateBusinessWithOwner = async (req, res) => {
  let createdUserId = null;

  try {
    const { owner, business, planId } = req.body || {};

    if (!owner || !business) {
      return res.status(400).json({
        success: false,
        message: 'Owner and business payload are required',
      });
    }

    const { name, email, phone, password } = owner;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Owner name, email, phone, and password are required',
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists',
      });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'business_owner',
    });
    createdUserId = user._id;

    const {
      name: businessName,
      slug,
      businessType,
      phone: businessPhone,
      whatsapp,
      email: businessEmail,
      address,
      description,
      workingHours,
      isActive,
      isVerified,
    } = business;

    if (!businessName || !businessType || !businessPhone || !address?.city || !address?.state) {
      return res.status(400).json({
        success: false,
        message: 'Business name, business type, phone, city and state are required',
      });
    }

    // Validate businessType exists
    const { BusinessType } = await import('../models/index.js');
    const businessTypeDoc = await BusinessType.findById(businessType);
    if (!businessTypeDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid business type. Please select a valid business type.',
      });
    }

    // Check if slug is already taken (if provided)
    if (slug) {
      const slugExists = await Business.findOne({ slug });
      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: 'This business slug is already taken',
        });
      }
    }

    const createdBusiness = await Business.create({
      owner: user._id,
      name: businessName,
      slug,
      businessType,
      phone: businessPhone,
      whatsapp: whatsapp || businessPhone,
      email: businessEmail,
      address: (() => {
        const next = address && typeof address === 'object' ? { ...address } : address;
        if (!next || typeof next !== 'object') return next;
        const loc = next.location;
        const coords = loc?.coordinates;
        const hasValidCoords =
          Array.isArray(coords) &&
          coords.length === 2 &&
          coords.every((n) => typeof n === 'number' && Number.isFinite(n));
        if (!hasValidCoords) delete next.location;
        return next;
      })(),
      description,
      workingHours,
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(typeof isVerified === 'boolean' ? { isVerified } : {}),
    });

    // Auto-create default categories based on business type (best-effort)
    try {
      await ensureDefaultCategoriesForBusiness({ businessId: createdBusiness._id, businessTypeDoc });
    } catch (e) {
      console.warn('Default category creation error (admin create):', e?.message || e);
    }

    // Auto-apply default cover/images (best-effort)
    try {
      await ensureDefaultMediaForBusiness({
        businessId: createdBusiness._id,
        businessTypeDoc,
        mutateDoc: createdBusiness,
      });
    } catch (e) {
      console.warn('Default media creation error (admin create):', e?.message || e);
    }

    if (planId) {
      const plan = await Plan.findById(planId);
      if (!plan || !plan.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive plan selected',
        });
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + plan.durationInDays);
      createdBusiness.plan = plan._id;
      createdBusiness.planExpiresAt = expiryDate;
      await createdBusiness.save();
    }

    await createdBusiness.populate('owner', 'name email phone role isActive');
    await createdBusiness.populate('businessType', 'name slug description suggestedListingType exampleCategories whyChooseUsTemplates defaultCoverImage defaultImages');
    await createdBusiness.populate('plan', 'name');

    res.status(201).json({
      success: true,
      message: 'Business created successfully',
      data: {
        owner: user.toSafeObject(),
        business: createdBusiness,
      },
    });
  } catch (error) {
    console.error('Admin create business error:', error);

    // best-effort rollback if user got created but business failed
    if (createdUserId) {
      try {
        await User.deleteOne({ _id: createdUserId });
      } catch {
        // ignore rollback errors
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error creating business',
    });
  }
};

// @desc    Get business by slug (PUBLIC - for storefront)
// @route   GET /api/business/slug/:slug
// @access  Public
export const getBusinessBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const normalizedSlug = String(slug || '').toLowerCase();
    const includeAll = ['1', 'true', 'yes'].includes(String(req.query.includeAll || '').toLowerCase());

    const business = await Business.findOne({ slug, isActive: true })
      .populate('owner', 'name email phone')
      .populate('businessType', 'name slug description suggestedListingType exampleCategories whyChooseUsTemplates defaultCoverImage defaultImages')
      .populate('plan');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (!includeAll && normalizedSlug !== DEMO_SHOP_SLUG) {
      const entitlements = await getEffectiveEntitlementsForBusiness(business);
      if (entitlements?.features?.publicShopEnabled !== true) {
        return res.status(404).json({
          success: false,
          message: 'Shop not available',
        });
      }
    }

    // Increment view count (optional - track analytics)
    await business.incrementStat('totalViews');

    const payload = business.toObject ? business.toObject() : business;
    payload.isOpen = resolveBusinessIsOpen(business);

    res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error('Get business by slug error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching business',
    });
  }
};

// @desc    Get all public shops (real dukandar list)
// @route   GET /api/business/public/shops
// @access  Public
export const getPublicShops = async (req, res) => {
  try {
    const { city, category, search, page = 1, limit = 40, lat, lng } = req.query;

    const includeAll = ['1', 'true', 'yes'].includes(String(req.query.includeAll || '').toLowerCase());

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 40, 1), 100);

    const normalizedCategory = category ? String(category).toLowerCase() : null;
    const normalizedCity = city ? String(city) : null;
    const term = search ? new RegExp(String(search), 'i') : null;

    const baseQuery = {
      isActive: true,
      ...(includeAll ? {} : { isVerified: true }),
      slug: { $exists: true, $ne: null },
      ...(normalizedCity ? { 'address.city': new RegExp(normalizedCity, 'i') } : {}),
      ...(term
        ? {
            $or: [{ name: term }, { description: term }, { 'address.city': term }, { 'address.state': term }],
          }
        : {}),
    };

    const now = new Date();
    const start = (safePage - 1) * safeLimit;

    const latNum = lat !== undefined ? Number(lat) : null;
    const lngNum = lng !== undefined ? Number(lng) : null;
    const hasGeo = Number.isFinite(latNum) && Number.isFinite(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;

    const pipeline = [];
    pipeline.push({ $match: baseQuery });

    // Exclude demo shop
    pipeline.push({ $match: { slug: { $ne: DEMO_SHOP_SLUG } } });

    pipeline.push({
      $lookup: {
        from: 'businesstypes',
        localField: 'businessType',
        foreignField: '_id',
        as: 'businessTypeDoc',
      },
    });
    pipeline.push({ $unwind: { path: '$businessTypeDoc', preserveNullAndEmptyArrays: true } });

    if (normalizedCategory) {
      pipeline.push({ $match: { 'businessTypeDoc.slug': normalizedCategory } });
    }

    pipeline.push({
      $lookup: {
        from: 'plans',
        localField: 'plan',
        foreignField: '_id',
        as: 'planDoc',
      },
    });
    pipeline.push({ $unwind: { path: '$planDoc', preserveNullAndEmptyArrays: true } });

    pipeline.push({
      $addFields: {
        planIsActive: {
          $and: [
            { $ne: ['$plan', null] },
            { $ne: ['$planExpiresAt', null] },
            { $gt: ['$planExpiresAt', now] },
          ],
        },
      },
    });

    pipeline.push({
      $addFields: {
        basePublicShopEnabled: {
          $cond: [
            '$planIsActive',
            { $ifNull: ['$planDoc.features.publicShopEnabled', true] },
            true,
          ],
        },
      },
    });

    pipeline.push({
      $addFields: {
        effectivePublicShopEnabled: {
          $ifNull: ['$featureOverrides.publicShopEnabled', '$basePublicShopEnabled'],
        },
      },
    });
    if (!includeAll) {
      pipeline.push({ $match: { effectivePublicShopEnabled: true } });
    }

    pipeline.push({
      $lookup: {
        from: 'reviews',
        let: { businessId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$business', '$$businessId'] } } },
          { $group: { _id: null, avgRating: { $avg: '$rating' }, reviewsCount: { $sum: 1 } } },
        ],
        as: 'reviewStats',
      },
    });
    pipeline.push({ $addFields: { reviewStat: { $arrayElemAt: ['$reviewStats', 0] } } });
    pipeline.push({
      $addFields: {
        rating: { $round: [{ $ifNull: ['$reviewStat.avgRating', 0] }, 1] },
        reviewCount: { $ifNull: ['$reviewStat.reviewsCount', 0] },
      },
    });

    pipeline.push({
      $lookup: {
        from: 'orders',
        let: { businessId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$business', '$$businessId'] },
                  { $ne: ['$status', 'cancelled'] },
                ],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'orderStats',
      },
    });
    pipeline.push({ $addFields: { orderStat: { $arrayElemAt: ['$orderStats', 0] } } });
    pipeline.push({ $addFields: { ordersCount: { $ifNull: ['$orderStat.count', 0] } } });

    pipeline.push({
      $addFields: {
        activePlanPrice: {
          $cond: ['$planIsActive', { $ifNull: ['$planDoc.price', 0] }, 0],
        },
      },
    });

    // Optional distance tie-breaker (does NOT exclude shops missing coords)
    if (hasGeo) {
      pipeline.push({
        $addFields: {
          _hasCoords: {
            $and: [
              { $isArray: '$address.location.coordinates' },
              { $eq: [{ $size: '$address.location.coordinates' }, 2] },
            ],
          },
          _shopLng: { $arrayElemAt: ['$address.location.coordinates', 0] },
          _shopLat: { $arrayElemAt: ['$address.location.coordinates', 1] },
        },
      });

      // Haversine distance in meters (best-effort)
      pipeline.push({
        $addFields: {
          distanceMeters: {
            $cond: [
              '$_hasCoords',
              {
                $let: {
                  vars: {
                    lat1: { $degreesToRadians: latNum },
                    lon1: { $degreesToRadians: lngNum },
                    lat2: { $degreesToRadians: '$_shopLat' },
                    lon2: { $degreesToRadians: '$_shopLng' },
                  },
                  in: {
                    $let: {
                      vars: {
                        dLat: { $subtract: ['$$lat2', '$$lat1'] },
                        dLon: { $subtract: ['$$lon2', '$$lon1'] },
                      },
                      in: {
                        $let: {
                          vars: {
                            a: {
                              $add: [
                                {
                                  $pow: [
                                    { $sin: { $divide: ['$$dLat', 2] } },
                                    2,
                                  ],
                                },
                                {
                                  $multiply: [
                                    { $cos: '$$lat1' },
                                    { $cos: '$$lat2' },
                                    {
                                      $pow: [
                                        { $sin: { $divide: ['$$dLon', 2] } },
                                        2,
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          },
                          in: {
                            $multiply: [
                              6371000,
                              {
                                $multiply: [
                                  2,
                                  {
                                    $atan2: [
                                      { $sqrt: '$$a' },
                                      { $sqrt: { $subtract: [1, '$$a'] } },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
              null,
            ],
          },
        },
      });
    }

    pipeline.push({
      $addFields: {
        distanceSort: { $ifNull: ['$distanceMeters', 9e15] },
      },
    });

    pipeline.push({
      $sort: {
        activePlanPrice: -1,
        ordersCount: -1,
        rating: -1,
        distanceSort: 1,
        createdAt: -1,
      },
    });

    pipeline.push({
      $facet: {
        data: [
          { $skip: start },
          { $limit: safeLimit },
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              description: { $ifNull: ['$description', ''] },
              phone: { $ifNull: ['$phone', ''] },
              whatsapp: { $ifNull: ['$whatsapp', '$phone'] },
              isVerified: { $toBool: '$isVerified' },
              logo: { $ifNull: ['$logo', ''] },
              coverImage: { $ifNull: ['$coverImage', ''] },
              businessType: {
                $cond: [
                  { $ifNull: ['$businessTypeDoc', false] },
                  { name: '$businessTypeDoc.name', slug: '$businessTypeDoc.slug' },
                  null,
                ],
              },
              address: {
                street: { $ifNull: ['$address.street', ''] },
                city: { $ifNull: ['$address.city', ''] },
                state: { $ifNull: ['$address.state', ''] },
                pincode: { $ifNull: ['$address.pincode', ''] },
                latitude: {
                  $cond: [
                    {
                      $and: [
                        { $isArray: '$address.location.coordinates' },
                        { $eq: [{ $size: '$address.location.coordinates' }, 2] },
                      ],
                    },
                    { $arrayElemAt: ['$address.location.coordinates', 1] },
                    null,
                  ],
                },
                longitude: {
                  $cond: [
                    {
                      $and: [
                        { $isArray: '$address.location.coordinates' },
                        { $eq: [{ $size: '$address.location.coordinates' }, 2] },
                      ],
                    },
                    { $arrayElemAt: ['$address.location.coordinates', 0] },
                    null,
                  ],
                },
              },
              rating: 1,
              reviewCount: 1,
              ordersCount: 1,
              activePlanPrice: 1,
              workingHours: 1,
              openStatusMode: 1,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    });

    const out = await Business.aggregate(pipeline);
    const data = out?.[0]?.data || [];
    const total = Number(out?.[0]?.total?.[0]?.count || 0);
    const shops = data.map((b) => ({
      ...b,
      isOpen: resolveBusinessIsOpen(b),
    }));

    return res.status(200).json({
      success: true,
      data: {
        shops,
        pagination: {
          total,
          page: safePage,
          pages: Math.max(Math.ceil(total / safeLimit), 1),
          limit: safeLimit,
        },
      },
    });
  } catch (error) {
    console.error('Get public shops error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching public shops',
    });
  }
};

// @desc    Save my business location (GeoJSON)
// @route   PUT /api/business/location
// @access  Private (business_owner)
export const saveMyBusinessLocation = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { latitude, longitude } = req.body || {};

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: 'Invalid latitude' });
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Invalid longitude' });
    }

    const business = await Business.findOne({ owner: userId, isActive: true }).select('_id owner address');
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    business.address = business.address || {};
    business.address.location = {
      type: 'Point',
      coordinates: [lng, lat],
    };

    await business.save();

    return res.status(200).json({
      success: true,
      message: 'Location saved',
      data: {
        businessId: business._id,
        location: business.address.location,
      },
    });
  } catch (error) {
    console.error('Save business location error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error saving location' });
  }
};

// @desc    Get nearby public businesses (sorted by distance)
// @route   GET /api/business/nearby?lat=xx&lng=xx&radiusKm=25&limit=500
// @access  Public
export const getNearbyBusinesses = async (req, res) => {
  try {
    let lat = Number(req.query.lat);
    let lng = Number(req.query.lng);

    const hasExplicitLatLng = Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasExplicitLatLng) {
      const savedCoords = req.user?.currentLocation?.coordinates;
      if (Array.isArray(savedCoords) && savedCoords.length === 2) {
        const savedLng = Number(savedCoords[0]);
        const savedLat = Number(savedCoords[1]);
        if (Number.isFinite(savedLat) && Number.isFinite(savedLng)) {
          lat = savedLat;
          lng = savedLng;
        }
      }
    }
    const includeAll = ['1', 'true', 'yes'].includes(String(req.query.includeAll || '').toLowerCase());
    const rawRadiusKm = Number(req.query.radiusKm ?? req.query.radius);
    const radiusKm = Math.max(Number.isFinite(rawRadiusKm) ? rawRadiusKm : 25, 0.1);
    const maxDistanceMeters = radiusKm * 1000;

    const rawLimit = Number(req.query.limit);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 500, 1), 1000);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: 'Invalid lat' });
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Invalid lng' });
    }

    // Best-effort: keep authenticated user's last active location in profile.
    if (req.user?._id) {
      User.updateOne(
        { _id: req.user._id },
        {
          $set: {
            currentLocation: {
              type: 'Point',
              coordinates: [lng, lat],
              capturedAt: new Date(),
            },
          },
        }
      ).catch((e) => {
        console.warn('Nearby location persist failed:', e?.message || e);
      });
    }

    const now = new Date();

    const geoQuery = includeAll
      ? { isActive: true, slug: { $exists: true, $nin: [null, DEMO_SHOP_SLUG] } }
      : { isActive: true, isVerified: true, slug: { $exists: true, $nin: [null, DEMO_SHOP_SLUG] } };

    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          key: 'address.location',
          distanceField: 'distanceMeters',
          maxDistance: maxDistanceMeters,
          spherical: true,
          query: geoQuery,
        },
      },
      {
        $lookup: {
          from: 'businesstypes',
          localField: 'businessType',
          foreignField: '_id',
          as: 'businessTypeDoc',
        },
      },
      { $unwind: { path: '$businessTypeDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'plans',
          localField: 'plan',
          foreignField: '_id',
          as: 'planDoc',
        },
      },
      { $unwind: { path: '$planDoc', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          planIsActive: {
            $and: [
              { $ne: ['$plan', null] },
              { $ne: ['$planExpiresAt', null] },
              { $gt: ['$planExpiresAt', now] },
            ],
          },
        },
      },
      {
        $addFields: {
          basePublicShopEnabled: {
            $cond: [
              '$planIsActive',
              { $ifNull: ['$planDoc.features.publicShopEnabled', true] },
              true,
            ],
          },
        },
      },
      {
        $addFields: {
          effectivePublicShopEnabled: {
            $ifNull: ['$featureOverrides.publicShopEnabled', '$basePublicShopEnabled'],
          },
          activePlanPrice: { $cond: ['$planIsActive', { $ifNull: ['$planDoc.price', 0] }, 0] },
        },
      },
    ];

    if (!includeAll) {
      pipeline.push({ $match: { effectivePublicShopEnabled: true } });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'reviews',
          let: { businessId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$business', '$$businessId'] } } },
            { $group: { _id: null, avgRating: { $avg: '$rating' }, reviewsCount: { $sum: 1 } } },
          ],
          as: 'reviewStats',
        },
      },
      { $addFields: { reviewStat: { $arrayElemAt: ['$reviewStats', 0] } } },
      {
        $addFields: {
          rating: { $round: [{ $ifNull: ['$reviewStat.avgRating', 0] }, 1] },
          reviewCount: { $ifNull: ['$reviewStat.reviewsCount', 0] },
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { businessId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$business', '$$businessId'] },
                    { $ne: ['$status', 'cancelled'] },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'orderStats',
        },
      },
      { $addFields: { orderStat: { $arrayElemAt: ['$orderStats', 0] } } },
      { $addFields: { ordersCount: { $ifNull: ['$orderStat.count', 0] } } },
      {
        $sort: {
          rating: -1,
          activePlanPrice: -1,
          ordersCount: -1,
          distanceMeters: 1,
          createdAt: -1,
        },
      },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          description: { $ifNull: ['$description', ''] },
          phone: { $ifNull: ['$phone', ''] },
          whatsapp: { $ifNull: ['$whatsapp', '$phone'] },
          isVerified: { $toBool: '$isVerified' },
          logo: { $ifNull: ['$logo', ''] },
          coverImage: { $ifNull: ['$coverImage', ''] },
          businessType: {
            $cond: [
              { $ifNull: ['$businessTypeDoc', false] },
              { name: '$businessTypeDoc.name', slug: '$businessTypeDoc.slug' },
              null,
            ],
          },
          address: {
            street: { $ifNull: ['$address.street', ''] },
            city: { $ifNull: ['$address.city', ''] },
            state: { $ifNull: ['$address.state', ''] },
            pincode: { $ifNull: ['$address.pincode', ''] },
            latitude: {
              $cond: [
                {
                  $and: [
                    { $isArray: '$address.location.coordinates' },
                    { $eq: [{ $size: '$address.location.coordinates' }, 2] },
                  ],
                },
                { $arrayElemAt: ['$address.location.coordinates', 1] },
                null,
              ],
            },
            longitude: {
              $cond: [
                {
                  $and: [
                    { $isArray: '$address.location.coordinates' },
                    { $eq: [{ $size: '$address.location.coordinates' }, 2] },
                  ],
                },
                { $arrayElemAt: ['$address.location.coordinates', 0] },
                null,
              ],
            },
          },
          rating: 1,
          reviewCount: 1,
          ordersCount: 1,
          activePlanPrice: 1,
          distanceKm: { $divide: ['$distanceMeters', 1000] },
          workingHours: 1,
          openStatusMode: 1,
        },
      }
    );

    const rows = await Business.aggregate(pipeline);
    const shops = (rows || []).map((b) => ({
      ...b,
      isOpen: resolveBusinessIsOpen(b),
    }));

    return res.status(200).json({
      success: true,
      data: { shops },
    });
  } catch (error) {
    console.error('Get nearby businesses error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load nearby shops',
    });
  }
};

// @desc    Get distance to a business (km)
// @route   GET /api/business/:id/distance?lat=xx&lng=xx
// @access  Public
export const getBusinessDistance = async (req, res) => {
  try {
    const { id } = req.params;
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: 'Invalid lat' });
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Invalid lng' });
    }

    const business = await Business.findById(id).select('_id address.location');
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const coords = business.address?.location?.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Business location not set',
      });
    }

    const [bizLng, bizLat] = coords;
    if (!Number.isFinite(bizLat) || !Number.isFinite(bizLng)) {
      return res.status(400).json({
        success: false,
        message: 'Business location invalid',
      });
    }

    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(bizLat - lat);
    const dLng = toRad(bizLng - lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat)) * Math.cos(toRad(bizLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Best-effort ETA without external maps (approx 25km/h average).
    const avgSpeedKmph = 25;
    const durationSeconds = Math.max(0, Math.round((distanceKm / avgSpeedKmph) * 3600));
    const durationMins = Math.round(durationSeconds / 60);

    return res.status(200).json({
      success: true,
      data: { distanceKm, durationMins, durationSeconds },
    });
  } catch (error) {
    console.error('Get business distance error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error calculating distance',
    });
  }
};
// @desc    Get business by ID
// @route   GET /api/business/:id
// @access  Public
export const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id)
      .populate('owner', 'name email phone')
      .populate('businessType', 'name slug description suggestedListingType exampleCategories whyChooseUsTemplates defaultCoverImage defaultImages')
      .populate('plan');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    const payload = business.toObject ? business.toObject() : business;
    payload.isOpen = resolveBusinessIsOpen(business);

    res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error('Get business by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching business',
    });
  }
};

// @desc    Admin: Get business by ID (FULL DETAILS)
// @route   GET /api/business/admin/:id
// @access  Private (admin only)
export const adminGetBusinessById = async (req, res) => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id)
      .populate('owner', 'name email phone role isActive referralCode lastLogin createdAt updatedAt')
      .populate('businessType', 'name slug description suggestedListingType exampleCategories whyChooseUsTemplates defaultCoverImage defaultImages')
      .populate('plan');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    res.status(200).json({
      success: true,
      data: business,
    });
  } catch (error) {
    console.error('Admin get business by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching business',
    });
  }
};

// @desc    Admin: Activate/Suspend + Verify controls
// @route   PATCH /api/business/admin/:id/status
// @access  Private (admin only)
export const adminUpdateBusinessStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, isVerified } = req.body || {};

    if (typeof isActive !== 'boolean' && typeof isVerified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one of: isActive, isVerified',
      });
    }

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (typeof isActive === 'boolean') {
      business.isActive = isActive;
    }
    if (typeof isVerified === 'boolean') {
      business.isVerified = isVerified;
    }

    await business.save();

    // Keep the owner account in sync with business status for login/route protection.
    if (typeof isActive === 'boolean' && business.owner) {
      await User.updateOne({ _id: business.owner }, { $set: { isActive } });
    }

    const updated = await Business.findById(id)
      .populate('owner', 'name email phone role isActive referralCode lastLogin createdAt updatedAt')
      .populate('businessType', 'name slug description suggestedListingType exampleCategories whyChooseUsTemplates defaultCoverImage defaultImages')
      .populate('plan');

    res.status(200).json({
      success: true,
      message: 'Business status updated',
      data: updated,
    });
  } catch (error) {
    console.error('Admin update business status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating business status',
    });
  }
};

// @desc    Admin: Assign/comp plan to a business (no payment required)
// @route   PATCH /api/business/admin/:id/plan
// @access  Private (admin only)
export const adminUpdateBusinessPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { planId, expiresAt, durationInDays, isComped, compReason, featureOverrides } = req.body || {};

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    // Allow clearing plan
    if (planId === null) {
      business.plan = undefined;
      business.planExpiresAt = undefined;
      business.planAssignmentSource = 'admin';
      business.planAssignedBy = req.user?._id;
      business.planAssignedAt = new Date();
      business.planComped = false;
      business.planCompReason = undefined;
      business.planCompedAt = undefined;
      if (featureOverrides === null) {
        business.featureOverrides = undefined;
      }

      await business.save();

      const updated = await Business.findById(id)
        .populate('owner', 'name email phone role isActive referralCode lastLogin createdAt updatedAt')
        .populate('businessType', 'name slug description suggestedListingType exampleCategories whyChooseUsTemplates defaultCoverImage defaultImages')
        .populate('plan');

      return res.status(200).json({
        success: true,
        message: 'Plan cleared successfully',
        data: updated,
      });
    }

    if (!planId) {
      return res.status(400).json({ success: false, message: 'planId is required' });
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive plan selected' });
    }

    let expiryDate = null;
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: 'expiresAt must be a valid date' });
      }
      expiryDate = d;
    } else {
      const days = typeof durationInDays === 'number' && durationInDays > 0 ? durationInDays : plan.durationInDays;
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
    }

    business.plan = plan._id;
    business.planExpiresAt = expiryDate;
    business.planAssignmentSource = 'admin';
    business.planAssignedBy = req.user?._id;
    business.planAssignedAt = new Date();

    if (typeof isComped === 'boolean') {
      business.planComped = isComped;
      business.planCompedAt = isComped ? new Date() : undefined;
    }

    if (typeof compReason === 'string') {
      business.planCompReason = compReason.trim() || undefined;
    }

    if (featureOverrides !== undefined) {
      if (featureOverrides === null) {
        business.featureOverrides = undefined;
      } else if (featureOverrides && typeof featureOverrides === 'object' && !Array.isArray(featureOverrides)) {
        business.featureOverrides = featureOverrides;
      } else {
        return res.status(400).json({ success: false, message: 'featureOverrides must be an object or null' });
      }
    }

    await business.save();

    const updated = await Business.findById(id)
      .populate('owner', 'name email phone role isActive referralCode lastLogin createdAt updatedAt')
      .populate('businessType', 'name slug description suggestedListingType exampleCategories whyChooseUsTemplates defaultCoverImage defaultImages')
      .populate('plan');

    return res.status(200).json({
      success: true,
      message: 'Plan assigned successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Admin update business plan error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error assigning plan',
    });
  }
};

// @desc    Get all businesses (with filters)
// @route   GET /api/business
// @access  Public
export const getAllBusinesses = async (req, res) => {
  try {
    const { businessType, city, search, isActive, isVerified, page = 1, limit = 20 } = req.query;

    // Build query
    // NOTE: This route is admin-only (see routes). Return all businesses by default.
    const query = {};

    // Optional explicit filters
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';

    if (businessType) query.businessType = businessType; // filter by businessType ObjectId
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [businesses, total] = await Promise.all([
      Business.find(query)
        .populate('owner', 'name email phone role isActive')
        .populate('businessType', 'name slug description suggestedListingType exampleCategories whyChooseUsTemplates defaultCoverImage defaultImages')
        .populate('plan', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Business.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        businesses,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get all businesses error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching businesses',
    });
  }
};

// @desc    Get my businesses
// @route   GET /api/business/my/businesses
// @access  Private
export const getMyBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({ owner: req.user._id })
      .populate('businessType', 'name slug description suggestedListingType exampleCategories whyChooseUsTemplates')
      .populate('plan')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: businesses,
    });
  } catch (error) {
    console.error('Get my businesses error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching businesses',
    });
  }
};

// @desc    Update business
// @route   PUT /api/business/:id
// @access  Private (owner only)
export const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    // Update fields (exclude sensitive fields)
    const allowedFields = [
      'name',
      'businessType',
      'logo',
      'coverImage',
      'branding',
      'phone',
      'whatsapp',
      'whatsappOrderMessageTemplate',
      'whatsappAutoGreetingEnabled',
      'whatsappAutoGreetingMessage',
      'email',
      'address',
      'description',
      'workingHours',
      'openStatusMode',
      'socialMediaCustom',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Allow partial social media updates without overwriting the whole object.
    // Accepts: { socialMedia: { facebook, instagram, twitter, youtube } }
    // Uses dot-notation so callers can update a single platform safely.
    if (req.body.socialMedia !== undefined) {
      const sm = req.body.socialMedia;

      if (sm && typeof sm === 'object' && !Array.isArray(sm)) {
        const keys = ['facebook', 'instagram', 'twitter', 'youtube'];
        keys.forEach((k) => {
          if (sm[k] !== undefined) {
            updates[`socialMedia.${k}`] = sm[k];
          }
        });
      } else if (sm === null) {
        // Clear all social links (set empty strings)
        updates['socialMedia.facebook'] = '';
        updates['socialMedia.instagram'] = '';
        updates['socialMedia.twitter'] = '';
        updates['socialMedia.youtube'] = '';
      }
    }

    // If businessType is being updated, validate it exists
    if (updates.businessType !== undefined) {
      const { BusinessType } = await import('../models/index.js');
      const businessTypeDoc = await BusinessType.findById(updates.businessType);
      if (!businessTypeDoc) {
        return res.status(400).json({
          success: false,
          message: 'Invalid business type. Please select a valid business type.',
        });
      }
    }

    // If name is changing, regenerate slug (same logic as model pre-save)
    if (typeof updates.name === 'string' && updates.name.trim()) {
      const baseSlug = slugify(updates.name, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g,
      });

      let slug = baseSlug;
      let counter = 1;
      while (await Business.findOne({ slug, _id: { $ne: id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      updates.slug = slug;
    }

    // Ownership scoping (admins can update any business)
    const query = req.user.role === 'admin' ? { _id: id } : { _id: id, owner: req.user._id };

    const existingBusiness = await Business.findOne(query);
    if (!existingBusiness) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    const updatedBusiness = await Business.findOneAndUpdate(
      query,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('owner', 'name email phone role isActive')
      .populate('businessType', 'name slug description suggestedListingType exampleCategories whyChooseUsTemplates defaultCoverImage defaultImages')
      .populate('plan');

    if (!updatedBusiness) {
      const exists = await Business.findById(id);
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: 'Business not found',
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this business',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Business updated successfully',
      data: updatedBusiness,
    });
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating business',
    });
  }
};

// @desc    Delete business
// @route   DELETE /api/business/:id
// @access  Private (owner only)
export const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    // Check ownership (unless admin)
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this business',
      });
    }

    // Soft delete (deactivate)
    business.isActive = false;
    await business.save();

    res.status(200).json({
      success: true,
      message: 'Business deleted successfully',
    });
  } catch (error) {
    console.error('Delete business error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting business',
    });
  }
};

// @desc    Get business stats
// @route   GET /api/business/:id/stats
// @access  Private (owner only)
export const getBusinessStats = async (req, res) => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    // Check ownership (unless admin)
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view stats',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        stats: business.stats,
        planStatus: {
          plan: business.plan,
          expiresAt: business.planExpiresAt,
          isActive: business.hasActivePlan(),
        },
      },
    });
  } catch (error) {
    console.error('Get business stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching stats',
    });
  }
};

// @desc    Get effective entitlements for a business (plan + overrides + expiry)
// @route   GET /api/business/:id/entitlements
// @access  Private (owner/admin)
export const getBusinessEntitlements = async (req, res) => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id).populate('plan');
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view entitlements' });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);

    return res.status(200).json({
      success: true,
      data: entitlements,
    });
  } catch (error) {
    console.error('Get business entitlements error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching entitlements',
    });
  }
};

// @desc    Public: Track customer action clicks (WhatsApp / Call / Map)
// @route   POST /api/business/slug/:slug/track
// @access  Public
export const trackBusinessAction = async (req, res) => {
  try {
    const { slug } = req.params;
    const { action } = req.body || {};

    if (!['whatsapp', 'call', 'map'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const business = await Business.findOne({ slug: String(slug || '').toLowerCase().trim(), isActive: true });
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const statName = action === 'whatsapp' ? 'whatsappClicks' : action === 'call' ? 'callClicks' : 'mapClicks';
    await business.incrementStat(statName);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Track business action error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error tracking action' });
  }
};
