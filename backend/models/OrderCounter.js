import mongoose from 'mongoose';

const orderCounterSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      unique: true,
      index: true,
    },
    seq: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

const OrderCounter = mongoose.model('OrderCounter', orderCounterSchema);

export default OrderCounter;
