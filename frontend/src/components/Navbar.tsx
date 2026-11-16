import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, X, ShoppingBag, Menu, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { socialLinks } from '../lib/socialLinks';
import { CURRENCY_OPTIONS, type DisplayCurrency, useCurrency } from '../contexts/CurrencyContext';
import BrandWordmark from './BrandWordmark';
import MobileSearchOverlay from './MobileSearchOverlay';
import { rememberSearch } from '../lib/recentSearches';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleCart, getCartCount } = useCartStore();
  const { user, logout } = useAuthStore();
  const { currency, setCurrency } = useCurrency();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 48);
  const menuCloseButton = useRef<HTMLButtonElement>(null);
  const cartCount = getCartCount();
  const isOverHero = location.pathname === '/' && !isScrolled;
  const isCompact = isScrolled || location.pathname !== '/';

  useEffect(() => {
    setSearchQuery(new URLSearchParams(location.search).get('q') || '');
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) setIsMobileSearchOpen(false);
      else setIsSearchOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateScroll = () => setIsScrolled(window.scrollY > 48);
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousLock = document.documentElement.dataset.scrollLocked;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    document.documentElement.dataset.scrollLocked = 'true';
    window.dispatchEvent(new Event('simvorae-scroll-lock-change'));
    menuCloseButton.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousLock === undefined) delete document.documentElement.dataset.scrollLocked;
      else document.documentElement.dataset.scrollLocked = previousLock;
      window.dispatchEvent(new Event('simvorae-scroll-lock-change'));
      previousFocus?.focus();
    };
  }, [isMobileMenuOpen]);

  const search = (value: string) => {
    const query = value.trim();
    setSearchQuery(value);
    if (query) {
      rememberSearch(query);
      navigate(`/shop?q=${encodeURIComponent(query)}`);
    }
    else if (new URLSearchParams(location.search).get('q')) navigate('/shop');
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    search(searchQuery);
  };

  return (
    <>
      <header className={`site-header fixed inset-x-0 top-0 z-[120] border-b transition-colors duration-300 motion-reduce:transition-none ${isOverHero ? 'border-transparent bg-transparent text-[#fcfbf9]' : 'border-stone-200/60 bg-[#fcfbf9]/92 text-[#1a1a1a] backdrop-blur-md'}`}>
        <div className={`relative mx-auto grid max-w-[1800px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 transition-[height] duration-300 motion-reduce:transition-none md:px-8 xl:px-12 ${isCompact ? 'h-16 md:h-[72px]' : 'h-24 md:h-32'}`}>
          <div className="flex min-w-0 items-center gap-0 md:gap-3">
            <button type="button" aria-label="Open search" aria-expanded={isMobileSearchOpen} aria-controls="mobile-search" onClick={() => { setIsSearchOpen(false); setIsMobileMenuOpen(false); setIsMobileSearchOpen(true); }} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center transition-opacity hover:opacity-60 xl:hidden">
              <Search size={18} />
            </button>
            <nav aria-label="Main navigation" className="hidden items-center gap-8 text-[10px] font-semibold uppercase tracking-[0.2em] xl:flex">
              <Link to="/" className="cursor-pointer transition-opacity hover:opacity-60">Home</Link>
              <Link to="/shop" className="cursor-pointer transition-opacity hover:opacity-60">Shop</Link>
            </nav>
          </div>

          <Link to="/" aria-label="Simvorae home" className="justify-self-center cursor-pointer transition-opacity hover:opacity-70">
            <BrandWordmark />
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-0 md:gap-4 xl:gap-6">
            <div className={`xl:relative xl:h-9 xl:shrink-0 transition-[width] duration-500 motion-reduce:transition-none ${isSearchOpen ? 'xl:w-[180px] 2xl:w-60' : 'xl:w-[70px]'}`}>
              {isSearchOpen && (
                <form id="site-search" onSubmit={handleSearchSubmit} role="search" onKeyDown={(event) => { if (event.key === 'Escape') { setIsSearchOpen(false); } }} className="absolute inset-x-0 top-1/2 hidden -translate-y-1/2 items-center border-b border-current xl:flex">
                  <input type="search" aria-label="Search products" placeholder="SEARCH..." enterKeyHint="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} autoFocus className="min-w-0 flex-1 appearance-none bg-transparent py-2 pr-2 text-[10px] uppercase tracking-widest outline-none placeholder:text-current placeholder:opacity-40 [&::-webkit-search-cancel-button]:appearance-none" />
                  <button type="button" aria-label="Dismiss search" onClick={() => setIsSearchOpen(false)} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center transition-opacity hover:opacity-50"><X size={14} /></button>
                </form>
              )}
              <button type="button" aria-label="Open search" aria-expanded={isSearchOpen} aria-controls="site-search" onClick={() => setIsSearchOpen(true)} className={`hidden h-9 cursor-pointer items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] transition-opacity hover:opacity-60 xl:flex ${isSearchOpen ? 'invisible pointer-events-none' : ''}`}>
                <Search size={16} /> Search
              </button>
            </div>
            <label className="hidden cursor-pointer items-center lg:flex">
              <span className="sr-only">Display currency</span>
              <select aria-label="Display currency" value={currency} onChange={(event) => setCurrency(event.target.value as DisplayCurrency)} className="cursor-pointer appearance-none bg-transparent text-[9px] font-semibold uppercase tracking-[0.16em] outline-none">
                {CURRENCY_OPTIONS.map((option) => <option key={option.code} value={option.code} className="bg-[#fcfbf9] text-[#1a1a1a]">{option.label}</option>)}
              </select>
            </label>
            <button type="button" aria-label={`Open bag${cartCount > 0 ? `, ${cartCount} items` : ''}`} onClick={toggleCart} className="relative flex h-9 min-w-9 cursor-pointer items-center justify-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] transition-opacity hover:opacity-60">
              <ShoppingBag size={18} />
              <span className="hidden xl:inline">Bag</span>
              {cartCount > 0 && (
                <span className={`absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] xl:static xl:h-auto xl:bg-transparent xl:p-0 xl:text-[9px] ${isOverHero ? 'bg-[#fcfbf9] text-[#1a1a1a] xl:text-[#fcfbf9]' : 'bg-[#1a1a1a] text-[#fcfbf9] xl:text-[#1a1a1a]'}`}>{cartCount}</span>
              )}
            </button>
            <Link to={user ? '/account' : '/login'} aria-label={user ? 'My account' : 'Log in'} className="hidden cursor-pointer items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] transition-opacity hover:opacity-60 md:flex">
              <User size={17} />
              <span className="hidden xl:inline">{user ? 'Account' : 'Login'}</span>
            </Link>
            <button type="button" aria-label="Open menu" aria-expanded={isMobileMenuOpen} aria-controls="mobile-navigation" onClick={() => { setIsSearchOpen(false); setIsMobileSearchOpen(false); setIsMobileMenuOpen(true); }} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center transition-opacity hover:opacity-60 xl:hidden">
              <Menu size={19} />
            </button>
          </div>
        </div>

      </header>

      {isMobileSearchOpen && <MobileSearchOverlay query={searchQuery} onQueryChange={setSearchQuery} onSearch={search} onClose={() => setIsMobileSearchOpen(false)} />}

      <div
        id="mobile-navigation"
        role="dialog"
        aria-label="Navigation menu"
        aria-modal={isMobileMenuOpen ? true : undefined}
        aria-hidden={!isMobileMenuOpen}
        inert={!isMobileMenuOpen}
        data-lenis-prevent
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsMobileMenuOpen(false);
          if (event.key === 'Tab') {
            const controls = event.currentTarget.querySelectorAll<HTMLElement>('a[href], button, select');
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}
        className={`fixed inset-0 z-[200] flex flex-col overflow-y-auto overscroll-contain bg-[#fcfbf9] px-6 py-6 text-[#1a1a1a] transition-transform duration-300 motion-reduce:transition-none ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <Link to="/" aria-label="Simvorae home" onClick={() => setIsMobileMenuOpen(false)} className="col-start-2"><BrandWordmark /></Link>
          <button ref={menuCloseButton} type="button" aria-label="Close menu" onClick={() => setIsMobileMenuOpen(false)} className="cursor-pointer justify-self-end p-2 transition-opacity hover:opacity-60"><X size={24} /></button>
        </div>
        <nav aria-label="Mobile navigation" className="flex flex-1 flex-col justify-center gap-7 py-10 text-center font-serif text-4xl">
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="transition-opacity hover:opacity-60">Home</Link>
          <Link to="/shop" onClick={() => setIsMobileMenuOpen(false)} className="transition-opacity hover:opacity-60">Shop</Link>
          <Link to={user ? '/account' : '/login'} onClick={() => setIsMobileMenuOpen(false)} className="transition-opacity hover:opacity-60">{user ? 'Account' : 'Login'}</Link>
        </nav>
        <div className="flex flex-col items-center gap-6 border-t border-stone-200 py-6 text-[10px] uppercase tracking-widest">
          <label className="flex items-center gap-3 text-stone-500">Currency
            <select aria-label="Display currency" value={currency} onChange={(event) => setCurrency(event.target.value as DisplayCurrency)} className="cursor-pointer border-b border-stone-300 bg-transparent pb-1 text-[#1a1a1a] outline-none">
              {CURRENCY_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => { setIsMobileMenuOpen(false); toggleCart(); }} className="cursor-pointer font-semibold">Shopping Bag ({cartCount})</button>
          {user && <button type="button" onClick={() => { setIsMobileMenuOpen(false); logout(); }} className="cursor-pointer font-semibold">Logout</button>}
          {socialLinks.length > 0 && <div className="flex gap-8 text-stone-500">{socialLinks.map((link) => <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>)}</div>}
        </div>
      </div>
    </>
  );
}
