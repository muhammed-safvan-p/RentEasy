const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isBlock: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      trim: true,
      required: false,
      set: (v) => (!v || String(v).trim() === '' ? undefined : String(v).trim()),
      validate: {
        validator: function (v) {
          if (!v) return true; // allow legacy users with no phone
          const { isValidPhone } = require('../utils/phoneUtils');
          return isValidPhone(v);
        },
        message: 'Please provide a valid 10-digit mobile number starting with 6-9',
      },
    },
  },
  { timestamps: true }
);

// Normalize phone before saving if present (strip spaces, dashes, parentheses)
userSchema.pre('save', function () {
  if (this.phone && typeof this.phone === 'string') {
    const { normalizePhone } = require('../utils/phoneUtils');
    this.phone = normalizePhone(this.phone) || undefined;
  } else if (!this.phone) {
    this.phone = undefined;
  }
});

// Partial unique index: strictly enforces uniqueness only for documents with a string phone,
// ensuring existing users without a phone are completely ignored and never collide.
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
);

module.exports = mongoose.model('User', userSchema);
