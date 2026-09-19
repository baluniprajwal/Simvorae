import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Order, useOrderStore } from './store/orderStore';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}

const deliverySteps = ['Confirmed', 'Packed', 'Shipped', 'Delivered'] as const;

function getDeliveryState(order: Order) {
  if (order.status === 'Cancelled') {
    return {
      label: 'Order cancelled',
      message: order.paymentStatus === 'refund_pending'
        ? 'Your refund has been initiated. We will email you when it is completed.'
        : order.paymentStatus === 'refunded'
          ? 'Your payment has been refunded.'
          : 'This order will not be shipped.',
      activeStep: -1,
    };
  }

  if (order.shippingStatus === 'cancelled') {
    return {
      label: 'Delivery being rearranged',
      message: 'The previous shipment was cancelled. We are preparing a new delivery for your order.',
      activeStep: 1,
    };
  }

  if (order.shippingStatus === 'cancellation_pending') {
    return {
      label: 'Cancellation requested',
      message: 'We are confirming the shipment cancellation with our delivery partner.',
      activeStep: Math.max(1, deliverySteps.indexOf(order.status as typeof deliverySteps[number])),
    };
  }

  if (order.shippingStatus === 'delivered' || order.status === 'Delivered') {
    return { label: 'Delivered', message: 'Your order has been delivered.', activeStep: 3 };
  }

  if (order.shippingStatus === 'in_transit' || order.status === 'Shipped') {
    return { label: 'On the way', message: 'Your order is with the courier and on its way to you.', activeStep: 2 };
  }

  if (order.shippingStatus === 'created') {
    return { label: 'Shipment booked', message: 'Your parcel is ready for handover to our delivery partner.', activeStep: 1 };
  }

  if (order.status === 'Packed') {
    return { label: 'Packed with care', message: 'Your order is packed and will be shipped shortly.', activeStep: 1 };
  }

  return { label: 'Order confirmed', message: 'We have received your order and will begin preparing it shortly.', activeStep: 0 };
}

