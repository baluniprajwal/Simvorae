// Reduces typed or autofilled input to a 10-digit Indian mobile number. Browser autofill often
// supplies "+91 98765 43210"; keeping the first 10 digits of that would silently produce the
// wrong number (9198765432), so drop the country code or trunk 0 first.
export function toIndianMobileDigits(value: string) {
  let digits = String(value || '').replace(/\D/g, '');

  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}
