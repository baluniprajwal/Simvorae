import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type HTMLAttributes, type ReactNode, useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }:
      HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}));

import { ToastProvider, useToast } from './ToastContext';

function ToastTrigger({ type = 'success' }: { type?: 'success' | 'error' }) {
  const { showError, showSuccess } = useToast();
  useEffect(() => {
    if (type === 'error') showError('Payment could not be completed.');
    else showSuccess('Added The Drape Tote to your bag.');
  }, [showError, showSuccess, type]);
  return <div>Page content</div>;
}

describe('toast provider', () => {
  it('shows and manually dismisses a success toast', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><ToastTrigger /></ToastProvider>);
    expect(screen.getByText('Added The Drape Tote to your bag.')).toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(screen.queryByText('Added The Drape Tote to your bag.')).not.toBeInTheDocument();
  });

  it('removes an error toast after its timeout', () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastTrigger type="error" /></ToastProvider>);
    expect(screen.getByText('Payment could not be completed.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText('Payment could not be completed.')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
