// Small input-checking helpers. Every value from a browser is treated as untrusted.

// Turn any value into a trimmed string no longer than "max" characters
export function clean(value, max = 255) {
  if (typeof value !== 'string') return '';        // Anything that is not text becomes empty
  return value.trim().slice(0, max);               // Remove spaces at the ends and cut to length
}

// Basic email format check
export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Check a date written as YYYY-MM-DD
export function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);                    // Try to build a real date
  return !Number.isNaN(date.getTime());            // Invalid dates such as 2026-02-31 fail here
}

// Convert to a whole number id, or null if it is not a positive whole number
export function toId(value) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : null;
}

// Convert to a number within a range. Empty means "not provided" (null).
// Returns undefined when the value is provided but invalid.
export function toNumberOrNull(value, min, max) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return undefined;
  return number;
}

// Password rule: at least 8 characters with upper case, lower case and a digit
export function isStrongPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 100 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

// Escape the special characters of SQL LIKE so a search for "50%" is treated literally
export function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}
