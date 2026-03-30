import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
    },
    pricingOptionLabel: {
      type: String,
      trim: true,
      maxlength: [120, 'Pricing option label cannot exceed 120 characters'],
    },
    title: {
      type: String,
      trim: true,
      required: [true, 'Item title is required'],
      maxlength: [200, 'Item title cannot exceed 200 characters'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price must be >= 0'],
    },
    lineTotal: {
      type: Number,
      required: true,
      min: [0, 'Line total must be >= 0'],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    orderNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    source: {
      type: String,
      enum: ['website', 'whatsapp', 'manual'],
      default: 'website',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    customer: {
      name: {
        type: String,
        trim: true,
        maxlength: [120, 'Customer name cannot exceed 120 characters'],
        default: 'Customer',
      },
      phone: {
        type: String,
        trim: true,
        maxlength: [30, 'Customer phone cannot exceed 30 characters'],
      },
      address: {
        type: String,
        trim: true,
        maxlength: [400, 'Customer address cannot exceed 400 characters'],
      },
      note: {
        type: String,
        trim: true,
        maxlength: [800, 'Customer note cannot exceed 800 characters'],
      },
    },
    items: {
      type: [orderItemSchema],
      validate: [
        (v) => Array.isArray(v) && v.length > 0,
        'Order must have at least one item',
      ],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal must be >= 0'],
    },
    deliveryCharges: {
      type: Number,
      default: 0,
      min: [0, 'Delivery charges must be >= 0'],
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total must be >= 0'],
    },
  },
  { timestamps: true }
);

orderSchema.index({ business: 1, orderId: 1 }, { unique: true });

const Order = mongoose.model('Order', orderSchema);

export default Order;
