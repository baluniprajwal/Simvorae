import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, X, ShoppingBag, Menu, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleCart, getCartCount } = useCartStore();
  const { user, logout } = useAuthStore();
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close search and mobile menu when route changes
  useEffect(() => {
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  }, [location]);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[120] px-6 md:px-12 py-8 md:py-10 flex items-center justify-between text-white mix-blend-difference pointer-events-none">
        {/* LEFT: Logo */}
        <div className="flex-1 flex items-center pointer-events-auto">
          <Link 
            to="/" 
            className="nav-item font-serif text-2xl md:text-3xl tracking-tight font-medium cursor-pointer block hover:italic transition-all duration-300"
          >
            SIMVORAE
          </Link>
        </div>
        
        {/* CENTER: Links */}
        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 gap-10 text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold items-center pt-1 opacity-90 pointer-events-auto">
          <Link to="/shop" className="nav-item hover:opacity-60 transition-opacity whitespace-nowrap cursor-pointer">Shop</Link>
          <Link to="/about" className="nav-item hover:opacity-60 transition-opacity whitespace-nowrap cursor-pointer">About</Link>
          <Link to="/contact" className="nav-item hover:opacity-60 transition-opacity whitespace-nowrap cursor-pointer">Contact</Link>
        </nav>

        {/* RIGHT: Search, Bag, and Mobile Menu */}
        <div className="flex-1 flex items-center gap-6 md:gap-12 justify-end pointer-events-auto pt-1">
          {/* Search Implementation */}
          <div className="relative flex items-center justify-end min-h-[32px]">
            <div 
              className={`flex items-center absolute right-0 z-20 transition-all duration-500 ease-[cubic-bezier(0.2,1,0.2,1)] ${isSearchOpen ? 'w-[240px] md:w-80 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
            >
              <form onSubmit={handleSearchSubmit} className="w-full relative flex items-center">
                <input
                  type="text"
                  placeholder="SEARCH..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-b border-white pr-8 pb-1 text-[10px] tracking-widest uppercase focus:outline-none placeholder:text-white/40"
                  autoFocus={isSearchOpen}
                />
                <button 
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-0 hover:opacity-50 transition-opacity mb-1"
                >
                  <X size={14} />
                </button>
              </form>
            </div>
            
            <button 
              onClick={() => setIsSearchOpen(true)}
              className={`nav-item cursor-pointer hover:opacity-60 transition-all duration-500 relative flex items-center gap-2 ${isSearchOpen ? 'opacity-0 invisible scale-90 translate-x-4' : 'opacity-100 visible scale-100 translate-x-0'}`}
            >
              <Search size={16} />
              {!isSearchOpen && <span className="hidden md:inline-block text-[9px] uppercase tracking-[0.2em] font-bold">Search</span>}
            </button>
          </div>

          <button 
            onClick={toggleCart} 
            className="nav-item cursor-pointer hover:opacity-60 transition-all duration-300 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold whitespace-nowrap"
          >
            <ShoppingBag size={16} className="md:hidden" />
            <span className="hidden md:inline-block">Bag</span>
            <span className="font-bold">({getCartCount()})</span>
          </button>

          {user ? (
            <Link
              to="/account"
              className="nav-item hidden md:flex cursor-pointer hover:opacity-60 transition-all duration-300 items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold whitespace-nowrap"
            >
              <User size={15} />
              Account
            </Link>
          ) : (
            <Link
              to="/login"
              className="nav-item hidden md:flex cursor-pointer hover:opacity-60 transition-all duration-300 items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold whitespace-nowrap"
            >
              <User size={15} />
              Login
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="nav-item lg:hidden cursor-pointer hover:opacity-60 transition-all duration-300 flex items-center"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* MOBILE MENU OVERLAY */}
      <div 
        className={`fixed inset-0 bg-[#fcfbf9] z-[200] flex flex-col px-6 py-8 transition-transform duration-700 ease-[cubic-bezier(0.2,1,0.2,1)] ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="flex justify-between items-center text-[#1a1a1a]">
          <span className="font-serif text-2xl tracking-tight font-medium">SIMVORAE</span>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex flex-col justify-center flex-1 gap-8 text-center text-[#1a1a1a]">
          <Link to="/" className="font-serif text-4xl hover:italic transition-all">Home</Link>
          <Link to="/shop" className="font-serif text-4xl hover:italic transition-all">Shop</Link>
          <Link to="/about" className="font-serif text-4xl hover:italic transition-all">About</Link>
          <Link to="/contact" className="font-serif text-4xl hover:italic transition-all">Contact</Link>
          <Link to={user ? '/account' : '/login'} className="font-serif text-4xl hover:italic transition-all">
            {user ? 'Account' : 'Login'}
          </Link>
        </nav>
        
        <div className="pb-8 flex flex-col items-center border-t border-stone-200 pt-8 gap-6 text-[#1a1a1a]">
           <button onClick={() => { setIsMobileMenuOpen(false); toggleCart(); }} className="text-[10px] uppercase tracking-widest font-bold">
             Shopping Bag ({getCartCount()})
           </button>
           {user && (
             <button onClick={() => { setIsMobileMenuOpen(false); logout(); }} className="text-[10px] uppercase tracking-widest font-bold">
               Logout
             </button>
           )}
           <div className="flex gap-8 text-[10px] uppercase tracking-widest text-stone-500">
             <a href="#">Instagram</a>
             <a href="#">Contact</a>
           </div>
        </div>
      </div>
    </>
  );
}
