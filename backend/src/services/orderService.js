import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { createHttpError } from '../utils/createHttpError.js';
import {
  isValidEmail,
  isValidIndianPhone,
  isValidIndianPostalCode,
  normalizePhone,
} from '../utils/validators.js';

function createOrderNumber() {
  const date = new Date();
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `SIM-${year}${month}${day}-${random}`;
}

function validateShippingAddress(address) {
  const requiredFields = ['addressLine1', 'city', 'state', 'postalCode'];

  for (const field of requiredFields) {
    if (!address?.[field]?.trim()) {
      return `${field} is required.`;
    }
  }

  if (!isValidIndianPostalCode(address.postalCode)) {
    return 'A valid 6-digit postal code is required.';
  }

  return '';
}

function getPrimaryImage(product) {
  const primaryImage = product.images.find((image) => image.isPrimary) || product.images[0];
  return primaryImage?.url || '';
}

async function buildOrderItems(inputItems) {
  if (!Array.isArray(inputItems) || inputItems.length === 0) {
    throw createHttpError(400, 'At least one order item is required.');
  }

  const productIdentifiers = inputItems.map((item) => String(item.productId));
  const objectIds = productIdentifiers.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const legacyIds = productIdentifiers
    .filter((id) => /^\d+$/.test(id))
    .map((id) => Number(id));

  const products = await Product.find({
    $or: [
      ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
      ...(legacyIds.length > 0 ? [{ legacyId: { $in: legacyIds } }] : []),
    ],
    isActive: true,
  });
  const productsById = new Map();

  for (const product of products) {
    productsById.set(product._id.toString(), product);
    productsById.set(String(product.legacyId), product);
  }

  return inputItems.map((item) => {
    const product = productsById.get(String(item.productId));
    const quantity = Number(item.quantity);

    if (!product) {
      throw createHttpError(404, 'One or more products were not found.');
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw createHttpError(400, 'Product quantity must be at least 1.');
    }

    if (product.stock < quantity) {
      throw createHttpError(400, `${product.name} does not have enough stock.`);
    }

    return {
      product: product._id,
      productSnapshot: {
        legacyId: product.legacyId,
        slug: product.slug,
        name: product.name,
        category: product.category,
        color: product.color,
        material: product.material,
        image: getPrimaryImage(product),
        unitPrice: product.price,
      },
      quantity,
      lineTotal: product.price * quantity,
    };
  });
}

function validateCheckoutPhone(phone) {
  const normalizedPhone = normalizePhone(phone);

  if (!isValidIndianPhone(normalizedPhone)) {
    throw createHttpError(400, 'A valid Indian phone number is required.');
  }

  return normalizedPhone;
}

export async function createPendingOrder({ payload, user }) {
  const { customer, shippingAddress, items, notes = '' } = payload;

  if (!customer?.name?.trim()) {
    throw createHttpError(400, 'Customer name is required.');
  }

  const customerEmail = user?.email || customer?.email;

  if (!isValidEmail(customerEmail)) {
    throw createHttpError(400, 'Customer email is required.');
  }

  const checkoutPhone = validateCheckoutPhone(customer?.phone);
  const addressError = validateShippingAddress(shippingAddress);

  if (addressError) {
    throw createHttpError(400, addressError);
  }

  const orderItems = await buildOrderItems(items);
  const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = 0;
  const order = await Order.create({
    orderNumber: createOrderNumber(),
    user: user?._id,
    customer: {
      name: customer.name.trim(),
      phone: checkoutPhone,
      email: customerEmail.trim().toLowerCase(),
    },
    shippingAddress: {
      addressLine1: shippingAddress.addressLine1.trim(),
      city: shippingAddress.city.trim(),
      state: shippingAddress.state.trim(),
      postalCode: shippingAddress.postalCode.trim(),
      country: shippingAddress.country?.trim() || 'India',
    },
    items: orderItems,
    totals: {
      subtotal,
      shipping,
      total: subtotal + shipping,
      currency: 'INR',
    },
    notes: notes.trim(),
  });

  if (user) {
    user.phone = checkoutPhone;
    user.lastOrderAt = new Date();
    await user.save();
  }

  return order;
}
