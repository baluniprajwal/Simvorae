import { describe, expect, it } from 'vitest';
import { toIndianMobileDigits } from './phone';

describe('Indian mobile number input', () => {
  it('drops +91 and a leading 0 instead of keeping the wrong first ten digits', () => {
    expect(toIndianMobileDigits('+91 98765 43210')).toBe('9876543210');
    expect(toIndianMobileDigits('919876543210')).toBe('9876543210');
    expect(toIndianMobileDigits('09876543210')).toBe('9876543210');
  });

  it('leaves plain numbers and partial typing alone', () => {
    expect(toIndianMobileDigits('98765 43210')).toBe('9876543210');
    expect(toIndianMobileDigits('9198')).toBe('9198');
    expect(toIndianMobileDigits('')).toBe('');
  });
});
