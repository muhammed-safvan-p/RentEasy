const authService = require('../services/authService');

class AuthController {
  async signup(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
      }

      const token = await authService.signup(username, password);
      
      // Set JWT in HTTP-Only Cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.status(201).json({ message: 'Signup successful' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
      }

      const token = await authService.login(username, password);

      // Set JWT in HTTP-Only Cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.status(200).json({ message: 'Login successful' });
    } catch (error) {
      res.status(401).json({ message: error.message });
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
