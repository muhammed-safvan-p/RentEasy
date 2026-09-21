const VehicleLock = require('../models/VehicleLock');

class LockRepository {
  /**
   * Create a new vehicle lock document.
   */
  async create(data) {
    const lock = new VehicleLock(data);
    return await lock.save();
  }

  /**
   * Find locks for a vehicle that overlap a given date range.
   * A lock overlaps [start, end] if: lock.startDate < end AND lock.endDate > start
   */
  async findByVehicleDateRange(vehicleId, startDate, endDate) {
    return await VehicleLock.find({
      vehicleId,
      startDate: { $lt: endDate },
      endDate: { $gt: startDate },
    })
      .populate('lockedBy', 'username')
      .sort({ startDate: 1 });
  }

  /**
   * Find a single lock by its ID, with lockedBy populated.
   */
  async findById(id) {
    return await VehicleLock.findById(id).populate('lockedBy', 'username');
  }

  /**
   * Hard-delete a lock by ID. Returns the deleted document or null.
   */
  async deleteById(id) {
    return await VehicleLock.findByIdAndDelete(id);
  }

  /**
   * Delete all locks for a specific vehicle.
   */
  async deleteManyByVehicleId(vehicleId, session = null) {
    return await VehicleLock.deleteMany({ vehicleId }, { session: session || undefined });
  }
}

module.exports = new LockRepository();
