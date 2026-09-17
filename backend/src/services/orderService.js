import mongoose from 'mongoose';
import { CheckoutAttempt } from '../models/CheckoutAttempt.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { createHttpError } from '../utils/createHttpError.js';
import {
  isValidEmail,
  isValidIndianPhone,
  isValidIndianPostalCode,
  normalizePhone,
} from '../utils/validators.js';

const CHECKOUT_RESERVATION_MINUTES = 20;

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
  const slugs = productIdentifiers.filter((id) => !mongoose.Types.ObjectId.isValid(id));

  const products = await Product.find({
    $or: [
      ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
      ...(slugs.length > 0 ? [{ slug: { $in: slugs } }] : []),
    ],
    isActive: true,
  });
  const productsById = new Map();

  for (const product of products) {
    productsById.set(product._id.toString(), product);
    productsById.set(product.slug, product);
  }

  const orderItems = inputItems.map((item) => {
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
        slug: product.slug,
        name: product.name,
        category: product.category,
        color: product.color,
        material: product.material,
        image: getPrimaryImage(product),
        unitPrice: product.price,
      },
      quantity,
      packageSnapshot: {
        lengthCm: product.packageDetails.lengthCm,
        breadthCm: product.packageDetails.breadthCm,
        heightCm: product.packageDetails.heightCm,
        weightKg: product.packageDetails.weightKg,
      },
      lineTotal: product.price * quantity,
    };
  });

  const quantityByProductId = new Map();

  for (const item of orderItems) {
    const productId = item.product.toString();
    quantityByProductId.set(productId, (quantityByProductId.get(productId) || 0) + item.quantity);
  }

  for (const [productId, quantity] of quantityByProductId.entries()) {
    const product = productsById.get(productId);

    if (product.stock < quantity) {
      throw createHttpError(400, `${product.name} has only ${product.stock} unit(s) left.`);
    }
  }

  return orderItems;
}

export async function validateOrderStockAvailability(order, session = null) {
  const productIds = order.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true })
    .select('name stock')
    .session(session);
  const productsById = new Map(products.map((product) => [product._id.toString(), product]));
  const quantityByProductId = new Map();

  for (const item of order.items) {
    const productId = item.product.toString();
    quantityByProductId.set(productId, (quantityByProductId.get(productId) || 0) + item.quantity);
  }

  for (const [productId, quantity] of quantityByProductId.entries()) {
    const product = productsById.get(productId);
    const orderItem = order.items.find((item) => item.product.toString() === productId);
    const productName = orderItem?.productSnapshot?.name || 'Product';

    if (!product) {
      throw createHttpError(409, `${productName} is no longer available.`);
    }

    if (product.stock < quantity) {
      throw createHttpError(409, `${productName} has only ${product.stock} unit(s) left.`);
    }
  }
}

function getOrderStockDebits(order) {
  const debitsByProductId = new Map();

  for (const item of order.items) {
    const productId = item.product.toString();
    const existingDebit = debitsByProductId.get(productId);
    const productName = item.productSnapshot?.name || 'Product';

    debitsByProductId.set(productId, {
      productId: item.product,
      productName,
      quantity: (existingDebit?.quantity || 0) + item.quantity,
    });
  }

  return [...debitsByProductId.values()];
}

export async function debitOrderStock(order) {
  if (order.stockDebited) {
    return;
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const currentOrder = await Order.findById(order._id).session(session);

      if (!currentOrder) {
        throw createHttpError(404, 'Order not found while updating inventory.');
      }

      if (currentOrder.stockDebited) {
        return;
      }

      await validateOrderStockAvailability(currentOrder, session);

      const debits = getOrderStockDebits(currentOrder);
      const result = await Product.bulkWrite(
        debits.map((debit) => ({
          updateOne: {
            filter: {
              _id: debit.productId,
              isActive: true,
              stock: { $gte: debit.quantity },
            },
            update: {
              $inc: { stock: -debit.quantity },
            },
          },
        })),
        { ordered: true, session },
      );

      if (result.modifiedCount !== debits.length) {
        throw createHttpError(409, 'Stock changed during payment confirmation. Please review the order.');
      }

      const orderResult = await Order.updateOne(
        { _id: currentOrder._id, stockDebited: false },
        { $set: { stockDebited: true } },
        { session },
      );

      if (orderResult.modifiedCount !== 1) {
        throw createHttpError(409, 'Order inventory was already updated.');
      }
    });

    order.stockDebited = true;
  } finally {
    await session.endSession();
  }
}

export async function finalizeRefundedOrder({ orderId, refund }) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw createHttpError(404, 'Order not found while completing refund.');
      }

      if (order.payment.status === 'refunded' && order.stockRestored) {
        return;
      }

      if (order.stockDebited && !order.stockRestored) {
        const credits = getOrderStockDebits(order);
        await Product.bulkWrite(
          credits.map((credit) => ({
            updateOne: {
              filter: { _id: credit.productId },
              update: { $inc: { stock: credit.quantity } },
            },
          })),
          { ordered: true, session },
        );

      }

      order.orderStatus = 'cancelled';
      order.payment.status = 'refunded';
      order.payment.refundId = refund.id || order.payment.refundId;
      order.payment.refundStatus = 'processed';
      order.payment.refundAmount = Number(refund.amount || order.payment.refundAmount || 0);
      order.payment.refundedAt = new Date();
      order.stockRestored = true;
      await order.save({ session });
    });

    return Order.findById(orderId);
  } finally {
    await session.endSession();
  }
}

