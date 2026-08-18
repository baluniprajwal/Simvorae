import { Product } from '../models/Product.js';
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

function buildProductPayload(body) {
  const images = normalizeProductImages(body.images || [], body.name);

  return {
    name: body.name.trim(),
    slug: createSlug(body.slug || body.name),
    price: Number(body.price),
    category: body.category.trim(),
    material: body.material.trim(),
    color: body.color.trim(),
    images,
    description: String(body.description || '').trim(),
    featured: Boolean(body.featured),
    stock: Number(body.stock ?? body.stockQuantity ?? 0),
    lowStockThreshold: Number(body.lowStockThreshold ?? 3),
    isActive: body.isActive ?? true,
  };
}

function getProductIdentityQuery(id) {
  const or = [{ legacyId: Number(id) || -1 }];

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
    return;
  }

  const results = await Promise.allSettled(uniqueKeys.map((key) => deleteImageObject(key)));
  const failedCount = results.filter((result) => result.status === 'rejected').length;

  if (failedCount > 0) {
    console.error(`Failed to delete ${failedCount} product image(s) from S3.`);
  }
}

function getRemovedProductImageKeys(previousImages, nextImages) {
  const nextKeys = new Set(nextImages.map((image) => getProductImageKey(image.url)));

  return previousImages
    .map((image) => getProductImageKey(image.url))
    .filter((key) => key && !nextKeys.has(key));
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

export async function createProduct(req, res, next) {
  try {
    const payload = buildProductPayload(req.body);
    const lastProduct = await Product.findOne({}).sort({ legacyId: -1 }).select('legacyId');

    const product = await Product.create({
      ...payload,
      legacyId: (lastProduct?.legacyId || 0) + 1,
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(createHttpError(409, 'Product slug or legacy ID already exists.'));
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
    deleteProductImageKeys(removedImageKeys);

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

    deleteProductImageKeys(product.images.map((image) => getProductImageKey(image.url)));

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
      $or: [{ legacyId: Number(id) || -1 }, { slug: id }],
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
