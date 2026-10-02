import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrencyProvider, useCurrency } from './CurrencyContext';

function CurrencyProbe() {
  const { currency, formatPrice, formatInr, isEstimated, setCurrency } = useCurrency();

  return (
    <div>
      <span data-testid="currency">{currency}</span>
      <span data-testid="display-price">{formatPrice(15000)}</span>
      <span data-testid="inr-price">{formatInr(15000)}</span>
      <span data-testid="estimated">{String(isEstimated)}</span>
      <button type="button" onClick={() => setCurrency('INR')}>Use INR</button>
    </div>
  );
}

describe('currency display', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('converts stored foreign currency as an estimate while preserving INR', async () => {
    window.localStorage.setItem('simvorae_display_currency', 'USD');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rate: 0.0113 }),
    }));

    render(<CurrencyProvider><CurrencyProbe /></CurrencyProvider>);

    await waitFor(() => expect(screen.getByTestId('estimated')).toHaveTextContent('true'));
    expect(screen.getByTestId('currency')).toHaveTextContent('USD');
    expect(screen.getByTestId('display-price').textContent).toMatch(/^~/);
    expect(screen.getByTestId('display-price')).toHaveTextContent('170');
    expect(screen.getByTestId('inr-price')).toHaveTextContent('15,000');

    fireEvent.click(screen.getByRole('button', { name: 'Use INR' }));
    expect(screen.getByTestId('currency')).toHaveTextContent('INR');
    expect(screen.getByTestId('estimated')).toHaveTextContent('false');
    expect(window.localStorage.getItem('simvorae_display_currency')).toBe('INR');
  });

  it('falls back to INR when country detection is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    render(<CurrencyProvider><CurrencyProbe /></CurrencyProvider>);

    await waitFor(() => expect(screen.getByTestId('currency')).toHaveTextContent('INR'));
    expect(screen.getByTestId('estimated')).toHaveTextContent('false');
    expect(screen.getByTestId('display-price')).toHaveTextContent('15,000');
  });

  it('shows INR during a rate outage but keeps the saved currency for the next visit', async () => {
    window.localStorage.setItem('simvorae_display_currency', 'USD');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rate service down')));

    render(<CurrencyProvider><CurrencyProbe /></CurrencyProvider>);

    await waitFor(() => expect(screen.getByTestId('currency')).toHaveTextContent('INR'));
    expect(screen.getByTestId('display-price')).toHaveTextContent('15,000');
    expect(window.localStorage.getItem('simvorae_display_currency')).toBe('USD');
  });

  it('still renders prices when the browser blocks storage', async () => {
    const blocked = () => {
      throw new DOMException('Storage is disabled', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ country: 'IN' }),
    }));

    render(<CurrencyProvider><CurrencyProbe /></CurrencyProvider>);

    expect(screen.getByTestId('display-price')).toHaveTextContent('15,000');
    fireEvent.click(screen.getByRole('button', { name: 'Use INR' }));
    await waitFor(() => expect(screen.getByTestId('currency')).toHaveTextContent('INR'));
  });

  it('ignores an older exchange-rate response after switching currency again', async () => {
    const pending: Record<string, (rate: number) => void> = {};
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url === '/api/country') return Promise.reject(new Error('no detection'));
      const code = url.split('/').pop() as string;
      return new Promise((resolve) => {
        pending[code] = (rate) => resolve({ ok: true, json: async () => ({ rate }) });
      });
    }));

    function Switcher() {
      const { setCurrency, formatPrice } = useCurrency();
      return (
        <div>
          <span data-testid="price">{formatPrice(100000)}</span>
          <button type="button" onClick={() => setCurrency('USD')}>USD</button>
          <button type="button" onClick={() => setCurrency('GBP')}>GBP</button>
        </div>
      );
    }

    render(<CurrencyProvider><Switcher /></CurrencyProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'USD' }));
    await waitFor(() => expect(pending.USD).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'GBP' }));
    await waitFor(() => expect(pending.GBP).toBeDefined());

    pending.GBP(0.009);
    await waitFor(() => expect(screen.getByTestId('price').textContent).toMatch(/900/));
    pending.USD(0.012);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(screen.getByTestId('price').textContent).toMatch(/900/);
    expect(screen.getByTestId('price').textContent).not.toMatch(/1,200/);
  });

  it('does not let country detection override a currency the visitor already picked', async () => {
    let finishDetection: (value: unknown) => void = () => {};
    vi.stubGlobal('fetch', vi.fn((url: string) => (url === '/api/country'
      ? new Promise((resolve) => { finishDetection = resolve; })
      : Promise.resolve({ ok: true, json: async () => ({ rate: 0.012 }) }))));

    render(<CurrencyProvider><CurrencyProbe /></CurrencyProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Use INR' }));
    finishDetection({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ country: 'US' }) });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(screen.getByTestId('currency')).toHaveTextContent('INR');
  });
});
