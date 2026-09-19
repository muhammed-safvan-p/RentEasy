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
  dailyRate: Joi.number().min(0).default(0),
  hourlyRate: Joi.number().min(0).default(0),
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
  dailyRate: Joi.number().min(0).optional(),
  hourlyRate: Joi.number().min(0).optional(),
});

module.exports = {
  adminVehicleParamSchema,
  adminUserParamSchema,
  addVehicleSchema,
  updateVehicleSchema,
};
