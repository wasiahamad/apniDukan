import cloudinary from '../config/cloudinary.js';
import User from '../models/User.js';

const hasCloudinaryConfig = () => {
  return (
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET
  );
};

// @desc    Upload a single image (Cloudinary)
// @route   POST /api/upload/image
// @access  Private
export const uploadImage = async (req, res) => {
  try {
    if (!hasCloudinaryConfig()) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary is not configured on the server',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const folder = req.body?.folder || 'apnidukan/listings';

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        alt: req.file.originalname,
      },
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading image',
    });
  }
};

// @desc    Upload customer/user avatar and save to profile
// @route   POST /api/upload/avatar
// @access  Private
export const uploadAvatar = async (req, res) => {
  try {
    if (!hasCloudinaryConfig()) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary is not configured on the server',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const roleFolder = req.user?.role === 'customer' ? 'customers' : 'users';
    const folder = `apnidukan/avatars/${roleFolder}`;

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ width: 512, height: 512, crop: 'limit' }],
        },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    const avatarUrl = result?.secure_url;
    if (!avatarUrl) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload avatar',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.profileImage = avatarUrl;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        url: avatarUrl,
        alt: req.file.originalname,
        user,
      },
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading avatar',
    });
  }
};
