import { Listing, Business, Category, BusinessType } from '../models/index.js';
import { getEffectiveEntitlementsForBusiness, isUnlimited } from '../services/entitlementsService.js';

const DEMO_SHOP_SLUG = 'ram-kirana-store';

/**
 * LISTING CONTROLLER - Universal listing management
 * Replaces: Product controller
 * Supports: products, services, courses, food, rentals
 * CRITICAL: Multi-tenant scoped - all queries filtered by business
 */

// @desc    Create new listing
// @route   POST /api/listings
// @access  Private (business owner)
export const createListing = async (req, res) => {
  try {
    const {
      business: businessId,
      title,
      description,
      images,
      listingType,
      price,
      priceType,
      category,
      attributes,
      pricingOptions,
      stock,
      sku,
      isFeatured,
      isActive,
    } = req.body;

    const normalizedImages = Array.isArray(images)
      ? images
          .map((img) => {
            const url = typeof img?.url === 'string' ? img.url.trim() : '';
            const alt = typeof img?.alt === 'string' ? img.alt.trim() : '';
            return url ? { url, ...(alt ? { alt } : {}) } : null;
          })
          .filter(Boolean)
      : [];

    const normalizedPricingOptions = Array.isArray(pricingOptions)
      ? pricingOptions
          .map((o) => ({
            label: typeof o?.label === 'string' ? o.label.trim() : '',
            price: Number(o?.price),
          }))
          .filter((o) => o.label && Number.isFinite(o.price) && o.price >= 0)
      : undefined;

    // Require at least 1 image
    const hasAtLeastOneImage = normalizedImages.length > 0;

    if (!hasAtLeastOneImage) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required',
      });
    }

    // Verify business ownership
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create listings for this business',
      });
    }

    // Auto-derive listing type from businessType.suggestedListingType (single source of truth)
    const businessTypeDoc = await BusinessType.findById(business.businessType).select('suggestedListingType');
    const derivedListingType =
      businessTypeDoc?.suggestedListingType === 'service' ||
      businessTypeDoc?.suggestedListingType === 'food' ||
      businessTypeDoc?.suggestedListingType === 'course' ||
      businessTypeDoc?.suggestedListingType === 'rental' ||
      businessTypeDoc?.suggestedListingType === 'product'
        ? businessTypeDoc.suggestedListingType
        : 'product';

    // Check plan limits (effective entitlements)
    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    const features = entitlements.features;

    const maxListings = features?.maxListings;
    if (!isUnlimited(maxListings) && typeof maxListings === 'number') {
      if ((business.stats?.totalListings || 0) >= maxListings) {
        return res.status(403).json({
          success: false,
          message: `Your plan allows maximum ${maxListings} listings. Please upgrade.`,
        });
      }
    }

    // Check featured listing limit
    if (isFeatured) {
      if (features?.featuredEnabled !== true) {
        return res.status(403).json({
          success: false,
          message: 'Featured listings are not enabled in your plan. Please upgrade.',
        });
      }

      const limit = features?.maxFeaturedListings ?? 0;
      if (!isUnlimited(limit) && typeof limit === 'number') {
        const featuredCount = await Listing.countDocuments({
          business: businessId,
          isFeatured: true,
        });
        if (featuredCount >= limit) {
          return res.status(403).json({
            success: false,
            message: `Your plan allows maximum ${limit} featured listings`,
          });
        }
      }
    }

    // Create listing
    const listing = await Listing.create({
      business: businessId,
      title,
      description,
      images: normalizedImages,
      listingType: derivedListingType,
      price,
      priceType,
      category: category || business.category,
      attributes,
      pricingOptions: normalizedPricingOptions,
      stock,
      sku,
      isFeatured: isFeatured || false,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id,
    });

    // Update business stats
    await business.incrementStat('totalListings');

    // Populate and return
    const populatedListing = await Listing.findById(listing._id).populate('category', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      data: populatedListing,
    });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating listing',
    });
  }
};

// @desc    Get MY listings (all listings across my businesses)
// @route   GET /api/listings/my/listings
// @access  Private
export const getMyListings = async (req, res) => {
  try {
    const { listingType, page = 1, limit = 20 } = req.query;

    // Find all businesses owned by this user
    const businesses = await Business.find({ owner: req.user._id }).select('_id');
    const businessIds = businesses.map((b) => b._id);

    const query = { business: { $in: businessIds }, isActive: true };
    if (listingType) query.listingType = listingType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate('business', 'name slug')
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Listing.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        listings,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get my listings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching listings',
    });
  }
};

