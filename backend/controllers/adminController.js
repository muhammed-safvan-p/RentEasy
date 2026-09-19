const adminService = require('../services/adminService');

class AdminController {
  dashboardGreeting(req, res, next) {
    try {
      res.status(200).json({
        message: `Welcome to the Admin Dashboard, ${req.user.username}!`,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/vehicles
  async getVehicles(req, res, next) {
    try {
      const vehicles = await adminService.getVehicles();
      res.status(200).json(vehicles);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/vehicles
  async addVehicle(req, res, next) {
    try {
      const vehicle = await adminService.addVehicle(req.body, req.user._id);
      res.status(201).json(vehicle);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/admin/vehicles/:id/toggle
  async toggleVehicleActive(req, res, next) {
    try {
      const result = await adminService.toggleVehicleActive(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/vehicles/:id
  async getVehicleById(req, res, next) {
    try {
      const vehicle = await adminService.getVehicleById(req.params.id);
      res.status(200).json(vehicle);
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/admin/vehicles/:id
  async updateVehicle(req, res, next) {
    try {
      const vehicle = await adminService.updateVehicle(req.params.id, req.body);
      res.status(200).json(vehicle);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/users/list
  async getUsersList(req, res, next) {
    try {
      const users = await adminService.getUsersList();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/users
  async getUsers(req, res, next) {
    try {
      const users = await adminService.getUsers();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/admin/users/:id/block
  async toggleUserBlock(req, res, next) {
    try {
      const result = await adminService.toggleUserBlock(req.params.id, req.user._id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
