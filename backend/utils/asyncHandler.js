/**
 * Wraps an async Express route/controller handler so that any rejected
 * promise or unhandled exception is forwarded to next(err) automatically.
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
