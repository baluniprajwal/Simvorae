// Accepts "+91 98765 43210" and "098765 43210" as well as plain 10-digit numbers; keep in sync
// with toIndianMobileDigits in the frontend.
export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }

  return digits;
}

export function isValidIndianPhone(phone) {
  return /^[6-9]\d{9}$/.test(normalizePhone(phone));
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function isValidIndianPostalCode(postalCode) {
  return /^\d{6}$/.test(String(postalCode || '').trim());
}
