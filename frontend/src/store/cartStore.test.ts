import { beforeEach, describe, expect, it } from 'vitest';
import { CART_STORAGE_KEY, useCartStore } from './cartStore';

const bag = {
  id: 'bag-1',
  name: 'The Drape Tote',
  price: 15000,
  image: '/bag.jpg',
  quantity: 1,
  stockQuantity: 2,
};

describe('cart store', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isOpen: false });
  });

  it('adds items, opens the drawer, and calculates totals', () => {
    useCartStore.getState().addItem(bag);

    expect(useCartStore.getState().items).toEqual([bag]);
    expect(useCartStore.getState().isOpen).toBe(true);
    expect(useCartStore.getState().getCartCount()).toBe(1);
    expect(useCartStore.getState().getCartTotal()).toBe(15000);
  });

  it('merges duplicate products without exceeding available stock', () => {
    useCartStore.getState().addItem(bag);
    useCartStore.getState().addItem({ ...bag, quantity: 3 });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('caps direct quantity changes at stock and removes zero quantities', () => {
    useCartStore.getState().addItem(bag);
    useCartStore.getState().updateQuantity('bag-1', 10);
    expect(useCartStore.getState().items[0].quantity).toBe(2);

    useCartStore.getState().updateQuantity('bag-1', 0);
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('removes and clears cart items', () => {
    useCartStore.getState().addItem(bag);
    useCartStore.getState().removeItem('bag-1');
    expect(useCartStore.getState().items).toEqual([]);

    useCartStore.getState().addItem(bag);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('saves only the bag items so they survive a page refresh', () => {
    useCartStore.getState().addItem(bag);

    const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '{}');
    expect(saved.state).toEqual({ items: [bag] });
  });

  it('restores saved items when the page loads again', async () => {
    useCartStore.setState({ items: [] });
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ state: { items: [bag] }, version: 0 }));

    await useCartStore.persist.rehydrate();

    expect(useCartStore.getState().items).toEqual([bag]);
    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it('updates a saved bag to live prices and stock and reports what changed', () => {
    useCartStore.setState({
      items: [
        { ...bag, id: 'repriced', name: 'Repriced Tote', price: 10000, quantity: 3, stockQuantity: 5 },
        { ...bag, id: 'sold-out', name: 'Sold Out Clutch' },
        { ...bag, id: 'retired', name: 'Retired Hobo' },
        { ...bag, id: 'unchanged', name: 'Mini Bag', price: 5000 },
      ],
    });

    const notes = useCartStore.getState().syncWithCatalog([
      { _id: 'repriced', name: 'Repriced Tote', price: 12000, image: '/new.jpg', stock: 2 },
      { _id: 'sold-out', name: 'Sold Out Clutch', price: 15000, image: '/bag.jpg', stock: 0 },
      { _id: 'unchanged', name: 'Mini Bag', price: 5000, image: '/bag.jpg', stock: 4 },
    ]);

    const items = useCartStore.getState().items;
    expect(items.map((item) => item.id)).toEqual(['repriced', 'unchanged']);
    expect(items[0]).toMatchObject({ price: 12000, quantity: 2, stockQuantity: 2, image: '/new.jpg' });
    expect(items[1]).toMatchObject({ price: 5000, quantity: 1, stockQuantity: 4 });
    expect(useCartStore.getState().getCartTotal()).toBe(29000);
    expect(notes).toHaveLength(4);
    expect(notes.join(' ')).toMatch(/Retired Hobo is no longer available/);
    expect(notes.join(' ')).toMatch(/Sold Out Clutch has sold out/);
    expect(notes.join(' ')).toMatch(/price of Repriced Tote has changed/);
  });
});