function validateCheckoutPhone(phone) {
  const normalizedPhone = normalizePhone(phone);

  if (!isValidIndianPhone(normalizedPhone)) {
    throw createHttpError(400, 'A valid Indian phone number is required.');
  }

  return normalizedPhone;
}

function saveCheckoutAddressToUser({ user, customerName, checkoutPhone, shippingAddress }) {
  const nextAddress = {
    label: 'Default',
    fullName: customerName.trim(),
    phone: checkoutPhone,
    addressLine1: shippingAddress.addressLine1.trim(),
    city: shippingAddress.city.trim(),
    state: shippingAddress.state.trim(),
    postalCode: shippingAddress.postalCode.trim(),
    country: shippingAddress.country?.trim() || 'India',
    isDefault: true,
  };

  user.addresses = [
    nextAddress,
    ...(user.addresses || []).filter((address) => !address.isDefault),
  ];
}

async function buildCheckoutData({ payload, user }) {
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

  return {
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
    checkoutPhone,
  };
}

export async function createCheckoutAttempt({ payload, user }) {
  const checkoutData = await buildCheckoutData({ payload, user });
  const session = await mongoose.startSession();
  let attempt;

  try {
    await session.withTransaction(async () => {
      await validateOrderStockAvailability(checkoutData, session);
      const debits = getOrderStockDebits(checkoutData);
      const result = await Product.bulkWrite(
        debits.map((debit) => ({
          updateOne: {
            filter: {
              _id: debit.productId,
              isActive: true,
              stock: { $gte: debit.quantity },
            },
            update: { $inc: { stock: -debit.quantity } },
          },
        })),
        { ordered: true, session },
      );

      if (result.modifiedCount !== debits.length) {
        throw createHttpError(409, 'Stock changed while checkout was starting. Please review your bag.');
      }

      [attempt] = await CheckoutAttempt.create(
        [{
          ...checkoutData,
          stockReserved: true,
          reservationExpiresAt: new Date(Date.now() + CHECKOUT_RESERVATION_MINUTES * 60 * 1000),
        }],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  attempt?.$session(null);

  try {
    if (user) {
      user.phone = checkoutData.checkoutPhone;
      saveCheckoutAddressToUser({
        user,
        customerName: checkoutData.customer.name,
        checkoutPhone: checkoutData.checkoutPhone,
        shippingAddress: checkoutData.shippingAddress,
      });
      await user.save();
    }
  } catch (error) {
    await releaseCheckoutReservation(attempt._id);
    await CheckoutAttempt.deleteOne({ _id: attempt._id });
    throw error;
  }

  return attempt;
}

export async function releaseCheckoutReservation(attemptId) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const attempt = await CheckoutAttempt.findById(attemptId).session(session);

      if (!attempt?.stockReserved) {
        return;
      }

      const credits = getOrderStockDebits(attempt);
      await Product.bulkWrite(
        credits.map((credit) => ({
          updateOne: {
            filter: { _id: credit.productId },
            update: { $inc: { stock: credit.quantity } },
          },
        })),
        { ordered: true, session },
      );

      attempt.stockReserved = false;
      attempt.stockReleasedAt = new Date();
      await attempt.save({ session });
    });
  } finally {
    await session.endSession();
  }
}

export async function releaseExpiredCheckoutReservations() {
  const expiredAttempts = await CheckoutAttempt.find({
    stockReserved: true,
    reservationExpiresAt: { $lte: new Date() },
  }).select('_id').limit(100);

  await Promise.allSettled(
    expiredAttempts.map((attempt) => releaseCheckoutReservation(attempt._id)),
  );
}

export async function createOrderFromCheckoutAttempt({ attempt, razorpayPaymentId, razorpaySignature = '' }) {
  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      const existingOrder = await Order.findOne({ orderNumber: attempt.orderNumber }).session(session);

      if (existingOrder) {
        order = existingOrder;
        return;
      }

      const reservedAttempt = await CheckoutAttempt.findOne({
        _id: attempt._id,
        stockReserved: true,
      }).session(session);

      if (!reservedAttempt) {
        throw createHttpError(409, 'Your stock reservation expired.');
      }

      [order] = await Order.create(
        [{
          orderNumber: reservedAttempt.orderNumber,
          user: reservedAttempt.user,
          customer: reservedAttempt.customer,
          shippingAddress: reservedAttempt.shippingAddress,
          items: reservedAttempt.items,
          totals: reservedAttempt.totals,
          payment: {
            provider: 'razorpay',
            status: 'pending',
            razorpayOrderId: reservedAttempt.payment.razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
          },
          notes: reservedAttempt.notes,
          stockDebited: true,
        }],
        { session },
      );

      reservedAttempt.stockReserved = false;
      await reservedAttempt.save({ session });
    });
  } finally {
    await session.endSession();
  }

  order?.$session(null);

  if (attempt.user) {
    await User.updateOne({ _id: attempt.user }, { $set: { lastOrderAt: new Date() } });
  }

  return order;
}
