import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, Eye, EyeOff, Lock, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';
import { useToast } from './contexts/ToastContext';

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : 'Request failed.';
}

const formatPrice = (price: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(price);

export default function CheckoutLogin() {
  const navigate = useNavigate();
  const { user, login, isLoading } = useAuthStore();
  const { items, isOpen: isCartOpen, toggleCart, getCartTotal, getCartCount } = useCartStore();
  const { showError, showSuccess } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) navigate('/checkout', { replace: true });
  }, [navigate, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await login({ email: email.trim(), password });
      showSuccess('Signed in. Proceeding to checkout.');
      navigate('/checkout', { replace: true });
    } catch (loginError) {
      const message = getErrorMessage(loginError);
      showError(message.toLowerCase().includes('invalid')
        ? 'Invalid credentials. Please check your email and password.'
        : 'Could not sign in right now. Please try again.');
    }
  };

  const count = getCartCount();
  const total = getCartTotal();
  const handleBackToBag = () => {
    navigate(-1);
    if (!isCartOpen) window.setTimeout(toggleCart, 0);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#fcfbf9] font-sans text-[#1a1a1a] md:flex-row">
      <div className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />

      <section className="relative order-1 flex min-h-[52vh] w-full flex-col justify-between overflow-hidden bg-[#161616] p-6 text-[#fcfbf9] md:min-h-screen md:w-5/12 md:p-12 lg:w-1/2 lg:p-16">
        <motion.img initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 0.35 }} transition={{ duration: 1.6, ease: [0.2, 1, 0.2, 1] }} src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1400&auto=format&fit=crop" alt="Simvorae atelier" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/70 to-[#121212]/30" />

        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="cursor-pointer font-serif text-2xl uppercase tracking-widest transition-opacity hover:opacity-80 md:text-3xl">Simvorae</Link>
          <div className="flex items-center gap-2 border border-white/10 bg-white/10 px-3 py-1.5 font-sans text-[9px] uppercase tracking-[0.2em] text-stone-300 backdrop-blur-md"><Lock size={11} /><span>Secure Access</span></div>
        </div>

        <div className="relative z-10 my-10 max-w-md md:my-auto">
          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="mb-3 font-sans text-[10px] uppercase tracking-[0.25em] text-stone-400">Private Client Checkout</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3 }} className="mb-5 font-serif text-4xl leading-[1.02] tracking-tight text-[#fcfbf9] md:text-5xl">Refined Living,<br />Seamlessly Delivered.</motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.4 }} className="max-w-sm font-sans text-xs font-light leading-relaxed text-stone-300 md:text-sm">Sign in to keep payment, delivery updates, and tracking securely connected to your customer account.</motion.p>
        </div>

        <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.5 }} className="relative z-10 border border-white/15 bg-white/[0.07] p-5 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 font-sans text-[9px] uppercase tracking-widest text-stone-300">
            <span className="flex items-center gap-2 text-white"><ShoppingBag size={14} /><span>Shopping Bag ({count} {count === 1 ? 'Piece' : 'Pieces'})</span></span>
            <span className="font-serif text-base normal-case tracking-normal text-white">{formatPrice(total)}</span>
          </div>
          {items.length ? (
            <div data-lenis-prevent className="max-h-36 space-y-3 overflow-y-auto overscroll-contain pt-3 pr-1">
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 font-sans text-[10px] text-stone-300">
                  <div className="flex min-w-0 items-center gap-3"><img src={item.image} alt={item.name} className="h-9 w-7 shrink-0 object-cover" /><span className="truncate">{item.name} <span className="text-stone-400">&times; {item.quantity}</span></span></div>
                  <span className="shrink-0 text-stone-200">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              {items.length > 3 && <p className="font-sans text-[9px] text-stone-400">+ {items.length - 3} additional {items.length - 3 === 1 ? 'item' : 'items'}</p>}
            </div>
          ) : <p className="pt-3 font-sans text-[10px] text-stone-400">Your bag is currently empty.</p>}
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 font-sans text-[8px] uppercase tracking-wider text-stone-400">
            <span className="flex items-center gap-1.5"><Truck size={12} />Free Shipping</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={12} />Secure Payment</span>
          </div>
        </motion.div>
      </section>

      <section className="relative z-20 order-2 flex min-h-screen w-full items-center justify-center bg-[#fcfbf9] px-6 py-20 md:w-7/12 md:px-14 lg:w-1/2 lg:px-20">
        <Link to="/shop" className="absolute right-6 top-6 cursor-pointer border-b border-transparent pb-1 font-sans text-[9px] uppercase tracking-[0.2em] text-stone-400 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a] md:right-12 md:top-10">Back to Shop</Link>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2, ease: [0.2, 1, 0.2, 1] }} className="w-full max-w-md">
          <div className="mb-10">
            <span className="mb-2 block font-sans text-[9px] uppercase tracking-[0.25em] text-stone-400">Identification</span>
            <h1 className="mb-3 font-serif text-4xl leading-none tracking-tight text-[#1a1a1a] md:text-5xl">Sign In to Checkout</h1>
            <p className="font-sans text-xs font-light leading-relaxed text-stone-500 md:text-sm">Enter your account details to continue with shipping and secure payment.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-7">
            <div className="group relative flex flex-col gap-2 border-b border-stone-300 pb-2 focus-within:border-[#1a1a1a]">
              <label className="font-sans text-[9px] uppercase tracking-widest text-stone-500 group-focus-within:text-[#1a1a1a]">Email Address</label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="w-full bg-transparent py-1.5 font-sans text-sm text-[#1a1a1a] outline-none placeholder:text-stone-300 md:text-base" placeholder="Enter your registered email" />
              <span className="absolute -bottom-px left-0 h-px w-0 bg-[#1a1a1a] transition-all duration-500 group-focus-within:w-full" />
            </div>

            <div className="group relative flex flex-col gap-2 border-b border-stone-300 pb-2 focus-within:border-[#1a1a1a]">
              <div className="flex items-end justify-between"><label className="font-sans text-[9px] uppercase tracking-widest text-stone-500 group-focus-within:text-[#1a1a1a]">Password</label><Link to="/forgot-password" className="cursor-pointer font-sans text-[9px] uppercase tracking-widest text-stone-400 transition-colors hover:text-[#1a1a1a]">Forgot?</Link></div>
              <div className="relative flex items-center"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" className="w-full bg-transparent py-1.5 pr-8 font-sans text-sm text-[#1a1a1a] outline-none placeholder:text-stone-300 md:text-base" placeholder="Enter your password" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-0 cursor-pointer text-stone-400 transition-colors hover:text-stone-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
              <span className="absolute -bottom-px left-0 h-px w-0 bg-[#1a1a1a] transition-all duration-500 group-focus-within:w-full" />
            </div>

            <button type="submit" disabled={isLoading} className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 bg-[#1a1a1a] py-4 font-sans text-[10px] uppercase tracking-[0.2em] text-[#fcfbf9] transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"><span>{isLoading ? 'Signing In' : 'Sign In & Proceed'}</span><ArrowRight size={14} /></button>
          </form>

          <div className="mt-10 border-t border-stone-200 pt-8"><p className="font-sans text-[10px] uppercase tracking-wider text-stone-500">Don't have an account? <Link to="/register?next=checkout" className="ml-1 inline-block cursor-pointer border-b border-[#1a1a1a] pb-0.5 text-[#1a1a1a] transition-colors hover:border-stone-500 hover:text-stone-600">Create an Account</Link></p></div>
          <div className="mt-8"><button type="button" onClick={handleBackToBag} className="flex w-fit cursor-pointer items-center gap-1 font-sans text-[9px] uppercase tracking-widest text-stone-400 transition-colors hover:text-black"><ChevronLeft size={13} />Back to Bag</button></div>
        </motion.div>
      </section>
    </div>
  );
}
