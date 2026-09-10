import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { type Order, useOrderStore } from './store/orderStore';

type StoredOrder = {
  orderNumber?: string;
  total?: number;
  email?: string;
};

function getStoredOrder(): StoredOrder {
  try {
    const rawOrder = window.sessionStorage.getItem('simvorae_last_order');
    return rawOrder ? JSON.parse(rawOrder) as StoredOrder : {};
  } catch {
    return {};
  }
}

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const fetchMyOrder = useOrderStore((state) => state.fetchMyOrder);
  const [order, setOrder] = useState<Order | null>(null);
  const storedOrder = getStoredOrder();
  const orderNumber = searchParams.get('order') || storedOrder.orderNumber || 'Processing';
  const customerEmail = order?.customer.email || storedOrder.email || 'your registered email';
  const paymentStatus = 'Paid';
  const fulfillmentStatus = order?.status || 'Confirmed';
  const totalAmount = order?.total ?? storedOrder.total;
  const formattedTotal = typeof totalAmount === 'number'
    ? `INR ${totalAmount.toLocaleString('en-IN')}`
    : 'Confirmed by email';

  const emailSent = `We've sent a confirmation email to ${customerEmail}.`;
  const nextStepMessage = 'Your order is currently being processed by our warehouse team.';
  const trackingMessage = 'Tracking details will be provided by email once your package ships.';
  const paidBadge = 'bg-green-50 text-green-700 border border-green-100';
  const confirmedBadge = 'bg-stone-100 text-[#1a1a1a] border border-stone-200';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!orderNumber || orderNumber === 'Processing') {
      return;
    }

    fetchMyOrder(orderNumber)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [fetchMyOrder, orderNumber]);

  return (
    <div className="relative flex min-h-screen flex-col bg-[#fcfbf9] font-sans text-[#1a1a1a]">
      <Navbar />

      <div
        className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035]"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}
      />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16 pt-24 sm:px-6 lg:pt-22">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.2, 1, 0.2, 1] }}
          className="w-full max-w-2xl border border-stone-200 bg-white shadow-sm"
        >
          <div className="border-b border-stone-100 bg-stone-50/50 p-6 text-center md:p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
              className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a1a1a] shadow-md"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fcfbf9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>

            <h1 className="mb-3 font-serif text-3xl md:text-4xl">Order Successful</h1>
            <p className="font-sans text-[11px] uppercase tracking-widest text-stone-500">
              Reference <span className="font-semibold text-[#1a1a1a]">#{orderNumber}</span>
            </p>
          </div>

          <div className="p-6 md:p-8">
            <div className="mb-7 grid grid-cols-1 gap-6 border-b border-stone-100 pb-7 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <span className="mb-2 block text-[9px] uppercase tracking-widest text-stone-400">Total Amount</span>
                  <span className="font-serif text-2xl">{formattedTotal}</span>
                </div>

                <div className="flex gap-3">
                  <div>
                    <span className="mb-2 block text-[9px] uppercase tracking-widest text-stone-400">Payment</span>
                    <span className={`rounded-sm px-3 py-1 text-[9px] font-semibold uppercase tracking-widest ${paidBadge}`}>
                      {paymentStatus}
                    </span>
                  </div>
                  <div>
                    <span className="mb-2 block text-[9px] uppercase tracking-widest text-stone-400">Status</span>
                    <span className={`rounded-sm px-3 py-1 text-[9px] font-semibold uppercase tracking-widest ${confirmedBadge}`}>
                      {fulfillmentStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-l-0 border-stone-100 font-sans text-[13px] leading-5 text-stone-600 md:border-l md:pl-6">
                <p>
                  <strong className="mb-1 block font-medium text-[#1a1a1a]">Confirmation</strong>
                  {emailSent}
                </p>
                <p>
                  <strong className="mb-1 block font-medium text-[#1a1a1a]">Next Steps</strong>
                  {nextStepMessage}
                </p>
                <p>
                  <strong className="mb-1 block font-medium text-[#1a1a1a]">Tracking</strong>
                  {trackingMessage}
                </p>
              </div>
            </div>

            {order?.items.length ? (
              <div className="mb-7 border-b border-stone-100 pb-7">
                <span className="mb-4 block text-[9px] uppercase tracking-widest text-stone-400">Order Items</span>
                <div className="space-y-4">
                  {order.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="h-16 w-12 shrink-0 overflow-hidden bg-stone-100">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-sans text-[12px] font-medium text-[#1a1a1a]">{item.name}</p>
                        <p className="mt-1 font-sans text-[10px] uppercase tracking-widest text-stone-400">
                          Qty {item.quantity} · INR {item.price.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <p className="shrink-0 font-serif text-lg text-[#1a1a1a]">
                        INR {(item.price * item.quantity).toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="font-sans text-[10px] uppercase tracking-widest text-stone-400">
                      +{order.items.length - 2} more item{order.items.length - 2 === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/account"
                className="w-full border border-stone-200 bg-white px-8 py-3.5 text-center text-[10px] font-semibold uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-stone-50 sm:w-auto"
              >
                View Orders
              </Link>
              <Link
                to="/shop"
                className="w-full bg-[#1a1a1a] px-8 py-3.5 text-center text-[10px] font-semibold uppercase tracking-widest text-[#fcfbf9] transition-colors hover:bg-stone-800 sm:w-auto"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
