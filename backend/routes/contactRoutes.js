import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getPublicContactSettings,
  createContactMessage,
  adminGetContactSettings,
  adminUpdateContactSettings,
  adminListContactMessages,
  adminGetContactMessage,
  adminUpdateContactMessage,
} from '../controllers/contactController.js';

const router = express.Router();

// Public
router.get('/settings', getPublicContactSettings);
router.post('/messages', createContactMessage);

// Admin
router.get('/admin/settings', protect, authorize('admin'), adminGetContactSettings);
router.put('/admin/settings', protect, authorize('admin'), adminUpdateContactSettings);

router.get('/admin/messages', protect, authorize('admin'), adminListContactMessages);
router.get('/admin/messages/:id', protect, authorize('admin'), adminGetContactMessage);
router.patch('/admin/messages/:id', protect, authorize('admin'), adminUpdateContactMessage);

export default router;
