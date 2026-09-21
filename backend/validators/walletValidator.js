const Joi = require('joi');
const { objectId, monthFormat } = require('./customValidators');

const walletVehicleParamSchema = Joi.object({
  vehicleId: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid vehicleId format',
    'any.required': 'vehicleId is required',
  }),
});

const walletTransactionParamSchema = Joi.object({
  vehicleId: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid vehicleId format',
  }),
  id: Joi.string().custom(objectId, 'MongoDB ObjectId').required().messages({
    'any.invalid': 'Invalid transaction ID format',
    'any.required': 'Transaction ID is required',
  }),
});

const getWalletTransactionsQuerySchema = Joi.object({
  month: monthFormat.optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(100),
});

const addTransactionSchema = Joi.object({
  type: Joi.string().valid('income', 'expense').required().messages({
    'any.only': 'type must be either "income" or "expense"',
    'any.required': 'type is required',
  }),
  paymentMethod: Joi.string().valid('cash', 'bank').required().messages({
    'any.only': 'paymentMethod must be either "cash" or "bank"',
    'any.required': 'paymentMethod is required',
  }),
  amount: Joi.number().min(0.01).required().messages({
    'number.min': 'amount must be at least 0.01',
    'any.required': 'amount is required',
  }),
  note: Joi.string().trim().max(500).allow('', null).optional(),
  source: Joi.string().valid('booking', 'manual').default('manual'),
  bookingId: Joi.string().custom(objectId, 'MongoDB ObjectId').allow(null, '').optional(),
  transactionDate: Joi.date().iso().optional(),
});

const editTransactionSchema = Joi.object({
  type: Joi.string().valid('income', 'expense').optional(),
  paymentMethod: Joi.string().valid('cash', 'bank').optional(),
  amount: Joi.number().min(0.01).optional().messages({
    'number.min': 'amount must be at least 0.01',
  }),
  note: Joi.string().trim().max(500).allow('', null).optional(),
});

module.exports = {
  walletVehicleParamSchema,
  walletTransactionParamSchema,
  getWalletTransactionsQuerySchema,
  addTransactionSchema,
  editTransactionSchema,
};
