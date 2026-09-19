const Joi = require('joi');
const { objectId } = require('./customValidators');

const bookingIdParamSchema = Joi.object({
  id: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid booking ID format',
    'any.required': 'Booking ID is required',
  }),
});

const createBookingSchema = Joi.object({
  vehicleId: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid vehicleId format',
    'any.required': 'vehicleId is required',
  }),
  customerName: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Customer name must be at least 2 characters',
    'string.max': 'Customer name cannot exceed 100 characters',
    'any.required': 'customerName is required',
  }),
  startDateTime: Joi.date().iso().required().messages({
    'date.format': 'startDateTime must be a valid ISO date/time',
    'any.required': 'startDateTime is required',
  }),
  endDateTime: Joi.date().iso().greater(Joi.ref('startDateTime')).required().messages({
    'date.format': 'endDateTime must be a valid ISO date/time',
    'date.greater': 'endDateTime must be strictly after startDateTime',
    'any.required': 'endDateTime is required',
  }),
  totalAmount: Joi.number().min(0).optional().messages({
    'number.min': 'totalAmount must be non-negative',
  }),
});

const updateBookingSchema = Joi.object({
  vehicleId: Joi.string().custom(objectId, 'MongoDB ObjectId').optional().messages({
    'any.invalid': 'Invalid vehicleId format',
  }),
  customerName: Joi.string().trim().min(2).max(100).optional(),
  startDateTime: Joi.date().iso().optional(),
  endDateTime: Joi.date().iso().optional(),
  totalAmount: Joi.number().min(0).optional().messages({
    'number.min': 'totalAmount must be non-negative',
  }),
});

const cancelBookingSchema = Joi.object({
  refundAmount: Joi.number().min(0).optional().messages({
    'number.min': 'refundAmount must be a non-negative number',
  }),
  refundPaymentMethod: Joi.when('refundAmount', {
    is: Joi.number().greater(0),
    then: Joi.string().valid('cash', 'bank').required().messages({
      'any.only': 'refundPaymentMethod must be either "cash" or "bank"',
      'any.required': 'refundPaymentMethod is required when refundAmount is greater than 0',
    }),
    otherwise: Joi.string().valid('cash', 'bank').optional(),
  }),
  cancellationNote: Joi.string().trim().max(500).allow('', null).optional(),
});

const recordPaymentSchema = Joi.object({
  amount: Joi.number().min(0.01).required().messages({
    'number.min': 'Payment amount must be at least 0.01',
    'any.required': 'amount is required',
  }),
  paymentMethod: Joi.string().valid('cash', 'bank').required().messages({
    'any.only': 'paymentMethod must be "cash" or "bank"',
    'any.required': 'paymentMethod is required',
  }),
  note: Joi.string().trim().max(500).allow('', null).optional(),
  paidAt: Joi.date().iso().optional(),
});

const listBookingsQuerySchema = Joi.object({
  vehicleId: Joi.string().custom(objectId, 'MongoDB ObjectId').optional(),
  isCancelled: Joi.boolean().truthy('true').falsy('false').optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  customerName: Joi.string().trim().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

module.exports = {
  bookingIdParamSchema,
  createBookingSchema,
  updateBookingSchema,
  cancelBookingSchema,
  recordPaymentSchema,
  listBookingsQuerySchema,
};
