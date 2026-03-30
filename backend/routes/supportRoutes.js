import express from 'express';
import { supportController } from '../controllers/index.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * SUPPORT ROUTES
 * Base: /api/support
 */

// Dukandar routes
router.post('/tickets', protect, supportController.createTicket);
router.get('/tickets', protect, supportController.listMyTickets);
router.get('/tickets/:id', protect, supportController.getTicket);
router.post('/tickets/:id/messages', protect, supportController.addMyMessage);

// Admin routes
router.get('/admin/tickets', protect, authorize('admin'), supportController.adminListTickets);
router.get('/admin/tickets/:id', protect, authorize('admin'), supportController.adminGetTicket);
router.patch('/admin/tickets/:id', protect, authorize('admin'), supportController.adminUpdateTicket);
router.post('/admin/tickets/:id/messages', protect, authorize('admin'), supportController.adminAddMessage);

export default router;
