import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import Admin from './Admin';
import AdminLogin from './AdminLogin';
import Home from './Home';
import Shop from './Shop';
import Product from './Product';
import Cart from './Cart';
import Checkout from './Checkout';
import CheckoutLogin from './CheckoutLogin';
import OrderDetail from './OrderDetail';
import OrderSuccess from './OrderSuccess';
import Account from './Account';
import ForgotPassword from './ForgotPassword';
import Login from './Login';
import Register from './Register';
import ResetPassword from './ResetPassword';
import VerifyEmail from './VerifyEmail';
import {
  CancellationReturnsPolicy,
  ContactGrievancePolicy,
  PrivacyPolicy,
  ShippingDeliveryPolicy,
  TermsConditionsPolicy,
} from './Policies';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './contexts/ToastContext';
import { useAdminAuthStore } from './lib/adminAuth';

function SmoothScroll() {
  const { key, pathname, search } = useLocation();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
    });
    lenisRef.current = lenis;
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    let animationFrameId = 0;
    const updateScrollLock = () => {
      if (document.documentElement.dataset.scrollLocked === 'true') {
        lenis.stop();
      } else {
        lenis.start();
      }
    };
    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }

    window.addEventListener('simvorae-scroll-lock-change', updateScrollLock);
    updateScrollLock();
    animationFrameId = requestAnimationFrame(raf);

    return () => {
      window.removeEventListener('simvorae-scroll-lock-change', updateScrollLock);
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
      lenisRef.current = null;
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    const lenis = lenisRef.current;
    lenis?.stop();

    const resetScroll = () => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      lenis?.resize();
      lenis?.scrollTo(0, { immediate: true, force: true, lock: true });
    };

    resetScroll();
    const animationFrameId = requestAnimationFrame(resetScroll);
    const settleTimeoutId = window.setTimeout(resetScroll, 100);
    const resumeTimeoutId = window.setTimeout(() => {
      resetScroll();
      if (document.documentElement.dataset.scrollLocked !== 'true') lenis?.start();
    }, 250);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.clearTimeout(settleTimeoutId);
      window.clearTimeout(resumeTimeoutId);
    };
  }, [key, pathname, search]);

  return null;
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const hydrateCustomer = useAuthStore((state) => state.hydrate);
  const bootstrapAdmin = useAdminAuthStore((state) => state.bootstrap);

  useEffect(() => {
    if (isAdminRoute) {
      void bootstrapAdmin();
    } else {
      void hydrateCustomer();
    }
  }, [bootstrapAdmin, hydrateCustomer, isAdminRoute]);

  return (
    <>
      <SmoothScroll />
      {!isAdminRoute && <Cart />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/contact" element={<ContactGrievancePolicy />} />
        <Route path="/shipping-delivery" element={<ShippingDeliveryPolicy />} />
        <Route path="/cancellation-returns-refunds" element={<CancellationReturnsPolicy />} />
        <Route path="/terms" element={<TermsConditionsPolicy />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/checkout" element={<ProtectedCheckoutRoute />} />
        <Route path="/checkout/login" element={<CheckoutLogin />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/account" element={<ProtectedAccountRoute />} />
        <Route path="/account/orders/:orderNumber" element={<ProtectedOrderDetailRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<ProtectedAdminRoute />} />
      </Routes>
    </>
  );
}

function ProtectedCheckoutRoute() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const location = useLocation();

  if (!isInitialized) return null;

  if (!user) {
    return <Navigate to="/checkout/login" replace state={{ from: location }} />;
  }

  return <Checkout />;
}

function ProtectedAccountRoute() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const location = useLocation();

  if (!isInitialized) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Account />;
}

function ProtectedOrderDetailRoute() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const location = useLocation();

  if (!isInitialized) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <OrderDetail />;
}

function ProtectedAdminRoute() {
  const user = useAdminAuthStore((state) => state.user);
  const isInitialized = useAdminAuthStore((state) => state.isInitialized);

  if (!isInitialized) return null;
  if (!user) return <Navigate to="/admin/login" replace />;

  return <Admin />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}
