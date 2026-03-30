import mongoose from 'mongoose';
import slugify from 'slugify';

/**
 * BUSINESS MODEL - Core multi-tenant entity
 * Replaces Shop model
 * Supports: kirana, clothing, restaurant, coaching, rental, service, etc.
 * Uses: slug-based routing (for public pages and future subdomain support)
 */

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Business owner is required'],
    },
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [150, 'Business name cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    businessType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessType',
      required: [true, 'Business type is required'],
    },
    logo: {
      type: String, // Cloudinary URL
    },
    coverImage: {
      type: String, // Cloudinary URL
    },
    branding: {
      themeColor: {
        type: String,
        default: '#1DBF73',
        match: [/^#([0-9a-fA-F]{6})$/, 'Theme color must be a valid hex color (e.g. #1DBF73)'],
      },
      backgroundColor: {
        type: String,
        default: '#F3F4F6',
        match: [/^#([0-9a-fA-F]{6})$/, 'Background color must be a valid hex color (e.g. #F3F4F6)'],
      },
      fontColor: {
        type: String,
        default: '#111827',
        match: [/^#([0-9a-fA-F]{6})$/, 'Font color must be a valid hex color (e.g. #111827)'],
      },
      fontFamily: {
        type: String,
        default: 'Plus Jakarta Sans',
        trim: true,
        maxlength: [60, 'Font family cannot exceed 60 characters'],
      },
    },
    socialMedia: {
      facebook: { type: String, trim: true, maxlength: [300, 'Facebook URL cannot exceed 300 characters'] },
      instagram: { type: String, trim: true, maxlength: [300, 'Instagram URL cannot exceed 300 characters'] },
      twitter: { type: String, trim: true, maxlength: [300, 'Twitter/X URL cannot exceed 300 characters'] },
      youtube: { type: String, trim: true, maxlength: [300, 'YouTube URL cannot exceed 300 characters'] },
    },
    socialMediaCustom: [
      {
        label: {
          type: String,
          trim: true,
          maxlength: [50, 'Social label cannot exceed 50 characters'],
        },
        url: {
          type: String,
          trim: true,
          maxlength: [300, 'Social URL cannot exceed 300 characters'],
        },
      },
    ],
    phone: {
      type: String,
      required: [true, 'Business phone is required'],
      trim: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    whatsappOrderMessageTemplate: {
      type: String,
      trim: true,
      maxlength: [500, 'WhatsApp order message cannot exceed 500 characters'],
      default: 'Hello {{business_name}}, I want to order {{product_name}}.',
    },
    whatsappAutoGreetingEnabled: {
      type: Boolean,
      default: true,
    },
    whatsappAutoGreetingMessage: {
      type: String,
      maxlength: [500, 'WhatsApp greeting message cannot exceed 500 characters'],
      default: 'Welcome! How can we help you?',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      street: String,
      city: {
        type: String,
        required: [true, 'City is required'],
      },
      state: {
        type: String,
        required: [true, 'State is required'],
      },
      pincode: String,
      landmark: String,
      location: {
        type: new mongoose.Schema(
          {
            type: {
              type: String,
              enum: ['Point'],
              required: true,
            },
            coordinates: {
              type: [Number], // [longitude, latitude]
              required: true,
              validate: {
                validator: (v) => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n)),
                message: 'Location.coordinates must be [lng,lat] numbers',
              },
            },
          },
          { _id: false }
        ),
        default: undefined,
      },
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    whyChooseUs: [
      {
        title: {
          type: String,
          trim: true,
          maxlength: [80, 'Why Choose Us title cannot exceed 80 characters'],
        },
        desc: {
          type: String,
          trim: true,
          maxlength: [180, 'Why Choose Us description cannot exceed 180 characters'],
        },
        // Optional icon component name (lucide-react icon name, e.g. "Truck")
        iconName: {
          type: String,
          trim: true,
          maxlength: [80, 'Why Choose Us icon name cannot exceed 80 characters'],
        },
      },
    ],
    workingHours: {
      monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
      sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } },
    },
    openStatusMode: {
      type: String,
      enum: ['auto', 'open', 'closed'],
      default: 'auto',
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
    },
    planExpiresAt: {
      type: Date,
    },
    // Optional per-business overrides on top of plan features.
    // Only set by admin; missing keys mean "inherit from plan".
    featureOverrides: {
      maxListings: { type: Number },
      publicShopEnabled: { type: Boolean },
      bookingEnabled: { type: Boolean },
      featuredEnabled: { type: Boolean },
      maxFeaturedListings: { type: Number },
      customDomain: { type: Boolean },
      analyticsEnabled: { type: Boolean },
      prioritySupport: { type: Boolean },
      whatsappIntegration: { type: Boolean },
      removeWatermark: { type: Boolean },
      seoTools: { type: Boolean },
      apiAccess: { type: Boolean },
      supportTicketsEnabled: { type: Boolean },
      referralsEnabled: { type: Boolean },
      invoicesEnabled: { type: Boolean },
      brandingEnabled: { type: Boolean },
      whatsappSettingsEnabled: { type: Boolean },

      ordersEnabled: { type: Boolean },
      inquiriesEnabled: { type: Boolean },
    },
    planAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    planAssignedAt: {
      type: Date,
    },
    planAssignmentSource: {
      type: String,
      enum: ['payment', 'admin', 'system'],
      default: 'payment',
    },
    planComped: {
      type: Boolean,
      default: false,
    },
    planCompReason: {
      type: String,
      trim: true,
      maxlength: [200, 'Comp reason cannot exceed 200 characters'],
    },
    planCompedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false, // Admin approval required
    },
    stats: {
      totalListings: { type: Number, default: 0 },
      totalInquiries: { type: Number, default: 0 },
      totalViews: { type: Number, default: 0 },
      whatsappClicks: { type: Number, default: 0 },
      callClicks: { type: Number, default: 0 },
      mapClicks: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL INDEXES for multi-tenant performance
businessSchema.index({ owner: 1 });
businessSchema.index({ businessType: 1, isActive: 1 });
businessSchema.index({ 'address.city': 1, isActive: 1 });
businessSchema.index({ isVerified: 1, isActive: 1 });
// Geo index for nearby / distance queries (GeoJSON stored in address.location)
businessSchema.index({ 'address.location': '2dsphere' });

// Auto-generate slug from business name if not provided
businessSchema.pre('save', async function (next) {
  if (!this.isModified('name') && this.slug) {
    return next();
  }

  try {
    // Generate base slug
    let baseSlug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    // Ensure uniqueness by appending number if needed
    let slug = baseSlug;
    let counter = 1;

    while (await mongoose.model('Business').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
    next();
  } catch (error) {
    next(error);
  }
});

// Guard against invalid GeoJSON that breaks 2dsphere indexes.
// - If location has valid coordinates, ensure type='Point'
// - If coordinates are missing/invalid, remove location entirely
businessSchema.pre('validate', function (next) {
  try {
    const loc = this?.address?.location;
    if (!loc || typeof loc !== 'object') return next();

    const coords = loc.coordinates;
    const validCoords =
      Array.isArray(coords) &&
      coords.length === 2 &&
      coords.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
      coords[0] >= -180 &&
      coords[0] <= 180 &&
      coords[1] >= -90 &&
      coords[1] <= 90;

    if (!validCoords) {
      if (this.address && typeof this.address === 'object') {
        this.address.location = undefined;
      }
      return next();
    }

    loc.type = 'Point';
    return next();
  } catch (e) {
    return next(e);
  }
});

// Virtual for public URL
businessSchema.virtual('publicUrl').get(function () {
  return `/shop/${this.slug}`;
});

// Method to check if business has active plan
businessSchema.methods.hasActivePlan = function () {
  return this.plan && this.planExpiresAt && new Date(this.planExpiresAt) > new Date();
};

// Method to increment stats
businessSchema.methods.incrementStat = async function (statName) {
  const fieldPath = `stats.${statName}`;
  await this.constructor.updateOne(
    { _id: this._id },
    { $inc: { [fieldPath]: 1 } }
  );

  // keep in-memory doc roughly in sync
  this.stats[statName] = (this.stats[statName] || 0) + 1;
};

const Business = mongoose.model('Business', businessSchema);

export default Business;
