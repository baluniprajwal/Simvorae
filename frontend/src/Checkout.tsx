import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, CreditCard, ShieldCheck, UserCheck } from 'lucide-react';
import api from './lib/api';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';

type CheckoutStep = 'ADDRESS' | 'PAYMENT';

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

function FieldError({
  children,
  error,
  className = '',
}: {
  children: React.ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {children}
      {error && <p className="mt-1.5 text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}

export default function Checkout() {
  const { items, getCartTotal, clearCart } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const refreshMe = useAuthStore((state) => state.refreshMe);
  const navigate = useNavigate();
  const hasPrefilledRef = useRef(false);

  const [step, setStep] = useState<CheckoutStep>('ADDRESS');
  const [phone, setPhone] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const subtotal = getCartTotal();
  const total = subtotal;

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (!user || hasPrefilledRef.current) {
      return;
    }

    const defaultAddress = user.addresses?.find((address) => address.isDefault) || user.addresses?.[0];

    if (user.phone) {
      setPhone(user.phone.replace(/\D/g, '').slice(0, 10));
    }

    if (defaultAddress) {
      setFormData({
        address: defaultAddress.addressLine1 || '',
        city: defaultAddress.city || '',
        state: defaultAddress.state || '',
        pincode: defaultAddress.postalCode || '',
      });
    }

    hasPrefilledRef.current = true;
  }, [user]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFieldErrors((current) => ({ ...current, [event.target.name]: '' }));
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const validateCheckoutForm = () => {
    const nextErrors: Record<string, string> = {};
    const trimmed = {
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      phone: phone.trim(),
    };

    if (!user?.name || !user.email) {
      nextErrors.account = 'Please sign in again before checkout.';
    }

    if (!/^[6-9]\d{9}$/.test(trimmed.phone)) {
      nextErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }

    if (trimmed.address.length < 8) {
      nextErrors.address = 'Enter the complete delivery address.';
    }

    if (!trimmed.city) {
      nextErrors.city = 'Enter the delivery city.';
    }

    if (!trimmed.state) {
      nextErrors.state = 'Enter the delivery state.';
    }

    if (!/^\d{6}$/.test(trimmed.pincode)) {
      nextErrors.pincode = 'Enter a valid 6-digit PIN code.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAddressSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!validateCheckoutForm()) {
      setError('Please fix the highlighted checkout details.');
      return;
    }

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
          name: user?.name,
          email: user?.email,
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
          name: user?.name,
          email: user?.email,
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

            window.sessionStorage.setItem('simvorae_last_order', JSON.stringify({
              orderNumber,
              total,
              email: user?.email || '',
            }));
            clearCart();
            navigate(`/order-success?order=${encodeURIComponent(orderNumber)}`, { replace: true });
          } catch (verifyError) {
            const message = axios.isAxiosError(verifyError)
              ? verifyError.response?.data?.message || verifyError.message
              : 'Payment completed, but verification failed. Contact support with your payment ID.';

            setError(message);
          } finally {
            setIsPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setError('Payment window was closed before completion. Your cart is still saved and no payment was confirmed.');
            setIsPaying(false);
          },
        },
      });

      razorpay.on('payment.failed', (response: RazorpayFailureResponse) => {
        const paymentId = response.error?.metadata?.payment_id;
        const reason = response.error?.description || response.error?.reason || 'Payment failed. Please try another payment method.';
        setError(paymentId ? `${reason} Payment ID: ${paymentId}` : reason);
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

  if (items.length === 0) {
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

              {error && (
                <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="rounded-[1rem] border border-[#1a1a1a]/10 bg-stone-100/40 p-4">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  <UserCheck className="h-4 w-4 text-stone-500" />
                  Signed in as
                </div>
                <p className="font-medium text-[#1a1a1a]">{user?.name}</p>
                <p className="mt-1 text-sm font-light text-stone-600">{user?.email}</p>
                {fieldErrors.account && <p className="mt-2 text-[11px] font-medium text-red-600">{fieldErrors.account}</p>}
              </div>
              {(phone || formData.address) && (
                <p className="text-[11px] leading-5 text-stone-500">
                  Saved delivery details are filled in automatically. You can edit them for this order.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FieldError className="col-span-2" error={fieldErrors.phone}>
                  <input type="tel" value={phone} placeholder="10-digit Mobile Number" onChange={(event) => { setFieldErrors((current) => ({ ...current, phone: '' })); setPhone(event.target.value.replace(/\D/g, '').slice(0, 10)); }} className="w-full px-4 py-3 md:py-3.5 bg-transparent border border-[#1a1a1a]/20 rounded-md focus:border-[#1a1a1a] font-light text-sm outline-none" />
                </FieldError>
                <FieldError className="col-span-2" error={fieldErrors.address}>
                  <input type="text" name="address" value={formData.address} placeholder="Complete Delivery Address" onChange={handleInputChange} className="w-full px-4 py-3 md:py-3.5 bg-transparent border border-[#1a1a1a]/20 rounded-md focus:border-[#1a1a1a] font-light text-sm outline-none" />
                </FieldError>
                <FieldError className="col-span-2 sm:col-span-1" error={fieldErrors.city}>
                  <input type="text" name="city" value={formData.city} placeholder="City" onChange={handleInputChange} className="w-full px-4 py-3 md:py-3.5 bg-transparent border border-[#1a1a1a]/20 rounded-md focus:border-[#1a1a1a] font-light text-sm outline-none" />
                </FieldError>
                <FieldError className="col-span-2 sm:col-span-1" error={fieldErrors.state}>
                  <input type="text" name="state" value={formData.state} placeholder="State" onChange={handleInputChange} className="w-full px-4 py-3 md:py-3.5 bg-transparent border border-[#1a1a1a]/20 rounded-md focus:border-[#1a1a1a] font-light text-sm outline-none" />
                </FieldError>
                <FieldError className="col-span-2" error={fieldErrors.pincode}>
                  <input type="text" name="pincode" value={formData.pincode} placeholder="PIN Code" onChange={(event) => { setFieldErrors((current) => ({ ...current, pincode: '' })); setFormData({ ...formData, pincode: event.target.value.replace(/\D/g, '').slice(0, 6) }); }} className="w-full px-4 py-3 md:py-3.5 bg-transparent border border-[#1a1a1a]/20 rounded-md focus:border-[#1a1a1a] font-light text-sm outline-none" />
                </FieldError>
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
                <p className="mb-2"><strong className="font-medium text-[#1a1a1a] text-base">{user?.name}</strong></p>
                <p className="mb-1">{formData.address}</p>
                <p className="mb-4 md:mb-5">{formData.city}, {formData.state} - {formData.pincode}</p>
                <div className="w-full h-px bg-[#1a1a1a]/10 my-4 md:my-5" />
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-400">Contact</span>
                  <button onClick={() => setStep('ADDRESS')} className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#1a1a1a] hover:text-stone-500 border-b border-[#1a1a1a] pb-0.5">Edit</button>
                </div>
                <p className="mb-1">+91 {phone}</p>
                <p>{user?.email}</p>
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
