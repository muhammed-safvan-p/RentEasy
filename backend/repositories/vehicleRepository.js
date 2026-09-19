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

  async save(vehicle, session = null) {
    return await vehicle.save({ session: session || undefined });
  }
}

module.exports = new VehicleRepository();
