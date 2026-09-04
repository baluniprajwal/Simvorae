import React, { useEffect } from 'react';
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
import About from './About';
import Contact from './Contact';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './contexts/ToastContext';
import { clearAdminToken, isAdminTokenValid } from './lib/adminAuth';

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}

function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
    });

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
    };
  }, []);

  return null;
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      <SmoothScroll />
      <ScrollToTop />
      {!isAdminRoute && <Cart />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
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
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/checkout/login" replace state={{ from: location }} />;
  }

  return <Checkout />;
}

function ProtectedAccountRoute() {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Account />;
}

function ProtectedOrderDetailRoute() {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <OrderDetail />;
}

function ProtectedAdminRoute() {
  if (!isAdminTokenValid()) {
    clearAdminToken();
    return <Navigate to="/admin/login" replace />;
  }

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
