const userService = require('../services/userService');

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

  async updatePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await userService.updatePassword(req.user._id, currentPassword, newPassword);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
