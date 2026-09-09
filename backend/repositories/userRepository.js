const User = require('../models/User');

class UserRepository {
  async findByUsername(username) {
    return await User.findOne({ username });
  }

  async createUser(userData) {
    const user = new User(userData);
    return await user.save();
  }
}

module.exports = new UserRepository();
