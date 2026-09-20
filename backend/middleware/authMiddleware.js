const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const vehicleRepository = require('../repositories/vehicleRepository');

const protect = async (req, res, next) => {
  let token = req.cookies.token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
      }
      const decoded = jwt.verify(token, secret);
      req.user = await userRepository.findById(decoded.id, '-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      if (req.user.isBlock) {
        res.clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        return res.status(403).json({
          message: 'Your account has been blocked. Please contact support: +91 9496432072',
          isBlocked: true,
        });
      }
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

const authorizeVehicleAccess = async (req, res, next) => {
  try {
    const vehicleId = req.params.vehicleId || req.params.id;
    if (!vehicleId) {
      return res.status(400).json({ message: 'Vehicle ID is required' });
    }

    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const isOwner = vehicle.ownerIds.some(
      (id) => id.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to access this vehicle' });
    }

    // If vehicle is blocked by admin, prevent non-admin owners from performing any mutations
    if (!isAdmin && vehicle.isActive === false && req.method !== 'GET') {
      return res.status(403).json({
        message: 'This vehicle is currently locked/blocked by administrator. Please contact support: +91 9496432072',
        isVehicleBlocked: true,
      });
    }

    // Attach vehicle to request for downstream use
    req.vehicle = vehicle;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error authorizing vehicle access', error: error.message });
  }
};

module.exports = { protect, adminOnly, authorizeVehicleAccess };
