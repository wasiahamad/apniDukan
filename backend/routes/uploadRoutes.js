import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import { uploadController } from '../controllers/index.js';
import { requireVerifiedBusinessOwnerForWrites } from '../middleware/verificationGate.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

/**
 * UPLOAD ROUTES
 * Base: /api/upload
 */
router.post('/image', protect, requireVerifiedBusinessOwnerForWrites, upload.single('file'), uploadController.uploadImage);

export default router;
