const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  adminVehicleParamSchema,
  adminUserParamSchema,
  addVehicleSchema,
  updateVehicleSchema,
  createUserSchema,
  updateUserSchema,
} = require('../validators/adminValidator');

const router = express.Router();

// Apply protect + adminOnly to all admin routes
router.use(protect, adminOnly);

router.get('/dashboard', adminController.dashboardGreeting);

// Vehicles
router.get('/vehicles', adminController.getVehicles);
router.post('/vehicles', validate(addVehicleSchema, 'body'), adminController.addVehicle);
router.get('/vehicles/:id', validate(adminVehicleParamSchema, 'params'), adminController.getVehicleById);
router.put('/vehicles/:id', validate(adminVehicleParamSchema, 'params'), validate(updateVehicleSchema, 'body'), adminController.updateVehicle);
router.delete('/vehicles/:id', validate(adminVehicleParamSchema, 'params'), adminController.deleteVehicle);
router.patch('/vehicles/:id/toggle', validate(adminVehicleParamSchema, 'params'), adminController.toggleVehicleActive);

// Users
router.get('/users/list', adminController.getUsersList);
router.get('/users', adminController.getUsers);
router.post('/users', validate(createUserSchema, 'body'), adminController.createUser);
router.put('/users/:id', validate(adminUserParamSchema, 'params'), validate(updateUserSchema, 'body'), adminController.updateUser);
router.delete('/users/:id', validate(adminUserParamSchema, 'params'), adminController.deleteUser);
router.patch('/users/:id/block', validate(adminUserParamSchema, 'params'), adminController.toggleUserBlock);

module.exports = router;
