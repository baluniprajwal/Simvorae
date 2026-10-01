import { useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useToast } from './contexts/ToastContext';
import { useAuthStore } from './store/authStore';

function getVerificationErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || error.message;

    // A used link looks the same as an expired one to the server, and second clicks are common
    // (double clicks, mail apps opening links), so do not assume the account is gone.
    if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid')) {
      return 'This link has already been used or has expired. Try signing in; if that fails, create your account again.';
    }

    if (message.toLowerCase().includes('already exists')) {
      return 'This email is already verified. Please sign in.';
    }
  }

  return 'Email verification failed. Please try again.';
}

// Each link is single-use on the server. React development mode runs effects twice, which would
// spend the token on the first run and report the second as a failure.
const tokensInFlight = new Map<string, ReturnType<ReturnType<typeof useAuthStore.getState>['verifyEmail']>>();

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verifyEmail = useAuthStore((state) => state.verifyEmail);
  const { showError, showSuccess } = useToast();
  const token = searchParams.get('token') || '';

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      if (!token) {
        showError('Verification link is missing. Please use the link from your email.');
        navigate('/login', { replace: true });
        return;
      }

      try {
        if (!tokensInFlight.has(token)) {
          tokensInFlight.set(token, verifyEmail(token));
        }
        await tokensInFlight.get(token);

        if (!isMounted) {
          return;
        }

        showSuccess('Email verified. Please sign in to continue.');
        navigate('/login', { replace: true });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        showError(getVerificationErrorMessage(error));
        navigate('/login', { replace: true });
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [navigate, showError, showSuccess, token, verifyEmail]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fcfbf9] font-sans text-[#1a1a1a]">
      <div
        className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.035]"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}
      />
      <div className="relative z-10 flex items-center gap-3 border border-stone-200 bg-white px-6 py-4">
        <Loader2 size={14} className="animate-spin text-stone-500" />
        <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-stone-500">Verifying Email</span>
      </div>
    </div>
  );
}
