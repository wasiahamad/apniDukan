import express from 'express';
import multer from 'multer';
import { storyController } from '../controllers/index.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireVerifiedBusinessOwnerForWrites } from '../middleware/verificationGate.js';
import { requireOwnerFeature } from '../middleware/entitlements.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Stories/Reels can be video, so allow a larger size than image uploads.
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter: (req, file, cb) => {
    const type = file.mimetype || '';
    if (!(type.startsWith('image/') || type.startsWith('video/'))) {
      return cb(new Error('Only image/video uploads are allowed'));
    }
    cb(null, true);
  },
});

/**
 * STORIES ROUTES
 * Required endpoints:
 * - POST /api/story
 * - GET  /api/stories
 */
router.post(
  '/story',
  protect,
  requireVerifiedBusinessOwnerForWrites,
  requireOwnerFeature('storiesEnabled'),
  upload.single('file'),
  storyController.createStory
);

// Public feed of active stories/reels (optionally filtered by businessId)
router.get('/stories', storyController.getStories);

// Admin feed: includes deleted/expired for backup
router.get('/admin/stories', protect, authorize('admin'), storyController.getStoriesAdmin);

// Create Story/Reel from an existing listing (auto link)
router.post(
  '/stories/from-listing',
  protect,
  requireVerifiedBusinessOwnerForWrites,
  requireOwnerFeature('storiesEnabled'),
  requireOwnerFeature('listingStoriesEnabled'),
  upload.single('file'),
  storyController.createStoryFromListing
);

router.post('/stories/:id/view', protect, storyController.markStoryViewed);

router.get('/stories/:id/viewers', protect, storyController.getStoryViewers);

// Update/delete story metadata (owner or admin)
router.patch(
  '/stories/:id',
  protect,
  requireVerifiedBusinessOwnerForWrites,
  requireOwnerFeature('storiesEnabled'),
  storyController.updateStory
);

router.delete(
  '/stories/:id',
  protect,
  requireVerifiedBusinessOwnerForWrites,
  requireOwnerFeature('storiesEnabled'),
  storyController.deleteStory
);

export default router;
