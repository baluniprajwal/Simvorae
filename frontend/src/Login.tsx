import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
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
  rightSlot,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="group relative flex flex-col gap-2 border-b border-stone-200 pb-2">
      <div className="flex items-end justify-between gap-4">
        <label className="font-sans text-[9px] font-semibold uppercase tracking-widest text-stone-500 transition-colors group-focus-within:text-[#1a1a1a]">
          {label}
        </label>
        {rightSlot}
      </div>
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

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const { showError, showSuccess } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await login({ email: email.trim(), password });
      showSuccess('Logged in successfully.');
      navigate('/', { replace: true });
    } catch (loginError) {
      const message = getErrorMessage(loginError);
      showError(message.toLowerCase().includes('invalid') ? 'Invalid credentials. Please check your email and password.' : 'Could not sign in right now. Please try again.');
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#fcfbf9] font-sans text-[#1a1a1a] md:flex-row">
      <div
        className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035]"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}
      />

      <div className="relative order-1 h-[45vh] w-full overflow-hidden md:h-screen md:w-1/2">
        <Link to="/" className="absolute left-6 top-6 z-50 font-serif text-2xl uppercase tracking-widest text-[#fcfbf9] transition-opacity hover:opacity-80 md:left-12 md:top-10 md:text-3xl">
          Simvorae
        </Link>
        <motion.img
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.2, 1, 0.2, 1] }}
          src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop"
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
            Simvorae <br /> Society
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.7, ease: [0.2, 1, 0.2, 1] }}
            className="font-sans text-[10px] uppercase tracking-[0.2em] md:text-[11px]"
          >
            Exclusive access to the latest collections.
          </motion.p>
        </div>
      </div>

      <div className="relative z-20 order-2 flex min-h-screen w-full items-center justify-center bg-[#fcfbf9] px-6 py-24 md:w-1/2 md:px-16 lg:px-24">
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
          <div className="mb-12">
            <h1 className="mb-4 font-serif text-4xl leading-[0.9] tracking-tighter text-[#1a1a1a] md:text-5xl">
              Welcome Back
            </h1>
            <p className="font-sans text-[11px] uppercase leading-loose tracking-[0.2em] text-stone-500">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <UnderlineField
              label="Email Address"
              value={email}
              onChange={setEmail}
              placeholder="Enter your email"
              type="email"
            />

            <UnderlineField
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              type="password"
              rightSlot={(
                <Link to="/forgot-password" className="pb-1 font-sans text-[9px] uppercase tracking-widest text-stone-400 transition-colors hover:text-[#1a1a1a]">
                  Forgot?
                </Link>
              )}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-full bg-[#1a1a1a] py-5 font-sans text-[11px] font-semibold uppercase tracking-widest text-[#fcfbf9] transition-transform duration-300 hover:scale-[1.02] hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-12 text-center md:text-left">
            <p className="font-sans text-[10px] uppercase tracking-widest text-stone-500">
              New to Simvorae?
              <Link to="/register" className="ml-2 border-b border-[#1a1a1a] pb-[2px] font-bold text-[#1a1a1a] transition-colors hover:border-stone-600 hover:text-stone-600">
                Create Account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
