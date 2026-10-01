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
});
