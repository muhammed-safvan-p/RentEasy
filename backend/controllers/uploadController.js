const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');

// Multer memory storage (holds image in RAM buffer before streaming to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WEBP images are allowed.'), false);
    }
  },
});

/**
 * Helper to upload a buffer to Cloudinary using upload_stream
 */
const streamUploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'renteasy/vehicles',
        transformation: [
          { width: 1200, height: 800, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * POST /api/upload/vehicle-image
 * Auth-protected. Accepts a single image file field named "image".
 * Returns: { url: string, publicId: string }
 */
const uploadVehicleImage = (req, res, _next) => {
  upload.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(400)
          .json({ message: 'File is too large. Maximum allowed size is 10 MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message || 'Invalid file upload.' });
    }

    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ message: 'No image file provided. Please choose a JPG, PNG, or WEBP photo.' });
    }

    try {
      const result = await streamUploadToCloudinary(req.file.buffer);
      return res.status(200).json({
        url: result.secure_url,
        publicId: result.public_id,
      });
    } catch (uploadErr) {
      console.error('Cloudinary upload stream error:', uploadErr);
      return res.status(500).json({
        message: uploadErr.message || 'Failed to upload image to Cloudinary.',
      });
    }
  });
};

/**
 * Helper to extract Cloudinary public_id from either a raw publicId or a Cloudinary URL.
 * Strictly scopes extraction to the 'renteasy/vehicles/' folder to prevent IDOR attacks.
 */
function extractPublicId(input) {
  if (!input || typeof input !== 'string') return null;
  const decoded = decodeURIComponent(input).trim();
  const match = decoded.match(/(renteasy\/vehicles\/[^./?#]+)/);
  if (match && match[1]) {
    return match[1];
  }
  if (decoded.startsWith('renteasy/vehicles/')) {
    return decoded.replace(/\.[a-zA-Z0-9]+$/, '');
  }
  return null;
}

/**
 * DELETE /api/upload/vehicle-image or POST /api/upload/delete-image
 * Auth-protected. Deletes an image from Cloudinary by its publicId or full imageUrl.
 */
const deleteVehicleImage = async (req, res) => {
  try {
    const rawTarget =
      req.body?.publicId ||
      req.body?.imageUrl ||
      req.query?.publicId ||
      req.query?.imageUrl ||
      req.params?.publicId;

    if (!rawTarget) {
      return res.status(400).json({ message: 'publicId or imageUrl is required.' });
    }

    const publicId = extractPublicId(rawTarget);
    if (!publicId || !publicId.startsWith('renteasy/vehicles/')) {
      return res.status(400).json({ message: 'Invalid or unauthorized image identifier.' });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok' || result.result === 'not found') {
      return res.status(200).json({ message: 'Image removed from Cloudinary successfully.' });
    }

    return res.status(400).json({ message: 'Failed to delete image from cloud.', detail: result });
  } catch (err) {
    return res.status(500).json({ message: 'Server error deleting image.', error: err.message });
  }
};

module.exports = { uploadVehicleImage, deleteVehicleImage };
