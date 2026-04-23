import mongoose from 'mongoose';

/**
 * PLAN MODEL - Subscription/Pricing Plans
 * Controls: Feature access for businesses
 * Multi-tier: Free, Starter, Pro, Business, Enterprise
 */

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    durationInDays: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 day'],
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    features: {
      maxListings: {
        type: Number,
        required: true,
        default: 10,
      },
      // Whether this plan allows publishing a customer-facing public shop (/shop/:slug)
      publicShopEnabled: {
        type: Boolean,
        default: true,
      },
      bookingEnabled: {
        type: Boolean,
        default: false,
      },
      featuredEnabled: {
        type: Boolean,
        default: false,
      },
      maxFeaturedListings: {
        type: Number,
        default: 0,
      },
      customDomain: {
        type: Boolean,
        default: false,
      },
      analyticsEnabled: {
        type: Boolean,
        default: false,
      },
      prioritySupport: {
        type: Boolean,
        default: false,
      },
      whatsappIntegration: {
        type: Boolean,
        default: true,
      },
      removeWatermark: {
        type: Boolean,
        default: false,
      },
      seoTools: {
        type: Boolean,
        default: false,
      },
      apiAccess: {
        type: Boolean,
        default: false,
      },

      // Social/engagement modules
      storiesEnabled: {
        type: Boolean,
        default: false,
      },

      // Allow posting existing listings as Story/Reel (auto link)
      listingStoriesEnabled: {
        type: Boolean,
        default: false,
      },

      ratingsEnabled: {
        type: Boolean,
        default: true,
      },

      locationEnabled: {
        type: Boolean,
        default: true,
      },

      // Dukandar module access (admin-controlled)
      supportTicketsEnabled: {
        type: Boolean,
        default: true,
      },
      referralsEnabled: {
        type: Boolean,
        default: true,
      },
      invoicesEnabled: {
        type: Boolean,
        default: true,
      },
      brandingEnabled: {
        type: Boolean,
        default: true,
      },
      whatsappSettingsEnabled: {
        type: Boolean,
        default: true,
      },

      ordersEnabled: {
        type: Boolean,
        default: true,
      },
      inquiriesEnabled: {
        type: Boolean,
        default: true,
      },

      // Offers/discount banners shown on public shop
      offersEnabled: {
        type: Boolean,
        default: false,
      },

      // AI modules (plan controlled)
      // Public/customer facing AI chat on public shop pages
      aiCustomerChatEnabled: {
        type: Boolean,
        default: true,
      },

      // Dukandar-facing AI agent (dashboard tools like generate/insights)
      aiDukandarAgentEnabled: {
        type: Boolean,
        default: false,
      },
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0, // For displaying plans in specific order
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
planSchema.index({ isActive: 1, order: 1 });
planSchema.index({ price: 1 });

// Method to check if plan allows specific feature
planSchema.methods.hasFeature = function (featureName) {
  return this.features[featureName] === true;
};

// Method to check if business can add more listings
planSchema.methods.canAddListing = function (currentListingCount) {
  if (typeof this.features.maxListings === 'number' && this.features.maxListings < 0) return true;
  return currentListingCount < this.features.maxListings;
};

// Static method to get all active plans
planSchema.statics.getActivePlans = async function () {
  return await this.find({ isActive: true }).sort({ order: 1, price: 1 }).lean();
};

// Static method to get plan by slug
planSchema.statics.getBySlug = async function (slug) {
  return await this.findOne({ slug, isActive: true });
};

const Plan = mongoose.model('Plan', planSchema);

export default Plan;
