const mongoose = require('mongoose');
const { Schema } = mongoose;
const { roundCurrency } = require('../utils/currencyUtils');

const bookingSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: {
      type: String,
      trim: true,
      required: [true, 'Customer name is required'],
      minlength: [2, 'Customer name must be at least 2 characters'],
      maxlength: [100, 'Customer name cannot exceed 100 characters'],
    },
    startDateTime: {
      type: Date,
      required: true,
    },
    endDateTime: {
      type: Date,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount must be non-negative'],
      set: roundCurrency,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
      set: roundCurrency,
    },
    balanceAmount: {
      type: Number,
      required: true,
      set: roundCurrency,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refunded amount cannot be negative'],
      set: roundCurrency,
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancellationNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation note cannot exceed 500 characters'],
      default: null,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ vehicleId: 1, isCancelled: 1, endDateTime: 1, startDateTime: 1 });
bookingSchema.index({ startDateTime: -1, isCancelled: 1 });
bookingSchema.index({ vehicleId: 1, isCancelled: 1, startDateTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
