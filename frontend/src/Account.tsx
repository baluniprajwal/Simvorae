import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, LogOut, MapPin, UserCheck } from 'lucide-react';
import { useAuthStore } from './store/authStore';

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }

  return error instanceof Error ? error.message : 'Request failed.';
}

export default function Account() {
  const navigate = useNavigate();
  const { user, refreshMe, updateProfile, logout, isLoading } = useAuthStore();
  const defaultAddress = user?.addresses?.find((address) => address.isDefault) || user?.addresses?.[0];
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
  });

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    setPhone((user?.phone || defaultAddress?.phone || '').replace(/\D/g, '').slice(0, 10));
    setFormData({
      addressLine1: defaultAddress?.addressLine1 || '',
      city: defaultAddress?.city || '',
      state: defaultAddress?.state || '',
      postalCode: defaultAddress?.postalCode || '',
    });
  }, [defaultAddress, user?.phone]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await updateProfile({
        phone,
        address: {
          ...formData,
          country: 'India',
        },
      });
      setMessage(response.message || 'Account details updated.');
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] px-5 py-8 text-[#1a1a1a] font-sans">
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-center">
        <section>
          <Link to="/" className="mb-12 inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm transition-colors hover:border-stone-900">
            <ArrowLeft size={17} />
          </Link>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-stone-400">Simvorae Account</p>
          <h1 className="max-w-xl font-serif text-[clamp(3.3rem,7vw,6rem)] leading-[0.9] tracking-tight">
            Your account details.
          </h1>
          <p className="mt-7 max-w-md text-[15px] font-light leading-7 text-stone-600">
            Manage your saved delivery details. Checkout will use these details automatically, and you can still edit them per order.
          </p>

          <button
            onClick={handleLogout}
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors hover:border-stone-900"
          >
            <LogOut size={14} />
            Logout
          </button>
        </section>

        <section className="rounded-[1.6rem] border border-stone-200 bg-white p-6 shadow-[0_16px_50px_rgba(0,0,0,0.06)] md:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
              <UserCheck size={18} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-stone-400">Signed In</p>
              <h2 className="font-serif text-2xl">{user?.name}</h2>
              <p className="mt-1 text-xs text-stone-500">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 border-t border-stone-100 pt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-stone-400">
              <MapPin size={15} />
              Saved Delivery Details
            </div>

            {error && (
              <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {message && (
              <p className="rounded-xl border border-stone-200 bg-[#fcfbf9] px-4 py-3 text-sm text-stone-600">{message}</p>
            )}

            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              className="w-full rounded-xl border border-stone-200 bg-[#fcfbf9] px-4 py-4 text-sm outline-none transition-colors focus:border-stone-900"
            />
            <input
              type="text"
              value={formData.addressLine1}
              onChange={(event) => setFormData({ ...formData, addressLine1: event.target.value })}
              placeholder="Complete delivery address"
              className="w-full rounded-xl border border-stone-200 bg-[#fcfbf9] px-4 py-4 text-sm outline-none transition-colors focus:border-stone-900"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={formData.city}
                onChange={(event) => setFormData({ ...formData, city: event.target.value })}
                placeholder="City"
                className="w-full rounded-xl border border-stone-200 bg-[#fcfbf9] px-4 py-4 text-sm outline-none transition-colors focus:border-stone-900"
              />
              <input
                type="text"
                value={formData.state}
                onChange={(event) => setFormData({ ...formData, state: event.target.value })}
                placeholder="State"
                className="w-full rounded-xl border border-stone-200 bg-[#fcfbf9] px-4 py-4 text-sm outline-none transition-colors focus:border-stone-900"
              />
            </div>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(event) => setFormData({ ...formData, postalCode: event.target.value.replace(/\D/g, '').slice(0, 6) })}
              placeholder="PIN code"
              className="w-full rounded-xl border border-stone-200 bg-[#fcfbf9] px-4 py-4 text-sm outline-none transition-colors focus:border-stone-900"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-[#1a1a1a] px-7 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#fcfbf9] transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Saving...' : 'Save Details'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
