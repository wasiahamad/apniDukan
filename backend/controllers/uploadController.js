import cloudinary from '../config/cloudinary.js';

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
