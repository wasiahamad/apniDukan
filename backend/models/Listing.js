import mongoose from 'mongoose';

/**
 * UNIVERSAL LISTING MODEL - Replaces Product Model
 * Supports: products, services, courses, food, rentals
 * Flexible: Uses dynamic attributes instead of hardcoded fields
 * REMOVES: productRam, size, productWeight, duplicate category fields
 * Multi-tenant: Every listing belongs to a business
 */

const listingSchema = new mongoose.Schema(
    {
        business: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Business',
            required: [true, 'Business reference is required'],
            index: true, // CRITICAL for multi-tenant queries
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            maxlength: [5000, 'Description cannot exceed 5000 characters'],
        },
        images: [
            {
                url: String,
                alt: String,
            },
        ],
        listingType: {
            type: String,
            required: [true, 'Listing type is required'],
            enum: ['product', 'service', 'course', 'food', 'rental'],
            index: true,
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
        priceType: {
            type: String,
            enum: ['fixed', 'per_day', 'per_month', 'per_hour', 'starting_from', 'inquiry'],
            default: 'fixed',
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            index: true,
        },
        // Flexible dynamic attributes - replaces hardcoded fields like productRam, size, etc.
        attributes: [
            {
                name: {
                    type: String,
                    required: true,
                },
                value: {
                    type: String,
                    required: true,
                },
            },
        ],

        // Pricing options (variants) - e.g., Half plate / Full plate, Basic / Premium, 1 hour / 2 hours
        pricingOptions: [
            {
                label: {
                    type: String,
                    required: true,
                    trim: true,
                },
                price: {
                    type: Number,
                    required: true,
                    min: [0, 'Price cannot be negative'],
                },
            },
        ],
        // Optional fields based on listing type
        stock: {
            type: Number,
            min: [0, 'Stock cannot be negative'],
        },
        sku: {
            type: String,
            trim: true,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        stats: {
            views: { type: Number, default: 0 },
            inquiries: { type: Number, default: 0 },
            bookings: { type: Number, default: 0 },
        },
    },
    {
        timestamps: true,
    }
);

// CRITICAL INDEXES for multi-tenant SaaS performance
listingSchema.index({ business: 1, isActive: 1 }); // Primary multi-tenant query
listingSchema.index({ business: 1, listingType: 1, isActive: 1 });
listingSchema.index({ business: 1, category: 1, isActive: 1 });
listingSchema.index({ category: 1, isActive: 1 });
listingSchema.index({ listingType: 1, isActive: 1 });
listingSchema.index({ isFeatured: 1, isActive: 1 });
listingSchema.index({ createdAt: -1 }); // For sorting by latest

// Text index for search functionality
listingSchema.index({ title: 'text', description: 'text' });

// Virtual for checking if listing is in stock (for products)
listingSchema.virtual('inStock').get(function () {
    if (this.listingType === 'product') {
        return this.stock !== undefined && this.stock > 0;
    }
    return true; // Services, courses, etc. are always "in stock"
});

// Method to increment stats
listingSchema.methods.incrementStat = async function (statName) {
    this.stats[statName] = (this.stats[statName] || 0) + 1;
    await this.save();
};

// Static method to get listings by business (multi-tenant scoped)
listingSchema.statics.getByBusiness = async function (businessId, filters = {}) {
    const query = { business: businessId, isActive: true, ...filters };
    return await this.find(query)
        .populate('category', 'name slug')
        .sort({ isFeatured: -1, createdAt: -1 })
        .lean();
};

// Static method for advanced filtering
listingSchema.statics.advancedFilter = async function (businessId, options = {}) {
    const {
        listingType,
        category,
        minPrice,
        maxPrice,
        search,
        page = 1,
        limit = 20,
        sort = '-createdAt',
    } = options;

    // Build query
    const query = { business: businessId, isActive: true };

    if (listingType) query.listingType = listingType;
    if (category) query.category = category;
    if (minPrice !== undefined || maxPrice !== undefined) {
        query.price = {};
        if (minPrice !== undefined) query.price.$gte = minPrice;
        if (maxPrice !== undefined) query.price.$lte = maxPrice;
    }
    if (search) {
        query.$text = { $search: search };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [listings, total] = await Promise.all([
        this.find(query)
            .populate('category', 'name slug')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query),
    ]);

    return {
        listings,
        pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
        },
    };
};

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;
