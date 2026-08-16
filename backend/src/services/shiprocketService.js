import { createHttpError } from '../utils/createHttpError.js';

const shiprocketBaseUrl = 'https://apiv2.shiprocket.in/v1/external';
let cachedToken = null;
let cachedTokenExpiresAt = 0;

function hasShiprocketConfig() {
  return Boolean(
    process.env.SHIPROCKET_EMAIL &&
      process.env.SHIPROCKET_PASSWORD &&
      process.env.SHIPROCKET_PICKUP_LOCATION,
  );
}

function getPackageConfig() {
  return {
    length: Number(process.env.SHIPROCKET_PACKAGE_LENGTH_CM || 20),
    breadth: Number(process.env.SHIPROCKET_PACKAGE_BREADTH_CM || 15),
    height: Number(process.env.SHIPROCKET_PACKAGE_HEIGHT_CM || 5),
    weight: Number(process.env.SHIPROCKET_PACKAGE_WEIGHT_KG || 0.5),
  };
}

function formatShiprocketDate(date) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

async function getShiprocketToken() {
  if (!hasShiprocketConfig()) {
    return null;
  }

  if (cachedToken && cachedTokenExpiresAt > Date.now()) {
    return cachedToken;
  }

  const response = await fetch(`${shiprocketBaseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });
  const data = await response.json();

  if (!response.ok || !data.token) {
    throw createHttpError(502, data.message || 'Failed to authenticate with Shiprocket.');
  }

  cachedToken = data.token;
  cachedTokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;

  return cachedToken;
}

function buildOrderItems(order) {
  return order.items.map((item) => ({
    name: item.productSnapshot.name,
    sku: item.productSnapshot.slug || String(item.productSnapshot.legacyId),
    units: item.quantity,
    selling_price: item.productSnapshot.unitPrice,
  }));
}

function buildShiprocketPayload(order) {
  const packageConfig = getPackageConfig();

  return {
    order_id: order.orderNumber,
    order_date: formatShiprocketDate(order.createdAt || order.placedAt),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION,
    billing_customer_name: order.customer.name,
    billing_last_name: '',
    billing_address: order.shippingAddress.addressLine1,
    billing_city: order.shippingAddress.city,
    billing_pincode: order.shippingAddress.postalCode,
    billing_state: order.shippingAddress.state,
    billing_country: order.shippingAddress.country || 'India',
    billing_email: order.customer.email,
    billing_phone: order.customer.phone,
    shipping_is_billing: true,
    order_items: buildOrderItems(order),
    payment_method: 'Prepaid',
    shipping_charges: order.totals.shipping,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: order.totals.subtotal,
    length: packageConfig.length,
    breadth: packageConfig.breadth,
    height: packageConfig.height,
    weight: packageConfig.weight,
  };
}

export async function createShiprocketOrder(order) {
  const token = await getShiprocketToken();

  if (!token) {
    console.warn('Skipping Shiprocket order creation because credentials are not configured.');
    return {
      skipped: true,
    };
  }

  const response = await fetch(`${shiprocketBaseUrl}/orders/create/adhoc`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildShiprocketPayload(order)),
  });
  const data = await response.json();

  if (!response.ok) {
    throw createHttpError(502, data.message || 'Failed to create Shiprocket order.');
  }

  return {
    skipped: false,
    raw: data,
    shiprocketOrderId: data.order_id ? String(data.order_id) : '',
    shipmentId: data.shipment_id ? String(data.shipment_id) : '',
    awbCode: data.awb_code ? String(data.awb_code) : '',
    trackingUrl: data.awb_code ? `https://shiprocket.co/tracking/${data.awb_code}` : '',
  };
}
