import mongoose from 'mongoose';
import slugify from 'slugify';

/**
 * BUSINESS TYPE MODEL
 * Admin-managed business types: Kirana Store, Coaching Center, Restaurant, Room Rental, etc.
 * Used for categorizing businesses at registration
 */

const businessTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business type name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    icon: {
      type: String, // URL to icon/image
    },

    // Optional icon component name (e.g. a lucide-react icon name like "Store")
    iconName: {
      type: String,
      trim: true,
      maxlength: [80, 'Icon name cannot exceed 80 characters'],
    },
    // Suggested listing type for this business type
    suggestedListingType: {
      type: String,
      enum: ['product', 'service', 'food', 'course', 'rental'],
      default: 'product',
    },
    // Example categories that dukandar might create
    exampleCategories: [String],

    // Optional default media applied to newly created businesses of this type.
    // Businesses can later replace/remove these images on their own profile.
    defaultCoverImage: {
      type: String,
      trim: true,
      maxlength: [500, 'Default cover image URL cannot exceed 500 characters'],
    },
    defaultImages: [
      {
        type: String,
        trim: true,
        maxlength: [500, 'Default image URL cannot exceed 500 characters'],
      },
    ],

    // Default "Why Choose Us" points to auto-apply to newly created businesses of this type
    whyChooseUsTemplates: [
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
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active business types
businessTypeSchema.index({ isActive: 1, displayOrder: 1 });

// Auto-generate slug from name
businessTypeSchema.pre('save', async function (next) {
  if (!this.isModified('name') && this.slug) {
    return next();
  }

  try {
    let baseSlug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    let slug = baseSlug;
    let counter = 1;

    while (await mongoose.model('BusinessType').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
    next();
  } catch (error) {
    next(error);
  }
});

const BusinessType = mongoose.model('BusinessType', businessTypeSchema);

export default BusinessType;
