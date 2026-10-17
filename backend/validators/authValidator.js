const Joi = require('joi');

const signupSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required',
    }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'any.required': 'Password is required',
  }),
  phone: Joi.string()
    .required()
    .custom((value, helpers) => {
      const { normalizePhone, getPhoneValidationError } = require('../utils/phoneUtils');
      const err = getPhoneValidationError(value);
      if (err) {
        return helpers.message(err);
      }
      return normalizePhone(value);
    })
    .messages({
      'any.required': 'Phone number is required',
      'string.empty': 'Phone number cannot be empty',
    }),
});

const loginSchema = Joi.object({
  username: Joi.string().trim().required().messages({
    'any.required': 'Username is required',
    'string.empty': 'Username cannot be empty',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
    'string.empty': 'Password cannot be empty',
  }),
});

module.exports = {
  signupSchema,
  loginSchema,
};
