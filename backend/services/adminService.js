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
      dailyRate,
      hourlyRate,
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
    if (dailyRate !== undefined && dailyRate !== '') {
      const parsedDaily = Number(dailyRate);
      if (!isNaN(parsedDaily) && parsedDaily >= 0) {
        vehicleData.dailyRate = parsedDaily;
      }
    }
    if (hourlyRate !== undefined && hourlyRate !== '') {
      const parsedHourly = Number(hourlyRate);
      if (!isNaN(parsedHourly) && parsedHourly >= 0) {
        vehicleData.hourlyRate = parsedHourly;
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
      dailyRate,
      hourlyRate,
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
    if (dailyRate !== undefined && dailyRate !== '') {
      const parsedDaily = Number(dailyRate);
      if (!isNaN(parsedDaily) && parsedDaily >= 0) {
        vehicle.dailyRate = parsedDaily;
      }
    }
    if (hourlyRate !== undefined && hourlyRate !== '') {
      const parsedHourly = Number(hourlyRate);
      if (!isNaN(parsedHourly) && parsedHourly >= 0) {
        vehicle.hourlyRate = parsedHourly;
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

  async getUsersList() {
    return await userRepository.findAll({}, 'username _id');
  }

  async getUsers() {
    return await userRepository.findAll({}, '-password', { createdAt: -1 });
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
