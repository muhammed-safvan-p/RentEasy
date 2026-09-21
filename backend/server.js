require('dotenv').config();

// Ensure required environment variables exist on boot
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is missing.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const corsOptions = require('./config/cors');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const walletRoutes = require('./routes/walletRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorMiddleware');

// Initialize express app
const app = express();

// Security Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Express 5 compatible NoSQL injection sanitization (sanitizes in-place without reassigning req.query)
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.query) mongoSanitize.sanitize(req.query);
  next();
});

// Trust reverse proxy headers when deployed on Render / cloud hosts
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Request logging middleware (dependency-free, captures method, path, status, and duration)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    let url = req.originalUrl || req.url || '/';
    if (url.includes('?')) {
      try {
        const [pathname, search] = url.split('?');
        const params = new URLSearchParams(search);
        for (const key of ['token', 'password', 'secret', 'key', 'auth', 'authorization']) {
          if (params.has(key)) {
            params.set(key, '[REDACTED]');
          }
        }
        const sanitized = params.toString();
        url = sanitized ? `${pathname}?${sanitized}` : pathname;
      } catch {
        url = url.split('?')[0];
      }
    }
    const duration = Date.now() - start;
    console.log(`${req.method} ${url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Rate limiting: 300 requests per 15 minutes per IP in production (relaxed in development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 300 : 1500,
  message: { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// Apply rate limiter to all API routes
app.use('/api/', limiter);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vehicles', walletRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/user', userRoutes);

// Error handling middleware (global)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Closing HTTP server and DB connections...`);
      server.close(async () => {
        try {
          await mongoose.connection.close(false);
          console.log('MongoDB connection closed. Process terminating cleanly.');
          process.exit(0);
        } catch (err) {
          console.error('Error closing MongoDB connection:', err);
          process.exit(1);
        }
      });

      // Force exit if connections take too long
      setTimeout(() => {
        console.error('Forced shutdown after 10s timeout.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

