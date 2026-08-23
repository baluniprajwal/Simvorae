import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { useOrderStore } from './store/orderStore';
import { useAuthStore } from './store/authStore';

type Tab = 'profile' | 'orders' | 'addresses';

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }

  return error instanceof Error ? error.message : 'Request failed.';
}

function UnderlineInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
  rightSlot,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="group relative flex flex-col gap-2 border-b border-stone-200 pb-2">
      <div className="flex w-full items-center justify-between gap-4">
        <label className="font-sans text-[9px] font-semibold uppercase tracking-widest text-stone-400 transition-colors group-focus-within:text-[#1a1a1a]">
          {label}
        </label>
        {rightSlot}
      </div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full bg-transparent px-0 py-2 text-sm text-[#1a1a1a] transition-colors placeholder:text-stone-300 focus:outline-none md:text-base ${
          readOnly ? 'cursor-default text-stone-500' : ''
        }`}
      />
      {!readOnly && <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#1a1a1a] transition-all duration-500 group-focus-within:w-full" />}
    </div>
  );
}

export default function Account() {
  const navigate = useNavigate();
  const { user, refreshMe, updateProfile, logout, isLoading } = useAuthStore();
  const { orders, fetchMyOrders, isLoading: isOrdersLoading, error: ordersError } = useOrderStore();
  const defaultAddress = user?.addresses?.find((address) => address.isDefault) || user?.addresses?.[0];
  const [activeTab, setActiveTab] = useState<Tab>('profile');
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
    window.scrollTo(0, 0);
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchMyOrders();
    }
  }, [activeTab, fetchMyOrders]);

  useEffect(() => {
    setPhone((user?.phone || defaultAddress?.phone || '').replace(/\D/g, '').slice(0, 10));
    setFormData({
      addressLine1: defaultAddress?.addressLine1 || '',
      city: defaultAddress?.city || '',
      state: defaultAddress?.state || '',
      postalCode: defaultAddress?.postalCode || '',
    });
  }, [defaultAddress, user?.phone]);

  const handleSave = async (event: React.FormEvent) => {
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

  const verifiedBadge = (
    <span className="flex items-center gap-1.5 font-sans text-[9px] font-semibold uppercase tracking-widest text-emerald-600">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      Verified
    </span>
  );

  const formatDate = (value: string) => new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

  const getOrderStatus = (order: typeof orders[number]) => {
    if (order.paymentStatus !== 'paid') {
      return order.paymentStatus;
    }

    if (order.shippingStatus !== 'not_created') {
      return order.shippingStatus.replace(/_/g, ' ');
    }

    return order.status;
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#fcfbf9] font-sans text-[#1a1a1a]">
      <div
        className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-[0.035]"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}
      />

      <Navbar />

      <main className="relative z-20 mx-auto w-full max-w-[1400px] flex-1 px-6 pb-24 pt-28 md:px-12 md:pb-32 md:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.2, 1, 0.2, 1] }}
          className="mb-12 md:mb-16"
        >
          <h1 className="mb-4 font-serif text-4xl leading-[0.9] tracking-tighter text-[#1a1a1a] md:text-6xl">
            My Account
          </h1>
          <p className="font-sans text-[10px] uppercase leading-loose tracking-[0.2em] text-stone-500 md:text-[11px]">
            Welcome back, {user?.name || 'Customer'}
          </p>
        </motion.div>

        <div className="flex flex-col gap-14 md:flex-row lg:gap-24">
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.2, 1, 0.2, 1] }}
            className="flex flex-col gap-6 border-l border-stone-200 pl-6 md:w-1/4 lg:w-1/5"
          >
            {[
              ['profile', 'Profile Information'],
              ['orders', 'Order History'],
              ['addresses', 'Saved Addresses'],
            ].map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab as Tab)}
                className={`cursor-pointer text-left font-sans text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                  activeTab === tab ? 'font-bold text-[#1a1a1a]' : 'text-stone-400 hover:text-[#1a1a1a]'
                }`}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleLogout}
              className="mt-8 cursor-pointer text-left font-sans text-[10px] uppercase tracking-[0.2em] text-red-700/70 transition-colors hover:text-red-700"
            >
              Logout
            </button>
          </motion.aside>

          <section className="min-h-[50vh] md:w-3/4 lg:w-4/5">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.2, 1, 0.2, 1] }}
                className="max-w-xl"
              >
                <h2 className="mb-10 font-serif text-2xl md:text-3xl">Personal Details</h2>

                <form onSubmit={handleSave} className="flex flex-col gap-10">
                  {error && (
                    <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  {message && (
                    <p className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-600">
                      {message}
                    </p>
                  )}

                  <UnderlineInput label="Full Name" value={user?.name || ''} readOnly />
                  <UnderlineInput label="Email Address" value={user?.email || ''} readOnly rightSlot={verifiedBadge} />
                  <UnderlineInput
                    label="Phone Number"
                    value={phone}
                    onChange={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    type="tel"
                  />

                  <div className="mt-4 flex flex-col gap-3">
                    <Link
                      to="/forgot-password"
                      className="w-max border-b border-[#1a1a1a] pb-1 font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-[#1a1a1a] transition-opacity hover:opacity-60"
                    >
                      Change Password
                    </Link>
                    <p className="max-w-md font-sans text-[11px] leading-relaxed text-stone-500">
                      Name and email are linked to your verified account. Delivery phone and address can be updated anytime.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 w-max cursor-pointer rounded-full bg-[#1a1a1a] px-12 py-4 font-sans text-[10px] font-semibold uppercase tracking-widest text-[#fcfbf9] transition-transform duration-300 hover:scale-[1.02] hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>

                <div className="mt-16 flex flex-col items-start gap-4 border-t border-stone-200 pt-10">
                  <h3 className="font-serif text-xl text-[#1a1a1a]">Account Management</h3>
                  <p className="max-w-md font-sans text-[11px] leading-relaxed text-stone-500">
                    Account deletion requests should be handled manually for now so order records, invoices, and shipment history are not accidentally removed.
                  </p>
                  <Link
                    to="/contact"
                    className="mt-2 border-b border-transparent pb-1 text-left font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-red-700/70 transition-colors hover:border-red-700 hover:text-red-700"
                  >
                    Request Account Deletion
                  </Link>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.2, 1, 0.2, 1] }}
              >
                <h2 className="mb-10 font-serif text-2xl md:text-3xl">Order History</h2>

                {ordersError && (
                  <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{ordersError}</p>
                  </div>
                )}

                <div className="flex flex-col">
                  <div className="mb-4 hidden grid-cols-12 gap-4 border-b border-[#1a1a1a] pb-4 text-[9px] font-semibold uppercase tracking-widest text-stone-400 md:grid">
                    <div className="col-span-3">Order</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-3 text-right">Actions</div>
                  </div>

                  {isOrdersLoading && (
                    <div className="py-12 text-center font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-400">
                      Loading Orders
                    </div>
                  )}

                  {!isOrdersLoading && orders.length === 0 && (
                    <div className="rounded-2xl border border-stone-200 bg-white p-8">
                      <p className="mb-3 font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-400">
                        No Orders Yet
                      </p>
                      <p className="max-w-lg text-sm leading-7 text-stone-600">
                        Your paid and pending Simvorae orders will appear here after checkout.
                      </p>
                      <Link
                        to="/shop"
                        className="mt-7 inline-block border-b border-[#1a1a1a] pb-1 font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-[#1a1a1a] transition-opacity hover:opacity-60"
                      >
                        Start Shopping
                      </Link>
                    </div>
                  )}

                  {!isOrdersLoading && orders.map((order, index) => (
                    <div
                      key={order.id}
                      className={`grid grid-cols-2 items-center gap-4 border-b border-stone-200 py-6 md:grid-cols-12 ${
                        index === 0 ? 'md:pt-4' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/account/orders/${order.id}`)}
                        className="col-span-2 flex cursor-pointer items-center gap-4 text-left transition-opacity hover:opacity-70 md:col-span-3"
                      >
                        <img
                          src={order.items[0]?.image}
                          alt={`Order ${order.id}`}
                          className="h-20 w-16 bg-stone-100 object-cover"
                        />
                        <div>
                          <span className="block font-sans text-[11px] font-medium tracking-wider text-[#1a1a1a]">{order.id}</span>
                          <span className="mt-1 block font-sans text-[10px] text-stone-400">
                            {order.items.reduce((sum, item) => sum + item.quantity, 0)} item{order.items.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </button>

                      <div className="col-span-1 font-sans text-[11px] text-stone-500 md:col-span-2">
                        {formatDate(order.createdAt)}
                      </div>

                      <div className="col-span-1 font-sans text-[9px] uppercase tracking-widest text-stone-500 md:col-span-2 md:text-center">
                        <span className="mt-2 inline-block rounded-full bg-stone-100 px-3 py-1 text-[#1a1a1a] md:mt-0">
                          {getOrderStatus(order)}
                        </span>
                      </div>

                      <div className="col-span-2 mt-2 flex items-center justify-between border-t border-stone-100 pt-4 text-right font-serif text-lg text-[#1a1a1a] md:col-span-2 md:mt-0 md:block md:border-transparent md:pt-0">
                        <span className="font-sans text-[9px] uppercase tracking-widest text-stone-400 md:hidden">Total</span>
                        {formatCurrency(order.total)}
                      </div>

                      <div className="col-span-2 mt-2 flex justify-end gap-4 md:col-span-3 md:mt-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/account/orders/${order.id}`)}
                          className="cursor-pointer border-b border-[#1a1a1a] pb-1 text-[9px] font-semibold uppercase tracking-widest text-[#1a1a1a] transition-opacity hover:opacity-60"
                        >
                          View Detail
                        </button>
                        {order.trackingUrl && (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hidden border-b border-transparent pb-1 text-[9px] font-semibold uppercase tracking-widest text-stone-500 transition-colors hover:text-[#1a1a1a] md:inline-block"
                          >
                            Track
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'addresses' && (
              <motion.div
                key="addresses"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.2, 1, 0.2, 1] }}
              >
                <h2 className="mb-10 font-serif text-2xl md:text-3xl">Saved Addresses</h2>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <form onSubmit={handleSave} className="relative rounded-2xl border border-stone-200 p-8">
                    <div className="absolute right-8 top-8 font-sans text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                      Default
                    </div>
                    <h3 className="mb-8 font-serif text-xl">Delivery Address</h3>

                    <div className="flex flex-col gap-7">
                      <UnderlineInput
                        label="Phone Number"
                        value={phone}
                        onChange={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile number"
                        type="tel"
                      />
                      <UnderlineInput
                        label="Complete Address"
                        value={formData.addressLine1}
                        onChange={(value) => setFormData({ ...formData, addressLine1: value })}
                        placeholder="House, street, landmark"
                      />
                      <UnderlineInput
                        label="City"
                        value={formData.city}
                        onChange={(value) => setFormData({ ...formData, city: value })}
                        placeholder="City"
                      />
                      <UnderlineInput
                        label="State"
                        value={formData.state}
                        onChange={(value) => setFormData({ ...formData, state: value })}
                        placeholder="State"
                      />
                      <UnderlineInput
                        label="PIN Code"
                        value={formData.postalCode}
                        onChange={(value) => setFormData({ ...formData, postalCode: value.replace(/\D/g, '').slice(0, 6) })}
                        placeholder="PIN code"
                      />

                      {error && <p className="text-xs text-red-600">{error}</p>}
                      {message && <p className="text-xs text-stone-500">{message}</p>}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-2 w-max cursor-pointer border-b border-[#1a1a1a] pb-1 font-sans text-[9px] font-semibold uppercase tracking-widest text-[#1a1a1a] transition-opacity hover:opacity-60 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoading ? 'Saving...' : 'Save Address'}
                      </button>
                    </div>
                  </form>

                  <div className="group flex min-h-[250px] cursor-default flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 p-8 text-center transition-colors">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 transition-all duration-300">
                      <span className="text-xl font-light leading-none">+</span>
                    </div>
                    <span className="font-sans text-[9px] font-semibold uppercase tracking-widest text-stone-500">
                      Multiple Addresses Later
                    </span>
                    <p className="mt-4 max-w-xs text-xs leading-6 text-stone-400">
                      For now, the account keeps one default address to keep checkout simple and reliable.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
