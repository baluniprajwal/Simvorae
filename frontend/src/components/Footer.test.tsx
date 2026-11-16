import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Footer from './Footer';

describe('footer links', () => {
  it('keeps hover font metrics unchanged for navigation and support links', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    for (const name of ['Shop', 'About Us', 'Contact Us', 'Shipping and Delivery', 'Cancellation and Refunds', 'Grievance Redressal']) {
      const link = screen.getByRole('link', { name });
      expect(link).not.toHaveClass('hover:italic', 'transition-all');
      expect(link).toHaveClass('max-w-full', 'transition-[color,transform]');
    }
  });

  it('preserves the grievance contact destination', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Grievance Redressal' })).toHaveAttribute('href', '/contact');
  });
});
