const authService = require('../services/authService');
const AppError = require('../utils/AppError');

const getCookieOptions = (isClear = false) => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    ...(isClear ? { expires: new Date(0) } : { maxAge: 30 * 24 * 60 * 60 * 1000 }),
  };
};

class AuthController {
  async signup(req, res, next) {
    try {
      const { username, password } = req.body;

      const { token, user } = await authService.signup(username, password);

      // Set JWT in HTTP-Only Cookie with cross-domain compatibility
      res.cookie('token', token, getCookieOptions());

      res.status(201).json({
        message: 'Signup successful',
        role: user.role,
        token,
      });
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

      // Set JWT in HTTP-Only Cookie with cross-domain compatibility
      res.cookie('token', token, getCookieOptions());

      res.status(200).json({
        message: 'Login successful',
        role: user.role,
        token,
      });
    } catch (error) {
      if (error.message === 'Account blocked') {
        res.clearCookie('token', getCookieOptions(true));
        return next(
          new AppError('Your account has been blocked. Please contact support: +91 9496432072', 403)
        );
      }
      if (error.message === 'Username not found' || error.message === 'Incorrect password') {
        return next(new AppError('Invalid username or password', 401));
      }
      next(error);
    }
  }

  logout(req, res) {
    res.clearCookie('token', getCookieOptions(true));
    res.status(200).json({ message: 'Logged out successfully' });
  }
}

module.exports = new AuthController();
