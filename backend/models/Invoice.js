import mongoose from 'mongoose';

/**
 * INVOICE MODEL - Payment invoices generated on successful plan purchase
 */

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    planSnapshot: {
      planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
      name: { type: String, required: true },
      slug: { type: String, required: true },
      price: { type: Number, required: true },
      durationInDays: { type: Number, required: true },
      features: {
        maxListings: { type: Number, required: true },
        bookingEnabled: { type: Boolean, default: false },
        featuredEnabled: { type: Boolean, default: false },
        maxFeaturedListings: { type: Number, default: 0 },
        customDomain: { type: Boolean, default: false },
        analyticsEnabled: { type: Boolean, default: false },
        prioritySupport: { type: Boolean, default: false },
        whatsappIntegration: { type: Boolean, default: true },
        removeWatermark: { type: Boolean, default: false },
        seoTools: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
      },
    },

    periodStart: {
      type: Date,
      required: true,
      index: true,
    },
    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },

    paymentProvider: {
      type: String,
      default: 'razorpay',
      index: true,
    },
    payment: {
      orderId: { type: String, index: true },
      paymentId: { type: String, unique: true, sparse: true, index: true },
      signature: { type: String },
      method: { type: String },
      status: { type: String },
      email: { type: String },
      contact: { type: String },
      vpa: { type: String },
      bank: { type: String },
      wallet: { type: String },
      cardNetwork: { type: String },
      cardLast4: { type: String },
    },

    status: {
      type: String,
      enum: ['paid', 'pending', 'failed'],
      default: 'paid',
      index: true,
    },

    issuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ owner: 1, issuedAt: -1 });
invoiceSchema.index({ business: 1, issuedAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
