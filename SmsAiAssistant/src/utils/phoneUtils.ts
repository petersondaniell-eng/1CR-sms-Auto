/**
 * Phone number validation and formatting utilities
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  error?: string;
}

/**
 * Validates and formats a phone number
 * Supports US (10 digits) and international formats
 */
export function validatePhoneNumber(input: string): PhoneValidationResult {
  // Remove all non-digit characters
  const digitsOnly = input.replace(/\D/g, '');

  // Check if empty
  if (digitsOnly.length === 0) {
    return {
      isValid: false,
      formatted: '',
      error: 'Phone number is required',
    };
  }

  // US format: 10 digits (with optional country code 1)
  if (digitsOnly.length === 10) {
    return {
      isValid: true,
      formatted: digitsOnly,
    };
  }

  // US with country code: 11 digits starting with 1
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return {
      isValid: true,
      formatted: digitsOnly.substring(1), // Remove leading 1
    };
  }

  // International format: Keep as-is if between 10-15 digits
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return {
      isValid: true,
      formatted: digitsOnly,
    };
  }

  // Invalid length
  return {
    isValid: false,
    formatted: digitsOnly,
    error: `Invalid phone number length (${digitsOnly.length} digits). Expected 10 digits for US or 10-15 for international.`,
  };
}

/**
 * Formats a phone number for display
 * US: (555) 123-4567
 * International: +1 555 123 4567
 */
export function formatPhoneNumberForDisplay(phoneNumber: string): string {
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  // US format: (555) 123-4567
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }

  // International: add spaces every 3-4 digits
  if (digitsOnly.length > 10) {
    return `+${digitsOnly.slice(0, digitsOnly.length - 10)} ${digitsOnly.slice(-10, -7)} ${digitsOnly.slice(-7, -4)} ${digitsOnly.slice(-4)}`;
  }

  // Fallback: return as-is
  return phoneNumber;
}

/**
 * Normalizes phone number for database storage
 * Removes all formatting, keeps only digits
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, '');
}
