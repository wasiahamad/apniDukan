import { Plan, Business } from '../models/index.js';

/**
 * PLAN CONTROLLER - Subscription plan management
 * Controls: Feature access for businesses
 */

// @desc    Create plan
// @route   POST /api/plans
// @access  Private (admin only)
export const createPlan = async (req, res) => {
  try {
    // Admin check
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create plans',
      });
    }

    const { name, slug, price, durationInDays, isPublic, features, description, isPopular, order } =
      req.body;

    // Check if plan with same slug exists
    if (slug) {
      const existingPlan = await Plan.findOne({ slug });
      if (existingPlan) {
        return res.status(400).json({
          success: false,
          message: 'Plan with this slug already exists',
        });
      }
    }

    const plan = await Plan.create({
      name,
      slug,
      price,
      durationInDays,
      ...(typeof isPublic === 'boolean' ? { isPublic } : {}),
      features,
      description,
      isPopular,
      order,
    });

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan,
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating plan',
    });
  }
};

// @desc    Get all plans
// @route   GET /api/plans
// @access  Public
export const getAllPlans = async (req, res) => {
  try {
    const { includeInactive, includeHidden } = req.query;

    const isAdmin = req.user?.role === 'admin';
    const query = {};

    // Only admins can see inactive plans.
    if (!isAdmin || !includeInactive) query.isActive = true;

    // Only admins can see non-public plans.
    // Use $ne:false so existing documents without isPublic are treated as public.
    if (!isAdmin || !includeHidden) query.isPublic = { $ne: false };

    const plans = await Plan.find(query).sort({ order: 1, price: 1 }).lean();

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Get all plans error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching plans',
    });
  }
};

// @desc    Get plan by ID
// @route   GET /api/plans/:id
// @access  Public
export const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Get plan by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching plan',
    });
  }
};

// @desc    Get plan by slug
// @route   GET /api/plans/slug/:slug
// @access  Public
export const getPlanBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const isAdmin = req.user?.role === 'admin';
    const query = { slug, isActive: true };
    if (!isAdmin) query.isPublic = { $ne: false };

    const plan = await Plan.findOne(query);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Get plan by slug error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching plan',
    });
  }
};

// @desc    Update plan
// @route   PUT /api/plans/:id
// @access  Private (admin only)
export const updatePlan = async (req, res) => {
  try {
    // Admin check
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update plans',
      });
    }

    const { id } = req.params;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    // Update allowed fields
    const allowedFields = [
      'name',
      'price',
      'durationInDays',
      'isPublic',
      'features',
      'description',
      'isActive',
      'isPopular',
      'order',
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        plan[field] = req.body[field];
      }
    });

    await plan.save();

    res.status(200).json({
      success: true,
      message: 'Plan updated successfully',
      data: plan,
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating plan',
    });
  }
};

// @desc    Delete plan
// @route   DELETE /api/plans/:id
// @access  Private (admin only)
export const deletePlan = async (req, res) => {
  try {
    // Admin check
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete plans',
      });
    }

    const { id } = req.params;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    // Check if any business is using this plan
    const businessCount = await Business.countDocuments({ plan: id });
    if (businessCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan. ${businessCount} businesses are using this plan.`,
      });
    }

    // Soft delete
    plan.isActive = false;
    await plan.save();

    res.status(200).json({
      success: true,
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting plan',
    });
  }
};

// @desc    Subscribe business to plan
// @route   POST /api/plans/:id/subscribe
// @access  Private (business owner)
export const subscribeToPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { businessId } = req.body;

    // Verify plan exists
    const plan = await Plan.findById(id);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    if (req.user.role !== 'admin' && plan.isPublic === false) {
      return res.status(403).json({
        success: false,
        message: 'This plan is not available for self-subscription',
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
        message: 'Not authorized to subscribe this business',
      });
    }

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationInDays);

    // Update business
    business.plan = plan._id;
    business.planExpiresAt = expiryDate;
    await business.save();

    // TODO: Integrate with payment gateway here (Razorpay, Stripe)

    res.status(200).json({
      success: true,
      message: 'Subscribed to plan successfully',
      data: {
        business,
        plan,
        expiresAt: expiryDate,
      },
    });
  } catch (error) {
    console.error('Subscribe to plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error subscribing to plan',
    });
  }
};
