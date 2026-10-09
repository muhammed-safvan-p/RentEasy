const Joi = require('joi');

const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Current password cannot be empty',
    'any.required': 'Current password is required',
  }),
  newPassword: Joi.string().min(6).max(128).required().messages({
    'string.min': 'New password must be at least 6 characters long',
    'string.max': 'New password cannot exceed 128 characters',
    'any.required': 'New password is required',
  }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Confirm password is required',
  }),
});

const addUserVehicleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Vehicle name is required',
    'string.min': 'Vehicle name must be at least 2 characters long',
    'string.max': 'Vehicle name cannot exceed 100 characters',
    'any.required': 'Vehicle name is required',
  }),
  plateNumber: Joi.string().trim().min(2).max(20).uppercase().required().messages({
    'string.empty': 'Registration plate number is required',
    'string.min': 'Registration plate number must be at least 2 characters long',
    'string.max': 'Registration plate number cannot exceed 20 characters',
    'any.required': 'Registration plate number is required',
  }),
  notes: Joi.string().trim().max(2000).allow('', null).optional().messages({
    'string.max': 'Notes cannot exceed 2000 characters',
  }),
  imageUrl: Joi.string().trim().uri().allow('', null).optional().messages({
    'string.uri': 'Image URL must be a valid web URL starting with http:// or https://',
  }),
  fuelType: Joi.string()
    .valid('Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG')
    .default('Diesel')
    .messages({
      'any.only': 'Fuel type must be Diesel, Petrol, Electric, Hybrid, or CNG',
    }),
  transmission: Joi.string().valid('Manual', 'Automatic').default('Manual').messages({
    'any.only': 'Transmission must be either Manual or Automatic',
  }),
  seatingCapacity: Joi.number().integer().min(1).max(100).default(5).messages({
    'number.base': 'Seating capacity must be a valid number',
    'number.integer': 'Seating capacity must be a whole number',
    'number.min': 'Seating capacity must be at least 1 seat',
    'number.max': 'Seating capacity cannot exceed 100 seats',
  }),
  initialCashBalance: Joi.number().default(0).messages({
    'number.base': 'Initial cash balance must be a valid number',
  }),
  initialBankBalance: Joi.number().default(0).messages({
    'number.base': 'Initial bank balance must be a valid number',
  }),
  ownerIds: Joi.array()
    .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'valid ObjectId'))
    .optional()
    .messages({
      'string.pattern.name': 'Each user ID must be a valid MongoDB ObjectId',
    }),
});

const updateUserVehicleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.empty': 'Vehicle name cannot be empty',
    'string.min': 'Vehicle name must be at least 2 characters long',
    'string.max': 'Vehicle name cannot exceed 100 characters',
  }),
  plateNumber: Joi.string().trim().min(2).max(20).uppercase().optional().messages({
    'string.empty': 'Registration plate number cannot be empty',
    'string.min': 'Registration plate number must be at least 2 characters long',
    'string.max': 'Registration plate number cannot exceed 20 characters',
  }),
  notes: Joi.string().trim().max(2000).allow('', null).optional().messages({
    'string.max': 'Notes cannot exceed 2000 characters',
  }),
  imageUrl: Joi.string().trim().uri().allow('', null).optional().messages({
    'string.uri': 'Image URL must be a valid web URL starting with http:// or https://',
  }),
  fuelType: Joi.string()
    .valid('Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG')
    .optional()
    .messages({
      'any.only': 'Fuel type must be Diesel, Petrol, Electric, Hybrid, or CNG',
    }),
  transmission: Joi.string().valid('Manual', 'Automatic').optional().messages({
    'any.only': 'Transmission must be either Manual or Automatic',
  }),
  seatingCapacity: Joi.number().integer().min(1).max(100).optional().messages({
    'number.base': 'Seating capacity must be a valid number',
    'number.integer': 'Seating capacity must be a whole number',
    'number.min': 'Seating capacity must be at least 1 seat',
    'number.max': 'Seating capacity cannot exceed 100 seats',
  }),
  ownerIds: Joi.array()
    .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'valid ObjectId'))
    .optional()
    .messages({
      'string.pattern.name': 'Each user ID must be a valid MongoDB ObjectId',
    }),
});

const updatePhoneSchema = Joi.object({
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

module.exports = {
  updatePasswordSchema,
  addUserVehicleSchema,
  updateUserVehicleSchema,
  updatePhoneSchema,
};
