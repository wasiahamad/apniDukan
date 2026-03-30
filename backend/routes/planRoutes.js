import express from 'express';
import { planController } from '../controllers/index.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * PLAN ROUTES
 * Base: /api/plans
 */

// Public routes
router.get('/', optionalAuth, planController.getAllPlans);
router.get('/slug/:slug', optionalAuth, planController.getPlanBySlug);
router.get('/:id', planController.getPlanById);

// Protected routes
router.post('/:id/subscribe', protect, planController.subscribeToPlan);

// Admin routes
router.post('/', protect, authorize('admin'), planController.createPlan);
router.put('/:id', protect, authorize('admin'), planController.updatePlan);
router.delete('/:id', protect, authorize('admin'), planController.deletePlan);

export default router;
