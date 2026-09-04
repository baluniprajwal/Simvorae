import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';
import { isAdminTokenValid, setAdminToken } from './lib/adminAuth';
import api from './lib/api';

type LoginResponse = {
  token: string;
  user: {
    role: 'customer' | 'admin';
  };
};

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (isAdminTokenValid()) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      });

      if (response.data.user.role !== 'admin') {
        showError('This account does not have admin access.');
        return;
      }

      setAdminToken(response.data.token);
      showSuccess('Access granted. Welcome to Admin Portal.');
      navigate('/admin', { replace: true });
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || 'Invalid admin email or password.'
        : 'Invalid admin email or password.';
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#fcfbf9] p-6 font-sans text-[#1a1a1a]">
      <div
        className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035]"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}
      />

      <Link
        to="/"
        className="absolute left-6 top-6 z-50 font-serif text-2xl uppercase tracking-widest text-[#1a1a1a] transition-opacity hover:opacity-70 md:left-12 md:top-10"
      >
        Simvorae
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.2, 1, 0.2, 1] }}
        className="relative z-50 w-full max-w-md border border-stone-200 bg-white p-8 shadow-sm md:p-12"
      >
        <div className="mb-10 text-center">
          <h1 className="mb-2 font-serif text-3xl text-[#1a1a1a] md:text-4xl">Portal Access</h1>
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-stone-500">Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="group relative flex flex-col gap-2 border-b border-stone-200 pb-2">
            <label className="font-sans text-[9px] font-semibold uppercase tracking-widest text-stone-500 transition-colors group-focus-within:text-[#1a1a1a]">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full bg-transparent px-0 py-2 text-sm text-[#1a1a1a] transition-colors placeholder:text-stone-300 focus:outline-none"
              placeholder="admin@simvorae.com"
            />
            <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#1a1a1a] transition-all duration-500 group-focus-within:w-full" />
          </div>

          <div className="group relative flex flex-col gap-2 border-b border-stone-200 pb-2">
            <label className="font-sans text-[9px] font-semibold uppercase tracking-widest text-stone-500 transition-colors group-focus-within:text-[#1a1a1a]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full bg-transparent px-0 py-2 text-sm text-[#1a1a1a] transition-colors placeholder:text-stone-300 focus:outline-none"
              placeholder="Enter password"
            />
            <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#1a1a1a] transition-all duration-500 group-focus-within:w-full" />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 w-full cursor-pointer bg-[#1a1a1a] py-4 font-sans text-[11px] font-semibold uppercase tracking-widest text-[#fcfbf9] transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            {isSubmitting ? 'Authenticating' : 'Authenticate'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="border-b border-transparent pb-1 text-[9px] uppercase tracking-[0.2em] text-stone-400 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
          >
            Return to Customer Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
