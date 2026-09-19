import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './cartStore';

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
});
