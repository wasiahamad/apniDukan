import mongoose from 'mongoose';

/**
 * INVOICE COUNTER - Yearly sequential invoice number generator
 * Example: INV-2026-0001
 */

const invoiceCounterSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const InvoiceCounter = mongoose.model('InvoiceCounter', invoiceCounterSchema);

export default InvoiceCounter;
