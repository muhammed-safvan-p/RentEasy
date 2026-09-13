const authService = require('../services/authService');

class AuthController {
  async signup(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
      }

      // Username: letters only (no numbers, symbols, spaces)
      if (!/^[a-zA-Z]+$/.test(username)) {
        return res.status(400).json({ message: 'Username must contain letters only — no numbers or symbols' });
      }

      if (username.length < 4) {
        return res.status(400).json({ message: 'Username must be at least 4 characters long' });
      }

      // Password length: 6 to 8 characters
      if (password.length < 6 || password.length > 8) {
        return res.status(400).json({ message: 'Password must be between 6 and 8 characters' });
      }

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
      // Improve the uniqueness error message from authService
      if (error.message === 'User already exists') {
        return res.status(400).json({ message: 'Username is already taken. Please choose a different one.' });
      }
      res.status(400).json({ message: error.message });
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
      }

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
