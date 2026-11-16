import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar';
import { CurrencyProvider } from '../contexts/CurrencyContext';
import { RECENT_SEARCHES_KEY } from '../lib/recentSearches';

function CurrentUrl() {
  const location = useLocation();
  return <span data-testid="url">{`${location.pathname}${location.search}`}</span>;
}

function renderAt(url: string) {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  return render(
    <MemoryRouter initialEntries={[url]}>
      <CurrencyProvider>
        <Navbar />
        <CurrentUrl />
      </CurrencyProvider>
    </MemoryRouter>,
  );
}

function openSearch(desktop = false) {
  fireEvent.click(screen.getAllByRole('button', { name: 'Open search' })[desktop ? 1 : 0]);
  return screen.getByRole('searchbox', { name: 'Search products' });
}

beforeEach(() => localStorage.removeItem(RECENT_SEARCHES_KEY));

afterEach(() => {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
  vi.unstubAllGlobals();
});

describe('navbar search', () => {
  it('clears the search when the box is emptied and Enter is pressed', () => {
    renderAt('/shop?q=tote');
    const input = openSearch();
    expect(input).toHaveValue('tote');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByTestId('url')).toHaveTextContent(/^\/shop$/);
    expect(openSearch()).toHaveValue('');
  });

  it('still searches for a typed query', () => {
    renderAt('/shop');
    const input = openSearch();

    fireEvent.change(input, { target: { value: ' tote ' } });
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByTestId('url')).toHaveTextContent('/shop?q=tote');
  });

  it('keeps the typed query when search is closed and reopened', () => {
    renderAt('/shop');
    fireEvent.change(openSearch(), { target: { value: 'leather tote' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss search' }));
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(openSearch()).toHaveValue('leather tote');
  });

  it('preserves the underlined inline desktop search', () => {
    renderAt('/shop');
    openSearch(true);
    const form = screen.getByRole('search');
    expect(form).not.toContainElement(screen.getByRole('link', { name: 'Simvorae home' }));
    expect(form).not.toContainElement(screen.getByRole('combobox', { name: 'Display currency' }));
    expect(screen.getByRole('banner')).toContainElement(form);
    expect(form).toHaveClass('top-1/2', '-translate-y-1/2', 'border-current', 'xl:flex');
    expect(form.parentElement).toHaveClass('xl:w-[180px]', '2xl:w-60');
    expect(screen.queryByRole('dialog', { name: 'Search the collection.' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Simvorae home' })).not.toHaveClass('invisible');
  });

  it('closes with Escape without losing the query', () => {
    renderAt('/shop');
    const input = openSearch();
    fireEvent.change(input, { target: { value: 'canvas' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(openSearch()).toHaveValue('canvas');
  });

  it('opens a full-screen mobile overlay and restores focus and scrolling when closed', () => {
    renderAt('/shop');
    const trigger = screen.getAllByRole('button', { name: 'Open search' })[0];
    trigger.focus();
    const previousOverflow = document.body.style.overflow;
    const input = openSearch();
    const dialog = screen.getByRole('dialog', { name: 'Search the collection.' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('fixed', 'inset-0', 'h-dvh');
    expect(dialog.parentElement).toBe(document.body);
    expect(screen.getByRole('banner')).not.toContainElement(dialog);
    expect(input).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.dataset.scrollLocked).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss search' }));
    expect(document.body.style.overflow).toBe(previousOverflow);
    expect(document.documentElement.dataset.scrollLocked).toBeUndefined();
    expect(trigger).toHaveFocus();
  });

  it('lets customers tap a recent search and clear history', () => {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['leather tote', 'black bag']));
    renderAt('/shop');
    openSearch();
    fireEvent.click(screen.getByRole('button', { name: 'leather tote' }));
    expect(screen.getByTestId('url')).toHaveTextContent('/shop?q=leather%20tote');
    expect(screen.queryByRole('dialog', { name: 'Search the collection.' })).not.toBeInTheDocument();
    expect(openSearch()).toHaveValue('leather tote');
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    expect(localStorage.getItem(RECENT_SEARCHES_KEY)).toBeNull();
    expect(screen.getByText('A fresh start.')).toBeInTheDocument();
  });

  it('keeps keyboard focus inside mobile search', () => {
    renderAt('/shop');
    openSearch();
    const dialog = screen.getByRole('dialog', { name: 'Search the collection.' });
    const close = screen.getByRole('button', { name: 'Dismiss search' });
    const submit = screen.getByRole('button', { name: 'Submit search' });
    submit.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(submit).toHaveFocus();
  });
});

describe('responsive navbar', () => {
  it('keeps mobile search on the left and the menu at the far right after the bag', () => {
    renderAt('/shop');
    const header = screen.getByRole('banner');
    const grid = header.firstElementChild!;
    const menu = screen.getByRole('button', { name: 'Open menu' });
    const bag = screen.getByRole('button', { name: 'Open bag' });
    const rightControls = grid.lastElementChild!;
    expect(rightControls).toContainElement(bag);
    expect(rightControls.lastElementChild).toBe(menu);
    expect(grid.firstElementChild).toContainElement(screen.getAllByRole('button', { name: 'Open search' })[0]);
    expect(grid.firstElementChild).not.toContainElement(menu);
  });

  it('uses a compact translucent header on other pages', () => {
    renderAt('/shop');
    expect(screen.getByRole('banner')).toHaveClass('bg-[#fcfbf9]/92', 'backdrop-blur-md');
    expect(screen.getByRole('banner')).not.toHaveClass('mix-blend-difference');
    expect(screen.getByRole('banner').firstElementChild).toHaveClass('h-16', 'md:h-[72px]');
  });

  it('shrinks into a subtle light header on scroll and restores the hero state at the top', () => {
    vi.stubGlobal('scrollY', 0);
    renderAt('/');
    expect(screen.getByRole('banner')).toHaveClass('bg-transparent');
    expect(screen.getByRole('banner').firstElementChild).toHaveClass('h-24', 'md:h-32');
    vi.stubGlobal('scrollY', 100);
    fireEvent.scroll(window);
    expect(screen.getByRole('banner')).toHaveClass('bg-[#fcfbf9]/92', 'backdrop-blur-md');
    expect(screen.getByRole('banner').firstElementChild).toHaveClass('h-16', 'md:h-[72px]');
    vi.stubGlobal('scrollY', 0);
    fireEvent.scroll(window);
    expect(screen.getByRole('banner')).toHaveClass('bg-transparent');
  });

  it('closes mobile search and releases its scroll lock when resizing to desktop', () => {
    renderAt('/shop');
    openSearch();
    vi.stubGlobal('innerWidth', 1440);
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('dialog', { name: 'Search the collection.' })).not.toBeInTheDocument();
    expect(document.documentElement.dataset.scrollLocked).toBeUndefined();
    expect(screen.getByRole('banner').firstElementChild).toHaveClass('h-16', 'md:h-[72px]');
  });

  it('keeps the roomy hero spacing when search opens', () => {
    vi.stubGlobal('scrollY', 0);
    renderAt('/');
    openSearch();
    expect(screen.getByRole('banner').firstElementChild).toHaveClass('h-24', 'md:h-32');
    expect(screen.getByRole('dialog', { name: 'Search the collection.' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveClass('bg-transparent');
  });

  it('locks scrolling for the mobile menu and restores it on Escape', () => {
    renderAt('/shop');
    const previousOverflow = document.body.style.overflow;
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    trigger.focus();
    fireEvent.click(trigger);
    const menu = screen.getByRole('dialog', { name: 'Navigation menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.dataset.scrollLocked).toBe('true');
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe(previousOverflow);
    expect(document.documentElement.dataset.scrollLocked).toBeUndefined();
    expect(trigger).toHaveFocus();
  });

  it('keeps a draft after closing search and opening the mobile menu', () => {
    renderAt('/shop');
    fireEvent.change(openSearch(), { target: { value: 'crossbody' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss search' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Navigation menu' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(openSearch()).toHaveValue('crossbody');
  });

  it('does not clear another overlay scroll lock while the menu is closed', () => {
    document.body.style.overflow = 'hidden';
    const { unmount } = renderAt('/shop');
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('hidden');
    document.body.style.overflow = '';
  });

  it('closes the mobile menu when its current-page link is selected', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const menu = screen.getByRole('dialog', { name: 'Navigation menu' });
    fireEvent.click(within(menu).getByRole('link', { name: 'Home' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.documentElement.dataset.scrollLocked).toBeUndefined();
  });
});
