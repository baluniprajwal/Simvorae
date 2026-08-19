const allowedSortValues = new Set(['featured', 'price_asc', 'price_desc', 'newest']);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function isNumericString(value) {
  return /^\d+$/.test(value);
}

export function validateProductQuery(req, _res, next) {
  const { search, category, color, material, sort, minPrice, maxPrice } = req.query;

  if (search !== undefined) {
    if (typeof search !== 'string') {
      return next(createValidationError('search must be a string.'));
    }

    if (search.trim().length > 100) {
      return next(createValidationError('search must not exceed 100 characters.'));
    }
  }

  for (const [key, value] of Object.entries({ category, color, material })) {
    if (value !== undefined && typeof value !== 'string') {
      return next(createValidationError(`${key} must be a string.`));
    }
  }

  if (sort !== undefined && !allowedSortValues.has(sort)) {
    return next(createValidationError('sort must be one of featured, price_asc, price_desc, or newest.'));
  }

  let parsedMinPrice;
  let parsedMaxPrice;

  if (minPrice !== undefined) {
    parsedMinPrice = Number(minPrice);
    if (Number.isNaN(parsedMinPrice) || parsedMinPrice < 0) {
      return next(createValidationError('minPrice must be a valid non-negative number.'));
    }
  }

  if (maxPrice !== undefined) {
    parsedMaxPrice = Number(maxPrice);
    if (Number.isNaN(parsedMaxPrice) || parsedMaxPrice < 0) {
      return next(createValidationError('maxPrice must be a valid non-negative number.'));
    }
  }

  if (
    parsedMinPrice !== undefined &&
    parsedMaxPrice !== undefined &&
    parsedMinPrice > parsedMaxPrice
  ) {
    return next(createValidationError('minPrice cannot be greater than maxPrice.'));
  }

  next();
}

export function validateProductIdentifier(req, _res, next) {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return next(createValidationError('Product identifier is required.'));
  }

  if (!isNumericString(id) && !slugPattern.test(id)) {
    return next(createValidationError('Product identifier must be a numeric id or a valid slug.'));
  }

  next();
}

export function validateAdminProductBody(req, _res, next) {
  const {
    name,
    price,
    category,
    material,
    color,
    images,
    stock,
    stockQuantity,
    lowStockThreshold,
    isActive,
    keyFeatures,
    whyLoveIt,
    dimensions,
    shippingReturns,
    moreInformation,
    packageDetails,
  } = req.body;

  for (const [key, value] of Object.entries({ name, category, material, color })) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return next(createValidationError(`${key} is required.`));
    }

    if (value.trim().length > 120) {
      return next(createValidationError(`${key} must not exceed 120 characters.`));
    }
  }

  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    return next(createValidationError('price must be a valid non-negative number.'));
  }

  if (!packageDetails || typeof packageDetails !== 'object' || Array.isArray(packageDetails)) {
    return next(createValidationError('Shiprocket package details are required.'));
  }

  for (const [key, value] of Object.entries({
    lengthCm: packageDetails.lengthCm,
    breadthCm: packageDetails.breadthCm,
    heightCm: packageDetails.heightCm,
    weightKg: packageDetails.weightKg,
  })) {
    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return next(createValidationError(`${key} must be a positive number.`));
    }
  }

  if (!Array.isArray(images) || images.length === 0) {
    return next(createValidationError('At least one product image is required.'));
  }

  if (images.some((image) => typeof image !== 'string' || image.trim().length === 0)) {
    return next(createValidationError('Every product image must be a valid URL.'));
  }

  if (keyFeatures !== undefined) {
    if (!Array.isArray(keyFeatures)) {
      return next(createValidationError('keyFeatures must be an array of text values.'));
    }

    if (keyFeatures.length > 8) {
      return next(createValidationError('keyFeatures must not exceed 8 items.'));
    }

    if (keyFeatures.some((feature) => typeof feature !== 'string' || feature.trim().length > 120)) {
      return next(createValidationError('Each key feature must be text under 120 characters.'));
    }
  }

  for (const [key, value] of Object.entries({ whyLoveIt, dimensions, shippingReturns, moreInformation })) {
    if (value !== undefined && (typeof value !== 'string' || value.trim().length > 1000)) {
      return next(createValidationError(`${key} must be text under 1000 characters.`));
    }
  }

  const parsedStock = Number(stock ?? stockQuantity ?? 0);
  if (!Number.isInteger(parsedStock) || parsedStock < 0) {
    return next(createValidationError('stock must be a non-negative integer.'));
  }

  const parsedLowStockThreshold = Number(lowStockThreshold ?? 3);
  if (!Number.isInteger(parsedLowStockThreshold) || parsedLowStockThreshold < 0) {
    return next(createValidationError('lowStockThreshold must be a non-negative integer.'));
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return next(createValidationError('isActive must be a boolean.'));
  }

  next();
}
