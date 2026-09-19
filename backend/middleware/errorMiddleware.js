const AppError = require('../utils/AppError');

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
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

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // Handle mongoose specific errors
    if (error.name === 'CastError') {
      const message = `Invalid ${error.path}: ${error.value}.`;
      error = new AppError(message, 400);
    }
    if (error.code === 11000) {
      const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : 'duplicate value';
      const message = `Duplicate field value: ${value}. Please use another value!`;
      error = new AppError(message, 400);
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(el => el.message);
      const message = `Invalid input data. ${errors.join('. ')}`;
      error = new AppError(message, 400);
    }
    if (error.name === 'JsonWebTokenError') {
      error = new AppError('Invalid token. Please log in again.', 401);
    }
    if (error.name === 'TokenExpiredError') {
      error = new AppError('Your token has expired! Please log in again.', 401);
    }

    sendErrorProd(error, res);
  } else {
    sendErrorDev(err, res);
  }
};

module.exports = errorHandler;
