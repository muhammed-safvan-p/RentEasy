const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

class UserController {
  async getMe(req, res) {
    try {
      res.status(200).json(req.user);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user info', error: error.message });
    }
  }

  async getMyVehicles(req, res) {
    try {
      const vehicles = await Vehicle.find({ ownerIds: req.user._id }).sort({ createdAt: -1 });
      
      const vehiclesWithStats = await Promise.all(vehicles.map(async (vehicle) => {
        const totalBookings = await Booking.countDocuments({ vehicleId: vehicle._id });
        const unpaidBookings = await Booking.countDocuments({ vehicleId: vehicle._id, isPaid: false });
        
        return {
          ...vehicle.toObject(),
          totalBookings,
          unpaidBookings
        };
      }));

      res.status(200).json(vehiclesWithStats);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user vehicles', error: error.message });
    }
  }

  async updatePassword(req, res) {
    try {
      const { newPassword, confirmPassword } = req.body;
      
      if (!newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'New password and confirm password are required' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }

      if (newPassword.length < 6 || newPassword.length > 8) {
        return res.status(400).json({ message: 'Password must be between 6 and 8 characters' });
      }

      const bcrypt = require('bcryptjs');
      const User = require('../models/User');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await User.findByIdAndUpdate(req.user._id, { password: hashedPassword });

      res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error updating password', error: error.message });
    }
  }
}

module.exports = new UserController();
