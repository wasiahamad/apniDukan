import express from 'express';
import { aiController } from '../controllers/index.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * AI ROUTES
 * Base: /api/ai
 */

// Public customer chatbot
router.post('/chat', aiController.chat);

// Dukandar content generator (business_owner/admin)
router.post('/generate', protect, authorize('business_owner', 'admin'), aiController.generate);

// Business insights (business_owner/admin)
router.post('/insights', protect, authorize('business_owner', 'admin'), aiController.insights);

export default router;
