import { ShopOffer, Business, Listing } from '../models/index.js';
import { getEffectiveEntitlementsForBusiness } from '../services/entitlementsService.js';

const DEMO_SHOP_SLUG = 'ram-kirana-store';

const getRequestedLang = (req) => {
  const q = String(req.query?.lang || '').toLowerCase();
  if (q.startsWith('hi')) return 'hi';
  if (q.startsWith('en')) return 'en';

  const header = String(req.headers?.['accept-language'] || '').toLowerCase();
  if (header.startsWith('hi')) return 'hi';
  return 'en';
};

const localizeOffer = (offer, lang) => {
  const obj = offer?.toObject ? offer.toObject() : offer;
  if (!obj) return obj;

  if (lang !== 'hi') return obj;

  return {
    ...obj,
    title: String(obj?.titleHi || '').trim() || obj?.title,
    description: String(obj?.descriptionHi || '').trim() || obj?.description,
    bogo: obj?.bogo
      ? {
          ...obj.bogo,
          label: String(obj?.bogo?.labelHi || '').trim() || obj?.bogo?.label,
        }
      : obj?.bogo,
  };
};

// @desc    List my offers (owner)
// @route   GET /api/offers/my
// @access  Private
export const getMyOffers = async (req, res) => {
  try {
    const ownerId = req.user?._id;

    const offers = await ShopOffer.find({ owner: ownerId, isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: offers,
    });
  } catch (error) {
    console.error('Get my offers error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching offers',
    });
  }
};

// @desc    Create offer (owner)
// @route   POST /api/offers
// @access  Private
export const createOffer = async (req, res) => {
  try {
    const ownerId = req.user?._id;

    const {
      title,
      titleHi,
      description,
      descriptionHi,
      type,
      percentOff,
      amountOff,
      bogo,
      banner,
      status,
      validFrom,
      validUntil,
      listingId,
    } = req.body || {};

    let resolvedListingId;
    if (listingId) {
      const listing = await Listing.findById(listingId).select('_id business isActive');
      if (!listing || listing.isActive !== true) {
        return res.status(400).json({
          success: false,
          message: 'Invalid listingId',
        });
      }

      const business = await Business.findOne({ _id: listing.business, owner: ownerId, isActive: true }).select('_id');
      if (!business) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this listing',
        });
      }

      resolvedListingId = listing._id;
    }

    const offer = await ShopOffer.create({
      owner: ownerId,
      title,
      ...(titleHi ? { titleHi } : {}),
      ...(description ? { description } : {}),
      ...(descriptionHi ? { descriptionHi } : {}),
      ...(type ? { type } : {}),
      ...(percentOff !== undefined ? { percentOff: Number(percentOff) } : {}),
      ...(amountOff !== undefined ? { amountOff: Number(amountOff) } : {}),
      ...(bogo && typeof bogo === 'object' ? { bogo } : {}),
      ...(banner && typeof banner === 'object' ? { banner } : {}),
      ...(status ? { status } : {}),
      ...(validFrom ? { validFrom: new Date(validFrom) } : {}),
      ...(validUntil ? { validUntil: new Date(validUntil) } : {}),
      ...(resolvedListingId ? { listingId: resolvedListingId } : {}),
    });

    res.status(201).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating offer',
    });
  }
};

// @desc    Update offer (owner)
// @route   PUT /api/offers/:id
// @access  Private
export const updateOffer = async (req, res) => {
  try {
    const ownerId = req.user?._id;
    const { id } = req.params;

    const offer = await ShopOffer.findOne({ _id: id, owner: ownerId, isActive: true });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    const update = req.body || {};
    const allowed = [
      'title',
      'titleHi',
      'description',
      'descriptionHi',
      'type',
      'percentOff',
      'amountOff',
      'bogo',
      'banner',
      'status',
      'validFrom',
      'validUntil',
      'appliesToAllBusinesses',
      'businessIds',
      'listingId',
    ];

    allowed.forEach((key) => {
      if (update[key] === undefined) return;

      if (key === 'percentOff' || key === 'amountOff') {
        offer[key] = update[key] === null ? undefined : Number(update[key]);
        return;
      }

      if (key === 'validFrom' || key === 'validUntil') {
        offer[key] = update[key] ? new Date(update[key]) : undefined;
        return;
      }

      offer[key] = update[key];
    });

    if (update.listingId !== undefined) {
      const nextListingId = update.listingId;
      if (!nextListingId) {
        offer.listingId = undefined;
      } else {
        const listing = await Listing.findById(nextListingId).select('_id business isActive');
        if (!listing || listing.isActive !== true) {
          return res.status(400).json({ success: false, message: 'Invalid listingId' });
        }
        const business = await Business.findOne({ _id: listing.business, owner: ownerId, isActive: true }).select('_id');
        if (!business) {
          return res.status(403).json({ success: false, message: 'You do not have access to this listing' });
        }
        offer.listingId = listing._id;
      }
    }

    await offer.save();

    res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    console.error('Update offer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating offer',
    });
  }
};

