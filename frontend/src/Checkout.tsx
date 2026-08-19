import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, ChevronLeft, CreditCard, ShieldCheck } from 'lucide-react';
import api from './lib/api';
import { useCartStore } from './store/cartStore';

type CheckoutStep = 'ADDRESS' | 'PAYMENT' | 'SUCCESS';

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: 'payment.failed', callback: (response: RazorpayFailureResponse) => void) => void;
    };
  }
}

type RazorpayFailureResponse = {
  error?: {
    description?: string;
    reason?: string;
    metadata?: {
      payment_id?: string;
      order_id?: string;
    };
  };
};

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById('razorpay-checkout-js') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { items, getCartTotal, clearCart } = useCartStore();
  const navigate = useNavigate();

  const [step, setStep] = useState<CheckoutStep>('ADDRESS');
  const [phone, setPhone] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const subtotal = getCartTotal();
  const total = subtotal;

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleAddressSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setConfirmedOrderNumber('');
    setStep('PAYMENT');
  };

  const handlePayment = async () => {
    if (isPaying) {
      return;
    }

    setError('');
    setIsPaying(true);

    try {
      const isRazorpayReady = await loadRazorpayScript();

      if (!isRazorpayReady || !window.Razorpay) {
        throw new Error('Unable to load Razorpay checkout. Please try again.');
      }

      const checkoutItems = items
        .filter((item) => item.id && item.id !== 'undefined' && item.id !== 'null')
        .map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        }));

      if (checkoutItems.length !== items.length) {
        throw new Error('Your cart has outdated items. Please remove them and add products again.');
      }

      const checkoutResponse = await api.post('/api/checkout', {
        customer: {
          name: formData.name,
          email: formData.email,
          phone,
        },
        shippingAddress: {
          addressLine1: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.pincode,
        },
        items: checkoutItems,
      });

      const checkout = checkoutResponse.data;
      const orderNumber = checkout.order.orderNumber;

      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.payment.amount,
        currency: checkout.payment.currency,
        name: 'SIMVORAE',
        description: `Order ${orderNumber}`,
        order_id: checkout.payment.razorpayOrderId,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: phone,
        },
        notes: {
          orderNumber,
        },
        theme: {
          color: '#1a1a1a',
        },
        handler: async (response: RazorpayCheckoutResponse) => {
          try {
            await api.post('/api/payments/razorpay/verify', {
              orderNumber,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            setConfirmedOrderNumber(orderNumber);
            clearCart();
            setStep('SUCCESS');
          } catch (verifyError) {
            const message = axios.isAxiosError(verifyError)
              ? verifyError.response?.data?.message || verifyError.message
              : 'Payment completed, but verification failed. Contact support with your payment id.';

            setError(message);
          } finally {
            setIsPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setError('Payment was not completed. Your cart is still saved.');
            setIsPaying(false);
          },
        },
      });

      razorpay.on('payment.failed', (response: RazorpayFailureResponse) => {
        const message = response.error?.description || response.error?.reason || 'Payment failed. Please try another payment method.';
        setError(message);
        setIsPaying(false);
      });

      razorpay.open();
    } catch (paymentError) {
      const message = axios.isAxiosError(paymentError)
        ? paymentError.response?.data?.message || paymentError.message
        : paymentError instanceof Error
          ? paymentError.message
          : 'Payment could not be started.';

      setError(message);
      setIsPaying(false);
    }
  };

  if (items.length === 0 && step !== 'SUCCESS') {
    return (
      <div className="min-h-screen bg-[#fcfbf9] text-[#1a1a1a] flex flex-col items-center justify-center p-6">
        <h2 className="font-serif text-3xl mb-4">Your bag is empty</h2>
        <button
          onClick={() => navigate('/shop')}
          className="px-8 py-4 bg-[#1a1a1a] text-[#fcfbf9] text-[10px] tracking-widest uppercase font-bold hover:bg-black transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  if (step === 'SUCCESS') {
    return (
      <div className="min-h-screen bg-[#fcfbf9] text-[#1a1a1a] flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle className="w-16 h-16 mb-6 text-[#1a1a1a]" />
        <h2 className="font-serif text-4xl mb-4">Order Placed Successfully!</h2>
        <p className="text-stone-500 font-light mb-2">Your payment is confirmed and order details have been sent by email.</p>
        {confirmedOrderNumber && <p className="text-xs font-mono text-stone-500 mb-8">Order {confirmedOrderNumber}</p>}
        <div className="flex gap-4">
          <button onClick={() => navigate('/shop')} className="px-8 py-4 bg-[#1a1a1a] text-[#fcfbf9] text-[10px] tracking-widest uppercase font-bold hover:bg-black transition-colors">
            Continue Shopping
          </button>
          <button disabled className="cursor-not-allowed px-8 py-4 border border-stone-200 text-stone-400 text-[10px] tracking-widest uppercase font-bold">
            My Orders Coming Soon
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#1a1a1a] font-sans">
      <div className="max-w-[1120px] mx-auto grid grid-cols-1 md:grid-cols-12 min-h-screen">
        <div className="md:col-span-7 lg:col-span-8 pt-12 md:pt-14 pb-16 px-6 md:px-8 lg:px-12 md:border-r border-[#1a1a1a]/10">
          <Link to="/shop" className="inline-flex items-center text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-semibold hover:text-stone-500 transition-colors mb-8 md:mb-12">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Catalog
          </Link>

          <div className="mb-8 md:mb-12">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-5xl tracking-tight mb-3">Checkout</h1>
            <div className="flex gap-3">
              <span className={`text-[10px] uppercase tracking-widest font-semibold ${step === 'ADDRESS' ? 'text-[#1a1a1a]' : 'text-stone-400'}`}>Details &gt;</span>
              <span className={`text-[10px] uppercase tracking-widest font-semibold ${step === 'ADDRESS' ? 'text-[#1a1a1a]' : 'text-stone-400'}`}>Shipping &gt;</span>
              <span className={`text-[10px] uppercase tracking-widest font-semibold ${step === 'PAYMENT' ? 'text-[#1a1a1a]' : 'text-stone-400'}`}>Payment</span>
            </div>
          </div>

          {step === 'ADDRESS' && (
            <form onSubmit={handleAddressSubmit} className="space-y-4 max-w-lg">
              <p className="text-stone-500 font-light text-sm mb-4 md:mb-6">Share your contact and delivery details.</p>

              <div className="grid grid-cols-2 gap-3">
                <input type="text" name="name" required value={formData.name} placeholder="Full Name" onChange={handleInputChange} className="col-span-2 w-full px-4 py-3 md:py-3.5 bg-transparent border border-[#1a1a1a]/20 rounded-md focus:border-[#1a1a1a] font-light text-sm outline-none" />
                <input type="email" name="email" required value={formData.email} placeholder="Email Address" onChange={handleInputChange} className="col-span-2 w-full px-4 py-3 md:py-3.5 bg-transparent border border-[#1a1a1a]/20 rounded-md focus:border-[#1a1a1a] font-light text-sm outline-none" />
                <input type="tel" required value={phone} placeholder="10-digit Mobile Number" pattern="[6-9][0-9]{9}" onChange={(event) => setPhone(event.target.value)} className="col-span-2 w-full px-4 py-3 md:py-3.5 bg-transparent border border-[#1a1a1a]/20 rounded-md focus:border-[#1a1a1a] font-light text-sm outline-none" />
                <input type="text" name="address" required value={formData.address} placeholder="Complete Delivery Address" onChange={handleInputChange} className="col-span-2 w-full px-4 py-3 md:py-3.5 bg-transparent border border-[#1a1a1a]/20 rounded-md focus:border-[#1a1a1a] font-light text-sm outline-none" />
                <input type="text" name="city" required value={formData.city} placeholder="City" onChange={handleInputChange} className="w-full col-span-2 sm:col-span-1 px-4 py-3 md:py-3.5 bg-transparent border border-[#1a1a1a]/20 rounded-md focus:border-[#1a1a1a] font-light text-sm outline-none" />
                <input type="text" name="state" required value={formData.state} placeholder="State" onChange={handleInputChange} className="w-full col-span-2 sm:col-span-1 px-4 py-3 md:py-3.5 bg-transparent border border-[#1a1a1a]/20 rounded-md focus:border-[#1a1a1a] font-light text-sm outline-none" />
                <input type="text" name="pincode" required value={formData.pincode} placeholder="PIN Code" pattern="[0-9]{6}" onChange={handleInputChange} className="w-full col-span-2 px-4 py-3 md:py-3.5 bg-transparent border border-[#1a1a1a]/20 rounded-md focus:border-[#1a1a1a] font-light text-sm outline-none" />
              </div>

              <div className="pt-4 md:pt-6">
                <button type="submit" className="w-full py-3.5 md:py-4 bg-[#1a1a1a] text-[#fcfbf9] text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-black transition-colors rounded-full">
                  Proceed to Payment
                </button>
              </div>
            </form>
          )}

          {step === 'PAYMENT' && (
            <div className="space-y-6 md:space-y-8 max-w-lg">
              <div className="p-6 md:p-8 bg-stone-100/50 rounded-[1rem] border border-[#1a1a1a]/10 text-sm font-light text-stone-600">
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-400">Deliver to</span>
                  <button onClick={() => setStep('ADDRESS')} className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#1a1a1a] hover:text-stone-500 border-b border-[#1a1a1a] pb-0.5">Edit</button>
                </div>
                <p className="mb-2"><strong className="font-medium text-[#1a1a1a] text-base">{formData.name}</strong></p>
                <p className="mb-1">{formData.address}</p>
                <p className="mb-4 md:mb-5">{formData.city}, {formData.state} - {formData.pincode}</p>
                <div className="w-full h-px bg-[#1a1a1a]/10 my-4 md:my-5" />
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-400">Contact</span>
                  <button onClick={() => setStep('ADDRESS')} className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#1a1a1a] hover:text-stone-500 border-b border-[#1a1a1a] pb-0.5">Edit</button>
                </div>
                <p className="mb-1">+91 {phone}</p>
                <p>{formData.email}</p>
              </div>

              <div className="pt-6 md:pt-8 border-t border-[#1a1a1a]/10">
                <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                  <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-stone-400" />
                  <h2 className="text-xl md:text-2xl font-serif tracking-tight">Payment Method</h2>
                </div>
                <p className="text-sm font-light text-stone-600 mb-6 md:mb-8 border border-[#1a1a1a]/10 p-4 md:p-6 rounded-[1rem] bg-[#fcfbf9]">
                  After clicking "Pay with Razorpay", complete your purchase securely using UPI, Card, Netbanking, or Wallet.
                </p>

                {error && (
                  <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <button disabled={isPaying} onClick={handlePayment} className="w-full py-4 md:py-5 bg-[#1a1a1a] text-[#fcfbf9] text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 rounded-full disabled:cursor-not-allowed disabled:opacity-60">
                  <ShieldCheck className="w-4 h-4" />
                  {isPaying ? 'Opening Razorpay...' : `Pay INR ${total.toLocaleString('en-IN')} with Razorpay`}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-5 lg:col-span-4 bg-stone-50/50 pt-12 md:pt-14 pb-16 px-6 md:px-8 lg:px-12 border-t md:border-t-0 border-[#1a1a1a]/10 h-full relative">
          <div className="md:sticky md:top-12">
            <h2 className="text-[10px] tracking-widest uppercase font-semibold mb-4 md:mb-6 text-stone-500">Order Summary</h2>

            <div className="space-y-4 md:space-y-6 mb-6 md:mb-8 max-h-[50vh] overflow-y-auto pt-2 pl-2 pr-4 pb-4 -ml-2 -mt-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-stone-300">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="relative flex-shrink-0">
                    <div className="w-14 md:w-16 aspect-[4/5] bg-stone-200 rounded-lg overflow-hidden border border-[#1a1a1a]/5">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#1a1a1a] text-[#fcfbf9] text-[10px] flex items-center justify-center rounded-full font-medium shadow-sm">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium hover:text-stone-500 transition-colors truncate">
                      <Link to={`/product/${item.id}`}>{item.name}</Link>
                    </h3>
                  </div>
                  <span className="text-sm font-medium">INR {(item.price * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 md:space-y-4 border-t border-[#1a1a1a]/10 pt-6 mb-6 text-sm font-light">
              <div className="flex justify-between">
                <span className="text-stone-500">Subtotal</span>
                <span className="font-medium text-[#1a1a1a]">INR {subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Shipping</span>
                <span className="font-medium text-[#1a1a1a] flex items-center gap-1.5">Free <span className="text-[10px] text-stone-400 italic">(via Shiprocket)</span></span>
              </div>
            </div>

            <div className="border-t border-[#1a1a1a]/10 pt-6 flex justify-between items-end">
              <span className="text-base md:text-lg font-medium">Total</span>
              <div className="flex items-end gap-2">
                <span className="text-[10px] font-sans uppercase tracking-widest text-stone-500 mb-1">INR</span>
                <span className="text-2xl md:text-3xl font-serif tracking-tight">{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
