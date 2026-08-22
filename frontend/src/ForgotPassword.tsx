import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Mail } from 'lucide-react';
import { useAuthStore } from './store/authStore';

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }

  return error instanceof Error ? error.message : 'Request failed.';
}

export default function ForgotPassword() {
  const { forgotPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await forgotPassword(email.trim());
      setMessage(response.message || 'If an account exists, a reset link has been sent.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] px-5 py-8 text-[#1a1a1a] font-sans">
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
        <section>
          <Link to="/login" className="mb-12 inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm transition-colors hover:border-stone-900">
            <ArrowLeft size={17} />
          </Link>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-stone-400">Account Recovery</p>
          <h1 className="max-w-xl font-serif text-[clamp(3.3rem,7vw,6rem)] leading-[0.9] tracking-tight">
            Reset your password.
          </h1>
          <p className="mt-7 max-w-md text-[15px] font-light leading-7 text-stone-600">
            Enter your verified email and we will send a secure reset link.
          </p>
        </section>

        <section className="rounded-[1.6rem] border border-stone-200 bg-white p-6 shadow-[0_16px_50px_rgba(0,0,0,0.06)] md:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">Forgot Password</p>
              <h2 className="font-serif text-2xl">Send reset link</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {message && (
              <p className="rounded-xl border border-stone-200 bg-[#fcfbf9] px-4 py-3 text-sm leading-6 text-stone-600">{message}</p>
            )}

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              className="w-full rounded-xl border border-stone-200 bg-[#fcfbf9] px-4 py-4 text-sm outline-none transition-colors focus:border-stone-900"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[#1a1a1a] px-7 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#fcfbf9] transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
