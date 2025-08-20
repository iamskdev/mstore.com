/**
 * @file Centralized utility functions for formatting data like dates, currency, etc.
 */

/**
 * Formats an ISO 8601 date string into a user-friendly format for the India timezone (IST).
 * @param {string} isoString - The date string in ISO format (e.g., "2024-08-21T10:30:00Z").
 * @returns {string} The formatted date string (e.g., "Aug 21, 2024, 4:00:00 PM") or an empty string if input is invalid.
 */
export function formatDateForIndia(isoString) {
  if (!isoString || typeof isoString !== 'string') return '';
  try {
    const date = new Date(isoString);
    const options = {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: true, timeZone: 'Asia/Kolkata'
    };
    return new Intl.DateTimeFormat('en-IN', options).format(date);
  } catch (error) {
    console.error("Error formatting date:", isoString, error);
    return isoString; // Fallback to original string on error
  }
}

/**
 * Formats an E.164 phone number into a more readable format with a space.
 * Specifically handles the +91 country code for now.
 * @param {string} e164Phone - The phone number in E.164 format (e.g., "+919876543210").
 * @returns {string} The formatted phone number (e.g., "+91 9876543210") or the original string.
 */
export function formatPhoneNumberWithSpace(e164Phone) {
  if (!e164Phone || typeof e164Phone !== 'string') return '';
  if (e164Phone.startsWith('+91') && e164Phone.length > 3) {
    return `+91 ${e164Phone.substring(3)}`;
  }
  return e164Phone; // Return original if it's not an Indian number or is too short
}

/**
 * Formats a number into a currency string for India (INR).
 * @param {number} amount - The numeric amount to format.
 * @param {string} [currency='INR'] - The currency code.
 * @returns {string} The formatted currency string (e.g., "₹1,250.00").
 */
export function formatCurrency(amount, currency = 'INR') {
  if (typeof amount !== 'number') return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a Date object into a relative time string (e.g., "2 hours ago", "just now").
 * @param {Date} date - The date object to format.
 * @returns {string} The relative time string.
 */
export function formatRelativeTime(date) {
    // Add a check for invalid dates (e.g., new Date('invalid string'))
    if (!(date instanceof Date) || isNaN(date)) return '';

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 5) return 'just now';

    // A more scalable, data-driven approach
    const units = [
        { name: 'year', seconds: 31536000 },
        { name: 'month', seconds: 2592000 },
        { name: 'week', seconds: 604800 },
        { name: 'day', seconds: 86400 },
        { name: 'hour', seconds: 3600 },
        { name: 'minute', seconds: 60 }
    ];

    for (const unit of units) {
        const interval = Math.floor(diffInSeconds / unit.seconds);
        if (interval >= 1) return `${interval} ${unit.name}${interval > 1 ? 's' : ''} ago`;
    }
    return `${Math.floor(diffInSeconds)} seconds ago`;
}
