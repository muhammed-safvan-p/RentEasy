const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { uploadVehicleImage, deleteVehicleImage } = require('../controllers/uploadController');

// POST /api/upload/vehicle-image — upload and crop vehicle cover image
router.post('/vehicle-image', protect, uploadVehicleImage);

// POST /api/upload/delete-image — delete image by { publicId } or { imageUrl } in JSON body
router.post('/delete-image', protect, deleteVehicleImage);

// DELETE /api/upload/vehicle-image — delete image by ?imageUrl=... or ?publicId=... or path param
router.delete('/vehicle-image', protect, deleteVehicleImage);
router.delete('/vehicle-image/:publicId', protect, deleteVehicleImage);

module.exports = router;
