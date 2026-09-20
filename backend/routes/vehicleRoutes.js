const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const bookingController = require('../controllers/bookingController');
const lockController = require('../controllers/lockController');
const dealerController = require('../controllers/dealerController');
const { protect, authorizeVehicleAccess } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  vehicleIdParamSchema,
  addOperationalNoteSchema,
  deleteOperationalNoteParamSchema,
  getBookingsMonthQuerySchema,
  getCalendarQuerySchema,
} = require('../validators/vehicleValidator');
const {
  createLockSchema,
  lockIdParamSchema,
  getLocksMonthQuerySchema,
} = require('../validators/lockValidator');
const {
  createDealerSchema,
  updateDealerSchema,
  dealerIdParamSchema,
} = require('../validators/dealerValidator');

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

// Lock routes
router.post('/:id/locks', validate(createLockSchema, 'body'), lockController.createLock);
router.get('/:id/locks', validate(getLocksMonthQuerySchema, 'query'), lockController.getLocks);
router.delete('/:id/locks/:lockId', validate(lockIdParamSchema, 'params'), lockController.deleteLock);

// Dealer routes
router.post('/:id/dealers', validate(createDealerSchema, 'body'), dealerController.createDealer);
router.get('/:id/dealers', dealerController.getDealers);
router.patch('/:id/dealers/:dealerId', validate(dealerIdParamSchema, 'params'), validate(updateDealerSchema, 'body'), dealerController.updateDealer);
router.delete('/:id/dealers/:dealerId', validate(dealerIdParamSchema, 'params'), dealerController.deleteDealer);

module.exports = router;
