import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar';
import { CurrencyProvider } from '../contexts/CurrencyContext';

function CurrentUrl() {
  const location = useLocation();
  return <span data-testid="url">{`${location.pathname}${location.search}`}</span>;
}

function renderAt(url: string) {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  render(
    <MemoryRouter initialEntries={[url]}>
      <CurrencyProvider>
        <Navbar />
        <CurrentUrl />
      </CurrencyProvider>
    </MemoryRouter>,
  );
}

describe('navbar search', () => {
  it('clears the search when the box is emptied and Enter is pressed', () => {
    renderAt('/shop?q=tote');
    const input = screen.getByPlaceholderText('SEARCH...');
    expect(input).toHaveValue('tote');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByTestId('url')).toHaveTextContent(/^\/shop$/);
    expect(input).toHaveValue('');
  });

  it('still searches for a typed query', () => {
    renderAt('/shop');
    const input = screen.getByPlaceholderText('SEARCH...');

    fireEvent.change(input, { target: { value: ' tote ' } });
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByTestId('url')).toHaveTextContent('/shop?q=tote');
  });
});