// @desc    Get listings by business (owner or admin only)
// @route   GET /api/listings/business/:businessId
// @access  Private
export const getListingsByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { listingType, category, minPrice, maxPrice, search, page = 1, limit = 20 } = req.query;

    // Verify business exists and is active
    const business = await Business.findById(businessId);
    if (!business || !business.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    // Only owner or admin can view listings
    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view listings for this business',
      });
    }

    // Use advanced filter method from model
    const result = await Listing.advancedFilter(businessId, {
      listingType,
      category,
      minPrice,
      maxPrice,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get listings by business error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching listings',
    });
  }
};

// @desc    Get public listings by business (active only)
// @route   GET /api/listings/public/business/:businessId
// @access  Public
export const getPublicListingsByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { listingType, category, minPrice, maxPrice, search, page = 1, limit = 20 } = req.query;

    // Verify business exists and is active
    const business = await Business.findById(businessId).select(
      '_id slug isActive isVerified plan planExpiresAt featureOverrides'
    );
    if (!business || !business.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    // Do not expose listings for unverified shops (demo exception)
    if (String(business.slug || '').toLowerCase() !== DEMO_SHOP_SLUG && business.isVerified !== true) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (String(business.slug || '').toLowerCase() !== DEMO_SHOP_SLUG) {
      const entitlements = await getEffectiveEntitlementsForBusiness(business);
      if (entitlements?.features?.publicShopEnabled !== true) {
        return res.status(404).json({
          success: false,
          message: 'Shop not available',
        });
      }
    }

    const result = await Listing.advancedFilter(businessId, {
      listingType,
      category,
      minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
      sort: '-isFeatured -createdAt',
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get public listings by business error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching listings',
    });
  }
};

// @desc    Get single listing by ID
// @route   GET /api/listings/:id
// @access  Public
export const getListingById = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id)
      .populate('business', 'name slug phone whatsapp address')
      .populate('category', 'name slug')
      .populate('createdBy', 'name');

    if (!listing || !listing.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // If business has public shop disabled, do not expose listing publicly
    if (listing?.business?._id) {
      const business = await Business.findById(listing.business._id).select(
        '_id slug plan planExpiresAt featureOverrides isActive isVerified'
      );
      if (!business || !business.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Listing not found',
        });
      }

      // Do not expose listings for unverified shops (demo exception)
      if (String(business.slug || '').toLowerCase() !== DEMO_SHOP_SLUG && business.isVerified !== true) {
        return res.status(404).json({
          success: false,
          message: 'Listing not found',
        });
      }

      if (String(business.slug || '').toLowerCase() !== DEMO_SHOP_SLUG) {
        const entitlements = await getEffectiveEntitlementsForBusiness(business);
        if (entitlements?.features?.publicShopEnabled !== true) {
          return res.status(404).json({
            success: false,
            message: 'Listing not found',
          });
        }
      }
    }

    // Increment view count
    await listing.incrementStat('views');

    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    console.error('Get listing by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching listing',
    });
  }
};

// @desc    Get single listing by ID (owner)
// @route   GET /api/listings/my/:id
// @access  Private (owner only)
export const getMyListingById = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id)
      .populate({
        path: 'business',
        select: 'name slug owner category',
        populate: { path: 'category', select: 'name slug' },
      })
      .populate('category', 'name slug')
      .populate('createdBy', 'name');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    const businessOwnerId = listing.business?.owner?.toString();
    if (businessOwnerId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this listing',
      });
    }

    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    console.error('Get my listing by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching listing',
    });
  }
};

