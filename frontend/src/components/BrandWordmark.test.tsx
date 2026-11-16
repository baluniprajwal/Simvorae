import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import BrandWordmark from './BrandWordmark';
import Navbar from './Navbar';
import Footer from './Footer';

vi.mock('../contexts/CurrencyContext', () => ({
  CURRENCY_OPTIONS: [{ code: 'INR', label: 'INR' }],
  useCurrency: () => ({ currency: 'INR', setCurrency: vi.fn() }),
}));

describe('shared brand wordmark', () => {
  it('uses one standard style for the main logo', () => {
    render(<BrandWordmark />);
    expect(screen.getByText('SIMVORAE')).toHaveAttribute('class', 'brand-wordmark');
    expect(screen.getByText('SIMVORAE')).not.toHaveAttribute('aria-hidden');
  });

  it('renders identical main wordmarks in the navbar and footer', () => {
    render(<MemoryRouter><Navbar /><Footer /></MemoryRouter>);
    const navbarWordmark = screen.getByRole('banner').querySelector('.brand-wordmark');
    const footerWordmark = screen.getByRole('contentinfo').querySelector('a .brand-wordmark');
    expect(navbarWordmark).toHaveTextContent('SIMVORAE');
    expect(footerWordmark).toHaveTextContent('SIMVORAE');
    expect(footerWordmark).toHaveAttribute('class', navbarWordmark!.getAttribute('class'));
  });

  it('only scales the decorative watermark and hides the duplicate from screen readers', () => {
    render(<BrandWordmark decorative />);
    const watermark = screen.getByText('SIMVORAE');
    expect(watermark).toHaveClass('brand-wordmark', 'brand-wordmark--decorative');
    expect(watermark).not.toHaveClass('italic', 'tracking-tighter');
    expect(watermark).toHaveAttribute('aria-hidden', 'true');
  });
});
