  const mongoose = require('mongoose');
  const { Schema } = mongoose;

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
      },
      bankBalance: {
        type: Number,
        default: 0,
      },
    },
    { timestamps: true }
  );

  walletSchema.virtual('totalBalance').get(function () {
    return this.cashBalance + this.bankBalance;
  });

  walletSchema.set('toJSON', { virtuals: true });

  module.exports = mongoose.model('Wallet', walletSchema);
