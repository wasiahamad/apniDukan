import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['referral', 'withdrawal'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'rejected'],
      default: 'completed',
      index: true,
    },
    referenceId: {
      type: String,
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ source: 1, referenceId: 1 });

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

export default WalletTransaction;
