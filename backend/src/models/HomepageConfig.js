import mongoose from 'mongoose';

const sectionSettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    subtitle: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 240 },
  },
  { _id: false },
);

const homepageConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'homepage',
      unique: true,
      immutable: true,
    },
    signatureSilhouettes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    artisanCrafted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    everydayCarry: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    sectionSettings: {
      signatureSilhouettes: {
        type: sectionSettingsSchema,
        default: () => ({
          enabled: true,
          title: 'Signature',
          subtitle: 'Silhouettes.',
          description: 'Discover iconic handbags that blend premium leatherwork with contemporary architectural forms.',
        }),
      },
      artisanCrafted: {
        type: sectionSettingsSchema,
        default: () => ({
          enabled: true,
          title: 'Artisan',
          subtitle: 'Crafted.',
          description: 'A continuous study of premium leather and structural utility. Discover handbags designed to develop character and outlast passing seasons.',
        }),
      },
      everydayCarry: {
        type: sectionSettingsSchema,
        default: () => ({
          enabled: true,
          title: 'Everyday',
          subtitle: 'Carry.',
          description: 'Foundation bags engineered to safely hold your essentials. From spacious totes to compact crossbodys.',
        }),
      },
    },
  },
  { timestamps: true },
);

export const HomepageConfig = mongoose.model('HomepageConfig', homepageConfigSchema);
