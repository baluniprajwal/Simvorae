import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
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
        className="w-full bg-transparent px-0 py-2 text-sm text-[#1a1a1a] transition-colors placeholder:text-stone-300 focus:outline-none md:text-base"
        placeholder={placeholder}
      />
      <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#1a1a1a] transition-all duration-500 group-focus-within:w-full" />
    </div>
  );
}

export default function Register() {
  const [searchParams] = useSearchParams();
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { showError, showSuccess } = useToast();
  const isCheckoutSignup = searchParams.get('next') === 'checkout';
  const verifiedLoginPath = isCheckoutSignup ? '/checkout/login' : '/login';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (password.length < 8) {
      showError('Password must be at least 8 characters long.');
      return;
    }

    try {
      const response = await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setMessage(response.message || 'Check your email and click Verify Email to create your account.');
      showSuccess('Verification email sent. Please check your inbox.');
      setPassword('');
    } catch (registerError) {
      const message = getErrorMessage(registerError);
      showError(message.toLowerCase().includes('already') ? 'An account already exists with this email.' : 'Could not create your account right now. Please try again.');
    }
  };

  if (message) {
    return (
      <div className="relative flex min-h-screen flex-col bg-[#fcfbf9] font-sans text-[#1a1a1a] md:h-screen md:min-h-0 md:overflow-hidden md:flex-row">
        <div
          className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035]"
          style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}
        />

        <div className="relative order-1 h-[38vh] w-full overflow-hidden md:h-full md:w-1/2">
          <Link to="/" className="absolute left-6 top-6 z-50 font-serif text-2xl uppercase tracking-widest text-[#fcfbf9] transition-opacity hover:opacity-80 md:left-12 md:top-10 md:text-3xl">
            Simvorae
          </Link>
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop"
            alt="Fashion editorial"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute bottom-8 left-6 z-10 text-[#fcfbf9] md:bottom-16 md:left-12">
            <h2 className="mb-2 font-serif text-3xl leading-tight md:text-5xl">
              Almost <br /> There
            </h2>
            <p className="font-sans text-[10px] uppercase tracking-[0.2em] md:text-[11px]">
              Verify to activate your account.
            </p>
          </div>
        </div>

        <div className="relative z-20 order-2 flex min-h-[62vh] w-full items-center justify-center bg-[#fcfbf9] px-6 py-16 md:h-full md:min-h-0 md:w-1/2 md:px-16 md:py-0 lg:px-24">
          <div className="absolute right-6 top-6 z-50 hidden md:block md:right-12 md:top-10">
            <Link to="/" className="border-b border-transparent pb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]">
              Back to Shop
            </Link>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 1, 0.2, 1] }}
            className="w-full max-w-md text-center md:text-left"
          >
            <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
              <CheckCircle size={22} />
            </div>
            <p className="mb-4 font-sans text-[10px] font-semibold uppercase tracking-[0.3em] text-stone-400">
              Verification Email Sent
            </p>
            <h1 className="mb-6 font-serif text-4xl leading-[0.95] tracking-tighter text-[#1a1a1a] md:text-5xl">
              Check your email to continue.
            </h1>
            <p className="text-sm leading-7 text-stone-600">
              We sent a verification button to {email.trim()}. Open the email, verify your account, then sign in{isCheckoutSignup ? ' to continue checkout' : ''}.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to={verifiedLoginPath} className="rounded-full bg-[#1a1a1a] px-7 py-4 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-[#fcfbf9] transition-colors hover:bg-black">
                I Verified, Sign In
              </Link>
              <Link to="/shop" className="rounded-full border border-stone-200 bg-white px-7 py-4 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-[#111] transition-colors hover:border-stone-900">
                Back To Shop
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

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
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop"
          alt="Fashion editorial"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 md:opacity-60" />
        <div className="absolute bottom-8 left-6 z-10 text-[#fcfbf9] md:bottom-16 md:left-12">
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.2, 1, 0.2, 1] }}
            className="mb-2 font-serif text-3xl leading-tight md:text-5xl"
          >
            Join The <br /> Collective
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.7, ease: [0.2, 1, 0.2, 1] }}
            className="font-sans text-[10px] uppercase tracking-[0.2em] md:text-[11px]"
          >
            Curated pieces, just for you.
          </motion.p>
        </div>
      </div>

      <div className="relative z-20 order-2 flex min-h-screen w-full items-center justify-center bg-[#fcfbf9] px-6 py-12 md:h-full md:min-h-0 md:w-1/2 md:px-16 md:py-0 lg:px-24">
        <div className="absolute right-6 top-6 z-50 hidden md:block md:right-12 md:top-10">
          <Link to="/" className="border-b border-transparent pb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]">
            Back to Shop
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.2, 1, 0.2, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-7">
            <h1 className="mb-4 font-serif text-4xl leading-[0.9] tracking-tighter text-[#1a1a1a] md:text-5xl">
              Create Account
            </h1>
            <p className="font-sans text-[11px] uppercase leading-loose tracking-[0.2em] text-stone-500">
              {isCheckoutSignup ? 'Verify before checkout' : 'Become a Simvorae member'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <UnderlineField label="Full Name" value={name} onChange={setName} placeholder="Enter your full name" />
            <UnderlineField label="Email Address" value={email} onChange={setEmail} placeholder="Enter your email" type="email" />
            <UnderlineField label="Password" value={password} onChange={setPassword} placeholder="Create a password" type="password" />

            <p className="-mt-1 font-sans text-[10px] leading-relaxed tracking-wide text-stone-400">
              We will send a verification button to your email. The account is created only after verification.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-0 w-full rounded-full bg-[#1a1a1a] py-4 font-sans text-[11px] font-semibold uppercase tracking-widest text-[#fcfbf9] transition-transform duration-300 hover:scale-[1.02] hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Sending Verification...' : 'Join Simvorae'}
            </button>
          </form>

          <div className="mt-5 text-center md:text-left">
            <p className="font-sans text-[10px] uppercase tracking-widest text-stone-500">
              Already have an account?
              <Link to={verifiedLoginPath} className="ml-2 border-b border-[#1a1a1a] pb-[2px] font-bold text-[#1a1a1a] transition-colors hover:border-stone-600 hover:text-stone-600">
                Sign In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
