const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { updatePasswordSchema } = require('../validators/userValidator');

const router = express.Router();

router.use(protect); // Require auth for user routes

router.get('/me', userController.getMe);
router.get('/vehicles', userController.getMyVehicles);
router.put('/password', validate(updatePasswordSchema, 'body'), userController.updatePassword);

module.exports = router;
