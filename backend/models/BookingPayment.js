const mongoose = require('mongoose');
const { Schema } = mongoose;

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
    },
  },
  { timestamps: true }
);

bookingPaymentSchema.index({ bookingId: 1, paidAt: -1 });

module.exports = mongoose.model('BookingPayment', bookingPaymentSchema);
