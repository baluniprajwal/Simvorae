import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from './types/product';

const { fetchJson } = vi.hoisted(() => ({ fetchJson: vi.fn() }));

vi.mock('./lib/api', () => ({ fetchJson }));
vi.mock('gsap', () => ({ default: { registerPlugin: vi.fn() } }));
vi.mock('@gsap/react', () => ({ useGSAP: vi.fn() }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));
vi.mock('./components/Navbar', () => ({ default: () => <nav>Navigation</nav> }));
vi.mock('./components/Footer', () => ({ default: () => <footer>Footer</footer> }));
vi.mock('./store/cartStore', () => ({
  useCartStore: () => ({ toggleCart: vi.fn(), getCartCount: () => 0 }),
}));
vi.mock('./contexts/CurrencyContext', () => ({
  useCurrency: () => ({ formatPrice: (amount: number) => `INR ${amount}` }),
}));

import Home from './Home';

const emptySections = {
  signatureSilhouettes: [],
  artisanCrafted: [],
  everydayCarry: [],
};

function product(id: string): Product {
  return {
    _id: id, slug: id, name: `Real bag ${id}`, price: 1234,
    image: `/real-images/${id}.jpg`, images: [], category: 'Tote',
    material: 'Leather', color: 'Black', keyFeatures: [],
    packageDetails: { lengthCm: 20, breadthCm: 15, heightCm: 5, weightKg: 0.5 },
    featured: true, stock: 1, lowStockThreshold: 3, isActive: true,
  };
}

async function renderHome() {
  await act(async () => {
    render(<MemoryRouter><Home /></MemoryRouter>);
  });
}

function productLinks() {
  return screen.queryAllByRole('link').filter((link) =>
    link.getAttribute('href')?.startsWith('/product/'),
  );
}

function expectNoProductSections() {
  expect(screen.queryByRole('heading', { name: /Signature/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /Artisan/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /Everyday/ })).not.toBeInTheDocument();
  expect(productLinks()).toHaveLength(0);
  expect(screen.queryByText('The Drape Tote')).not.toBeInTheDocument();
}

describe('homepage merchandising', () => {
  beforeEach(() => {
    fetchJson.mockReset();
    window.sessionStorage.setItem('simvorae_intro_seen', '1');
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('does not show dummy products while the request is loading', async () => {
    fetchJson.mockReturnValue(new Promise(() => {}));
    await renderHome();
    expectNoProductSections();
  });

  it('hides empty sections but keeps the editorial page and navigation', async () => {
    fetchJson.mockResolvedValue({ sections: emptySections });
    await renderHome();
    expectNoProductSections();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Luxury Handbag Editorial' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Handbag Campaign Image' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(fetchJson).toHaveBeenCalledWith('/api/products/homepage');
  });

  it.each([1, 2])('renders only real cards with %i product(s) per section', async (count) => {
    const sections = {
      signatureSilhouettes: Array.from({ length: count }, (_, i) => product(`signature-${i}`)),
      artisanCrafted: Array.from({ length: count }, (_, i) => product(`artisan-${i}`)),
      everydayCarry: Array.from({ length: count }, (_, i) => product(`carry-${i}`)),
    };
    fetchJson.mockResolvedValue({ sections });
    await renderHome();

    expect(productLinks()).toHaveLength(count * 3);
    for (const item of Object.values(sections).flat()) {
      expect(screen.getByRole('img', { name: item.name })).toHaveAttribute('src', item.image);
      expect(screen.getByText(item.name)).toBeInTheDocument();
      expect(document.querySelector(`a[href="/product/${item.slug}"]`)).toBeInTheDocument();
    }
    expect(screen.getAllByText('INR 1234')).toHaveLength(count * 2);
    expect(screen.queryByText('The Drape Tote')).not.toBeInTheDocument();
    expect(screen.queryByText('Structured Hobo')).not.toBeInTheDocument();
    expect(screen.queryByText('Leather Carryall')).not.toBeInTheDocument();
  });

  it('preserves all twelve slots when the sections are fully populated', async () => {
    fetchJson.mockResolvedValue({
      sections: {
        signatureSilhouettes: Array.from({ length: 5 }, (_, i) => product(`signature-${i}`)),
        artisanCrafted: Array.from({ length: 3 }, (_, i) => product(`artisan-${i}`)),
        everydayCarry: Array.from({ length: 4 }, (_, i) => product(`carry-${i}`)),
      },
    });
    await renderHome();
    expect(productLinks()).toHaveLength(12);
    expect(screen.getAllByText('INR 1234')).toHaveLength(9);
  });

  it('respects disabled sections even when they have products', async () => {
    const disabled = { enabled: false, title: 'Hidden', subtitle: '', description: '' };
    fetchJson.mockResolvedValue({
      sections: {
        signatureSilhouettes: [product('signature')],
        artisanCrafted: [product('artisan')],
        everydayCarry: [product('carry')],
      },
      settings: {
        signatureSilhouettes: disabled,
        artisanCrafted: disabled,
        everydayCarry: disabled,
      },
    });
    await renderHome();
    expect(productLinks()).toHaveLength(0);
    expect(screen.queryByText('Real bag signature')).not.toBeInTheDocument();
  });

  it('does not invent products if the API fails', async () => {
    fetchJson.mockRejectedValue(new Error('Unavailable'));
    await renderHome();
    expectNoProductSections();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('handles missing sections and settings without crashing', async () => {
    fetchJson.mockResolvedValue({});
    await renderHome();
    expectNoProductSections();
  });
});
