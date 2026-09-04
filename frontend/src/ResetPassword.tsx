import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, LockKeyhole } from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { useToast } from './contexts/ToastContext';

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }

  return error instanceof Error ? error.message : 'Request failed.';
}

function UnderlineField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  minLength?: number;
}) {
  return (
    <div className="group relative flex flex-col gap-2 border-b border-stone-200 pb-2">
      <label className="font-sans text-[9px] font-semibold uppercase tracking-widest text-stone-500 transition-colors group-focus-within:text-[#1a1a1a]">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={minLength}
        className="w-full bg-transparent px-0 py-2 text-sm text-[#1a1a1a] transition-colors placeholder:text-stone-300 focus:outline-none md:text-base"
        placeholder={placeholder}
      />
      <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#1a1a1a] transition-all duration-500 group-focus-within:w-full" />
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuthStore();
  const { showError, showSuccess } = useToast();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = searchParams.get('token') || '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!token) {
      showError('Reset link is missing. Please open the password reset link from your email.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword({ token, password });
      const successMessage = response.message || 'Password updated. You can sign in now.';
      setMessage(successMessage);
      showSuccess(successMessage);
      setPassword('');
    } catch (requestError) {
      showError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#fcfbf9] font-sans text-[#1a1a1a] md:h-screen md:min-h-0 md:overflow-hidden md:flex-row">
      <div
        className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035]"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}
      />

      <div className="relative order-1 h-[40vh] w-full overflow-hidden md:h-full md:w-1/2">
        <Link to="/" className="absolute left-6 top-6 z-50 font-serif text-2xl uppercase tracking-widest text-[#fcfbf9] transition-opacity hover:opacity-80 md:left-12 md:top-10 md:text-3xl">
          Simvorae
        </Link>
        <motion.img
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.2, 1, 0.2, 1] }}
          src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1200&auto=format&fit=crop"
          alt="Fashion editorial"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <div className="absolute bottom-8 left-6 z-10 text-[#fcfbf9] md:bottom-16 md:left-12">
          <h2 className="mb-2 font-serif text-3xl leading-tight md:text-5xl">
            Secure <br /> Access
          </h2>
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] md:text-[11px]">
            Choose a stronger password.
          </p>
        </div>
      </div>

      <div className="relative z-20 order-2 flex min-h-screen w-full items-center justify-center bg-[#fcfbf9] px-6 py-14 md:h-full md:min-h-0 md:w-1/2 md:px-16 md:py-0 lg:px-24">
        <div className="absolute right-6 top-6 z-50 hidden md:block md:right-12 md:top-10">
          <Link to="/login" className="border-b border-transparent pb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]">
            Back to Sign In
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.2, 1, 0.2, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-9">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
              {message ? <CheckCircle size={18} /> : <LockKeyhole size={18} />}
            </div>
            <h1 className="mb-4 font-serif text-4xl leading-[0.9] tracking-tighter text-[#1a1a1a] md:text-5xl">
              New Password
            </h1>
            <p className="font-sans text-[11px] uppercase leading-loose tracking-[0.2em] text-stone-500">
              Reset links expire after 30 minutes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {message && (
              <p className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-600">
                {message}
              </p>
            )}

            {!message && (
              <UnderlineField
                label="New Password"
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
                type="password"
                minLength={8}
              />
            )}

            {message ? (
              <Link
                to="/login"
                className="w-full rounded-full bg-[#1a1a1a] py-4 text-center font-sans text-[11px] font-semibold uppercase tracking-widest text-[#fcfbf9] transition-transform duration-300 hover:scale-[1.02] hover:bg-black"
              >
                Sign In
              </Link>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="w-full rounded-full bg-[#1a1a1a] py-4 font-sans text-[11px] font-semibold uppercase tracking-widest text-[#fcfbf9] transition-transform duration-300 hover:scale-[1.02] hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
