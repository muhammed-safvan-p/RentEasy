const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Require auth for user routes

router.get('/me', userController.getMe);
router.get('/vehicles', userController.getMyVehicles);
router.put('/password', userController.updatePassword);

module.exports = router;
