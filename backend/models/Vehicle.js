const mongoose = require('mongoose');
const { Schema } = mongoose;

const operationalNoteSchema = new Schema(
  {
    text: {
      type: String,
      required: [true, 'Note text is required'],
      trim: true,
      maxlength: [1000, 'Operational note cannot exceed 1000 characters'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

const vehicleSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Vehicle name is required'],
      trim: true,
      minlength: [2, 'Vehicle name must be at least 2 characters'],
      maxlength: [100, 'Vehicle name cannot exceed 100 characters'],
    },
    plateNumber: {
      type: String,
      required: [true, 'Plate number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, 'Plate number must be at least 2 characters'],
      maxlength: [20, 'Plate number cannot exceed 20 characters'],
    },
    ownerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    imageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    operationalNotes: [operationalNoteSchema],
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'],
      default: 'Diesel',
    },
    transmission: {
      type: String,
      enum: ['Manual', 'Automatic'],
      default: 'Manual',
    },
    seatingCapacity: {
      type: Number,
      default: 5,
      min: [1, 'Seating capacity must be at least 1'],
      max: [100, 'Seating capacity cannot exceed 100'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bookingVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

vehicleSchema.index({ ownerIds: 1 });
vehicleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