// @desc    Update listing
// @route   PUT /api/listings/:id
// @access  Private (owner only)
export const updateListing = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id).populate('business');
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // Check ownership
    if (
      listing.business.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this listing',
      });
    }

    // Enforce plan rules for enabling featured on existing listings
    if (req.body.isFeatured === true && listing.isFeatured !== true) {
      const entitlements = await getEffectiveEntitlementsForBusiness(listing.business);
      const features = entitlements.features;

      if (features?.featuredEnabled !== true) {
        return res.status(403).json({
          success: false,
          message: 'Featured listings are not enabled in your plan. Please upgrade.',
        });
      }

      const limit = features?.maxFeaturedListings ?? 0;
      if (!isUnlimited(limit) && typeof limit === 'number') {
        const featuredCount = await Listing.countDocuments({
          business: listing.business._id,
          isFeatured: true,
        });
        if (featuredCount >= limit) {
          return res.status(403).json({
            success: false,
            message: `Your plan allows maximum ${limit} featured listings`,
          });
        }
      }
    }

    // Update allowed fields
    const allowedFields = [
      'title',
      'description',
      'images',
      'listingType',
      'price',
      'priceType',
      'category',
      'attributes',
      'pricingOptions',
      'stock',
      'sku',
      'isFeatured',
      'isActive',
    ];

    // Normalize images (if provided)
    if (req.body.images !== undefined) {
      req.body.images = Array.isArray(req.body.images)
        ? req.body.images
            .map((img) => {
              const url = typeof img?.url === 'string' ? img.url.trim() : '';
              const alt = typeof img?.alt === 'string' ? img.alt.trim() : '';
              return url ? { url, ...(alt ? { alt } : {}) } : null;
            })
            .filter(Boolean)
        : [];
    }

    // Normalize pricingOptions (if provided)
    if (req.body.pricingOptions !== undefined) {
      req.body.pricingOptions = Array.isArray(req.body.pricingOptions)
        ? req.body.pricingOptions
            .map((o) => ({
              label: typeof o?.label === 'string' ? o.label.trim() : '',
              price: Number(o?.price),
            }))
            .filter((o) => o.label && Number.isFinite(o.price) && o.price >= 0)
        : [];
    }

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    // If listingType was attempted to be changed, enforce derived type from businessType.suggestedListingType
    if (req.body.listingType !== undefined) {
      const businessTypeDoc = await BusinessType.findById(listing.business.businessType).select('suggestedListingType');
      const derivedListingType =
        businessTypeDoc?.suggestedListingType === 'service' ||
        businessTypeDoc?.suggestedListingType === 'food' ||
        businessTypeDoc?.suggestedListingType === 'course' ||
        businessTypeDoc?.suggestedListingType === 'rental' ||
        businessTypeDoc?.suggestedListingType === 'product'
          ? businessTypeDoc.suggestedListingType
          : 'product';
      listing.listingType = derivedListingType;
    }

    await listing.save();

    const updatedListing = await Listing.findById(listing._id).populate('category', 'name slug');

    res.status(200).json({
      success: true,
      message: 'Listing updated successfully',
      data: updatedListing,
    });
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating listing',
    });
  }
};

// @desc    Delete listing
// @route   DELETE /api/listings/:id
// @access  Private (owner only)
export const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id).populate('business');
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // Check ownership
    if (
      listing.business.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this listing',
      });
    }

    // Soft delete
    listing.isActive = false;
    await listing.save();

    // Update business stats
    await Business.updateOne(
      { _id: listing.business._id, 'stats.totalListings': { $gt: 0 } },
      { $inc: { 'stats.totalListings': -1 } }
    );

    res.status(200).json({
      success: true,
      message: 'Listing deleted successfully',
    });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting listing',
    });
  }
};

// @desc    Search listings across all businesses
// @route   GET /api/listings/search
// @access  Public
export const searchListings = async (req, res) => {
  try {
    const { query, city, listingType, category, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    // Build search query
    const searchQuery = {
      isActive: true,
      $text: { $search: query },
    };

    if (listingType) searchQuery.listingType = listingType;
    if (category) searchQuery.category = category;

    // If city filter, first find businesses in that city
    if (city) {
      const businessesInCity = await Business.find({
        'address.city': new RegExp(city, 'i'),
        isActive: true,
      }).select('_id');

      searchQuery.business = { $in: businessesInCity.map((b) => b._id) };
    }

    const skip = (page - 1) * limit;
    const [listings, total] = await Promise.all([
      Listing.find(searchQuery)
        .populate('business', 'name slug address.city')
        .populate('category', 'name slug')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Listing.countDocuments(searchQuery),
    ]);

    res.status(200).json({
      success: true,
      data: {
        listings,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Search listings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error searching listings',
    });
  }
};

// @desc    Get featured listings
// @route   GET /api/listings/featured
// @access  Public
export const getFeaturedListings = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const listings = await Listing.find({ isFeatured: true, isActive: true })
      .populate('business', 'name slug address.city')
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: listings,
    });
  } catch (error) {
    console.error('Get featured listings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching featured listings',
    });
  }
};