// @desc    Delete offer (soft)
// @route   DELETE /api/offers/:id
// @access  Private
export const deleteOffer = async (req, res) => {
  try {
    const ownerId = req.user?._id;
    const { id } = req.params;

    const offer = await ShopOffer.findOne({ _id: id, owner: ownerId, isActive: true });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    offer.isActive = false;
    offer.status = 'archived';
    await offer.save();

    res.status(200).json({
      success: true,
      message: 'Offer deleted',
    });
  } catch (error) {
    console.error('Delete offer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting offer',
    });
  }
};

// @desc    Get public offers for a business
// @route   GET /api/offers/public/business/:businessId
// @access  Public
export const getPublicOffersByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const requestedListingId = String(req.query?.listingId || '').trim();

    const business = await Business.findById(businessId).select(
      '_id slug owner isActive isVerified plan planExpiresAt featureOverrides'
    );

    if (!business || !business.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (String(business.slug || '').toLowerCase() !== DEMO_SHOP_SLUG && business.isVerified !== true) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (String(business.slug || '').toLowerCase() !== DEMO_SHOP_SLUG) {
      const now = new Date();
      const planIsActive =
        !!business.plan && !!business.planExpiresAt && new Date(business.planExpiresAt) > now;

      if (!planIsActive) {
        return res.status(404).json({
          success: false,
          message: 'Shop not available',
        });
      }

      const entitlements = await getEffectiveEntitlementsForBusiness(business, { now });
      const publicShopEnabled = !!entitlements?.features?.publicShopEnabled;
      const offersEnabled = !!entitlements?.features?.offersEnabled;

      if (!publicShopEnabled) {
        return res.status(404).json({
          success: false,
          message: 'Shop not available',
        });
      }

      if (!offersEnabled) {
        return res.status(200).json({
          success: true,
          data: { offers: [] },
        });
      }
    }

    const ownerId = business.owner;
    const now = new Date();

    const listingFilter = requestedListingId
      ? {
          $or: [
            { listingId: requestedListingId },
            { listingId: null },
            { listingId: { $exists: false } },
          ],
        }
      : {};

    const offers = await ShopOffer.find({
      owner: ownerId,
      isActive: true,
      status: 'active',
      $and: [
        { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
        { $or: [{ validUntil: null }, { validUntil: { $gte: now } }] },
      ],
      $or: [{ appliesToAllBusinesses: true }, { businessIds: business._id }],
      ...listingFilter,
    })
      .sort({ createdAt: -1 })
      .lean();

    // If an offer is linked to a listing, only show it on the listing's business.
    const listingIdsInOffers = Array.isArray(offers)
      ? offers
          .map((o) => o?.listingId)
          .filter(Boolean)
          .map((id) => String(id))
      : [];

    let allowedListingIds = null;
    if (listingIdsInOffers.length > 0) {
      const allowedListings = await Listing.find({
        _id: { $in: listingIdsInOffers },
        business: business._id,
        isActive: true,
      })
        .select('_id')
        .lean();
      allowedListingIds = new Set((allowedListings || []).map((l) => String(l._id)));
    }

    const scopedOffers = allowedListingIds
      ? offers.filter((o) => !o?.listingId || allowedListingIds.has(String(o.listingId)))
      : offers;

    const lang = getRequestedLang(req);
    const localized = scopedOffers.map((o) => localizeOffer(o, lang));

    res.status(200).json({
      success: true,
      data: { offers: localized },
    });
  } catch (error) {
    console.error('Get public offers by business error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching offers',
    });
  }
};
