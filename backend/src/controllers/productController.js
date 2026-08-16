import { Product } from '../models/Product.js';
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
