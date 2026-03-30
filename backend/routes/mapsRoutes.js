import express from 'express';
import * as mapsController from '../controllers/mapsController.js';

const router = express.Router();

/**
 * MAPS ROUTES
 * Base: /api/maps
 */

router.get('/route', mapsController.getRoute);
router.post('/visit', mapsController.saveVisitorLocation);

export default router;
