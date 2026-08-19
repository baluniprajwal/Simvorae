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

function getOptionalCourierId() {
  const courierId = Number(process.env.SHIPROCKET_COURIER_ID);
  return Number.isInteger(courierId) && courierId > 0 ? courierId : undefined;
}

function shouldRequestPickup() {
  return process.env.SHIPROCKET_AUTO_REQUEST_PICKUP !== 'false';
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

async function shiprocketRequest(path, options = {}) {
  const token = await getShiprocketToken();

  if (!token) {
    return { skipped: true };
  }

  const response = await fetch(`${shiprocketBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw createHttpError(502, data.message || data.error || 'Shiprocket API request failed.');
  }

  return { skipped: false, data };
}

function buildOrderItems(order) {
  return order.items.map((item) => ({
    name: item.productSnapshot.name,
    sku: item.productSnapshot.slug || String(item.productSnapshot.legacyId),
    units: item.quantity,
    selling_price: item.productSnapshot.unitPrice,
  }));
}

function getShipmentPackageDetails(order) {
  const packageSnapshots = order.items.map((item) => item.packageSnapshot);

  return {
    length: Math.max(...packageSnapshots.map((item) => item.lengthCm)),
    breadth: Math.max(...packageSnapshots.map((item) => item.breadthCm)),
    height: packageSnapshots.reduce((sum, item) => sum + item.heightCm, 0),
    weight: order.items.reduce((sum, item) => sum + item.packageSnapshot.weightKg * item.quantity, 0),
  };
}

function buildShiprocketPayload(order) {
  const packageDetails = getShipmentPackageDetails(order);

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
    length: packageDetails.length,
    breadth: packageDetails.breadth,
    height: packageDetails.height,
    weight: packageDetails.weight,
  };
}

function extractAwbAssignment(awbData) {
  const assignmentData = awbData?.response?.data || awbData?.data || awbData;

  return {
    awbCode: assignmentData?.awb_code ? String(assignmentData.awb_code) : '',
    courierName: assignmentData?.courier_name ? String(assignmentData.courier_name) : '',
    shiprocketOrderId: assignmentData?.order_id ? String(assignmentData.order_id) : '',
    shipmentId: assignmentData?.shipment_id ? String(assignmentData.shipment_id) : '',
  };
}

function extractPickupData(pickupData) {
  const response = pickupData?.response || {};
  const scheduledDate = response.pickup_scheduled_date || response.pickup_generated_date?.date || null;

  return {
    pickupStatus: response.data || pickupData?.message || '',
    pickupTokenNumber: response.pickup_token_number || '',
    pickupScheduledAt: scheduledDate ? new Date(scheduledDate) : null,
  };
}

function getTrackingUrl(awbCode, fallback = '') {
  if (fallback) {
    return fallback;
  }

  return awbCode ? `https://shiprocket.co/tracking/${awbCode}` : '';
}

function mapShiprocketStatus(currentStatus = '', statusCode = null) {
  const normalized = currentStatus.toLowerCase();
  const deliveredCodes = new Set([7]);
  const inTransitCodes = new Set([6, 17, 18, 22, 42]);
  const failedCodes = new Set([8, 21, 71, 72, 76, 77]);

  if (deliveredCodes.has(Number(statusCode)) || normalized.includes('delivered')) {
    return {
      shippingStatus: 'delivered',
      orderStatus: 'delivered',
      deliveredAt: new Date(),
      shippedAt: null,
    };
  }

  if (failedCodes.has(Number(statusCode)) || normalized.includes('exception') || normalized.includes('failed')) {
    return {
      shippingStatus: 'failed',
      orderStatus: null,
      deliveredAt: null,
      shippedAt: null,
    };
  }

  if (
    inTransitCodes.has(Number(statusCode)) ||
    normalized.includes('picked') ||
    normalized.includes('transit') ||
    normalized.includes('shipped')
  ) {
    return {
      shippingStatus: 'in_transit',
      orderStatus: 'shipped',
      deliveredAt: null,
      shippedAt: new Date(),
    };
  }

  return {
    shippingStatus: 'created',
    orderStatus: null,
    deliveredAt: null,
    shippedAt: null,
  };
}

function extractTrackingData(data) {
  const trackingData = Array.isArray(data) ? data[0]?.tracking_data : data?.tracking_data;
  const shipmentTrack = trackingData?.shipment_track?.[0] || {};
  const statusCode = trackingData?.shipment_status ?? shipmentTrack?.sr_status ?? null;
  const currentStatus = shipmentTrack?.current_status || trackingData?.current_status || '';
  const awbCode = shipmentTrack?.awb_code ? String(shipmentTrack.awb_code) : '';
  const trackingUrl = trackingData?.track_url || getTrackingUrl(awbCode);
  const status = mapShiprocketStatus(currentStatus, statusCode);

  return {
    awbCode,
    trackingUrl,
    currentStatus,
    statusCode: statusCode === null ? null : Number(statusCode),
    courierName: shipmentTrack?.courier_name || '',
    ...status,
  };
}

export async function createShiprocketOrder(order) {
  const orderResponse = await shiprocketRequest('/orders/create/adhoc', {
    method: 'POST',
    body: JSON.stringify(buildShiprocketPayload(order)),
  });

  if (orderResponse.skipped) {
    return {
      skipped: true,
    };
  }

  const data = orderResponse.data;
  const shipmentId = data.shipment_id ? String(data.shipment_id) : '';
  let awb = {
    awbCode: data.awb_code ? String(data.awb_code) : '',
    courierName: '',
    shiprocketOrderId: data.order_id ? String(data.order_id) : '',
    shipmentId,
  };
  let pickup = {
    pickupStatus: '',
    pickupTokenNumber: '',
    pickupScheduledAt: null,
  };

  if (shipmentId && !awb.awbCode) {
    const awbBody = {
      shipment_id: Number(shipmentId),
      ...(getOptionalCourierId() ? { courier_id: getOptionalCourierId() } : {}),
    };
    const awbResponse = await shiprocketRequest('/courier/assign/awb', {
      method: 'POST',
      body: JSON.stringify(awbBody),
    });

    awb = {
      ...awb,
      ...extractAwbAssignment(awbResponse.data),
    };
  }

  if (shipmentId && awb.awbCode && shouldRequestPickup()) {
    const pickupResponse = await shiprocketRequest('/courier/generate/pickup', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: [Number(shipmentId)],
      }),
    });

    pickup = extractPickupData(pickupResponse.data);
  }

  return {
    skipped: false,
    raw: data,
    shiprocketOrderId: awb.shiprocketOrderId || (data.order_id ? String(data.order_id) : ''),
    shipmentId: awb.shipmentId || shipmentId,
    awbCode: awb.awbCode,
    courierName: awb.courierName,
    trackingUrl: getTrackingUrl(awb.awbCode),
    pickupStatus: pickup.pickupStatus,
    pickupTokenNumber: pickup.pickupTokenNumber,
    pickupScheduledAt: pickup.pickupScheduledAt,
  };
}

export async function getShiprocketTracking(order) {
  if (!order.shipping.awbCode && !order.shipping.shipmentId) {
    throw createHttpError(400, 'AWB or shipment ID is required to sync Shiprocket tracking.');
  }

  const path = order.shipping.awbCode
    ? `/courier/track/awb/${encodeURIComponent(order.shipping.awbCode)}`
    : `/courier/track/shipment/${encodeURIComponent(order.shipping.shipmentId)}`;
  const response = await shiprocketRequest(path);

  if (response.skipped) {
    return {
      skipped: true,
    };
  }

  return {
    skipped: false,
    raw: response.data,
    ...extractTrackingData(response.data),
  };
}
