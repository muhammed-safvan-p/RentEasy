const mongoose = require('mongoose');
const { Schema } = mongoose;

const vehicleLockSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    lockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      required: [true, 'Reason is required and cannot be empty'],
      minlength: [1, 'Reason cannot be empty'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

// Compound index for fast overlap range queries
vehicleLockSchema.index({ vehicleId: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('VehicleLock', vehicleLockSchema);