export default function OrderDetail() {
  const { orderNumber = '' } = useParams();
  const { fetchMyOrder, isLoading, error } = useOrderStore();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    if (!orderNumber) {
      return;
    }

    fetchMyOrder(orderNumber)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [fetchMyOrder, orderNumber]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfbf9] p-24 text-center font-sans text-[10px] uppercase tracking-[0.24em] text-stone-400">
        Loading Order
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fcfbf9] p-8 text-center text-[#1a1a1a]">
        <p className="mb-4 font-serif text-3xl">Order not found</p>
        <p className="mb-8 max-w-md text-sm leading-7 text-stone-500">{error || 'This order is not available for your account.'}</p>
        <Link to="/account" className="border-b border-[#1a1a1a] pb-1 text-[9px] font-semibold uppercase tracking-[0.2em]">
          Back To Account
        </Link>
      </div>
    );
  }

  const deliveryState = getDeliveryState(order);

  return (
    <div className="relative flex min-h-screen flex-col bg-[#fcfbf9] font-sans text-[#1a1a1a]">
      <div
        className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035]"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}
      />

      <Navbar />

      <main className="relative z-20 mx-auto w-full max-w-[1400px] flex-1 px-6 pb-24 pt-28 md:px-12 md:pb-32 md:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.2, 1, 0.2, 1] }}
          className="mb-12 md:mb-16"
        >
          <div className="mb-8 text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            <Link to="/account" className="transition-colors hover:text-[#1a1a1a]">My Account</Link>
            <span className="mx-3">/</span>
            <span className="text-[#1a1a1a]">{order.id}</span>
          </div>

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="mb-4 font-serif text-4xl leading-[0.9] tracking-tighter text-[#1a1a1a] md:text-5xl">
                Order {order.id}
              </h1>
              <p className="font-sans text-[10px] uppercase leading-loose tracking-[0.2em] text-stone-500 md:text-[11px]">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>

            <div className="flex gap-4">
              <Link
                to="/contact"
                className="border-b border-[#1a1a1a] pb-1 text-[9px] font-semibold uppercase tracking-widest text-[#1a1a1a] transition-opacity hover:opacity-60"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col gap-16 lg:flex-row lg:gap-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.2, 1, 0.2, 1] }}
            className="flex flex-col gap-12 lg:w-7/12"
          >
            <div>
              <div className="mb-4 border-b border-[#1a1a1a] pb-4 text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                Ordered Products
              </div>
              <div className="flex flex-col">
                {order.items.map((item, index) => (
                  <div key={`${item.id}-${index}`} className={`flex gap-6 border-b border-stone-200 py-6 ${index === 0 ? 'pt-4' : ''}`}>
                    <div className="h-32 w-24 flex-shrink-0 bg-stone-100">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-grow flex-col justify-between py-1">
                      <div>
                        <h3 className="mb-2 font-serif text-xl text-[#1a1a1a]">{item.name}</h3>
                        <p className="font-sans text-[10px] uppercase tracking-widest text-stone-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="font-sans text-[11px] font-medium tracking-wider text-[#1a1a1a]">
                        {formatCurrency(item.price)} each
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-stone-100 bg-stone-50 p-8 md:p-12">
              <div className="mb-6 flex items-center justify-between font-sans text-[10px] uppercase tracking-widest text-stone-500">
                <span>Subtotal</span>
                <span className="font-semibold text-[#1a1a1a]">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="mb-6 flex items-center justify-between font-sans text-[10px] uppercase tracking-widest text-stone-500">
                <span>Shipping</span>
                <span className="font-semibold text-[#1a1a1a]">{order.shipping === 0 ? 'Free' : formatCurrency(order.shipping)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-stone-200 pt-6">
                <span className="font-serif text-xl">Total</span>
                <span className="font-serif text-2xl">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.2, 1, 0.2, 1] }}
            className="flex flex-col gap-12 lg:w-5/12"
          >
            <div>
              <div className="mb-8 border-b border-[#1a1a1a] pb-4 text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                Your Order Journey
              </div>

              <div className="flex flex-col">
                <div className="border-b border-stone-100 pb-7">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <h2 className="font-serif text-2xl text-[#1a1a1a]">{deliveryState.label}</h2>
                    <span className="shrink-0 rounded-sm border border-stone-200 bg-stone-50 px-3 py-1 font-sans text-[9px] uppercase tracking-widest text-stone-600">
                      {order.paymentStatus === 'paid' ? 'Payment received' : formatStatus(order.paymentStatus)}
                    </span>
                  </div>
                  <p className="max-w-md font-sans text-[11px] leading-5 text-stone-500">
                    {deliveryState.message}
                  </p>
                </div>

                {deliveryState.activeStep >= 0 && (
                  <div className="grid grid-cols-4 py-7">
                    {deliverySteps.map((step, index) => {
                      const isComplete = index <= deliveryState.activeStep;
                      return (
                        <div key={step} className="relative flex flex-col gap-3 pr-2">
                          {index < deliverySteps.length - 1 && (
                            <span className={`absolute left-3 right-0 top-[5px] h-px ${index < deliveryState.activeStep ? 'bg-[#1a1a1a]' : 'bg-stone-200'}`} />
                          )}
                          <span className={`relative z-10 h-[11px] w-[11px] rounded-full border ${isComplete ? 'border-[#1a1a1a] bg-[#1a1a1a]' : 'border-stone-300 bg-[#fcfbf9]'}`} />
                          <span className={`font-sans text-[8px] uppercase tracking-[0.14em] ${isComplete ? 'text-[#1a1a1a]' : 'text-stone-400'}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(order.awbCode || order.trackingUrl || order.courierName) && (
                  <div className="flex items-end justify-between gap-6 border border-stone-100 bg-stone-50 p-6">
                    <div>
                      <span className="mb-2 block font-sans text-[9px] uppercase tracking-widest text-stone-400">Delivery Partner</span>
                      <span className="font-sans text-[11px] text-[#1a1a1a]">{order.courierName || 'Courier assigned'}</span>
                      {order.awbCode && (
                        <span className="mt-1 block font-sans text-[10px] text-stone-500">Tracking no. {order.awbCode}</span>
                      )}
                    </div>
                    {order.courierName && (
                      <span className="sr-only">Courier: {order.courierName}</span>
                    )}
                    {order.trackingUrl && (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-max border-b border-[#1a1a1a] pb-1 text-left text-[9px] font-semibold uppercase tracking-widest text-[#1a1a1a] transition-opacity hover:opacity-60"
                      >
                        Track My Order
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="mb-8 border-b border-[#1a1a1a] pb-4 text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                Customer Information
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-1">
                <div>
                  <h4 className="mb-3 font-sans text-[10px] uppercase tracking-widest text-stone-500">Contact Details</h4>
                  <p className="font-sans text-sm leading-relaxed text-[#1a1a1a]">
                    {order.customer.name}<br />
                    {order.customer.email}<br />
                    +91 {order.customer.phone}
                  </p>
                </div>
                <div>
                  <h4 className="mb-3 font-sans text-[10px] uppercase tracking-widest text-stone-500">Shipping Address</h4>
                  <p className="font-sans text-sm leading-relaxed text-[#1a1a1a]">
                    {order.customer.name}<br />
                    {order.shippingAddress.addressLine1}<br />
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
                    {order.shippingAddress.country}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
