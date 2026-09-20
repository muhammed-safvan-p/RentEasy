const dealerRepository = require('../repositories/dealerRepository');
const AppError = require('../utils/AppError');

class DealerService {
  /**
   * Create a new dealer for a vehicle.
   * Enforces case-insensitive uniqueness per vehicle.
   */
  async createDealer({ vehicleId, name, createdBy }) {
    const trimmedName = name.trim();

    const existing = await dealerRepository.findByNameAndVehicle(trimmedName, vehicleId);
    if (existing) {
      throw new AppError(`A dealer named "${trimmedName}" already exists for this vehicle.`, 409);
    }

    try {
      const dealer = await dealerRepository.create({
        vehicleId,
        name: trimmedName,
        createdBy,
      });
      return dealer;
    } catch (err) {
      if (err.code === 11000) {
        throw new AppError(`A dealer named "${trimmedName}" already exists for this vehicle.`, 409);
      }
      throw err;
    }
  }

  /**
   * Get all dealers for a vehicle, sorted alphabetically.
   */
  async getDealers(vehicleId) {
    return await dealerRepository.findByVehicle(vehicleId);
  }

  /**
   * Update dealer name.
   */
  async updateDealer(dealerId, vehicleId, { name }) {
    const dealer = await dealerRepository.findById(dealerId);
    if (!dealer || dealer.vehicleId.toString() !== vehicleId.toString()) {
      throw new AppError('Dealer not found for this vehicle.', 404);
    }

    const trimmedName = name.trim();
    const existing = await dealerRepository.findByNameAndVehicle(trimmedName, vehicleId);
    if (existing && existing._id.toString() !== dealerId.toString()) {
      throw new AppError(`A dealer named "${trimmedName}" already exists for this vehicle.`, 409);
    }

    try {
      const updated = await dealerRepository.updateById(dealerId, { name: trimmedName });
      return updated;
    } catch (err) {
      if (err.code === 11000) {
        throw new AppError(`A dealer named "${trimmedName}" already exists for this vehicle.`, 409);
      }
      throw err;
    }
  }

  /**
   * Delete a dealer (hard delete).
   */
  async deleteDealer(dealerId, vehicleId) {
    const dealer = await dealerRepository.findById(dealerId);
    if (!dealer || dealer.vehicleId.toString() !== vehicleId.toString()) {
      throw new AppError('Dealer not found for this vehicle.', 404);
    }

    await dealerRepository.deleteById(dealerId);
    return { dealerId };
  }
}

module.exports = new DealerService();
