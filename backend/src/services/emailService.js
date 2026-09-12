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
          <td style="padding:18px 0;border-bottom:1px solid #eeeae4;">
            <div style="font-size:14px;color:#1a1a1a;font-weight:600;">${escapeHtml(item.productSnapshot.name)}</div>
            <div style="color:#78716c;font-size:12px;line-height:1.7;">${escapeHtml(item.productSnapshot.color)} / ${escapeHtml(item.productSnapshot.material)}</div>
          </td>
          <td style="padding:18px 0;border-bottom:1px solid #eeeae4;text-align:center;color:#57534e;font-size:13px;">${item.quantity}</td>
          <td style="padding:18px 0;border-bottom:1px solid #eeeae4;text-align:right;color:#1a1a1a;font-size:14px;">${formatCurrency(item.lineTotal)}</td>
        </tr>
      `,
    )
    .join('');
}

function buildEmailShell({ eyebrow, heading, intro, children }) {
  return `
    <div style="margin:0;padding:32px 16px;background:#fcfbf9;color:#1a1a1a;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;">
        <div style="padding:32px 36px;border-bottom:1px solid #f1eee9;background:#fbfaf8;">
          <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#a8a29e;font-weight:700;margin-bottom:14px;">
            ${escapeHtml(eyebrow)}
          </div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.05;font-weight:400;color:#1a1a1a;margin:0;">
            ${escapeHtml(heading)}
          </div>
          ${
            intro
              ? `<p style="font-family:Arial,sans-serif;color:#57534e;font-size:14px;line-height:1.8;margin:18px 0 0;">${escapeHtml(intro)}</p>`
              : ''
          }
        </div>
        <div style="padding:32px 36px;font-family:Arial,sans-serif;">
          ${children}
        </div>
        <div style="padding:22px 36px;border-top:1px solid #f1eee9;background:#fbfaf8;font-family:Arial,sans-serif;color:#a8a29e;font-size:11px;line-height:1.7;">
          Simvorae<br />
          Keep this email for reference and support.
        </div>
      </div>
    </div>
  `;
}

function buildInfoBlock(title, lines) {
  return `
    <div style="border:1px solid #eeeae4;background:#fcfbf9;padding:18px 20px;">
      <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#a8a29e;font-weight:700;margin-bottom:10px;">${escapeHtml(title)}</div>
      <div style="font-size:13px;line-height:1.8;color:#44403c;">${lines.map(escapeHtml).join('<br />')}</div>
    </div>
  `;
}

function buildButton({ href, label }) {
  return `
    <a href="${escapeHtml(href)}" style="background:#1a1a1a;color:#fcfbf9;text-decoration:none;padding:14px 22px;display:inline-block;font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;">
      ${escapeHtml(label)}
    </a>
  `;
}

function buildOrderEmailHtml(order, heading, intro) {
  return buildEmailShell({
    eyebrow: `Order ${order.orderNumber}`,
    heading,
    intro,
    children: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:30px;">
        ${buildInfoBlock('Customer', [
          order.customer.name,
          order.customer.email,
          order.customer.phone,
        ])}
        ${buildInfoBlock('Shipping Address', [
          order.shippingAddress.addressLine1,
          `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`,
          order.shippingAddress.country,
        ])}
      </div>

      <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#a8a29e;font-weight:700;margin-bottom:12px;">Order Items</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr>
            <th style="padding:0 0 10px;text-align:left;border-bottom:1px solid #1a1a1a;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;">Product</th>
            <th style="padding:0 0 10px;text-align:center;border-bottom:1px solid #1a1a1a;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;">Qty</th>
            <th style="padding:0 0 10px;text-align:right;border-bottom:1px solid #1a1a1a;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;">Total</th>
          </tr>
        </thead>
        <tbody>${buildOrderItemsRows(order)}</tbody>
      </table>

      <div style="border-top:1px solid #eeeae4;padding-top:18px;text-align:right;">
        <p style="margin:4px 0;color:#78716c;font-size:13px;">Subtotal: ${formatCurrency(order.totals.subtotal)}</p>
        <p style="margin:4px 0;color:#78716c;font-size:13px;">Shipping: ${formatCurrency(order.totals.shipping)}</p>
        <p style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#1a1a1a;">${formatCurrency(order.totals.total)}</p>
      </div>
    `,
  });
}

function buildShipmentEmailHtml(order) {
  return buildEmailShell({
    eyebrow: `Order ${order.orderNumber}`,
    heading: 'Your order has shipped',
    intro: 'Your Simvorae order is now on the way.',
    children: `
      ${buildInfoBlock('Tracking', [
        `AWB: ${order.shipping.awbCode || 'Not available yet'}`,
        `Courier: ${order.shipping.courierName || 'Not available yet'}`,
        `Shipment ID: ${order.shipping.shipmentId || 'Not available yet'}`,
      ])}

      ${
        order.shipping.trackingUrl
          ? `<p style="margin:28px 0 0;">${buildButton({ href: order.shipping.trackingUrl, label: 'Track Order' })}</p>`
          : ''
      }
    `,
  });
}

function buildEmailVerificationHtml({ name, verificationUrl }) {
  return buildEmailShell({
    eyebrow: 'Simvorae Account',
    heading: 'Verify your email',
    intro: `Hi ${name || 'there'}, confirm your email address to activate your Simvorae account and continue checkout.`,
    children: `
      <p style="margin:0 0 24px;">${buildButton({ href: verificationUrl, label: 'Verify Email' })}</p>
      <p style="color:#78716c;line-height:1.7;font-size:13px;margin:0;">
        This link expires in 24 hours. If you did not create this account, you can ignore this email.
      </p>
    `,
  });
}

function buildPasswordResetHtml({ name, resetUrl }) {
  return buildEmailShell({
    eyebrow: 'Simvorae Account',
    heading: 'Reset your password',
    intro: `Hi ${name || 'there'}, use the button below to set a new password for your Simvorae account.`,
    children: `
      <p style="margin:0 0 24px;">${buildButton({ href: resetUrl, label: 'Reset Password' })}</p>
      <p style="color:#78716c;line-height:1.7;font-size:13px;margin:0;">
        This link expires in 30 minutes. If you did not request this, ignore this email.
      </p>
    `,
  });
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

export async function sendEmailVerification({ to, name, verificationUrl }) {
  return sendEmail({
    to,
    subject: 'Verify your Simvorae email',
    html: buildEmailVerificationHtml({ name, verificationUrl }),
  });
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  return sendEmail({
    to,
    subject: 'Reset your Simvorae password',
    html: buildPasswordResetHtml({ name, resetUrl }),
  });
}
