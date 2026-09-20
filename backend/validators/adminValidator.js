const Joi = require('joi');
const { objectId } = require('./customValidators');

const adminVehicleParamSchema = Joi.object({
  id: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid vehicle ID format',
    'any.required': 'Vehicle ID is required',
  }),
});

const adminUserParamSchema = Joi.object({
  id: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid user ID format',
    'any.required': 'User ID is required',
  }),
});

const addVehicleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Vehicle name is required',
    'any.required': 'Vehicle name is required',
  }),
  plateNumber: Joi.string().trim().min(2).max(20).uppercase().required().messages({
    'string.empty': 'Plate number is required',
    'any.required': 'Plate number is required',
  }),
  ownerIds: Joi.array().items(Joi.string().custom(objectId, 'MongoDB ObjectId')).default([]),
  notes: Joi.string().trim().max(2000).allow('', null).optional(),
  imageUrl: Joi.string().trim().uri().allow('', null).optional(),
  fuelType: Joi.string().valid('Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG').default('Diesel'),
  transmission: Joi.string().valid('Manual', 'Automatic').default('Manual'),
  seatingCapacity: Joi.number().integer().min(1).max(100).default(5),
  initialCashBalance: Joi.number().min(0).default(0),
  initialBankBalance: Joi.number().min(0).default(0),
});

const updateVehicleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Vehicle name is required',
    'any.required': 'Vehicle name is required',
  }),
  plateNumber: Joi.string().trim().min(2).max(20).uppercase().required().messages({
    'string.empty': 'Plate number is required',
    'any.required': 'Plate number is required',
  }),
  ownerIds: Joi.array().items(Joi.string().custom(objectId, 'MongoDB ObjectId')).optional(),
  notes: Joi.string().trim().max(2000).allow('', null).optional(),
  imageUrl: Joi.string().trim().uri().allow('', null).optional(),
  fuelType: Joi.string().valid('Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG').optional(),
  transmission: Joi.string().valid('Manual', 'Automatic').optional(),
  seatingCapacity: Joi.number().integer().min(1).max(100).optional(),
});

const createUserSchema = Joi.object({
  username: Joi.string().trim().min(3).max(30).required().messages({
    'string.empty': 'Username is required',
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username cannot exceed 30 characters',
    'any.required': 'Username is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
  role: Joi.string().valid('user', 'admin').default('user'),
  isBlock: Joi.boolean().default(false),
});

const updateUserSchema = Joi.object({
  username: Joi.string().trim().min(3).max(30).optional().messages({
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username cannot exceed 30 characters',
  }),
  password: Joi.string().min(6).allow('', null).optional().messages({
    'string.min': 'Password must be at least 6 characters',
  }),
  role: Joi.string().valid('user', 'admin').optional(),
  isBlock: Joi.boolean().optional(),
});

module.exports = {
  adminVehicleParamSchema,
  adminUserParamSchema,
  addVehicleSchema,
  updateVehicleSchema,
  createUserSchema,
  updateUserSchema,
};
