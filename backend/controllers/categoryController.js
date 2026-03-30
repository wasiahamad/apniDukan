import { Category, Business, Listing, BusinessType } from '../models/index.js';
import { getEffectiveEntitlementsForBusiness } from '../services/entitlementsService.js';

const DEMO_SHOP_SLUG = 'ram-kirana-store';

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

const ensureDefaultCategoriesForBusiness = async ({ business }) => {
  if (!business?._id) return;

  const businessTypeDoc = await BusinessType.findById(business.businessType).select('exampleCategories').lean();
  const exampleCategories = normalizeExampleCategories(businessTypeDoc?.exampleCategories).slice(0, 50);
  if (exampleCategories.length === 0) return;

  const existing = await Category.find({ business: business._id }).select('name').lean();
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
    creations.push(Category.create({ business: business._id, name, order: i }));
  }

  if (creations.length === 0) return;
  await Promise.allSettled(creations);
};

/**
 * CATEGORY CONTROLLER - Business-scoped category management
 * Dukandar creates categories for their products/services
 * Examples: Grocery, Dairy, Snacks for Kirana; Fast Food, Chinese for Restaurant
 */

// @desc    Create category for dukandar's business
// @route   POST /api/categories
// @access  Private (business_owner)
export const createCategory = async (req, res) => {
  try {
    const { businessId, name, description, image, order, icon } = req.body;

    // Verify business ownership
    const business = await Business.findOne({ 
      _id: businessId, 
      owner: req.user._id 
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found or you do not own this business',
      });
    }

    // Check if category with same name exists for this business
    const existingCategory = await Category.findOne({
      business: businessId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists for your business',
      });
    }

    const category = await Category.create({
      business: businessId,
      name,
      description,
      image,
      order,
      icon,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating category',
    });
  }
};

// @desc    Get categories for a specific business (PUBLIC - for shop page)
// @route   GET /api/categories/business/:businessId
// @access  Public
export const getCategoriesByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await Business.findById(businessId).select('_id slug isActive plan planExpiresAt featureOverrides');
    if (!business || !business.isActive) {
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

    const categories = await Category.find({
      business: businessId,
      isActive: true,
    })
      .sort({ order: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Get categories by business error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching categories',
    });
  }
};

// @desc    Get my business categories (for dukandar)
// @route   GET /api/categories/my/:businessId
// @access  Private (business_owner)
export const getMyCategories = async (req, res) => {
  try {
    const { businessId } = req.params;

    // Verify business ownership
    const business = await Business.findOne({
      _id: businessId,
      owner: req.user._id,
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found or you do not own this business',
      });
    }

    // Safety net: if no categories exist yet, auto-create defaults from BusinessType.
    // This makes categories appear immediately in dashboard even for older records.
    try {
      await ensureDefaultCategoriesForBusiness({ business });
    } catch (e) {
      console.warn('Auto default category bootstrap failed:', e?.message || e);
    }

    const categories = await Category.find({
      business: businessId,
    })
      .sort({ order: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Get my categories error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching categories',
    });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id).populate('business', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching category',
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (owner only)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, isActive, order, icon } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Verify business ownership
    const business = await Business.findOne({
      _id: category.business,
      owner: req.user._id,
    });

    if (!business && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this category',
      });
    }

    // Check for duplicate name if name is being changed
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        business: category.business,
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id },
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists for your business',
        });
      }
    }

    // Update fields
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (icon !== undefined) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;
    if (order !== undefined) category.order = order;

    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating category',
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (owner only)
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Verify business ownership
    const business = await Business.findOne({
      _id: category.business,
      owner: req.user._id,
    });

    if (!business && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this category',
      });
    }

    // Check if any listings use this category
    const listingCount = await Listing.countDocuments({ category: id });

    if (listingCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${listingCount} listing(s) are using this category. Please update or delete those listings first.`,
      });
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting category',
    });
  }
};
