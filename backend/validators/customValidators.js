const Joi = require('joi');
const mongoose = require('mongoose');

// Custom Joi validator for 24-character hexadecimal MongoDB ObjectId
const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

// Custom Joi validator for YYYY-MM month format
const monthFormat = Joi.string()
  .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
  .messages({
    'string.pattern.base': '{#label} must be in YYYY-MM format (e.g. 2026-09)',
  });

module.exports = {
  objectId,
  monthFormat,
};
