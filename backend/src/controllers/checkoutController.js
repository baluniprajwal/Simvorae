import { createCheckoutAttempt } from '../services/orderService.js';
import { createRazorpayOrder } from '../services/razorpayService.js';
import { createHttpError } from '../utils/createHttpError.js';

export async function createCheckout(req, res, next) {
  try {
    const attempt = await createCheckoutAttempt({
      payload: req.body,
      user: req.user,
    });
    const razorpayOrder = await createRazorpayOrder(attempt);

    attempt.payment.razorpayOrderId = razorpayOrder.id;
    await attempt.save();

    return res.status(201).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      order: attempt,
      payment: {
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        razorpayOrderId: razorpayOrder.id,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(createHttpError(409, 'Order number already exists. Please try again.'));
    }

    return next(error);
  }
}
