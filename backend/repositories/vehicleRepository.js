const Vehicle = require('../models/Vehicle');

class VehicleRepository {
  async findById(id, populate = null) {
    let query = Vehicle.findById(id);
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((p) => {
          query = query.populate(p);
        });
      } else {
        query = query.populate(populate);
      }
    }
    return await query;
  }

  async findByPlateNumber(plateNumber) {
    return await Vehicle.findOne({ plateNumber: plateNumber.trim().toUpperCase() });
  }

  async findAll(filter = {}, populate = null, sort = { createdAt: -1 }, limit = null, skip = null) {
    let query = Vehicle.find(filter);
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((p) => {
          query = query.populate(p);
        });
      } else {
        query = query.populate(populate);
      }
    }
    if (sort) {
      query = query.sort(sort);
    }
    if (skip) {
      query = query.skip(skip);
    }
    if (limit) {
      query = query.limit(limit);
    }
    return await query;
  }

  async findByOwnerId(ownerId, sort = { createdAt: -1 }) {
    return await Vehicle.find({ ownerIds: ownerId }).sort(sort);
  }

  async create(vehicleData, session = null) {
    const vehicle = new Vehicle(vehicleData);
    return await vehicle.save({ session: session || undefined });
  }

  async deleteById(id, session = null) {
    return await Vehicle.findByIdAndDelete(id, { session: session || undefined });
  }

  async save(vehicle, session = null) {
    return await vehicle.save({ session: session || undefined });
  }

  /**
   * Atomically increment bookingVersion on a vehicle using Compare-And-Swap (OCC).
   * If currentVersion === 0, matches either bookingVersion: 0 or documents where bookingVersion is not set yet.
   * Returns updated vehicle document if version matched, or null if a concurrent change occurred.
   */
  async incrementBookingVersion(vehicleId, currentVersion, session = null) {
    const filter =
      currentVersion === 0
        ? { _id: vehicleId, $or: [{ bookingVersion: 0 }, { bookingVersion: { $exists: false } }] }
        : { _id: vehicleId, bookingVersion: currentVersion };

    return await Vehicle.findOneAndUpdate(
      filter,
      { $inc: { bookingVersion: 1 } },
      { returnDocument: 'after', session: session || undefined }
    );
  }

  /**
   * Increment bookingVersion unconditionally (used within an ACID transaction to guarantee write-write serialization).
   */
  async touchBookingVersion(vehicleId, session = null) {
    return await Vehicle.findByIdAndUpdate(
      vehicleId,
      { $inc: { bookingVersion: 1 } },
      { returnDocument: 'after', session: session || undefined }
    );
  }

  /**
   * Count vehicles owned by a specific user.
   */
  async countByOwnerId(ownerId) {
    return await Vehicle.countDocuments({ ownerIds: ownerId });
  }

  /**
   * Pull an owner ID from all vehicles they are assigned to.
   */
  async removeOwnerFromAllVehicles(ownerId, session = null) {
    return await Vehicle.updateMany(
      { ownerIds: ownerId },
      { $pull: { ownerIds: ownerId } },
      { session: session || undefined }
    );
  }

  /**
   * Aggregate counts of vehicles grouped by ownerId.
   */
  async aggregateOwnerCounts() {
    return await Vehicle.aggregate([
      { $unwind: '$ownerIds' },
      { $group: { _id: '$ownerIds', count: { $sum: 1 } } },
    ]);
  }
}

module.exports = new VehicleRepository();
