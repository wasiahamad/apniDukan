import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { updateLocation } from '../controllers/locationController.js';

const router = express.Router();

/**
 * LOCATION ROUTES
 * Base: /api/location
 */
router.post('/update', optionalAuth, updateLocation);
router.put('/update', optionalAuth, updateLocation);

export default router;
