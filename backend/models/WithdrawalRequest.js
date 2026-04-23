import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema(
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
    bankDetails: {
      accountHolderName: { type: String, required: true, trim: true, maxlength: 120 },
      bankName: { type: String, required: true, trim: true, maxlength: 120 },
      accountNumber: { type: String, required: true, trim: true, maxlength: 40 },
      ifsc: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true }
);

withdrawalRequestSchema.index({ status: 1, createdAt: -1 });

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);

export default WithdrawalRequest;
