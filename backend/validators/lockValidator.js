const Joi = require('joi');
const { objectId, monthFormat } = require('./customValidators');

const createLockSchema = Joi.object({
  startDate: Joi.date().iso().required().messages({
    'date.format': '"startDate" must be a valid ISO date (e.g. 2026-09-25)',
    'any.required': '"startDate" is required',
  }),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .required()
    .messages({
      'date.format': '"endDate" must be a valid ISO date',
      'date.min': '"endDate" must be on or after "startDate"',
      'any.required': '"endDate" is required',
    }),
  reason: Joi.string().trim().min(1).max(500).required().messages({
    'string.empty': 'Reason cannot be empty',
    'string.min': 'Reason must have at least 1 character',
    'string.max': 'Reason cannot exceed 500 characters',
    'any.required': 'Reason is required',
  }),
});

const lockIdParamSchema = Joi.object({
  id: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid vehicle ID format',
    'any.required': 'Vehicle ID is required',
  }),
  lockId: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid lock ID format',
    'any.required': 'Lock ID is required',
  }),
});

const getLocksMonthQuerySchema = Joi.object({
  month: monthFormat.optional(),
});

module.exports = {
  createLockSchema,
  lockIdParamSchema,
  getLocksMonthQuerySchema,
};
