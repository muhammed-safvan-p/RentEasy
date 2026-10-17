const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

class AuthService {
  async signup(username, password, phone) {
    const { normalizePhone, isValidPhone } = require('../utils/phoneUtils');
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      const err = new Error('Phone number must be a valid 10-digit number');
      err.statusCode = 400;
      throw err;
    }

    // Check if username exists
    const existingUser = await userRepository.findByUsername(username);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Check if phone exists
    const existingPhone = await userRepository.findByPhone(normalizedPhone);
    if (existingPhone) {
      throw new Error('Phone already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await userRepository.createUser({
      username,
      password: hashedPassword,
      phone: normalizedPhone,
    });

    const token = this.generateToken(user);
    const userResponse = user.toObject ? user.toObject() : { ...user };
    delete userResponse.password;
    return { token, user: userResponse };
  }

  async login(username, password) {
    // Check user and explicitly include password for verification since select: false is enabled
    const user = await userRepository.findByUsername(username, '+password');
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
    const userResponse = user.toObject ? user.toObject() : { ...user };
    delete userResponse.password;
    return { token, user: userResponse };
  }

  generateToken(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('FATAL: JWT_SECRET environment variable is missing.');
    }
    return jwt.sign({ id: user._id, role: user.role }, secret, {
      expiresIn: '30d',
    });
  }
}

module.exports = new AuthService();
