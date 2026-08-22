import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: '',
    },
    fullName: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'India',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      index: true,
      sparse: true,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
      index: true,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
      default: '',
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
      default: null,
    },
    source: {
      type: String,
      enum: ['direct', 'admin'],
      default: 'direct',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
      required: true,
    },
    addresses: {
      type: [addressSchema],
      default: [],
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastOrderAt: {
      type: Date,
      default: null,
    },
    isPortalEnabled: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ source: 1, createdAt: -1 });

export const User = mongoose.model('User', userSchema);
