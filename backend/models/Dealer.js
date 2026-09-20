const mongoose = require('mongoose');
const { Schema } = mongoose;

const dealerSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Dealer name is required and cannot be empty'],
      trim: true,
      minlength: [1, 'Dealer name cannot be empty'],
      maxlength: [100, 'Dealer name cannot exceed 100 characters'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Compound unique index per vehicle (case-insensitive)
dealerSchema.index(
  { vehicleId: 1, name: 1 },
  {
    unique: true,
    collation: { locale: 'en', strength: 2 },
  }
);

module.exports = mongoose.model('Dealer', dealerSchema);
