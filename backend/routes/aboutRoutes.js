import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getAboutPage, adminGetAboutPage, adminUpdateAboutPage } from '../controllers/aboutController.js';

const router = express.Router();

router.get('/', getAboutPage);

router.get('/admin', protect, authorize('admin'), adminGetAboutPage);
router.put('/admin', protect, authorize('admin'), adminUpdateAboutPage);

export default router;
