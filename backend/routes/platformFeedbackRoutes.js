import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createPlatformFeedback,
  getPlatformFeedbackStats,
  adminListPlatformFeedback,
} from '../controllers/platformFeedbackController.js';

const router = express.Router();

// Public stats for homepage etc.
router.get('/stats', getPlatformFeedbackStats);

// Authenticated submit
router.post('/', protect, createPlatformFeedback);

// Admin listing
router.get('/admin', protect, authorize('admin'), adminListPlatformFeedback);

export default router;
