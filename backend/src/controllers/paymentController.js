import { Order } from '../models/Order.js';
import { sendPaymentConfirmedEmails } from '../services/emailService.js';
import { verifyRazorpaySignature } from '../services/razorpayService.js';
import { createHttpError } from '../utils/createHttpError.js';

export async function verifyPayment(req, res, next) {
  try {
    const {
      orderNumber,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!orderNumber || !razorpayPaymentId || !razorpaySignature) {
      return next(createHttpError(400, 'Payment verification details are required.'));
    }

    const order = await Order.findOne({ orderNumber });

    if (!order) {
      return next(createHttpError(404, 'Order not found.'));
    }

    if (!order.payment.razorpayOrderId) {
      return next(createHttpError(400, 'Razorpay order has not been created for this order.'));
    }

    const isValidSignature = verifyRazorpaySignature({
      razorpayOrderId: order.payment.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSignature) {
      order.payment.status = 'failed';
      await order.save();
      return next(createHttpError(400, 'Invalid payment signature.'));
    }

    if (order.payment.status !== 'paid') {
      order.payment.status = 'paid';
      order.payment.razorpayPaymentId = razorpayPaymentId;
      order.payment.razorpaySignature = razorpaySignature;
      order.payment.paidAt = new Date();
      order.orderStatus = 'confirmed';
      await order.save();

      await sendPaymentConfirmedEmails(order);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      order,
    });
  } catch (error) {
    return next(error);
  }
}
