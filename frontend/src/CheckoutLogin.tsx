import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, LockKeyhole, ShoppingBag } from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }

  return error instanceof Error ? error.message : 'Request failed.';
}

export default function CheckoutLogin() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const cartCount = useCartStore((state) => state.getCartCount());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      await login({ email: email.trim(), password });
      navigate('/checkout', { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] px-5 py-8 text-[#1a1a1a] font-sans">
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl gap-10 lg:grid-cols-[0.95fr_1fr] lg:items-center">
        <section>
          <Link to="/cart" className="mb-12 inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm transition-colors hover:border-stone-900">
            <ArrowLeft size={17} />
          </Link>

          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-stone-700 shadow-sm">
            <ShoppingBag size={14} />
            <span className="text-[9px] font-bold uppercase tracking-[0.24em]">{cartCount} item{cartCount === 1 ? '' : 's'} in bag</span>
          </div>

          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-stone-400">Secure Checkout</p>
          <h1 className="max-w-xl font-serif text-[clamp(3.3rem,7vw,6rem)] leading-[0.9] tracking-tight">
            Sign in to place your order.
          </h1>
          <p className="mt-7 max-w-md text-[15px] font-light leading-7 text-stone-600">
            Orders are placed only from verified accounts, so payment, email updates, and tracking stay attached to one customer profile.
          </p>
        </section>

        <section className="rounded-[1.6rem] border border-stone-200 bg-white p-6 shadow-[0_16px_50px_rgba(0,0,0,0.06)] md:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
              <LockKeyhole size={18} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">Checkout Login</p>
              <h2 className="font-serif text-2xl">Continue securely</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              className="w-full rounded-xl border border-stone-200 bg-[#fcfbf9] px-4 py-4 text-sm outline-none transition-colors focus:border-stone-900"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-stone-200 bg-[#fcfbf9] px-4 py-4 text-sm outline-none transition-colors focus:border-stone-900"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-[#1a1a1a] px-7 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#fcfbf9] transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Signing In...' : 'Continue To Checkout'}
            </button>
          </form>

          <p className="mt-7 border-t border-stone-100 pt-6 text-center text-xs text-stone-500">
            Need an account?{' '}
            <Link to="/register?next=checkout" className="font-bold uppercase tracking-[0.18em] text-[#111] hover:text-stone-500">
              Create Account
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
