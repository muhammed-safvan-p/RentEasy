const mongoose = require('mongoose');
const { Schema } = mongoose;
const { roundCurrency } = require('../utils/currencyUtils');

const walletSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      unique: true, // one wallet per vehicle
    },
    cashBalance: {
      type: Number,
      default: 0,
      required: true,
      set: roundCurrency,
    },
    bankBalance: {
      type: Number,
      default: 0,
      required: true,
      set: roundCurrency,
    },
  },
  { timestamps: true }
);

walletSchema.virtual('totalBalance').get(function () {
  return roundCurrency((this.cashBalance || 0) + (this.bankBalance || 0));
});

  walletSchema.set('toJSON', { virtuals: true });

  module.exports = mongoose.model('Wallet', walletSchema);
