import React, { useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle, MailCheck } from 'lucide-react';
import { useAuthStore } from './store/authStore';

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }

  return error instanceof Error ? error.message : 'Request failed.';
}

export default function Register() {
  const [searchParams] = useSearchParams();
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isCheckoutSignup = searchParams.get('next') === 'checkout';
  const verifiedLoginPath = isCheckoutSignup ? '/checkout/login' : '/login';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setMessage(response.message || 'Account created. Check your email to verify your account.');
      setPassword('');
    } catch (registerError) {
      setError(getErrorMessage(registerError));
    }
  };

  if (message) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] px-5 py-8 text-[#1a1a1a] font-sans">
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
          <section className="w-full rounded-[1.6rem] border border-stone-200 bg-white p-6 text-center shadow-[0_16px_50px_rgba(0,0,0,0.06)] md:p-10">
            <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
              <CheckCircle size={22} />
            </div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-stone-400">Verification Email Sent</p>
            <h1 className="mx-auto max-w-xl font-serif text-4xl leading-tight md:text-5xl">
              Check your email to continue.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-stone-600">
              We sent a verification button to {email.trim()}. Open the email, verify your account, then sign in{isCheckoutSignup ? ' to continue checkout' : ''}.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={verifiedLoginPath} className="rounded-full bg-[#1a1a1a] px-7 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#fcfbf9] transition-colors hover:bg-black">
                I Verified, Sign In
              </Link>
              <Link to="/shop" className="rounded-full border border-stone-200 bg-white px-7 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#111] transition-colors hover:border-stone-900">
                Back To Shop
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9] px-5 py-8 text-[#1a1a1a] font-sans">
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
        <section>
          <Link to={isCheckoutSignup ? '/checkout/login' : '/'} className="mb-12 inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm transition-colors hover:border-stone-900">
            <ArrowLeft size={17} />
          </Link>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-stone-400">Simvorae Account</p>
          <h1 className="max-w-xl font-serif text-[clamp(3.3rem,7vw,6rem)] leading-[0.9] tracking-tight">
            Create your account.
          </h1>
          <p className="mt-7 max-w-md text-[15px] font-light leading-7 text-stone-600">
            We will send a verification button to your email. {isCheckoutSignup ? 'After verifying, sign in to continue checkout.' : 'Checkout is available after your email is verified.'}
          </p>
        </section>

        <section className="rounded-[1.6rem] border border-stone-200 bg-white p-6 shadow-[0_16px_50px_rgba(0,0,0,0.06)] md:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
              <MailCheck size={18} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">New Customer</p>
              <h2 className="font-serif text-2xl">Register</h2>
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
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              className="w-full rounded-xl border border-stone-200 bg-[#fcfbf9] px-4 py-4 text-sm outline-none transition-colors focus:border-stone-900"
            />
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
              placeholder="Password, minimum 8 characters"
              className="w-full rounded-xl border border-stone-200 bg-[#fcfbf9] px-4 py-4 text-sm outline-none transition-colors focus:border-stone-900"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-[#1a1a1a] px-7 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#fcfbf9] transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-7 border-t border-stone-100 pt-6 text-center text-xs text-stone-500">
            Already verified?{' '}
            <Link to={verifiedLoginPath} className="font-bold uppercase tracking-[0.18em] text-[#111] hover:text-stone-500">
              Sign In
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
