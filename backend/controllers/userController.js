const userService = require('../services/userService');
const adminService = require('../services/adminService');
const AppError = require('../utils/AppError');

class UserController {
  async getMe(req, res, next) {
    try {
      const user = await userService.getMe(req.user._id);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async getMyVehicles(req, res, next) {
    try {
      const vehiclesWithStats = await userService.getMyVehicles(req.user._id);
      res.status(200).json(vehiclesWithStats);
    } catch (error) {
      next(error);
    }
  }

  async addVehicle(req, res, next) {
    try {
      const { ownerIds = [], ...rest } = req.body;
      const currentUserIdStr = req.user._id.toString();
      const rawOwners = Array.isArray(ownerIds) ? ownerIds : [];
      // Always include current user and avoid duplicates
      const mergedOwners = Array.from(new Set([currentUserIdStr, ...rawOwners]));

      const vehicleData = {
        ...rest,
        ownerIds: mergedOwners,
      };
      const vehicle = await adminService.addVehicle(vehicleData, req.user._id);
      res.status(201).json(vehicle);
    } catch (error) {
      next(error);
    }
  }

  async updateVehicle(req, res, next) {
    try {
      const vehicle = await userService.updateVehicle(
        req.params.id,
        req.user._id,
        req.body,
        req.user.role
      );
      res.status(200).json(vehicle);
    } catch (error) {
      next(error);
    }
  }

  async getUsersList(req, res, next) {
    try {
      const users = await userService.getUsersList();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  async updatePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await userService.updatePassword(req.user._id, currentPassword, newPassword);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateMyPhone(req, res, next) {
    try {
      const { phone } = req.body;
      const result = await userService.updatePhone(req.user._id, phone);
      res.status(200).json(result);
    } catch (error) {
      if (error.code === 11000) {
        return next(
          new AppError('This phone number is already registered with another account.', 409)
        );
      }
      next(error);
    }
  }
}

module.exports = new UserController();
