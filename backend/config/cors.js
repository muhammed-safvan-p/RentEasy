/**
 * CORS Configuration
 *
 * Dynamically resolves allowed origins from environment variables while
 * retaining safe defaults for local development and non-browser tooling.
 */

const getAllowedOrigins = () => {
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean)
    : [];

  return Array.from(new Set([...defaultOrigins, ...envOrigins]));
};

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = getAllowedOrigins();
    const isAllowed = allowedOrigins.includes(origin);
    const isVercelPreview =
      process.env.NODE_ENV !== 'production' && origin.endsWith('.vercel.app');

    if (isAllowed || isVercelPreview) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy violation: origin "${origin}" is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24-hour preflight cache
};

module.exports = corsOptions;
