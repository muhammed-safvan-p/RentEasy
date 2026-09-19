const Joi = require('joi');
const { objectId, monthFormat } = require('./customValidators');

const vehicleIdParamSchema = Joi.object({
  id: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid vehicle ID format',
    'any.required': 'Vehicle ID is required',
  }),
});

const addOperationalNoteSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required().messages({
    'string.empty': 'Note text cannot be empty',
    'string.min': 'Note text must have at least 1 character',
    'string.max': 'Note text cannot exceed 2000 characters',
    'any.required': 'Note text is required',
  }),
});

const deleteOperationalNoteParamSchema = Joi.object({
  id: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid vehicle ID format',
  }),
  noteId: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid note ID format',
  }),
});

const getBookingsMonthQuerySchema = Joi.object({
  month: monthFormat.optional(),
});

const getCalendarQuerySchema = Joi.object({
  from: Joi.date().iso().optional().messages({
    'date.format': '"from" must be a valid ISO date',
  }),
  to: Joi.date().iso().optional().messages({
    'date.format': '"to" must be a valid ISO date',
  }),
  includeCancelled: Joi.boolean().truthy('true').falsy('false').optional(),
});

module.exports = {
  vehicleIdParamSchema,
  addOperationalNoteSchema,
  deleteOperationalNoteParamSchema,
  getBookingsMonthQuerySchema,
  getCalendarQuerySchema,
};
