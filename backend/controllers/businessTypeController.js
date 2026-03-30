import { BusinessType } from '../models/index.js';

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

  return result.slice(0, 12);
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

/**
 * BUSINESS TYPE CONTROLLER
 * Admin manages business types (Kirana Store, Restaurant, etc.)
 * Public can view active business types for business registration
 */

// @desc    Get all business types (PUBLIC - for registration)
// @route   GET /api/business-types
// @access  Public
export const getAllBusinessTypes = async (req, res) => {
  try {
    const businessTypes = await BusinessType.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .select('-__v')
      .lean();

    res.status(200).json({
      success: true,
      data: businessTypes,
    });
  } catch (error) {
    console.error('Get all business types error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching business types',
    });
  }
};

// @desc    Get all business types (ADMIN - includes inactive)
// @route   GET /api/business-types/admin/all
// @access  Private/Admin
export const getAllBusinessTypesAdmin = async (req, res) => {
  try {
    const { search, isActive } = req.query;

    const query = {};
    if (typeof isActive !== 'undefined') {
      query.isActive = String(isActive) === 'true';
    }

    if (search) {
      const term = new RegExp(String(search), 'i');
      query.$or = [{ name: term }, { slug: term }, { description: term }];
    }

    const businessTypes = await BusinessType.find(query)
      .sort({ displayOrder: 1, name: 1 })
      .select('-__v')
      .lean();

    res.status(200).json({
      success: true,
      data: businessTypes,
    });
  } catch (error) {
    console.error('Admin get all business types error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching business types',
    });
  }
};

// @desc    Get business type by ID or slug
// @route   GET /api/business-types/:identifier
// @access  Public
export const getBusinessType = async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try to find by ID first, then by slug
    const query = identifier.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: identifier }
      : { slug: identifier };

    const businessType = await BusinessType.findOne(query);

    if (!businessType) {
      return res.status(404).json({
        success: false,
        message: 'Business type not found',
      });
    }

    res.status(200).json({
      success: true,
      data: businessType,
    });
  } catch (error) {
    console.error('Get business type error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching business type',
    });
  }
};

// @desc    Create new business type (ADMIN ONLY)
// @route   POST /api/business-types
// @access  Private/Admin
export const createBusinessType = async (req, res) => {
  try {
    const {
      name,
      description,
      icon,
      iconName,
      suggestedListingType,
      exampleCategories,
      defaultCoverImage,
      defaultImages,
      whyChooseUsTemplates,
      displayOrder,
      isActive,
    } = req.body;

    // Check if business type with same name exists
    const existingType = await BusinessType.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingType) {
      return res.status(400).json({
        success: false,
        message: 'Business type with this name already exists',
      });
    }

    const businessType = await BusinessType.create({
      name,
      description,
      icon,
      iconName,
      suggestedListingType,
      exampleCategories,
      defaultCoverImage: String(defaultCoverImage || '').trim() || undefined,
      defaultImages: normalizeImageList(defaultImages),
      whyChooseUsTemplates: normalizeWhyChooseUsTemplates(whyChooseUsTemplates),
      displayOrder,
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
    });

    res.status(201).json({
      success: true,
      message: 'Business type created successfully',
      data: businessType,
    });
  } catch (error) {
    console.error('Create business type error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating business type',
    });
  }
};

// @desc    Update business type (ADMIN ONLY)
// @route   PUT /api/business-types/:id
// @access  Private/Admin
export const updateBusinessType = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      icon,
      iconName,
      suggestedListingType,
      exampleCategories,
      defaultCoverImage,
      defaultImages,
      whyChooseUsTemplates,
      isActive,
      displayOrder,
    } = req.body;

    const businessType = await BusinessType.findById(id);

    if (!businessType) {
      return res.status(404).json({
        success: false,
        message: 'Business type not found',
      });
    }

    // Check if new name conflicts with existing
    if (name && name !== businessType.name) {
      const existingType = await BusinessType.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id },
      });

      if (existingType) {
        return res.status(400).json({
          success: false,
          message: 'Business type with this name already exists',
        });
      }
    }

    // Update fields
    if (name !== undefined) businessType.name = name;
    if (description !== undefined) businessType.description = description;
    if (icon !== undefined) businessType.icon = icon;
    if (iconName !== undefined) businessType.iconName = iconName;
    if (suggestedListingType !== undefined) businessType.suggestedListingType = suggestedListingType;
    if (exampleCategories !== undefined) businessType.exampleCategories = exampleCategories;
    if (defaultCoverImage !== undefined) businessType.defaultCoverImage = String(defaultCoverImage || '').trim();
    if (defaultImages !== undefined) businessType.defaultImages = normalizeImageList(defaultImages);
    if (whyChooseUsTemplates !== undefined) businessType.whyChooseUsTemplates = normalizeWhyChooseUsTemplates(whyChooseUsTemplates);
    if (isActive !== undefined) businessType.isActive = isActive;
    if (displayOrder !== undefined) businessType.displayOrder = displayOrder;

    await businessType.save();

    res.status(200).json({
      success: true,
      message: 'Business type updated successfully',
      data: businessType,
    });
  } catch (error) {
    console.error('Update business type error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating business type',
    });
  }
};

// @desc    Generate Why Choose Us templates with AI (ADMIN ONLY)
// @route   POST /api/business-types/:id/why-choose-us/generate
// @access  Private/Admin
export const generateWhyChooseUsTemplatesAI = async (req, res) => {
  try {
    const { id } = req.params;
    const count = Number(req.body?.count ?? 4);
    const safeCount = Number.isFinite(count) ? Math.min(Math.max(count, 2), 8) : 4;

    const businessType = await BusinessType.findById(id).select('name description suggestedListingType exampleCategories').lean();
    if (!businessType) {
      return res.status(404).json({
        success: false,
        message: 'Business type not found',
      });
    }

    const { generateWhyChooseUsTemplatesForBusinessType } = await import('../services/openrouterService.js');
    const generated = await generateWhyChooseUsTemplatesForBusinessType({
      businessType,
      count: safeCount,
    });

    return res.status(200).json({
      success: true,
      data: normalizeWhyChooseUsTemplates(generated),
    });
  } catch (error) {
    console.error('Generate whyChooseUsTemplates AI error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error generating templates',
    });
  }
};

// @desc    Delete business type (ADMIN ONLY)
// @route   DELETE /api/business-types/:id
// @access  Private/Admin
export const deleteBusinessType = async (req, res) => {
  try {
    const { id } = req.params;

    const hard = String(req.query?.hard || '').toLowerCase() === 'true';

    const businessType = await BusinessType.findById(id);

    if (!businessType) {
      return res.status(404).json({
        success: false,
        message: 'Business type not found',
      });
    }

    // Check if any businesses use this type
    const { Business } = await import('../models/index.js');
    const businessCount = await Business.countDocuments({ businessType: id });

    // Default behavior: deactivate (safe), even if used.
    if (!hard) {
      businessType.isActive = false;
      await businessType.save();
      return res.status(200).json({
        success: true,
        message: businessCount > 0
          ? `Business type deactivated (in use by ${businessCount} business(es))`
          : 'Business type deactivated',
        data: businessType,
      });
    }

    // Hard delete only allowed if unused.
    if (businessCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot hard delete. ${businessCount} business(es) are using this type. Use soft delete instead.`,
      });
    }

    await businessType.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Business type deleted successfully',
    });
  } catch (error) {
    console.error('Delete business type error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting business type',
    });
  }
};
