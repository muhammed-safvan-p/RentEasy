const mongoose = require('mongoose');
const { Schema } = mongoose;
const { roundCurrency } = require('../utils/currencyUtils');

const bookingPaymentSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
      set: roundCurrency,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank'],
      required: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Payment note cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

bookingPaymentSchema.index({ bookingId: 1, paidAt: -1 });
bookingPaymentSchema.index({ bookingId: 1, amount: 1 });
bookingPaymentSchema.index({ vehicleId: 1, paidAt: -1 });

module.exports = mongoose.model('BookingPayment', bookingPaymentSchema);
