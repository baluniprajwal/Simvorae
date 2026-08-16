export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
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
