/**
 * Phone number normalization and bulletproof validation utilities for RentEasy.
 *
 * Normalizes input by removing spaces, dashes, parentheses, and standard country prefixes (+91/0).
 * Enforces Indian mobile number standards (TRAI):
 *  - Exactly 10 digits
 *  - Must start with 6, 7, 8, or 9
 *  - Rejects repeated identical digits (e.g., 0000000000, 9999999999)
 *  - Rejects consecutive repeating digits (e.g., 8+ same digits in a row)
 *  - Rejects sequential patterns and known dummy numbers (e.g., 1234567890, 9876543210)
 */

const KNOWN_DUMMY_NUMBERS = new Set([
  '0123456789',
  '1234567890',
  '2345678901',
  '3456789012',
  '4567890123',
  '5678901234',
  '6789012345',
  '7890123456',
  '8901234567',
  '9012345678',
  '9876543210',
  '8765432109',
  '7654321098',
  '6543210987',
  '5432109876',
  '4321098765',
  '3210987654',
  '2109876543',
  '1098765432',
  '0987654321',
  '9123456789',
  '9000000000',
  '9898989898',
  '9797979797',
]);

function normalizePhone(raw) {
  if (raw === undefined || raw === null) return undefined;
  let cleaned = String(raw)
    .trim()
    .replace(/[\s\-()]/g, '');

  // Handle +91 or 91 country prefix if 12 digits total
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
}

/**
 * Returns a human-readable validation error string, or null if valid.
 */
function getPhoneValidationError(raw) {
  const normalized = normalizePhone(raw);
  if (!normalized) {
    return 'Phone number is required';
  }

  if (!/^\d+$/.test(normalized)) {
    return 'Phone number must contain only numeric digits';
  }

  if (normalized.length !== 10) {
    return 'Phone number must be exactly 10 digits';
  }

  if (!/^[6-9]/.test(normalized)) {
    return 'Mobile number must start with 6, 7, 8, or 9';
  }

  // Reject all identical digits: 0000000000, 9999999999, etc.
  if (/^(\d)\1{9}$/.test(normalized)) {
    return 'Please enter a valid mobile number, not repeated digits';
  }

  // Reject 8 or more consecutive identical digits: e.g. 9888888888, 9999999912
  if (/(\d)\1{7,}/.test(normalized)) {
    return 'Please enter a valid mobile number';
  }

  // Reject known sequential and dummy test numbers
  if (KNOWN_DUMMY_NUMBERS.has(normalized)) {
    return 'Please enter a valid mobile number, not a dummy or sequential number';
  }

  return null;
}

function isValidPhone(raw) {
  return getPhoneValidationError(raw) === null;
}

module.exports = {
  normalizePhone,
  isValidPhone,
  getPhoneValidationError,
};
