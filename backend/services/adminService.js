const bcrypt = require('bcryptjs');
const vehicleRepository = require('../repositories/vehicleRepository');
const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');
const bookingRepository = require('../repositories/bookingRepository');
const dealerRepository = require('../repositories/dealerRepository');
const lockRepository = require('../repositories/lockRepository');
const walletService = require('./walletService');
const { runInTransaction } = require('../utils/transactionRunner');
const AppError = require('../utils/AppError');

class AdminService {
  async getVehicles(queryParams = {}) {
    const { page, limit } = queryParams;

    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 100));
      const skip = (pageNum - 1) * limitNum;

      return await vehicleRepository.findAll(
        {},
        { path: 'ownerIds', select: 'username' },
        { createdAt: -1 },
        limitNum,
        skip
      );
    }

    // Default safe ceiling capped at 100 to prevent unbounded memory spikes
    return await vehicleRepository.findAll(
      {},
      { path: 'ownerIds', select: 'username' },
      { createdAt: -1 },
      100
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

    const cashBalance = Number(initialCashBalance) || 0;
    const bankBalance = Number(initialBankBalance) || 0;

    return await runInTransaction(async (session) => {
      const vehicle = await vehicleRepository.create(vehicleData, session);

      // Auto-create Wallet for the new vehicle
      const wallet = await walletRepository.createWallet(
        {
          vehicleId: vehicle._id,
          cashBalance: 0,
          bankBalance: 0,
        },
        session
      );

      if (cashBalance !== 0) {
        const isIncome = cashBalance > 0;
        const absAmount = Math.abs(cashBalance);
        await walletRepository.createTransaction(
          {
            walletId: wallet._id,
            vehicleId: vehicle._id,
            type: isIncome ? 'income' : 'expense',
            paymentMethod: 'cash',
            amount: absAmount,
            note: isIncome ? 'Initial cash balance' : 'Initial negative cash balance',
            source: 'manual',
            createdBy: adminUserId,
          },
          session
        );
        await walletService.applyTransaction(
          session,
          wallet,
          isIncome ? 'income' : 'expense',
          'cash',
          absAmount
        );
      }

      if (bankBalance !== 0) {
        const isIncome = bankBalance > 0;
        const absAmount = Math.abs(bankBalance);
        await walletRepository.createTransaction(
          {
            walletId: wallet._id,
            vehicleId: vehicle._id,
            type: isIncome ? 'income' : 'expense',
            paymentMethod: 'bank',
            amount: absAmount,
            note: isIncome ? 'Initial bank balance' : 'Initial negative bank balance',
            source: 'manual',
            createdBy: adminUserId,
          },
          session
        );
        await walletService.applyTransaction(
          session,
          wallet,
          isIncome ? 'income' : 'expense',
          'bank',
          absAmount
        );
      }

      return vehicle;
    });
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
      isActive,
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

    if (imageUrl !== undefined) {
      const trimmedNewImage = imageUrl ? imageUrl.trim() : null;
      // If image is being replaced or removed, destroy the old one on Cloudinary
      if (
        vehicle.imageUrl &&
        vehicle.imageUrl !== trimmedNewImage &&
        (vehicle.imageUrl.includes('cloudinary.com') || vehicle.imageUrl.includes('res.cloudinary'))
      ) {
        try {
          const { cloudinary } = require('../config/cloudinary');
          const match = vehicle.imageUrl.match(/(renteasy\/vehicles\/[^./?#]+)/);
          if (match && match[1]) {
            cloudinary.uploader.destroy(match[1]).catch(() => {});
          }
        } catch (_e) {
          // non-blocking
        }
      }
      vehicle.imageUrl = trimmedNewImage;
    }

    if (fuelType) vehicle.fuelType = fuelType;
    if (transmission) vehicle.transmission = transmission;
    if (seatingCapacity !== undefined && seatingCapacity !== '') {
      const parsedCapacity = Number(seatingCapacity);
      if (!isNaN(parsedCapacity) && parsedCapacity > 0) {
        vehicle.seatingCapacity = parsedCapacity;
      }
    }
    if (isActive !== undefined) {
      vehicle.isActive = Boolean(isActive);
    }

    const saved = await vehicleRepository.save(vehicle);
    await saved.populate({ path: 'ownerIds', select: 'username' });
    return saved;
  }

  async toggleVehicleActive(id) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    vehicle.isActive = !vehicle.isActive;
    await vehicleRepository.save(vehicle);
    return {
      isActive: vehicle.isActive,
      message: `Vehicle ${vehicle.isActive ? 'activated' : 'deactivated'}`,
    };
  }

  async deleteVehicle(id) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const activeBookingsCount = await bookingRepository.countActiveByVehicle(id);
    if (activeBookingsCount > 0) {
      throw new AppError(
        `Cannot delete vehicle with ${activeBookingsCount} active booking(s). Please complete or cancel active bookings first.`,
        400
      );
    }

    // Cascade delete vehicle and all associated records atomically in a transaction.
    // Operations run sequentially (not Promise.all) because a MongoDB ClientSession
    // is single-threaded — parallel operations on the same session cause a
    // "transaction number collision" error. Child documents are deleted first,
    // the vehicle document itself is deleted last.
    await runInTransaction(async (session) => {
      await dealerRepository.deleteManyByVehicleId(id, session);
      await lockRepository.deleteManyByVehicleId(id, session);
      await walletRepository.deleteTransactionsByVehicleId(id, session);
      await walletRepository.deleteByVehicleId(id, session);
      await bookingRepository.deletePaymentsByVehicleId(id, session);
      await bookingRepository.deleteManyByVehicleId(id, session);
      await vehicleRepository.deleteById(id, session); // vehicle deleted last
    });

    // Cleanup vehicle image from Cloudinary asynchronously if present
    if (
      vehicle.imageUrl &&
      (vehicle.imageUrl.includes('cloudinary.com') || vehicle.imageUrl.includes('res.cloudinary'))
    ) {
      try {
        const { cloudinary } = require('../config/cloudinary');
        const match = vehicle.imageUrl.match(/(renteasy\/vehicles\/[^./?#]+)/);
        if (match && match[1]) {
          await cloudinary.uploader.destroy(match[1]);
        }
      } catch (err) {
        console.error(
          'Non-critical: Failed to delete vehicle image from Cloudinary on vehicle deletion:',
          err.message
        );
      }
    }

    return { message: 'Vehicle deleted successfully' };
  }

  async getUsersList() {
    return await userRepository.findAll({}, 'username _id');
  }

  async getUsers(filter = {}) {
    const [users, vehicleCounts] = await Promise.all([
      userRepository.findAll(filter, '-password', { createdAt: -1 }),
      vehicleRepository.aggregateOwnerCounts(),
    ]);

    const countMap = new Map();
    vehicleCounts.forEach((c) => countMap.set(c._id.toString(), c.count));

    return users.map((u) => ({
      _id: u._id,
      username: u.username,
      role: u.role,
      phone: u.phone || undefined,
      isBlock: u.isBlock,
      vehicleCount: countMap.get(u._id.toString()) || 0,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  async createUser(userData) {
    const { username, password, phone, role, isBlock } = userData;
    const trimmedUsername = username.trim();

    const existing = await userRepository.findByUsername(trimmedUsername);
    if (existing) {
      throw new AppError('Username already exists', 400);
    }

    let normalizedPhone = undefined;
    if (phone) {
      const { normalizePhone, isValidPhone } = require('../utils/phoneUtils');
      normalizedPhone = normalizePhone(phone);
      if (!isValidPhone(normalizedPhone)) {
        throw new AppError('Phone number must be a valid 10-digit number', 400);
      }
      const existingPhone = await userRepository.findByPhone(normalizedPhone);
      if (existingPhone) {
        throw new AppError('This phone number is already registered with another account.', 409);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await userRepository.createUser({
      username: trimmedUsername,
      password: hashedPassword,
      phone: normalizedPhone,
      role: role || 'user',
      isBlock: isBlock || false,
    });

    return {
      _id: user._id,
      username: user.username,
      phone: user.phone || undefined,
      role: user.role,
      isBlock: user.isBlock,
      vehicleCount: 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUser(userId, updateData, currentAdminId) {
    const { username, password, phone, role, isBlock } = updateData;

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

    if (phone !== undefined) {
      if (phone && phone.trim() !== '') {
        const { normalizePhone, isValidPhone } = require('../utils/phoneUtils');
        const normalizedPhone = normalizePhone(phone);
        if (!isValidPhone(normalizedPhone)) {
          throw new AppError('Phone number must be a valid 10-digit number', 400);
        }
        const existingPhone = await userRepository.findByPhone(normalizedPhone);
        if (existingPhone && existingPhone._id.toString() !== user._id.toString()) {
          throw new AppError('This phone number is already registered with another account.', 409);
        }
        user.phone = normalizedPhone;
      } else {
        user.phone = undefined;
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
    const vehicleCount = await vehicleRepository.countByOwnerId(updatedUser._id);

    return {
      _id: updatedUser._id,
      username: updatedUser.username,
      phone: updatedUser.phone || undefined,
      role: updatedUser.role,
      isBlock: updatedUser.isBlock,
      vehicleCount,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async updateUserPhone(userId, phone) {
    const { normalizePhone, isValidPhone } = require('../utils/phoneUtils');
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      throw new AppError('Phone number must be a valid 10-digit number', 400);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const existingWithPhone = await userRepository.findByPhone(normalizedPhone);
    if (existingWithPhone && existingWithPhone._id.toString() !== user._id.toString()) {
      throw new AppError('This phone number is already registered with another account.', 409);
    }

    user.phone = normalizedPhone;
    await userRepository.save(user);

    return {
      message: 'Phone number updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        phone: user.phone,
      },
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
    await vehicleRepository.removeOwnerFromAllVehicles(user._id);

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
