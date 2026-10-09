const AppError = require('../utils/AppError');

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    details: err.details,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      details: err.details,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

const errorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (err.code === 11000) {
    if (err.keyValue?.phone || err.keyPattern?.phone) {
      err.statusCode = 409;
      err.message = 'This phone number is already registered with another account.';
      err.isOperational = true;
    } else if (err.keyValue?.username || err.keyPattern?.username) {
      err.statusCode = 409;
      err.message = 'Username is already taken. Please choose a different one.';
      err.isOperational = true;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    let error = err;

    // Handle mongoose specific errors
    if (error.name === 'CastError') {
      const message = `Invalid ${error.path}: ${error.value}.`;
      error = new AppError(message, 400);
    } else if (error.code === 11000) {
      if (error.keyValue?.phone || error.keyPattern?.phone) {
        error = new AppError('This phone number is already registered with another account.', 409);
      } else if (error.keyValue?.username || error.keyPattern?.username) {
        error = new AppError('Username is already taken. Please choose a different one.', 409);
      } else {
        const value = error.keyValue
          ? JSON.stringify(error.keyValue)
          : error.message && error.message.match(/(["'])(\\?.)*?\1/)
            ? error.message.match(/(["'])(\\?.)*?\1/)[0]
            : 'duplicate value';
        const message = `Duplicate field value: ${value}. Please use another value!`;
        error = new AppError(message, 400);
      }
    } else if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map((el) => el.message);
      const message = `Invalid input data. ${errors.join('. ')}`;
      error = new AppError(message, 400);
    } else if (error.name === 'JsonWebTokenError') {
      error = new AppError('Invalid token. Please log in again.', 401);
    } else if (error.name === 'TokenExpiredError') {
      error = new AppError('Your token has expired! Please log in again.', 401);
    }

    sendErrorProd(error, res);
  } else {
    sendErrorDev(err, res);
  }
};

module.exports = errorHandler;
