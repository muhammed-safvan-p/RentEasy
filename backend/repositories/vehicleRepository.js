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

  async findAll(filter = {}, populate = null, sort = { createdAt: -1 }) {
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
}

module.exports = new VehicleRepository();
