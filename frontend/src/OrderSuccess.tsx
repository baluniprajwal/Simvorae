import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Mail, PackageCheck, ReceiptText, Truck } from 'lucide-react';

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
  const storedOrder = getStoredOrder();
  const orderNumber = searchParams.get('order') || storedOrder.orderNumber || '';
  const formattedTotal = typeof storedOrder.total === 'number'
    ? storedOrder.total.toLocaleString('en-IN')
    : '';

  return (
    <div className="min-h-screen bg-[#fcfbf9] px-5 py-3 text-[#1a1a1a] font-sans">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}
      />

      <main className="relative z-10 mx-auto max-w-6xl">
        <Link
          to="/shop"
          className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-[#111] shadow-sm transition-colors hover:border-stone-900"
          aria-label="Back to shop"
        >
          <ArrowLeft size={17} />
        </Link>

        <section className="grid gap-10 lg:grid-cols-[minmax(360px,0.86fr)_minmax(440px,1fr)] lg:items-center">
          <div className="max-w-xl pt-2 lg:-mt-20 xl:-mt-24">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-800">
              <CheckCircle size={14} />
              <span className="text-[9px] font-bold uppercase tracking-[0.24em]">Payment Confirmed</span>
            </div>

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.32em] text-stone-400">Simvorae Order</p>
            <h1 className="max-w-[560px] font-serif text-[clamp(3.25rem,6.7vw,5.6rem)] leading-[0.9] tracking-tight">
              Your order is confirmed.
            </h1>

            <p className="mt-7 max-w-lg text-[15px] font-light leading-7 text-stone-600">
              Your payment is verified. We have sent the order confirmation email{storedOrder.email ? ` to ${storedOrder.email}` : ''}.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link to="/shop" className="rounded-full bg-[#1a1a1a] px-7 py-4 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-[#fcfbf9] transition-colors hover:bg-black">
                Continue Shopping
              </Link>
              <Link to="/" className="rounded-full border border-stone-200 bg-white px-7 py-4 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-[#111] transition-colors hover:border-stone-900">
                Back Home
              </Link>
            </div>
          </div>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white shadow-[0_16px_50px_rgba(0,0,0,0.06)]">
              <div className="flex flex-col gap-4 border-b border-stone-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                    <ReceiptText size={17} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">Order Summary</p>
                    <p className="mt-1 font-serif text-xl leading-none text-[#111]">Receipt</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-700">Paid</span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-stone-600">Confirmed</span>
                </div>
              </div>

              <div className="space-y-5 px-5 py-6 md:px-7">
                <div className="grid gap-4 border-b border-stone-100 pb-5 sm:grid-cols-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">Order ID</p>
                    <p className="mt-2 font-mono text-sm font-bold text-[#111]">{orderNumber || 'Processing'}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">Confirmation</p>
                    <p className="mt-2 text-sm font-medium text-[#111]">Email sent</p>
                  </div>
                </div>

                <div className="rounded-[1rem] border border-stone-200 bg-[#fcfbf9] p-4">
                  <div className="flex gap-3.5">
                    <Mail className="mt-0.5 shrink-0 text-stone-500" size={16} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">Confirmation Email</p>
                      <p className="mt-2 max-w-lg text-[13px] leading-6 text-stone-600">
                        We sent the confirmation email{storedOrder.email ? ` to ${storedOrder.email}` : ''}. Keep it for order reference and support.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 border-b border-stone-100 pb-5 text-[15px]">
                  <div className="flex justify-between gap-6">
                    <span className="text-stone-500">Payment Status</span>
                    <span className="font-medium text-[#111]">Paid</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-stone-500">Fulfillment Status</span>
                    <span className="font-medium text-[#111]">Confirmed</span>
                  </div>
                  {formattedTotal && (
                    <div className="flex justify-between gap-6">
                      <span className="text-stone-500">Order Total</span>
                      <span className="font-mono font-bold text-[#111]">INR {formattedTotal}</span>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1rem] border border-stone-200 bg-[#fcfbf9] p-4.5">
                    <PackageCheck className="mb-4 text-stone-400" size={18} />
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">Next Step</p>
                    <p className="mt-2 text-[13px] leading-6 text-stone-600">Our team will review and pack your order.</p>
                  </div>
                  <div className="rounded-[1rem] border border-stone-200 bg-[#fcfbf9] p-4.5">
                    <Truck className="mb-4 text-stone-400" size={18} />
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">Tracking</p>
                    <p className="mt-2 text-[13px] leading-6 text-stone-600">Tracking details will be emailed after shipment is created.</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="px-2 text-center text-[11px] leading-5 text-stone-400">
              Need help? Reply to your confirmation email with your order number.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
