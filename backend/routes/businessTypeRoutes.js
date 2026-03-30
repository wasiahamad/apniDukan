import express from 'express';
import {
  getAllBusinessTypes,
  getAllBusinessTypesAdmin,
  getBusinessType,
  createBusinessType,
  updateBusinessType,
  deleteBusinessType,
  generateWhyChooseUsTemplatesAI,
} from '../controllers/businessTypeController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllBusinessTypes);

// Admin list route (must come before /:identifier)
router.get('/admin/all', protect, authorize('admin'), getAllBusinessTypesAdmin);

router.get('/:identifier', getBusinessType);

// Admin-only routes
router.use(protect, authorize('admin'));
router.post('/:id/why-choose-us/generate', generateWhyChooseUsTemplatesAI);
router.post('/', createBusinessType);
router.put('/:id', updateBusinessType);
router.delete('/:id', deleteBusinessType);

export default router;
