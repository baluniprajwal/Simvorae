import { createCheckoutAttempt, releaseCheckoutReservation } from '../services/orderService.js';
import { CheckoutAttempt } from '../models/CheckoutAttempt.js';
import { createRazorpayOrder } from '../services/razorpayService.js';
import { createHttpError } from '../utils/createHttpError.js';

export async function createCheckout(req, res, next) {
  try {
    const attempt = await createCheckoutAttempt({
      payload: req.body,
      user: req.user,
    });
    let razorpayOrder;

    try {
      razorpayOrder = await createRazorpayOrder(attempt);
    } catch (error) {
      await releaseCheckoutReservation(attempt._id);
      await CheckoutAttempt.deleteOne({ _id: attempt._id });
      throw error;
    }

    try {
      attempt.payment.razorpayOrderId = razorpayOrder.id;
      await attempt.save();
    } catch (error) {
      await releaseCheckoutReservation(attempt._id);
      await CheckoutAttempt.deleteOne({ _id: attempt._id });
      throw error;
    }

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
      const message = error.keyPattern?.orderNumber
        ? 'Order number already exists. Please try again.'
        : 'Checkout could not be started. Please try again.';
      return next(createHttpError(409, message));
    }

    return next(error);
  }
}
