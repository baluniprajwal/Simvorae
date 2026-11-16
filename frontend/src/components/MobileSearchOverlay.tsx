import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import BrandWordmark from './BrandWordmark';
import { clearRecentSearches, readRecentSearches } from '../lib/recentSearches';

type Props = {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  onClose: () => void;
};

export default function MobileSearchOverlay({ query, onQueryChange, onSearch, onClose }: Props) {
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const previousLock = document.documentElement.dataset.scrollLocked;
    const background = document.getElementById('root');
    const previousInert = background?.inert;
    if (background) background.inert = true;
    document.body.style.overflow = 'hidden';
    document.documentElement.dataset.scrollLocked = 'true';
    window.dispatchEvent(new Event('simvorae-scroll-lock-change'));
    input.current?.focus({ preventScroll: true });

    return () => {
      if (background) background.inert = previousInert ?? false;
      document.body.style.overflow = previousOverflow;
      if (previousLock === undefined) delete document.documentElement.dataset.scrollLocked;
      else document.documentElement.dataset.scrollLocked = previousLock;
      window.dispatchEvent(new Event('simvorae-scroll-lock-change'));
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div
      id="mobile-search"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-search-title"
      data-lenis-prevent
      className="mobile-search-overlay fixed inset-0 z-[210] flex h-dvh flex-col overflow-y-auto overscroll-contain bg-[#fcfbf9] text-[#1a1a1a]"
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key === 'Tab') {
          const controls = event.currentTarget.querySelectorAll<HTMLElement>('button, input');
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-stone-200/70 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top,0px))] sm:px-8">
        <span className="col-start-2"><BrandWordmark /></span>
        <button type="button" aria-label="Dismiss search" onClick={onClose} className="flex h-11 w-11 cursor-pointer items-center justify-center justify-self-end transition-opacity hover:opacity-50 focus-visible:outline focus-visible:outline-offset-2"><X size={21} strokeWidth={1.3} /></button>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-8 sm:px-10 sm:pt-12">
        <p className="text-[9px] uppercase tracking-[0.25em] text-stone-500">Discover Simvorae</p>
        <h2 id="mobile-search-title" className="mt-3 font-serif text-[clamp(2rem,7vw,3.5rem)] font-normal leading-[1.1] tracking-tight">Search the collection.</h2>
        <form role="search" onSubmit={(event) => { event.preventDefault(); onSearch(query); }} className="mt-7 flex items-center gap-3 border-b border-stone-400 pb-1 focus-within:border-[#1a1a1a]">
          <Search size={19} strokeWidth={1.4} aria-hidden="true" className="shrink-0 text-stone-500" />
          <input ref={input} type="search" aria-label="Search products" placeholder="Name, colour, material..." enterKeyHint="search" autoComplete="off" value={query} onChange={(event) => onQueryChange(event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent py-3 text-base outline-none placeholder:text-stone-400 [&::-webkit-search-cancel-button]:appearance-none" />
          <button type="submit" aria-label="Submit search" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center transition-opacity hover:opacity-50 focus-visible:outline focus-visible:outline-offset-2"><ArrowRight size={22} strokeWidth={1.3} /></button>
        </form>

        <section aria-labelledby="recent-searches-heading" className="mt-10 sm:mt-14">
          <div className="flex items-center justify-between gap-4">
            <h3 id="recent-searches-heading" className="text-[9px] font-medium uppercase tracking-[0.2em] text-stone-500">Recent Searches</h3>
            {recentSearches.length > 0 && <button type="button" onClick={() => { clearRecentSearches(); setRecentSearches([]); input.current?.focus({ preventScroll: true }); }} className="min-h-11 cursor-pointer text-[10px] text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-[#1a1a1a]">Clear history</button>}
          </div>
          {recentSearches.length > 0 ? (
            <ul className="mt-2">
              {recentSearches.map((recent) => <li key={recent}><button type="button" onClick={() => { onQueryChange(recent); onSearch(recent); }} className="group flex w-full cursor-pointer items-center justify-between gap-5 border-b border-stone-200/80 py-4 text-left transition-colors hover:text-stone-500 focus-visible:outline focus-visible:outline-offset-2"><span className="min-w-0 break-words font-serif text-2xl font-normal sm:text-3xl">{recent}</span><ArrowRight size={18} strokeWidth={1.2} aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" /></button></li>)}
            </ul>
          ) : (
            <div className="mt-5 border-t border-stone-200 pt-5">
              <p className="font-serif text-2xl">A fresh start.</p>
              <p className="mt-2 max-w-xs text-xs leading-6 text-stone-500">Search for a piece you love. Your recent searches will appear here.</p>
            </div>
          )}
        </section>
        <p className="mt-auto pt-10 text-[9px] uppercase tracking-[0.13em] text-stone-400">Search history stays on this device.</p>
      </div>
    </div>,
    document.body,
  );
}
