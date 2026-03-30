import express from 'express';
import { invoiceController } from '../controllers/index.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireOwnerFeature } from '../middleware/entitlements.js';

const router = express.Router();

/**
 * INVOICE ROUTES
 * Base: /api/invoices
 */

// Owner routes
router.get('/', protect, authorize('business_owner'), requireOwnerFeature('invoicesEnabled'), invoiceController.listMyInvoices);
// Admin routes
router.get('/admin', protect, authorize('admin'), invoiceController.adminListInvoices);

// Shared routes (owner/admin)
router.get('/:id', protect, authorize('business_owner', 'admin'), requireOwnerFeature('invoicesEnabled'), invoiceController.getInvoice);
router.get('/:id/pdf', protect, authorize('business_owner', 'admin'), requireOwnerFeature('invoicesEnabled'), invoiceController.downloadInvoicePdf);

export default router;
