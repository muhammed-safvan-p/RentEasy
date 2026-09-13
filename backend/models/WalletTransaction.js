const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletTransactionSchema = new Schema(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true, // kept here too for fast filtering without a join
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    note: {
      type: String,
      trim: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ['booking', 'manual'],
      default: 'manual',
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ walletId: 1, transactionDate: -1 });
walletTransactionSchema.index({ vehicleId: 1, transactionDate: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
