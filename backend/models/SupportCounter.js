import mongoose from 'mongoose';

const supportCounterSchema = new mongoose.Schema(
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

const SupportCounter = mongoose.model('SupportCounter', supportCounterSchema);

export default SupportCounter;
