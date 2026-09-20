const mongoose = require('mongoose');
const { Schema } = mongoose;

const operationalNoteSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
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
      required: true,
      trim: true,
    },
    plateNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
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

module.exports = mongoose.model('Vehicle', vehicleSchema);
