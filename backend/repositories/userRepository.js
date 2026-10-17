const User = require('../models/User');

class UserRepository {
  async findById(id, select = null) {
    let query = User.findById(id);
    if (select) {
      query = query.select(select);
    }
    return await query;
  }

  async findByUsername(username, select = null) {
    let query = User.findOne({ username });
    if (select) {
      query = query.select(select);
    }
    return await query;
  }

  async findByPhone(phone) {
    if (!phone) return null;
    return await User.findOne({ phone });
  }

  async createUser(userData, session = null) {
    const user = new User(userData);
    return await user.save({ session: session || undefined });
  }

  async findAll(filter = {}, select = null, sort = null) {
    let query = User.find(filter);
    if (select) {
      query = query.select(select);
    }
    if (sort) {
      query = query.sort(sort);
    }
    return await query;
  }

  async save(user, session = null) {
    return await user.save({ session: session || undefined });
  }

  async deleteById(id, session = null) {
    return await User.findByIdAndDelete(id, { session: session || undefined });
  }
}

module.exports = new UserRepository();
