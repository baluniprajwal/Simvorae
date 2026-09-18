import mongoose from 'mongoose';

const PAYMENT_STATUS = ['pending', 'authorized', 'failed'];

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
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
  },
  { _id: false },
);

const checkoutItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productSnapshot: {
      slug: {
        type: String,
        required: true,
        trim: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      category: {
        type: String,
        required: true,
        trim: true,
      },
      color: {
        type: String,
        required: true,
        trim: true,
      },
      material: {
        type: String,
        required: true,
        trim: true,
      },
      image: {
        type: String,
        required: true,
        trim: true,
      },
      unitPrice: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    packageSnapshot: {
      lengthCm: {
        type: Number,
        required: true,
        min: 0.1,
      },
      breadthCm: {
        type: Number,
        required: true,
        min: 0.1,
      },
      heightCm: {
        type: Number,
        required: true,
        min: 0.1,
      },
      weightKg: {
        type: Number,
        required: true,
        min: 0.01,
      },
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const totalsSchema = new mongoose.Schema(
  {
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shipping: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'INR',
    },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: PAYMENT_STATUS,
      required: true,
      default: 'pending',
      index: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false },
);

const checkoutAttemptSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customer: {
      type: customerSchema,
      required: true,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    items: {
      type: [checkoutItemSchema],
      required: true,
    },
    totals: {
      type: totalsSchema,
      required: true,
    },
    payment: {
      type: paymentSchema,
      required: true,
      default: () => ({}),
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    stockReserved: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    reservationExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    stockReleasedAt: {
      type: Date,
      default: null,
    },
    purgeAt: {
      type: Date,
      default: null,
      index: {
        expires: 0,
      },
    },
  },
  { timestamps: true },
);

checkoutAttemptSchema.index({ user: 1, createdAt: -1 });
checkoutAttemptSchema.index({ stockReserved: 1, reservationExpiresAt: 1 });

export const CheckoutAttempt = mongoose.model('CheckoutAttempt', checkoutAttemptSchema);
