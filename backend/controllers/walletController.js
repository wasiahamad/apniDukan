import mongoose from 'mongoose';
import { User, WalletTransaction, WithdrawalRequest } from '../models/index.js';

const MIN_WITHDRAWAL = Number(process.env.WALLET_MIN_WITHDRAWAL || 100);

const parseAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
};

// @desc    Customer: get wallet overview
// @route   GET /api/wallet/me
// @access  Private (customer)
export const getMyWallet = async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can access wallet' });
    }

    const user = await User.findById(req.user._id).select('walletBalance');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.status(200).json({ success: true, data: { walletBalance: Number(user.walletBalance || 0) } });
  } catch (error) {
    console.error('Get my wallet error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching wallet' });
  }
};

// @desc    Customer: list wallet transactions
// @route   GET /api/wallet/transactions
// @access  Private (customer)
export const listMyWalletTransactions = async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can access wallet' });
    }

    const rows = await WalletTransaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('List my wallet transactions error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching transactions' });
  }
};

// @desc    Customer: list my withdrawal requests
// @route   GET /api/wallet/withdrawals
// @access  Private (customer)
export const listMyWithdrawals = async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can access wallet' });
    }

    const rows = await WithdrawalRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('List my withdrawals error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching withdrawals' });
  }
};

// @desc    Customer: request withdrawal
// @route   POST /api/wallet/withdraw
// @access  Private (customer)
export const requestWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can withdraw' });
    }

    const { amount, accountHolderName, bankName, accountNumber, IFSC, ifsc } = req.body || {};
    const a = parseAmount(amount);

    if (!a || a <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    if (a < MIN_WITHDRAWAL) {
      return res.status(400).json({ success: false, message: `Minimum withdrawal is ₹${MIN_WITHDRAWAL}` });
    }

    const ifscValue = String(IFSC || ifsc || '').trim().toUpperCase();

    if (!accountHolderName || !bankName || !accountNumber || !ifscValue) {
      return res.status(400).json({ success: false, message: 'Bank details are required' });
    }

    const user = await User.findById(req.user._id).select('walletBalance');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (Number(user.walletBalance || 0) < a) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    session.startTransaction();

    const withdrawal = await WithdrawalRequest.create(
      [
        {
          user: user._id,
          amount: a,
          bankDetails: {
            accountHolderName: String(accountHolderName).trim(),
            bankName: String(bankName).trim(),
            accountNumber: String(accountNumber).trim(),
            ifsc: ifscValue,
          },
          status: 'pending',
        },
      ],
      { session }
    );

    const withdrawalDoc = withdrawal[0];

    await User.updateOne({ _id: user._id }, { $inc: { walletBalance: -a } }, { session });

    await WalletTransaction.create(
      [
        {
          user: user._id,
          amount: a,
          type: 'debit',
          source: 'withdrawal',
          status: 'pending',
          referenceId: String(withdrawalDoc._id),
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: 'Withdrawal request created',
      data: withdrawalDoc,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Request withdrawal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error creating withdrawal request' });
  } finally {
    session.endSession();
  }
};

// ---------------------- ADMIN ----------------------

// @desc    Admin: list withdrawal requests
// @route   GET /api/wallet/admin/withdrawals
// @access  Private (admin)
export const adminListWithdrawals = async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status && ['pending', 'approved', 'rejected'].includes(String(status))) {
      query.status = String(status);
    }

    const rows = await WithdrawalRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('user', 'name email phone referralCode walletBalance')
      .populate('processedBy', 'name email')
      .lean();

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Admin list withdrawals error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching withdrawals' });
  }
};

