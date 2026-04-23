/**
 * City Routes
 */

import { Router } from 'express';
import { cityController } from '../controllers/index.js';

const router = Router();

/**
 * GET /api/public/cities/:cityName/image
 * Get image for a specific city
 */
router.get('/:cityName/image', cityController.getCityImageEndpoint);

/**
 * POST /api/public/cities/images/batch
 * Get images for multiple cities
 */
router.post('/images/batch', cityController.getCityImagesBatch);

export default router;
