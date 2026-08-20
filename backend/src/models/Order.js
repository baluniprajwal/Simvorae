import mongoose from 'mongoose';

const ORDER_STATUS = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const PAYMENT_STATUS = ['pending', 'authorized', 'paid', 'failed', 'refunded'];

const SHIPPING_STATUS = ['not_created', 'created', 'in_transit', 'delivered', 'cancelled', 'failed'];

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

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productSnapshot: {
      legacyId: {
        type: Number,
        required: true,
      },
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
    provider: {
      type: String,
      required: true,
      trim: true,
      default: 'razorpay',
    },
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
    razorpaySignature: {
      type: String,
      trim: true,
      default: '',
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const shippingSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      trim: true,
      default: 'shiprocket',
    },
    status: {
      type: String,
      enum: SHIPPING_STATUS,
      required: true,
      default: 'not_created',
      index: true,
    },
    shipmentId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    shiprocketOrderId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    awbCode: {
      type: String,
      trim: true,
      default: '',
    },
    courierName: {
      type: String,
      trim: true,
      default: '',
    },
    trackingUrl: {
      type: String,
      trim: true,
      default: '',
    },
    pickupStatus: {
      type: String,
      trim: true,
      default: '',
    },
    pickupTokenNumber: {
      type: String,
      trim: true,
      default: '',
    },
    pickupScheduledAt: {
      type: Date,
      default: null,
    },
    currentStatus: {
      type: String,
      trim: true,
      default: '',
    },
    statusCode: {
      type: Number,
      default: null,
    },
    trackingNotifiedAt: {
      type: Date,
      default: null,
    },
    shippedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const shipmentAttemptSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      trim: true,
      default: 'shiprocket',
    },
    status: {
      type: String,
      enum: SHIPPING_STATUS,
      required: true,
      default: 'cancelled',
    },
    shipmentId: {
      type: String,
      trim: true,
      default: '',
    },
    shiprocketOrderId: {
      type: String,
      trim: true,
      default: '',
    },
    awbCode: {
      type: String,
      trim: true,
      default: '',
    },
    courierName: {
      type: String,
      trim: true,
      default: '',
    },
    trackingUrl: {
      type: String,
      trim: true,
      default: '',
    },
    pickupStatus: {
      type: String,
      trim: true,
      default: '',
    },
    currentStatus: {
      type: String,
      trim: true,
      default: '',
    },
    cancelledAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
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
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'At least one order item is required.',
      },
    },
    totals: {
      type: totalsSchema,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUS,
      required: true,
      default: 'pending',
      index: true,
    },
    payment: {
      type: paymentSchema,
      required: true,
      default: () => ({}),
    },
    stockDebited: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    shipping: {
      type: shippingSchema,
      required: true,
      default: () => ({}),
    },
    shipmentAttempts: {
      type: [shipmentAttemptSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    placedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ 'customer.phone': 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1, createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
