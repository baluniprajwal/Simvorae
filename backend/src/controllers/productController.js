import { Product } from '../models/Product.js';
import { HomepageConfig } from '../models/HomepageConfig.js';
import { deleteImageObject } from '../services/s3Service.js';
import { createHttpError } from '../utils/createHttpError.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPriceFilter(minPrice, maxPrice) {
  const price = {};

  if (minPrice !== undefined) {
    price.$gte = Number(minPrice);
  }

  if (maxPrice !== undefined) {
    price.$lte = Number(maxPrice);
  }

  return Object.keys(price).length > 0 ? price : undefined;
}

function createSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeProductImages(images, name) {
  return images
    .filter((image) => typeof image === 'string' && image.trim())
    .map((url, index) => ({
      url: url.trim(),
      alt: name,
      isPrimary: index === 0,
      order: index,
    }));
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim());
}

function buildProductPayload(body) {
  const images = normalizeProductImages(body.images || [], body.name);
  const packageDetails = body.packageDetails || {};

  return {
    name: body.name.trim(),
    slug: createSlug(body.slug || body.name),
    price: Number(body.price),
    category: body.category.trim(),
    material: body.material.trim(),
    color: body.color.trim(),
    images,
    description: String(body.description || '').trim(),
    keyFeatures: normalizeStringList(body.keyFeatures),
    whyLoveIt: String(body.whyLoveIt || '').trim(),
    dimensions: String(body.dimensions || '').trim(),
    shippingReturns: String(body.shippingReturns || '').trim(),
    moreInformation: String(body.moreInformation || '').trim(),
    packageDetails: {
      lengthCm: Number(packageDetails.lengthCm),
      breadthCm: Number(packageDetails.breadthCm),
      heightCm: Number(packageDetails.heightCm),
      weightKg: Number(packageDetails.weightKg),
    },
    featured: Boolean(body.featured),
    stock: Number(body.stock ?? body.stockQuantity ?? 0),
    lowStockThreshold: Number(body.lowStockThreshold ?? 3),
    isActive: body.isActive ?? true,
  };
}

function getProductIdentityQuery(id) {
  const or = [{ slug: id }];

  if (/^[a-f\d]{24}$/i.test(id)) {
    or.push({ _id: id });
  }

  return { $or: or };
}

function getProductImageKey(url) {
  if (typeof url !== 'string' || !url.includes('/api/uploads/images/products/')) {
    return '';
  }

  const [, key] = url.split('/api/uploads/images/');
  return key?.startsWith('products/') ? key : '';
}

