import crypto from 'node:crypto';
import { Order } from '../models/Order.js';
import { sendRefundConfirmationEmail } from './emailService.js';

export async function sendRefundConfirmationBestEffort(order) {
  if (!order || order.payment?.status !== 'refunded' || order.refundEmailSentAt) {
    return false;
  }

  const claimToken = crypto.randomUUID();
  const claimedAt = new Date();
  const staleClaimBefore = new Date(claimedAt.getTime() - 10 * 60 * 1000);
  let claimedOrder;

  try {
    claimedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        'payment.status': 'refunded',
        refundEmailSentAt: null,
        $or: [
          { refundEmailClaimToken: '' },
          { refundEmailClaimToken: { $exists: false } },
          { refundEmailClaimedAt: { $lte: staleClaimBefore } },
        ],
      },
      {
        $set: {
          refundEmailClaimToken: claimToken,
          refundEmailClaimedAt: claimedAt,
          refundEmailLastAttemptAt: claimedAt,
        },
      },
      { new: true },
    );

    if (!claimedOrder) {
      return false;
    }

    const result = await sendRefundConfirmationEmail(claimedOrder);
    const update = {
      refundEmailClaimToken: '',
      refundEmailClaimedAt: null,
      refundEmailLastError: '',
      ...(result ? { refundEmailSentAt: new Date() } : {}),
    };

    if (!result) {
      update.refundEmailLastError = 'Email provider is not configured.';
      console.error(`Refund confirmation email was not sent for ${claimedOrder.orderNumber}: email provider is not configured.`);
    }

    await Order.updateOne(
      { _id: claimedOrder._id, refundEmailClaimToken: claimToken },
      { $set: update },
    );
    Object.assign(order, update);
    return Boolean(result);
  } catch (error) {
    console.error(`Refund confirmation email failed for ${claimedOrder?.orderNumber || order.orderNumber}: ${error.message}`);

    if (claimedOrder) {
      try {
        await Order.updateOne(
          { _id: claimedOrder._id, refundEmailClaimToken: claimToken },
          {
            $set: {
              refundEmailClaimToken: '',
              refundEmailClaimedAt: null,
              refundEmailLastError: error.message || 'Refund confirmation email failed.',
            },
          },
        );
      } catch (updateError) {
        console.error(`Could not release refund email claim for ${claimedOrder.orderNumber}: ${updateError.message}`);
      }
    }

    return false;
  }
}
