import mongoose from 'mongoose';

const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    alt: {
      type: String,
      default: '',
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const packageDetailsSchema = new mongoose.Schema(
  {
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
  {
    _id: false,
  },
);

const productSchema = new mongoose.Schema(
  {
    legacyId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    material: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    color: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    images: {
      type: [productImageSchema],
      validate: {
        validator(images) {
          return Array.isArray(images) && images.length > 0;
        },
        message: 'At least one product image is required.',
      },
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    keyFeatures: {
      type: [String],
      default: [],
    },
    whyLoveIt: {
      type: String,
      default: '',
      trim: true,
    },
    dimensions: {
      type: String,
      default: '',
      trim: true,
    },
    shippingReturns: {
      type: String,
      default: 'Complimentary express shipping on all orders. Returns are accepted within 30 days of delivery in their original condition.',
      trim: true,
    },
    moreInformation: {
      type: String,
      default: 'Each item is crafted in limited numbers to preserve its exclusivity. Contact our concierge for personalized styling advice.',
      trim: true,
    },
    packageDetails: {
      type: packageDetailsSchema,
      required: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    stock: {
      type: Number,
      default: 10,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 3,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

productSchema.virtual('image').get(function imageGetter() {
  const primaryImage = this.images.find((item) => item.isPrimary) || this.images[0];
  return primaryImage?.url || '';
});

productSchema.pre('validate', function ensurePrimaryImage(next) {
  if (!Array.isArray(this.images) || this.images.length === 0) {
    return next();
  }

  const hasPrimary = this.images.some((item) => item.isPrimary);

  if (!hasPrimary) {
    this.images[0].isPrimary = true;
  }

  this.images = this.images
    .map((item, index) => ({
      ...item.toObject?.() ?? item,
      order: typeof item.order === 'number' ? item.order : index,
    }))
    .sort((a, b) => a.order - b.order);

  next();
});

export const Product = mongoose.model('Product', productSchema);
