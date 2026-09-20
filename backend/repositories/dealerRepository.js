const Dealer = require('../models/Dealer');

class DealerRepository {
  /**
   * Create a new dealer document.
   */
  async create(data) {
    const dealer = new Dealer(data);
    return await dealer.save();
  }

  /**
   * Find all dealers for a specific vehicle.
   */
  async findByVehicle(vehicleId) {
    return await Dealer.find({ vehicleId })
      .collation({ locale: 'en', strength: 2 })
      .sort({ name: 1 });
  }

  /**
   * Find a dealer by exact name (case-insensitive) for a vehicle.
   */
  async findByNameAndVehicle(name, vehicleId) {
    // Escape regex characters
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return await Dealer.findOne({
      vehicleId,
      name: { $regex: new RegExp(`^${escaped}$`, 'i') },
    });
  }

  /**
   * Find a dealer by ID.
   */
  async findById(id) {
    return await Dealer.findById(id);
  }

  /**
   * Update dealer by ID.
   */
  async updateById(id, data) {
    return await Dealer.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });
  }

  /**
   * Hard-delete a dealer by ID.
   */
  async deleteById(id) {
    return await Dealer.findByIdAndDelete(id);
  }
}

module.exports = new DealerRepository();
