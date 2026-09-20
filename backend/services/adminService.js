const bcrypt = require('bcryptjs');
const Vehicle = require('../models/Vehicle');
const vehicleRepository = require('../repositories/vehicleRepository');
const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');
const walletService = require('./walletService');
const AppError = require('../utils/AppError');

class AdminService {
  async getVehicles() {
    return await vehicleRepository.findAll(
      {},
      { path: 'ownerIds', select: 'username' },
      { createdAt: -1 }
    );
  }

  async getVehicleById(id) {
    const vehicle = await vehicleRepository.findById(id, { path: 'ownerIds', select: 'username' });
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    return vehicle;
  }

  async addVehicle(vehicleDataInput, adminUserId) {
    const {
      name,
      plateNumber,
      ownerIds,
      notes,
      imageUrl,
      fuelType,
      transmission,
      seatingCapacity,
      initialCashBalance,
      initialBankBalance,
    } = vehicleDataInput;

    const formattedPlate = plateNumber.trim().toUpperCase();

    // Check if plate exists
    const existing = await vehicleRepository.findByPlateNumber(formattedPlate);
    if (existing) {
      throw new AppError('Vehicle with this plate number already exists', 400);
    }

    const vehicleData = {
      name: name.trim(),
      plateNumber: formattedPlate,
      ownerIds: ownerIds || [],
      notes: notes ? notes.trim() : '',
    };

    if (imageUrl !== undefined) vehicleData.imageUrl = imageUrl ? imageUrl.trim() : null;
    if (fuelType) vehicleData.fuelType = fuelType;
    if (transmission) vehicleData.transmission = transmission;
    if (seatingCapacity !== undefined && seatingCapacity !== '') {
      const parsedCapacity = Number(seatingCapacity);
      if (!isNaN(parsedCapacity) && parsedCapacity > 0) {
        vehicleData.seatingCapacity = parsedCapacity;
      }
    }

    const vehicle = await vehicleRepository.create(vehicleData);

    // Auto-create Wallet for the new vehicle
    const cashBalance = Number(initialCashBalance) || 0;
    const bankBalance = Number(initialBankBalance) || 0;

    const wallet = await walletRepository.createWallet({
      vehicleId: vehicle._id,
      cashBalance: 0,
      bankBalance: 0,
    });

    if (cashBalance > 0) {
      await walletRepository.createTransaction({
        walletId: wallet._id,
        vehicleId: vehicle._id,
        type: 'income',
        paymentMethod: 'cash',
        amount: cashBalance,
        note: 'Initial cash balance',
        source: 'manual',
        createdBy: adminUserId,
      });
      await walletService.applyTransaction(null, wallet, 'income', 'cash', cashBalance);
    }

    if (bankBalance > 0) {
      await walletRepository.createTransaction({
        walletId: wallet._id,
        vehicleId: vehicle._id,
        type: 'income',
        paymentMethod: 'bank',
        amount: bankBalance,
        note: 'Initial bank balance',
        source: 'manual',
        createdBy: adminUserId,
      });
      await walletService.applyTransaction(null, wallet, 'income', 'bank', bankBalance);
    }

    return vehicle;
  }

  async updateVehicle(id, updateDataInput) {
    const {
      name,
      plateNumber,
      ownerIds,
      notes,
      imageUrl,
      fuelType,
      transmission,
      seatingCapacity,
    } = updateDataInput;

    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const formattedPlate = plateNumber.trim().toUpperCase();

    // Check if plate exists and belongs to a different vehicle
    if (formattedPlate !== vehicle.plateNumber) {
      const existing = await vehicleRepository.findByPlateNumber(formattedPlate);
      if (existing) {
        throw new AppError('Vehicle with this plate number already exists', 400);
      }
    }

    vehicle.name = name.trim();
    vehicle.plateNumber = formattedPlate;
    if (ownerIds !== undefined) vehicle.ownerIds = ownerIds;
    if (notes !== undefined) vehicle.notes = notes ? notes.trim() : '';
    if (imageUrl !== undefined) vehicle.imageUrl = imageUrl ? imageUrl.trim() : null;
    if (fuelType) vehicle.fuelType = fuelType;
    if (transmission) vehicle.transmission = transmission;
    if (seatingCapacity !== undefined && seatingCapacity !== '') {
      const parsedCapacity = Number(seatingCapacity);
      if (!isNaN(parsedCapacity) && parsedCapacity > 0) {
        vehicle.seatingCapacity = parsedCapacity;
      }
    }

    return await vehicleRepository.save(vehicle);
  }