// @desc    Admin: approve withdrawal
// @route   PATCH /api/wallet/admin/withdrawals/:id/approve
// @access  Private (admin)
export const adminApproveWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;

    session.startTransaction();

    const w = await WithdrawalRequest.findById(id).session(session);
    if (!w) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (w.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Withdrawal is not pending' });
    }

    w.status = 'approved';
    w.processedAt = new Date();
    w.processedBy = req.user._id;
    await w.save({ session });

    await WalletTransaction.updateOne(
      { user: w.user, source: 'withdrawal', type: 'debit', referenceId: String(w._id) },
      { $set: { status: 'completed' } },
      { session }
    );

    await session.commitTransaction();

    const populated = await WithdrawalRequest.findById(w._id)
      .populate('user', 'name email phone referralCode walletBalance')
      .populate('processedBy', 'name email')
      .lean();

    return res.status(200).json({ success: true, message: 'Withdrawal approved', data: populated });
  } catch (error) {
    await session.abortTransaction();
    console.error('Admin approve withdrawal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error approving withdrawal' });
  } finally {
    session.endSession();
  }
};

// @desc    Admin: reject withdrawal (refunds wallet)
// @route   PATCH /api/wallet/admin/withdrawals/:id/reject
// @access  Private (admin)
export const adminRejectWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    session.startTransaction();

    const w = await WithdrawalRequest.findById(id).session(session);
    if (!w) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (w.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Withdrawal is not pending' });
    }

    w.status = 'rejected';
    w.processedAt = new Date();
    w.processedBy = req.user._id;
    w.rejectionReason = String(reason || '').trim() || undefined;
    await w.save({ session });

    // Mark debit txn as rejected
    await WalletTransaction.updateOne(
      { user: w.user, source: 'withdrawal', type: 'debit', referenceId: String(w._id) },
      { $set: { status: 'rejected' } },
      { session }
    );

    // Refund wallet
    await User.updateOne({ _id: w.user }, { $inc: { walletBalance: Number(w.amount || 0) } }, { session });

    await WalletTransaction.create(
      [
        {
          user: w.user,
          amount: Number(w.amount || 0),
          type: 'credit',
          source: 'withdrawal',
          status: 'completed',
          referenceId: String(w._id),
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const populated = await WithdrawalRequest.findById(w._id)
      .populate('user', 'name email phone referralCode walletBalance')
      .populate('processedBy', 'name email')
      .lean();

    return res.status(200).json({ success: true, message: 'Withdrawal rejected', data: populated });
  } catch (error) {
    await session.abortTransaction();
    console.error('Admin reject withdrawal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error rejecting withdrawal' });
  } finally {
    session.endSession();
  }
};

// @desc    Admin: list customers with wallet balances
// @route   GET /api/wallet/admin/customers
// @access  Private (admin)
export const adminListCustomerWallets = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const q = String(search || '').trim();

    const filter = { role: 'customer' };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { referralCode: { $regex: q, $options: 'i' } },
      ];
    }

    const rows = await User.find(filter)
      .sort({ walletBalance: -1, createdAt: -1 })
      .select('name email phone referralCode walletBalance createdAt')
      .limit(200)
      .lean();

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Admin list customer wallets error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching wallets' });
  }
};

// @desc    Admin: list wallet transactions (optional by user)
// @route   GET /api/wallet/admin/transactions
// @access  Private (admin)
export const adminListWalletTransactions = async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = {};
    if (userId) filter.user = userId;

    const rows = await WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('user', 'name email phone referralCode')
      .lean();

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Admin list wallet transactions error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching transactions' });
  }
};

// @desc    Admin: wallet + withdrawal metrics
// @route   GET /api/wallet/admin/metrics
// @access  Private (admin)
export const adminWalletMetrics = async (req, res) => {
  try {
    const [pendingAgg] = await Promise.all([
      WithdrawalRequest.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
      ]),
    ]);

    const pendingWithdrawals = pendingAgg?.[0]?.count || 0;
    const pendingWithdrawalsAmount = pendingAgg?.[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: {
        pendingWithdrawals,
        pendingWithdrawalsAmount,
      },
    });
  } catch (error) {
    console.error('Admin wallet metrics error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching wallet metrics' });
  }
};
