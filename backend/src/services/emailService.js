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

function getPublicImageUrl(value) {
  const imageUrl = String(value || '').trim();

  if (!imageUrl) {
    return '';
  }

  const uploadPathIndex = imageUrl.indexOf('/api/uploads/images/');
  if (uploadPathIndex >= 0 && process.env.PUBLIC_API_URL) {
    return `${process.env.PUBLIC_API_URL.replace(/\/$/, '')}${imageUrl.slice(uploadPathIndex)}`;
  }

  if (imageUrl.startsWith('/api/') && process.env.PUBLIC_API_URL) {
    return `${process.env.PUBLIC_API_URL.replace(/\/$/, '')}${imageUrl}`;
  }

  return imageUrl;
}

function buildOrderItemsRows(order) {
  return order.items
    .map((item) => {
      const imageUrl = getPublicImageUrl(item.productSnapshot.image);
      return `
        <tr>
          <td style="padding:18px 0;border-bottom:1px solid #eeeae4;width:76px;vertical-align:top;">
            ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.productSnapshot.name)}" width="64" height="80" style="display:block;width:64px;height:80px;object-fit:cover;border:0;background:#f5f5f4;" />` : ''}
          </td>
          <td style="padding:18px 12px;border-bottom:1px solid #eeeae4;vertical-align:middle;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#1a1a1a;font-weight:400;line-height:1.3;">${escapeHtml(item.productSnapshot.name)}</div>
            <div style="color:#78716c;font-size:11px;line-height:1.7;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">${escapeHtml(item.productSnapshot.color)} / ${escapeHtml(item.productSnapshot.material)}</div>
          </td>
          <td style="padding:18px 0;border-bottom:1px solid #eeeae4;text-align:center;color:#57534e;font-size:12px;vertical-align:middle;">${item.quantity}</td>
          <td style="padding:18px 0;border-bottom:1px solid #eeeae4;text-align:right;color:#1a1a1a;font-size:13px;vertical-align:middle;white-space:nowrap;">${formatCurrency(item.lineTotal)}</td>
        </tr>
      `;
    })
    .join('');
}

function buildEmailShell({
  subtitle = 'Atelier correspondence',
  icon = '&#10003;',
  eyebrow,
  heading,
  intro,
  children,
  footer = 'Keep this email for reference and support.',
}) {
  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style type="text/css">
        body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
        @media only screen and (max-width:620px){.email-wrapper{padding:10px 0!important}.email-container{width:100%!important}.content-padding{padding-left:20px!important;padding-right:20px!important}.col-half{display:block!important;width:100%!important;padding:0 0 12px!important}.primary-button{display:block!important;width:100%!important;box-sizing:border-box!important;text-align:center!important}}
      </style>
    </head>
    <body style="margin:0;padding:0;width:100%;background-color:#fcfbf9;color:#1a1a1a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table role="presentation" class="email-wrapper" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#fcfbf9;table-layout:fixed;">
        <tr><td align="center" style="padding:40px 12px;">
          <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e8e6e1;box-shadow:0 4px 20px rgba(0,0,0,0.02);">
            <tr><td align="center" class="content-padding" style="padding:44px 32px 30px;border-bottom:1px solid #f0eee9;">
              <div style="font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:28px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:#1a1a1a;">SIMVORAE</div>
              <div style="font-size:8.5px;font-weight:600;letter-spacing:0.32em;text-transform:uppercase;color:#8c8983;margin-top:6px;">${escapeHtml(subtitle)}</div>
            </td></tr>
            <tr><td align="center" class="content-padding" style="padding:40px 32px 36px;border-bottom:1px solid #f0eee9;background-color:#faf9f6;">
              <div style="width:44px;height:44px;line-height:44px;background-color:#1a1a1a;color:#ffffff;border-radius:50%;margin:0 auto 20px;text-align:center;font-size:18px;">${icon}</div>
              <div style="font-size:9px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:#8c8983;margin-bottom:8px;">${escapeHtml(eyebrow)}</div>
              <div style="font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:400;color:#1a1a1a;">${escapeHtml(heading)}</div>
              ${intro ? `<p style="color:#737069;font-size:13.5px;line-height:1.6;max-width:440px;margin:14px auto 0;">${escapeHtml(intro)}</p>` : ''}
            </td></tr>
            <tr><td class="content-padding" style="padding:36px 32px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${children}</td></tr>
            <tr><td align="center" class="content-padding" style="padding:36px 32px 40px;border-top:1px solid #e8e6e1;background-color:#faf9f6;text-align:center;">
              <div style="font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:16px;letter-spacing:0.15em;text-transform:uppercase;color:#1a1a1a;margin-bottom:10px;">SIMVORAE</div>
              <div style="font-size:11px;color:#8c8983;line-height:1.7;max-width:440px;margin:0 auto 16px;">${escapeHtml(footer)}</div>
              <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:0.2em;color:#8c8983;">&copy; ${new Date().getFullYear()} SIMVORAE ATELIER. ALL RIGHTS RESERVED.</div>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>
  `;
}

function buildInfoBlock(title, lines) {
  return `
    <div style="border:1px solid #eeeae4;background:#fcfbf9;padding:18px 20px;height:100%;box-sizing:border-box;">
      <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#a8a29e;font-weight:700;margin-bottom:10px;">${escapeHtml(title)}</div>
      <div style="font-size:13px;line-height:1.8;color:#44403c;">${lines.map(escapeHtml).join('<br />')}</div>
    </div>
  `;
}

function buildTwoColumnInfo(left, right) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-bottom:30px;">
      <tr>
        <td width="50%" valign="top" style="padding-right:8px;">${left}</td>
        <td width="50%" valign="top" style="padding-left:8px;">${right}</td>
      </tr>
    </table>
  `;
}

function buildItemsTable(order, { showTotals = true } = {}) {
  return `
    <div style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#a8a29e;font-weight:700;margin-bottom:12px;">Order Items</div>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:${showTotals ? '24px' : '4px'};" cellspacing="0" cellpadding="0" border="0">
      <thead>
        <tr>
          <th colspan="2" style="padding:0 0 10px;text-align:left;border-bottom:1px solid #1a1a1a;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;">Product</th>
          <th style="padding:0 0 10px;text-align:center;border-bottom:1px solid #1a1a1a;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;">Qty</th>
          <th style="padding:0 0 10px;text-align:right;border-bottom:1px solid #1a1a1a;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;">Total</th>
        </tr>
      </thead>
      <tbody>${buildOrderItemsRows(order)}</tbody>
    </table>
    ${showTotals ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #eeeae4;">
        <tr><td style="padding-top:18px;color:#78716c;font-size:12px;">Subtotal</td><td style="padding-top:18px;text-align:right;color:#57534e;font-size:12px;">${formatCurrency(order.totals.subtotal)}</td></tr>
        <tr><td style="padding-top:8px;color:#78716c;font-size:12px;">Shipping</td><td style="padding-top:8px;text-align:right;color:#57534e;font-size:12px;">${Number(order.totals.shipping) === 0 ? 'Complimentary' : formatCurrency(order.totals.shipping)}</td></tr>
        <tr><td style="padding-top:15px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#1a1a1a;">Total</td><td style="padding-top:15px;text-align:right;font-family:Georgia,'Times New Roman',serif;font-size:25px;color:#1a1a1a;">${formatCurrency(order.totals.total)}</td></tr>
      </table>
    ` : ''}
  `;
}

function buildButton({ href, label }) {
  return `
    <a class="primary-button" href="${escapeHtml(href)}" target="_blank" style="display:inline-block;background-color:#1a1a1a;color:#fcfbf9;text-decoration:none;padding:16px 36px;border:1px solid #1a1a1a;font-family:'Inter',Arial,sans-serif;font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;">
      ${escapeHtml(label)}
    </a>
  `;
}

export function buildOrderEmailHtml(order, heading, intro) {
  const isAdminEmail = heading === 'Paid order received';
  return buildEmailShell({
    subtitle: isAdminEmail ? 'Operations / Paid order alert' : 'Client acquisitions / Order confirmation',
    icon: isAdminEmail ? '&#9670;' : '&#10003;',
    eyebrow: `${isAdminEmail ? 'Payment captured' : 'Order confirmed'} &middot; ${order.orderNumber}`,
    heading,
    intro,
    footer: isAdminEmail
      ? 'This operational notice was sent to the configured Simvorae administrator.'
      : 'Our concierge will email tracking details as soon as your order is dispatched.',
    children: `
      ${buildTwoColumnInfo(
        buildInfoBlock('Customer', [
          order.customer.name,
          order.customer.email,
          order.customer.phone,
        ]),
        buildInfoBlock('Shipping Address', [
          order.shippingAddress.addressLine1,
          `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`,
          order.shippingAddress.country,
        ]),
      )}
      ${buildItemsTable(order)}
      ${isAdminEmail ? `
        <div style="margin-top:28px;padding:20px 24px;border:1px solid #f0eee9;background-color:#faf9f6;">
          <div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.2em;color:#8c8983;margin-bottom:8px;">Razorpay references</div>
          <div style="font-family:monospace;font-size:11px;line-height:1.8;color:#1a1a1a;">Order: ${escapeHtml(order.payment.razorpayOrderId || 'Not available')}<br />Payment: ${escapeHtml(order.payment.razorpayPaymentId || 'Not available')}</div>
        </div>
      ` : ''}
    `,
  });
}

export function buildShipmentEmailHtml(order) {
  return buildEmailShell({
    subtitle: 'Dispatch / Shiprocket tracking',
    icon: '&#9992;',
    eyebrow: `In transit &middot; ${order.orderNumber}`,
    heading: 'Your piece has been dispatched',
    intro: `Dear ${order.customer.name}, your order has been packed and handed to our delivery partner.`,
    footer: 'For delivery assistance, use your tracking number or contact the Simvorae concierge.',
    children: `
      ${buildTwoColumnInfo(
        buildInfoBlock('Delivery Partner', [
          order.shipping.courierName || 'Courier assigned',
          `Tracking no. ${order.shipping.awbCode || 'Pending'}`,
        ]),
        buildInfoBlock('Delivering To', [
          order.customer.name,
          order.shippingAddress.addressLine1,
          `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`,
        ]),
      )}

      ${buildItemsTable(order, { showTotals: false })}

      ${
        order.shipping.trackingUrl
          ? `<p style="margin:28px 0 0;text-align:center;">${buildButton({ href: order.shipping.trackingUrl, label: 'Track My Order' })}</p>`
          : ''
      }
    `,
  });
}

export function buildRefundEmailHtml(order) {
  const refundAmount = Number(order.payment.refundAmount) > 0
    ? Number(order.payment.refundAmount) / 100
    : Number(order.totals.total || 0);

  return buildEmailShell({
    subtitle: 'Client concierge / Settlement notice',
    icon: '&#10003;',
    eyebrow: 'Refund processed &middot; Razorpay',
    heading: 'Your refund has been processed',
    intro: `Dear ${order.customer.name}, Razorpay has confirmed the refund for order ${order.orderNumber}.`,
    footer: 'Our personal concierge remains available if the credit is not visible after the settlement window.',
    children: `
      ${buildTwoColumnInfo(
        buildInfoBlock('Refunded Amount', [formatCurrency(refundAmount), 'Returned to your original payment method']),
        buildInfoBlock('Reference', [
          `Refund ID: ${order.payment.refundId || 'Not available'}`,
          `Payment ID: ${order.payment.razorpayPaymentId || 'Not available'}`,
        ]),
      )}
      ${buildItemsTable(order, { showTotals: false })}
      <p style="color:#78716c;line-height:1.8;font-size:13px;margin:24px 0 0;">
        Your bank may take 5-7 business days to show the amount in the original payment method.
      </p>
    `,
  });
}

export function buildEmailVerificationHtml({ name, verificationUrl }) {
  return buildEmailShell({
    subtitle: 'Client admission / Identity verification',
    icon: '&#9993;',
    eyebrow: 'Welcome to the circle',
    heading: 'Verify your email address',
    intro: `Dear ${name || 'there'}, confirm your email address to activate your private Simvorae account.`,
    footer: 'This identity-verification message was sent because an account registration was started with this address.',
    children: `
      <div style="text-align:center;margin:0 0 28px;">${buildButton({ href: verificationUrl, label: 'Confirm Email Address' })}</div>
      <div style="text-align:center;margin-bottom:28px;"><span style="display:inline-block;padding:6px 14px;background-color:#ffffff;border:1px solid #e2ded8;font-size:10px;text-transform:uppercase;letter-spacing:0.16em;color:#8c8983;">Link validity: <strong style="color:#1a1a1a;">24 hours</strong></span></div>
      <div style="background-color:#faf9f6;border:1px solid #f0eee9;padding:20px 24px;">
        <div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.2em;color:#8c8983;margin-bottom:6px;">Security protocol</div>
        <div style="font-size:12px;color:#737069;line-height:1.55;">If you did not create a Simvorae account, disregard this email. No account will be activated without verification.</div>
      </div>
    `,
  });
}

export function buildPasswordResetHtml({ name, resetUrl }) {
  return buildEmailShell({
    subtitle: 'Client security / Access recovery',
    icon: '&#128274;',
    eyebrow: 'Secure access request',
    heading: 'Reset your password',
    intro: `Dear ${name || 'there'}, a password reset was requested for your private Simvorae account.`,
    footer: 'For your security, this access-recovery link can only be used once.',
    children: `
      <div style="text-align:center;margin:0 0 28px;">${buildButton({ href: resetUrl, label: 'Reset Password' })}</div>
      <div style="text-align:center;margin-bottom:28px;"><span style="display:inline-block;padding:6px 14px;background-color:#fff8f2;border:1px solid #fed7aa;font-size:10px;text-transform:uppercase;letter-spacing:0.16em;color:#9a3412;">Link validity: <strong>30 minutes</strong></span></div>
      <div style="background-color:#faf9f6;border:1px solid #f0eee9;padding:20px 24px;">
        <div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.2em;color:#8c8983;margin-bottom:6px;">Security notice</div>
        <div style="font-size:12px;color:#737069;line-height:1.55;">If you did not request a password reset, ignore this message. Your existing password remains unchanged.</div>
      </div>
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

export async function sendRefundConfirmationEmail(order) {
  return sendEmail({
    to: order.customer.email,
    subject: `Refund completed for Simvorae order ${order.orderNumber}`,
    html: buildRefundEmailHtml(order),
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
