const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect + adminOnly to all admin routes
router.use(protect, adminOnly);

router.get('/dashboard', adminController.dashboardGreeting);

// Vehicles
router.get('/vehicles', adminController.getVehicles);
router.post('/vehicles', adminController.addVehicle);
router.get('/vehicles/:id', adminController.getVehicleById);
router.put('/vehicles/:id', adminController.updateVehicle);
router.patch('/vehicles/:id/toggle', adminController.toggleVehicleActive);

// Users
router.get('/users/list', adminController.getUsersList);
router.get('/users', adminController.getUsers);
router.patch('/users/:id/block', adminController.toggleUserBlock);

module.exports = router;
