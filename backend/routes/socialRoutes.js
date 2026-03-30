import express from 'express';
import { protect } from '../middleware/auth.js';
import { socialController } from '../controllers/index.js';
import { requireVerifiedBusinessOwnerForWrites } from '../middleware/verificationGate.js';

const router = express.Router();

// Get provider authorization URL (requires login)
router.get('/oauth/:platform/url', protect, socialController.getOAuthUrl);

// Connect YouTube directly using frontend Google access token (avoids redirect URI mismatch)
router.post('/oauth/youtube/connect-token', protect, requireVerifiedBusinessOwnerForWrites, socialController.connectYoutubeWithAccessToken);

// OAuth callback (public)
router.get('/oauth/:platform/callback', socialController.oauthCallback);

export default router;
