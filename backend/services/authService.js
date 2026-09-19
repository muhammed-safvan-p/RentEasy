const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

class AuthService {
  async signup(username, password) {
    // Check if user exists
    const existingUser = await userRepository.findByUsername(username);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await userRepository.createUser({
      username,
      password: hashedPassword,
    });

    const token = this.generateToken(user);
    return { token, user };
  }

  async login(username, password) {
    // Check user
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Username not found');
    }

    if (user.isBlock) {
      throw new Error('Account blocked');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Incorrect password');
    }

    const token = this.generateToken(user);
    return { token, user };
  }

  generateToken(user) {
    // Use a secret key from env or fallback for dev
    const secret = process.env.JWT_SECRET || 'fallback_secret_key_for_dev_only';
    return jwt.sign({ id: user._id, role: user.role }, secret, {
      expiresIn: '30d',
    });
  }
}

module.exports = new AuthService();
