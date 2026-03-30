import { Inquiry, Business, Listing } from '../models/index.js';
import { getEffectiveEntitlementsForBusiness } from '../services/entitlementsService.js';

/**
 * INQUIRY CONTROLLER - Lightweight inquiry management
 * Replaces: Heavy order logic
 * Supports: WhatsApp, Call, Form inquiries
 * CRITICAL: Multi-tenant scoped
 */

// @desc    Create inquiry
// @route   POST /api/inquiries
// @access  Public
export const createInquiry = async (req, res) => {
  try {
    const { businessId, listingId, customerName, customerPhone, customerEmail, message, type } =
      req.body;

    // Verify business exists
    const business = await Business.findById(businessId)
      .populate('plan')
      .select('_id isActive owner plan planExpiresAt featureOverrides name phone whatsapp');
    if (!business || !business.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (entitlements?.features?.inquiriesEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'Inquiries are not enabled for this business',
      });
    }

    // Verify listing if provided
    if (listingId) {
      const listing = await Listing.findById(listingId);
      if (!listing || listing.business.toString() !== businessId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid listing',
        });
      }

      // Increment listing inquiry stat
      await listing.incrementStat('inquiries');
    }

    // Create inquiry
    const inquiry = await Inquiry.create({
      business: businessId,
      listing: listingId || null,
      customerName,
      customerPhone,
      customerEmail,
      message,
      type,
      source: 'website',
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        referrer: req.headers['referer'],
      },
    });

    // Update business stats
    await business.incrementStat('totalInquiries');

    const populatedInquiry = await Inquiry.findById(inquiry._id)
      .populate('listing', 'title listingType')
      .populate('business', 'name phone whatsapp');

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      data: populatedInquiry,
    });
  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating inquiry',
    });
  }
};

// @desc    Get inquiries by business
// @route   GET /api/inquiries/business/:businessId
// @access  Private (owner only)
export const getInquiriesByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status, type, page = 1, limit = 20 } = req.query;

    // Verify business ownership
    const business = await Business.findById(businessId)
      .populate('plan')
      .select('_id owner isActive plan planExpiresAt featureOverrides');
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view inquiries',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (req.user.role !== 'admin' && entitlements?.features?.inquiriesEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'This feature is not enabled in your plan. Please upgrade.',
      });
    }

    // Build filters
    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;

    // Get inquiries using model method
    const skip = (page - 1) * limit;
    const [inquiries, total] = await Promise.all([
      Inquiry.find({ business: businessId, ...filters })
        .populate('listing', 'title listingType')
        .populate('notes.addedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Inquiry.countDocuments({ business: businessId, ...filters }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        inquiries,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get inquiries by business error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching inquiries',
    });
  }
};

// @desc    Get single inquiry
// @route   GET /api/inquiries/:id
// @access  Private (owner only)
export const getInquiryById = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await Inquiry.findById(id)
      .populate('business', 'name owner')
      .populate('listing', 'title listingType')
      .populate('notes.addedBy', 'name');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    // Check ownership
    if (
      inquiry.business.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this inquiry',
      });
    }

    if (req.user.role !== 'admin') {
      const business = await Business.findById(inquiry.business?._id)
        .populate('plan')
        .select('_id owner isActive plan planExpiresAt featureOverrides');
      if (!business || !business.isActive) {
        return res.status(404).json({ success: false, message: 'Business not found' });
      }

      const entitlements = await getEffectiveEntitlementsForBusiness(business);
      if (entitlements?.features?.inquiriesEnabled !== true) {
        return res.status(403).json({
          success: false,
          message: 'This feature is not enabled in your plan. Please upgrade.',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error('Get inquiry by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching inquiry',
    });
  }
};

// @desc    Update inquiry status
// @route   PUT /api/inquiries/:id/status
// @access  Private (owner only)
export const updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const inquiry = await Inquiry.findById(id).populate('business', 'owner');
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    // Check ownership
    if (
      inquiry.business.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this inquiry',
      });
    }

    if (req.user.role !== 'admin') {
      const business = await Business.findById(inquiry.business?._id)
        .populate('plan')
        .select('_id owner isActive plan planExpiresAt featureOverrides');
      if (!business || !business.isActive) {
        return res.status(404).json({ success: false, message: 'Business not found' });
      }

      const entitlements = await getEffectiveEntitlementsForBusiness(business);
      if (entitlements?.features?.inquiriesEnabled !== true) {
        return res.status(403).json({
          success: false,
          message: 'This feature is not enabled in your plan. Please upgrade.',
        });
      }
    }

    // Update status using model method
    await inquiry.updateStatus(status, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Inquiry status updated successfully',
      data: inquiry,
    });
  } catch (error) {
    console.error('Update inquiry status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating inquiry status',
    });
  }
};

// @desc    Add note to inquiry
// @route   POST /api/inquiries/:id/notes
// @access  Private (owner only)
export const addInquiryNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const inquiry = await Inquiry.findById(id).populate('business', 'owner');
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    // Check ownership
    if (
      inquiry.business.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add notes to this inquiry',
      });
    }

    if (req.user.role !== 'admin') {
      const business = await Business.findById(inquiry.business?._id)
        .populate('plan')
        .select('_id owner isActive plan planExpiresAt featureOverrides');
      if (!business || !business.isActive) {
        return res.status(404).json({ success: false, message: 'Business not found' });
      }

      const entitlements = await getEffectiveEntitlementsForBusiness(business);
      if (entitlements?.features?.inquiriesEnabled !== true) {
        return res.status(403).json({
          success: false,
          message: 'This feature is not enabled in your plan. Please upgrade.',
        });
      }
    }

    // Add note using model method
    await inquiry.addNote(req.user._id, note);

    const updatedInquiry = await Inquiry.findById(id)
      .populate('listing', 'title')
      .populate('notes.addedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: updatedInquiry,
    });
  } catch (error) {
    console.error('Add inquiry note error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding note',
    });
  }
};

// @desc    Get inquiry stats
// @route   GET /api/inquiries/business/:businessId/stats
// @access  Private (owner only)
export const getInquiryStats = async (req, res) => {
  try {
    const { businessId } = req.params;

    // Verify business ownership
    const business = await Business.findById(businessId)
      .populate('plan')
      .select('_id owner isActive plan planExpiresAt featureOverrides');
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (business.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view stats',
      });
    }

    const entitlements = await getEffectiveEntitlementsForBusiness(business);
    if (req.user.role !== 'admin' && entitlements?.features?.inquiriesEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: 'This feature is not enabled in your plan. Please upgrade.',
      });
    }

    // Get stats using model method
    const stats = await Inquiry.getStats(businessId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get inquiry stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching inquiry stats',
    });
  }
};

// @desc    Delete inquiry
// @route   DELETE /api/inquiries/:id
// @access  Private (owner/admin only)
export const deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await Inquiry.findById(id).populate('business', 'owner');
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    // Check ownership
    if (
      inquiry.business.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this inquiry',
      });
    }

    if (req.user.role !== 'admin') {
      const business = await Business.findById(inquiry.business?._id)
        .populate('plan')
        .select('_id owner isActive plan planExpiresAt featureOverrides');
      if (!business || !business.isActive) {
        return res.status(404).json({ success: false, message: 'Business not found' });
      }

      const entitlements = await getEffectiveEntitlementsForBusiness(business);
      if (entitlements?.features?.inquiriesEnabled !== true) {
        return res.status(403).json({
          success: false,
          message: 'This feature is not enabled in your plan. Please upgrade.',
        });
      }
    }

    await inquiry.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Inquiry deleted successfully',
    });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting inquiry',
    });
  }
};
