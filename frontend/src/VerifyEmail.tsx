import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from './store/authStore';

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }

  return error instanceof Error ? error.message : 'Email verification failed.';
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyEmail } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const token = searchParams.get('token') || '';

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing.');
        return;
      }

      try {
        const response = await verifyEmail(token);

        if (!isMounted) {
          return;
        }

        setStatus('success');
        setMessage(response.message || 'Email verified successfully.');
        window.setTimeout(() => navigate('/checkout', { replace: true }), 1200);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatus('error');
        setMessage(getErrorMessage(error));
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [navigate, token, verifyEmail]);

  return (
    <div className="min-h-screen bg-[#fcfbf9] px-5 py-8 text-[#1a1a1a] font-sans">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
        <section className="w-full rounded-[1.8rem] border border-stone-200 bg-white p-8 text-center shadow-[0_16px_50px_rgba(0,0,0,0.06)] md:p-12">
          <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
            {status === 'loading' && <Loader2 size={22} className="animate-spin" />}
            {status === 'success' && <CheckCircle size={22} className="text-emerald-700" />}
            {status === 'error' && <AlertTriangle size={22} className="text-red-600" />}
          </div>

          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-stone-400">Email Verification</p>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">
            {status === 'success' ? 'Email verified.' : status === 'error' ? 'Link could not be verified.' : 'Checking your link.'}
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-stone-600">{message}</p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {status === 'success' ? (
              <Link to="/checkout" className="rounded-full bg-[#1a1a1a] px-7 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#fcfbf9] transition-colors hover:bg-black">
                Continue Checkout
              </Link>
            ) : (
              <>
                <Link to="/login" className="rounded-full bg-[#1a1a1a] px-7 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#fcfbf9] transition-colors hover:bg-black">
                  Back To Login
                </Link>
                <Link to="/register" className="rounded-full border border-stone-200 bg-white px-7 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#111] transition-colors hover:border-stone-900">
                  Create Account
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
