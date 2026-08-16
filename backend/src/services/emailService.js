import { Resend } from 'resend';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getEmailClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  return new Resend(process.env.RESEND_API_KEY);
}

function getFromEmail() {
  return process.env.EMAIL_FROM || 'Simvorae <orders@simvorae.com>';
}

function buildOrderItemsRows(order) {
  return order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;">
            <strong>${escapeHtml(item.productSnapshot.name)}</strong><br />
            <span style="color:#777;font-size:13px;">${escapeHtml(item.productSnapshot.color)} / ${escapeHtml(item.productSnapshot.material)}</span>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.lineTotal)}</td>
        </tr>
      `,
    )
    .join('');
}

function buildOrderEmailHtml(order, heading, intro) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;">
      <h1 style="font-family:Georgia,serif;font-weight:400;">${escapeHtml(heading)}</h1>
      <p style="color:#555;">${escapeHtml(intro)}</p>
      <p style="color:#555;">Order <strong>${escapeHtml(order.orderNumber)}</strong></p>

      <h2 style="font-size:16px;margin-top:28px;">Customer</h2>
      <p style="line-height:1.6;color:#555;">
        ${escapeHtml(order.customer.name)}<br />
        ${escapeHtml(order.customer.email)}<br />
        ${escapeHtml(order.customer.phone)}
      </p>

      <h2 style="font-size:16px;margin-top:28px;">Shipping Address</h2>
      <p style="line-height:1.6;color:#555;">
        ${escapeHtml(order.shippingAddress.addressLine1)}<br />
        ${escapeHtml(order.shippingAddress.city)}, ${escapeHtml(order.shippingAddress.state)} ${escapeHtml(order.shippingAddress.postalCode)}<br />
        ${escapeHtml(order.shippingAddress.country)}
      </p>

      <h2 style="font-size:16px;margin-top:28px;">Items</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:8px 0;text-align:left;border-bottom:1px solid #ddd;">Product</th>
            <th style="padding:8px 0;text-align:center;border-bottom:1px solid #ddd;">Qty</th>
            <th style="padding:8px 0;text-align:right;border-bottom:1px solid #ddd;">Total</th>
          </tr>
        </thead>
        <tbody>${buildOrderItemsRows(order)}</tbody>
      </table>

      <div style="margin-top:24px;text-align:right;">
        <p style="margin:4px 0;color:#555;">Subtotal: ${formatCurrency(order.totals.subtotal)}</p>
        <p style="margin:4px 0;color:#555;">Shipping: ${formatCurrency(order.totals.shipping)}</p>
        <p style="margin:8px 0;font-size:18px;"><strong>Total: ${formatCurrency(order.totals.total)}</strong></p>
      </div>
    </div>
  `;
}

function buildShipmentEmailHtml(order) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;">
      <h1 style="font-family:Georgia,serif;font-weight:400;">Your order has shipped</h1>
      <p style="color:#555;">Order <strong>${escapeHtml(order.orderNumber)}</strong> is now on the way.</p>

      <h2 style="font-size:16px;margin-top:28px;">Tracking</h2>
      <p style="line-height:1.6;color:#555;">
        AWB: ${escapeHtml(order.shipping.awbCode || 'Not available yet')}<br />
        Shipment ID: ${escapeHtml(order.shipping.shipmentId || 'Not available yet')}
      </p>

      ${
        order.shipping.trackingUrl
          ? `<p style="margin-top:24px;"><a href="${escapeHtml(order.shipping.trackingUrl)}" style="background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 18px;display:inline-block;">Track Order</a></p>`
          : ''
      }
    </div>
  `;
}

async function sendEmail({ to, subject, html }) {
  const resend = getEmailClient();

  if (!resend) {
    console.warn('Skipping email send because RESEND_API_KEY is not configured.');
    return null;
  }

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send email.');
  }

  return data;
}

export async function sendPaymentConfirmedEmails(order) {
  const tasks = [
    sendEmail({
      to: order.customer.email,
      subject: `Your Simvorae order ${order.orderNumber}`,
      html: buildOrderEmailHtml(
        order,
        'Your order is confirmed',
        'Payment has been confirmed and your order is now being processed.',
      ),
    }),
  ];

  if (process.env.ADMIN_ORDER_EMAIL) {
    tasks.push(
      sendEmail({
        to: process.env.ADMIN_ORDER_EMAIL,
        subject: `Paid order received: ${order.orderNumber}`,
        html: buildOrderEmailHtml(
          order,
          'Paid order received',
          'A customer payment has been confirmed for this order.',
        ),
      }),
    );
  }

  return Promise.allSettled(tasks);
}

export async function sendShipmentTrackingEmail(order) {
  return sendEmail({
    to: order.customer.email,
    subject: `Your Simvorae order ${order.orderNumber} has shipped`,
    html: buildShipmentEmailHtml(order),
  });
}
