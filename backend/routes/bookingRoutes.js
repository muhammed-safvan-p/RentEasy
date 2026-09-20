const express = require('express');
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  bookingIdParamSchema,
  createBookingSchema,
  updateBookingSchema,
  cancelBookingSchema,
  recordPaymentSchema,
  listBookingsQuerySchema,
} = require('../validators/bookingValidator');

const router = express.Router();

router.use(protect); // Require auth for all booking routes

// Booking CRUD & operations
router.post('/', validate(createBookingSchema, 'body'), bookingController.createBooking);
router.get('/', validate(listBookingsQuerySchema, 'query'), bookingController.listBookings);
router.patch('/:id', validate(bookingIdParamSchema, 'params'), validate(updateBookingSchema, 'body'), bookingController.updateBooking);
router.put('/:id', validate(bookingIdParamSchema, 'params'), validate(updateBookingSchema, 'body'), bookingController.updateBooking);
router.post('/:id/cancel', validate(bookingIdParamSchema, 'params'), validate(cancelBookingSchema, 'body'), bookingController.cancelBooking);

// Booking payments
router.post('/:id/payments', validate(bookingIdParamSchema, 'params'), validate(recordPaymentSchema, 'body'), bookingController.recordPayment);
router.get('/:id/payments', validate(bookingIdParamSchema, 'params'), bookingController.listPayments);

module.exports = router;
