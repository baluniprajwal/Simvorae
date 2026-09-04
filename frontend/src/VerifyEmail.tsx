import { useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useToast } from './contexts/ToastContext';
import { useAuthStore } from './store/authStore';

function getVerificationErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || error.message;

    if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid')) {
      return 'Verification link is invalid or expired. Please create your account again.';
    }

    if (message.toLowerCase().includes('already exists')) {
      return 'This email is already verified. Please sign in.';
    }
  }

  return 'Email verification failed. Please try again.';
}

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
        await verifyEmail(token);

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
