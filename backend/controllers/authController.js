const authService = require('../services/authService');
const AppError = require('../utils/AppError');

class AuthController {
  async signup(req, res, next) {
    try {
      const { username, password } = req.body;

      const { token, user } = await authService.signup(username, password);
      
      // Set JWT in HTTP-Only Cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.status(201).json({ message: 'Signup successful', role: user.role });
    } catch (error) {
      if (error.message === 'User already exists') {
        return next(new AppError('Username is already taken. Please choose a different one.', 409));
      }
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      const { token, user } = await authService.login(username, password);

      // Set JWT in HTTP-Only Cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.status(200).json({ message: 'Login successful', role: user.role });
    } catch (error) {
      if (error.message === 'Account blocked') {
        return next(new AppError('Your account has been deactivated. Please contact support.', 403));
      }
      if (error.message === 'Username not found' || error.message === 'Incorrect password') {
        return next(new AppError('Invalid username or password', 401));
      }
      next(error);
    }
  }

  logout(req, res) {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
    });
    res.status(200).json({ message: 'Logged out successfully' });
  }
}

module.exports = new AuthController();
