const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const { protect, authorizeVehicleAccess } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

// Apply protect + authorizeVehicleAccess to all vehicle routes
router.use('/:id', protect, authorizeVehicleAccess);

router.get('/:id', vehicleController.getVehicle);
router.get('/:id/stats', vehicleController.getVehicleStats);
router.get('/:id/status', vehicleController.getVehicleStatus);
router.get('/:id/bookings', vehicleController.getVehicleBookings);
router.post('/:id/notes', vehicleController.addOperationalNote);
router.delete('/:id/notes/:noteId', vehicleController.deleteOperationalNote);

module.exports = router;
