import express from 'express';
import {
  createCategory,
  getCategoriesByBusiness,
  getMyCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect } from '../middleware/auth.js';
import { requireVerifiedBusinessOwnerForWrites } from '../middleware/verificationGate.js';

const router = express.Router();

/**
 * CATEGORY ROUTES - Business-scoped
 * Base: /api/categories
 * Dukandar creates categories for their products/services
 */

// Public routes
router.get('/business/:businessId', getCategoriesByBusiness);
router.get('/:id', getCategoryById);

// Protected routes (business owner)
router.post('/', protect, requireVerifiedBusinessOwnerForWrites, createCategory);
router.get('/my/:businessId', protect, getMyCategories);
router.put('/:id', protect, requireVerifiedBusinessOwnerForWrites, updateCategory);
router.delete('/:id', protect, requireVerifiedBusinessOwnerForWrites, deleteCategory);

export default router;
