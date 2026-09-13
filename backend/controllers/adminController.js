const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

class AdminController {
  dashboardGreeting(req, res) {
    try {
      res.status(200).json({
        message: `Welcome to the Admin Dashboard, ${req.user.username}!`,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching admin dashboard' });
    }
  }

  // GET /api/admin/vehicles
  async getVehicles(req, res) {
    try {
      const vehicles = await Vehicle.find()
        .populate('ownerIds', 'username')
        .sort({ createdAt: -1 });
      res.status(200).json(vehicles);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching vehicles', error: error.message });
    }
  }

  // POST /api/admin/vehicles
  async addVehicle(req, res) {
    try {
      const { name, plateNumber, ownerIds, notes, initialCashBalance, initialBankBalance } = req.body;

      if (!name || !plateNumber) {
        return res.status(400).json({ message: 'Name and Plate Number are required' });
      }

      // Check if plate exists
      const existing = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase() });
      if (existing) {
        return res.status(400).json({ message: 'Vehicle with this plate number already exists' });
      }

      const vehicle = new Vehicle({
        name,
        plateNumber,
        ownerIds: ownerIds || [],
        notes
      });

      await vehicle.save();
      
      // Auto-create Wallet for the new vehicle
      const Wallet = require('../models/Wallet');
      const WalletTransaction = require('../models/WalletTransaction');
      const walletService = require('../services/walletService');

      const cashBalance = Number(initialCashBalance) || 0;
      const bankBalance = Number(initialBankBalance) || 0;

      const wallet = new Wallet({ 
        vehicleId: vehicle._id,
        cashBalance: 0,
        bankBalance: 0
      });
      await wallet.save();

      if (cashBalance > 0) {
        const tx = new WalletTransaction({
          walletId: wallet._id,
          vehicleId: vehicle._id,
          type: 'income',
          paymentMethod: 'cash',
          amount: cashBalance,
          note: 'Initial cash balance',
          source: 'manual',
          createdBy: req.user._id,
        });
        await tx.save();
        await walletService.applyTransaction(null, wallet, 'income', 'cash', cashBalance);
      }

      if (bankBalance > 0) {
        const tx = new WalletTransaction({
          walletId: wallet._id,
          vehicleId: vehicle._id,
          type: 'income',
          paymentMethod: 'bank',
          amount: bankBalance,
          note: 'Initial bank balance',
          source: 'manual',
          createdBy: req.user._id,
        });
        await tx.save();
        await walletService.applyTransaction(null, wallet, 'income', 'bank', bankBalance);
      }

      res.status(201).json(vehicle);
    } catch (error) {
      res.status(500).json({ message: 'Error adding vehicle', error: error.message });
    }
  }

  // PATCH /api/admin/vehicles/:id/toggle
  async toggleVehicleActive(req, res) {
    try {
      const vehicle = await Vehicle.findById(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      vehicle.isActive = !vehicle.isActive;
      await vehicle.save();
      res.status(200).json({ isActive: vehicle.isActive, message: `Vehicle ${vehicle.isActive ? 'activated' : 'deactivated'}` });
    } catch (error) {
      res.status(500).json({ message: 'Error toggling vehicle status', error: error.message });
    }
  }

  // GET /api/admin/vehicles/:id
  async getVehicleById(req, res) {
    try {
      const vehicle = await Vehicle.findById(req.params.id).populate('ownerIds', 'username');
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.status(200).json(vehicle);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching vehicle', error: error.message });
    }
  }

  // PUT /api/admin/vehicles/:id
  async updateVehicle(req, res) {
    try {
      const { name, plateNumber, ownerIds, notes } = req.body;
      const vehicle = await Vehicle.findById(req.params.id);

      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      if (!name || !plateNumber) {
        return res.status(400).json({ message: 'Name and Plate Number are required' });
      }

      // Check if plate exists and belongs to a different vehicle
      if (plateNumber.toUpperCase() !== vehicle.plateNumber) {
        const existing = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase() });
        if (existing) {
          return res.status(400).json({ message: 'Vehicle with this plate number already exists' });
        }
      }

      vehicle.name = name;
      vehicle.plateNumber = plateNumber;
      vehicle.ownerIds = ownerIds || [];
      vehicle.notes = notes || '';

      await vehicle.save();
      res.status(200).json(vehicle);
    } catch (error) {
      res.status(500).json({ message: 'Error updating vehicle', error: error.message });
    }
  }

  // GET /api/admin/users/list
  async getUsersList(req, res) {
    try {
      const users = await User.find().select('username _id');
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
  }

  // GET /api/admin/users
  async getUsers(req, res) {
    try {
      const users = await User.find().select('-password').sort({ createdAt: -1 });
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
  }

  // PATCH /api/admin/users/:id/block
  async toggleUserBlock(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent admin from blocking themselves
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'You cannot block yourself' });
      }

      user.isBlock = !user.isBlock;
      await user.save();
      res.status(200).json({ isBlock: user.isBlock, message: `User ${user.isBlock ? 'blocked' : 'unblocked'}` });
    } catch (error) {
      res.status(500).json({ message: 'Error toggling user block status', error: error.message });
    }
  }
}

module.exports = new AdminController();
