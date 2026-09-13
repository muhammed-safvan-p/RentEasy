const express = require('express');
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Require auth for booking routes

router.patch('/:id/pay', bookingController.markAsPaid);

module.exports = router;
