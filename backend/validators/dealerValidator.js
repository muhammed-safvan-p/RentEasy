const Joi = require('joi');
const { objectId } = require('./customValidators');

const createDealerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'Dealer name cannot be empty',
    'string.min': 'Dealer name must be at least 1 character',
    'string.max': 'Dealer name cannot exceed 100 characters',
    'any.required': 'Dealer name is required',
  }),
});

const updateDealerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'Dealer name cannot be empty',
    'string.min': 'Dealer name must be at least 1 character',
    'string.max': 'Dealer name cannot exceed 100 characters',
    'any.required': 'Dealer name is required',
  }),
});

const dealerIdParamSchema = Joi.object({
  id: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid vehicle ID format',
    'any.required': 'Vehicle ID is required',
  }),
  dealerId: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid dealer ID format',
    'any.required': 'Dealer ID is required',
  }),
});

module.exports = {
  createDealerSchema,
  updateDealerSchema,
  dealerIdParamSchema,
};