async function deleteProductImageKeys(keys) {
  const uniqueKeys = [...new Set(keys.filter(Boolean))];

  if (uniqueKeys.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(uniqueKeys.map((key) => deleteImageObject(key)));
  const failedKeys = results
    .map((result, index) => (result.status === 'rejected' ? uniqueKeys[index] : ''))
    .filter(Boolean);

  if (failedKeys.length > 0) {
    console.error('Failed to delete product image(s) from S3:', failedKeys);
  }

  return failedKeys;
}

function getRemovedProductImageKeys(previousImages, nextImages) {
  const nextKeys = new Set(nextImages.map((image) => getProductImageKey(image.url)));

  return previousImages
    .map((image) => getProductImageKey(image.url))
    .filter((key) => key && !nextKeys.has(key));
}

const homepageSections = {
  signatureSilhouettes: 5,
  artisanCrafted: 3,
  everydayCarry: 4,
};

const defaultHomepageSettings = {
  signatureSilhouettes: {
    enabled: true,
    title: 'Signature',
    subtitle: 'Silhouettes.',
    description: 'Discover iconic handbags that blend premium leatherwork with contemporary architectural forms.',
  },
  artisanCrafted: {
    enabled: true,
    title: 'Artisan',
    subtitle: 'Crafted.',
    description: 'A continuous study of premium leather and structural utility. Discover handbags designed to develop character and outlast passing seasons.',
  },
  everydayCarry: {
    enabled: true,
    title: 'Everyday',
    subtitle: 'Carry.',
    description: 'Foundation bags engineered to safely hold your essentials. From spacious totes to compact crossbodys.',
  },
};

function normalizeHomepageSettings(value = {}) {
  return Object.fromEntries(Object.keys(homepageSections).map((section) => {
    const defaults = defaultHomepageSettings[section];
    const settings = value?.[section] || {};
    const title = String(settings.title ?? defaults.title).trim();
    const subtitle = String(settings.subtitle ?? defaults.subtitle).trim();
    const description = String(settings.description ?? defaults.description).trim();

    if (!title || !subtitle || !description) {
      throw createHttpError(400, 'Homepage section headings and descriptions cannot be empty.');
    }
    if (title.length > 80 || subtitle.length > 80 || description.length > 240) {
      throw createHttpError(400, 'Homepage section text is too long.');
    }

    return [section, {
      enabled: settings.enabled !== false,
      title,
      subtitle,
      description,
    }];
  }));
}

function serializeHomepageSettings(config) {
  return Object.fromEntries(Object.keys(homepageSections).map((section) => [
    section,
    {
      ...defaultHomepageSettings[section],
      ...(config?.sectionSettings?.[section]?.toObject?.() || config?.sectionSettings?.[section] || {}),
    },
  ]));
}

function normalizeHomepageSelection(value, limit) {
  if (!Array.isArray(value)) {
    throw createHttpError(400, `Select exactly ${limit} products for this homepage section.`);
  }

  const productIds = value.map((id) => String(id || '').trim()).filter(Boolean);
  if (productIds.length !== limit) {
    throw createHttpError(400, `Select exactly ${limit} products for this homepage section.`);
  }

  if (productIds.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
    throw createHttpError(400, 'One or more selected homepage products are invalid.');
  }

  if (new Set(productIds).size !== productIds.length) {
    throw createHttpError(400, 'A product can only appear once within a homepage section.');
  }

  return productIds;
}

function serializeHomepageConfig(config) {
  return Object.fromEntries(
    Object.keys(homepageSections).map((section) => [
      section,
      (config?.[section] || []).map((product) => String(product?._id || product)),
    ]),
  );
}

async function getHomepageFallback() {
  const products = await Product.find({ isActive: true })
    .sort({ featured: -1, createdAt: -1 })
    .limit(12);

  return {
    signatureSilhouettes: products.slice(0, 5),
    artisanCrafted: products.slice(0, 3),
    everydayCarry: products.slice(0, 4),
  };
}

async function fillPublicHomepageSections(config) {
  const fallback = await getHomepageFallback();

  return Object.fromEntries(Object.entries(homepageSections).map(([section, limit]) => {
    const configured = (config[section] || []).filter(Boolean);
    const usedIds = new Set(configured.map((product) => String(product._id)));
    const replacements = fallback[section].filter((product) => !usedIds.has(String(product._id)));
    return [section, [...configured, ...replacements].slice(0, limit)];
  }));
}

export async function getHomepageProducts(_req, res, next) {
  try {
    const config = await HomepageConfig.findOne({ key: 'homepage' }).populate(
      Object.keys(homepageSections).map((path) => ({ path, match: { isActive: true } })),
    );
    const sections = config ? await fillPublicHomepageSections(config) : await getHomepageFallback();

    return res.status(200).json({
      success: true,
      sections,
      settings: serializeHomepageSettings(config),
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAdminHomepageConfig(_req, res, next) {
  try {
    const config = await HomepageConfig.findOne({ key: 'homepage' });
    const sections = config ? serializeHomepageConfig(config) : serializeHomepageConfig(await getHomepageFallback());
    return res.status(200).json({
      success: true,
      sections,
      settings: serializeHomepageSettings(config),
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdminHomepageConfig(req, res, next) {
  try {
    const sections = Object.fromEntries(
      Object.entries(homepageSections).map(([section, limit]) => [
        section,
        normalizeHomepageSelection(req.body?.sections?.[section] ?? [], limit),
      ]),
    );
    const selectedIds = [...new Set(Object.values(sections).flat())];
    const settings = normalizeHomepageSettings(req.body?.settings);
    const existingCount = await Product.countDocuments({
      _id: { $in: selectedIds },
      isActive: true,
    });

    if (existingCount !== selectedIds.length) {
      return next(createHttpError(400, 'One or more selected products are hidden or no longer exist.'));
    }

    const config = await HomepageConfig.findOneAndUpdate(
      { key: 'homepage' },
      { $set: { ...sections, sectionSettings: settings }, $setOnInsert: { key: 'homepage' } },
      { new: true, upsert: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message: 'Homepage products updated successfully.',
      sections: serializeHomepageConfig(config),
      settings: serializeHomepageSettings(config),
    });
  } catch (error) {
    return next(error);
  }
}

export async function getProducts(req, res, next) {
  try {
    const {
      search,
      category,
      color,
      material,
      sort = 'featured',
      minPrice,
      maxPrice,
    } = req.query;

    const query = { isActive: true };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (color && color !== 'All') {
      query.color = color;
    }

    if (material && material !== 'All') {
      query.material = material;
    }

    const priceFilter = buildPriceFilter(minPrice, maxPrice);
    if (priceFilter) {
      query.price = priceFilter;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { name: regex },
        { category: regex },
        { description: regex },
        { material: regex },
        { color: regex },
      ];
    }

    let sortOption = { featured: -1, createdAt: -1 };
    if (sort === 'price_asc') {
      sortOption = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOption = { price: -1 };
    } else if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    }

    const products = await Product.find(query).sort(sortOption);

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(createHttpError(500, 'Failed to fetch products.'));
  }
}

export async function getAdminProducts(_req, res, next) {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    return next(createHttpError(500, 'Failed to fetch admin products.'));
  }
}

export async function getAdminProductCategoryStats(_req, res, next) {
  try {
    const categories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: ['$isActive', 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1,
          activeCount: 1,
        },
      },
      { $sort: { count: -1, category: 1 } },
    ]);

    const total = categories.reduce((sum, item) => sum + item.count, 0);

    return res.status(200).json({
      success: true,
      total,
      categories: categories.map((item) => ({
        ...item,
        ratio: total > 0 ? Math.round((item.count / total) * 100) : 0,
      })),
    });
  } catch (error) {
    return next(createHttpError(500, 'Failed to fetch product category stats.'));
  }
}

export async function createProduct(req, res, next) {
  try {
    const payload = buildProductPayload(req.body);
    const product = await Product.create(payload);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(createHttpError(409, 'Product slug already exists.'));
    }

    return next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const payload = buildProductPayload(req.body);
    const existingProduct = await Product.findOne(getProductIdentityQuery(req.params.id));

    if (!existingProduct) {
      return next(createHttpError(404, 'Product not found.'));
    }

    const product = await Product.findOneAndUpdate(
      getProductIdentityQuery(req.params.id),
      payload,
      {
        new: true,
        runValidators: true,
      },
    );

    const removedImageKeys = getRemovedProductImageKeys(existingProduct.images, payload.images);
    await deleteProductImageKeys(removedImageKeys);

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(createHttpError(409, 'Product slug already exists.'));
    }

    return next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findOneAndDelete({
      ...getProductIdentityQuery(req.params.id),
    });

    if (!product) {
      return next(createHttpError(404, 'Product not found.'));
    }

    await deleteProductImageKeys(product.images.map((image) => getProductImageKey(image.url)));
    await HomepageConfig.updateOne(
      { key: 'homepage' },
      { $pull: Object.fromEntries(Object.keys(homepageSections).map((section) => [section, product._id])) },
    );

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      ...getProductIdentityQuery(id),
      isActive: true,
    });

    if (!product) {
      return next(createHttpError(404, 'Product not found.'));
    }

    const similarProducts = await Product.find({
      category: product.category,
      isActive: true,
      _id: { $ne: product._id },
    })
      .limit(4)
      .sort({ featured: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      product,
      similarProducts,
    });
  } catch (error) {
    return next(createHttpError(500, 'Failed to fetch product.'));
  }
}

export async function getProductFilters(_req, res, next) {
  try {
    const [categories, colors, materials] = await Promise.all([
      Product.distinct('category', { isActive: true }),
      Product.distinct('color', { isActive: true }),
      Product.distinct('material', { isActive: true }),
    ]);

    res.status(200).json({
      success: true,
      filters: {
        categories: categories.sort(),
        colors: colors.sort(),
        materials: materials.sort(),
      },
    });
  } catch (error) {
    next(createHttpError(500, 'Failed to fetch product filters.'));
  }
}
