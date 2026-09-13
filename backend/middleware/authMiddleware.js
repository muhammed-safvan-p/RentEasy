const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token = req.cookies.token;

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'fallback_secret_key_for_dev_only';
      const decoded = jwt.verify(token, secret);
      req.user = await User.findById(decoded.id).select('-password');
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

const Vehicle = require('../models/Vehicle');

const authorizeVehicleAccess = async (req, res, next) => {
  try {
    const vehicleId = req.params.vehicleId || req.params.id;
    if (!vehicleId) {
      return res.status(400).json({ message: 'Vehicle ID is required' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
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

    // Attach vehicle to request for downstream use
    req.vehicle = vehicle;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error authorizing vehicle access', error: error.message });
  }
};

module.exports = { protect, adminOnly, authorizeVehicleAccess };