  async toggleVehicleActive(id) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    vehicle.isActive = !vehicle.isActive;
    await vehicleRepository.save(vehicle);
    return { isActive: vehicle.isActive, message: `Vehicle ${vehicle.isActive ? 'activated' : 'deactivated'}` };
  }

  async deleteVehicle(id) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const Booking = require('../models/Booking');
    const activeBookingsCount = await Booking.countDocuments({
      vehicleId: id,
      status: { $in: ['confirmed', 'in_progress', 'payment_pending'] },
    });
    if (activeBookingsCount > 0) {
      throw new AppError(
        `Cannot delete vehicle with ${activeBookingsCount} active booking(s). Please complete or cancel active bookings first.`,
        400
      );
    }

    await vehicleRepository.deleteById(id);
    return { message: 'Vehicle deleted successfully' };
  }

  async getUsersList() {
    return await userRepository.findAll({}, 'username _id');
  }

  async getUsers(filter = {}) {
    const users = await userRepository.findAll(filter, '-password', { createdAt: -1 });
    
    // Count associated vehicles for each user
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const vehicleCount = await Vehicle.countDocuments({ ownerIds: u._id });
        return {
          _id: u._id,
          username: u.username,
          role: u.role,
          isBlock: u.isBlock,
          vehicleCount,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      })
    );

    return usersWithStats;
  }

  async createUser(userData) {
    const { username, password, role, isBlock } = userData;
    const trimmedUsername = username.trim();

    const existing = await userRepository.findByUsername(trimmedUsername);
    if (existing) {
      throw new AppError('Username already exists', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await userRepository.createUser({
      username: trimmedUsername,
      password: hashedPassword,
      role: role || 'user',
      isBlock: isBlock || false,
    });

    return {
      _id: user._id,
      username: user.username,
      role: user.role,
      isBlock: user.isBlock,
      vehicleCount: 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUser(userId, updateData, currentAdminId) {
    const { username, password, role, isBlock } = updateData;

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (username !== undefined) {
      const trimmedUsername = username.trim();
      if (trimmedUsername !== user.username) {
        const existing = await userRepository.findByUsername(trimmedUsername);
        if (existing && existing._id.toString() !== user._id.toString()) {
          throw new AppError('Username already exists', 400);
        }
        user.username = trimmedUsername;
      }
    }

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    if (role !== undefined) {
      if (user._id.toString() === currentAdminId.toString() && role !== 'admin') {
        throw new AppError('You cannot demote your own admin account', 400);
      }
      user.role = role;
    }

    if (isBlock !== undefined) {
      if (user._id.toString() === currentAdminId.toString() && isBlock) {
        throw new AppError('You cannot block your own account', 400);
      }
      user.isBlock = isBlock;
    }

    const updatedUser = await userRepository.save(user);
    const vehicleCount = await Vehicle.countDocuments({ ownerIds: updatedUser._id });

    return {
      _id: updatedUser._id,
      username: updatedUser.username,
      role: updatedUser.role,
      isBlock: updatedUser.isBlock,
      vehicleCount,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async deleteUser(userId, currentAdminId) {
    if (userId.toString() === currentAdminId.toString()) {
      throw new AppError('You cannot delete your own account', 400);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Pull user from any vehicles where they are assigned as co-owner
    await Vehicle.updateMany({ ownerIds: user._id }, { $pull: { ownerIds: user._id } });

    await userRepository.deleteById(userId);
    return { message: 'User deleted successfully' };
  }

  async toggleUserBlock(userId, currentAdminId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user._id.toString() === currentAdminId.toString()) {
      throw new AppError('You cannot block yourself', 400);
    }

    user.isBlock = !user.isBlock;
    await userRepository.save(user);
    return { isBlock: user.isBlock, message: `User ${user.isBlock ? 'blocked' : 'unblocked'}` };
  }
}

module.exports = new AdminService();
