const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  updatePasswordSchema,
  addUserVehicleSchema,
  updateUserVehicleSchema,
  updatePhoneSchema,
} = require('../validators/userValidator');
const { vehicleIdParamSchema } = require('../validators/vehicleValidator');

const router = express.Router();

router.use(protect); // Require auth for user routes

router.get('/me', userController.getMe);
router.patch('/me/phone', validate(updatePhoneSchema, 'body'), userController.updateMyPhone);
router.get('/users/list', userController.getUsersList);
router.get('/vehicles', userController.getMyVehicles);
router.post('/vehicles', validate(addUserVehicleSchema, 'body'), userController.addVehicle);
router.patch(
  '/vehicles/:id',
  validate(vehicleIdParamSchema, 'params'),
  validate(updateUserVehicleSchema, 'body'),
  userController.updateVehicle
);
router.put(
  '/vehicles/:id',
  validate(vehicleIdParamSchema, 'params'),
  validate(updateUserVehicleSchema, 'body'),
  userController.updateVehicle
);
router.put('/password', validate(updatePasswordSchema, 'body'), userController.updatePassword);

module.exports = router;
