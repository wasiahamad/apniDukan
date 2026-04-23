import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { walletController } from '../controllers/index.js';

const router = express.Router();

// Customer
router.get('/me', protect, authorize('customer'), walletController.getMyWallet);
router.get('/transactions', protect, authorize('customer'), walletController.listMyWalletTransactions);
router.get('/withdrawals', protect, authorize('customer'), walletController.listMyWithdrawals);
router.post('/withdraw', protect, authorize('customer'), walletController.requestWithdrawal);

// Admin
router.get('/admin/metrics', protect, authorize('admin'), walletController.adminWalletMetrics);
router.get('/admin/withdrawals', protect, authorize('admin'), walletController.adminListWithdrawals);
router.patch('/admin/withdrawals/:id/approve', protect, authorize('admin'), walletController.adminApproveWithdrawal);
router.patch('/admin/withdrawals/:id/reject', protect, authorize('admin'), walletController.adminRejectWithdrawal);
router.get('/admin/customers', protect, authorize('admin'), walletController.adminListCustomerWallets);
router.get('/admin/transactions', protect, authorize('admin'), walletController.adminListWalletTransactions);

export default router;
