const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const bookingController = require('../controllers/bookingController');
const { protect, authorizeVehicleAccess } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  vehicleIdParamSchema,
  addOperationalNoteSchema,
  deleteOperationalNoteParamSchema,
  getBookingsMonthQuerySchema,
  getCalendarQuerySchema,
} = require('../validators/vehicleValidator');

const router = express.Router({ mergeParams: true });

// Apply validation + protect + authorizeVehicleAccess to all vehicle routes
router.use('/:id', validate(vehicleIdParamSchema, 'params'), protect, authorizeVehicleAccess);

router.get('/:id', vehicleController.getVehicle);
router.get('/:id/stats', vehicleController.getVehicleStats);
router.get('/:id/status', vehicleController.getVehicleStatus);
router.get('/:id/bookings', validate(getBookingsMonthQuerySchema, 'query'), vehicleController.getVehicleBookings);
router.get('/:id/calendar', validate(getCalendarQuerySchema, 'query'), bookingController.getVehicleCalendar);
router.post('/:id/notes', validate(addOperationalNoteSchema, 'body'), vehicleController.addOperationalNote);
router.delete('/:id/notes/:noteId', validate(deleteOperationalNoteParamSchema, 'params'), vehicleController.deleteOperationalNote);

module.exports = router;
