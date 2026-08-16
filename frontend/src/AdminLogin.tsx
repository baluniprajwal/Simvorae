import axios from 'axios';
import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, Mail } from 'lucide-react';
import api from './lib/api';

type LoginResponse = {
  token: string;
  user: {
    role: 'customer' | 'admin';
  };
};

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (window.localStorage.getItem('simvorae_admin_token')) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      });

      if (response.data.user.role !== 'admin') {
        throw new Error('This account does not have admin access.');
      }

      window.localStorage.setItem('simvorae_admin_token', response.data.token);
      navigate('/admin', { replace: true });
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : error instanceof Error
          ? error.message
          : 'Admin login failed.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#141414] text-[#fcfbf9] flex items-center justify-center p-6">
      <div className="pointer-events-none fixed inset-0 opacity-[0.08]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />

      <section className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#fcfbf9] p-7 text-[#1a1a1a] shadow-2xl md:p-9">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-stone-500 hover:text-stone-900"
        >
          <ArrowLeft size={13} />
          Back to store
        </button>

        <div className="mb-8">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400">Admin Portal</p>
          <h1 className="font-serif text-4xl tracking-tight">SIMVORAE</h1>
          <p className="mt-3 text-sm font-light leading-6 text-stone-500">
            Sign in with an admin account to manage orders and catalog operations.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-stone-500">Email</span>
            <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 focus-within:border-stone-500">
              <Mail size={15} className="text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-stone-500">Password</span>
            <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 focus-within:border-stone-500">
              <LockKeyhole size={15} className="text-stone-400" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 w-full rounded-2xl bg-[#1a1a1a] px-5 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[#fcfbf9] transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            {isSubmitting ? 'Signing in' : 'Enter Dashboard'}
          </button>
        </form>
      </section>
    </main>
  );
}
