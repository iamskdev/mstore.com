/**
 * @file Centralized ID Generation Utility
 * @description Provides a globally unique, chronologically sortable ID.
 * This function should ideally be used on the server-side (e.g., Cloud Functions)
 * to ensure time accuracy.
 */

/**
 * Generates a unique ID based on the entity type and a UTC timestamp.
 * Format: TYPE-YYYYMMDD-HHMMSS-SSS-RRRR
 *
 * @param {string} entityType - A 3-letter uppercase code for the entity (e.g., 'USR', 'ITM').
 * @returns {string} The generated unique ID.
 */
export function generateId(entityType) {
  // Input validation: Ensure entityType is a 3-character uppercase string.
  if (typeof entityType !== 'string' || !/^[A-Z]{3}$/.test(entityType)) {
    console.error('Invalid entityType. It must be a 3-letter uppercase code.');
    // Fallback to a generic type or throw an error.
    entityType = 'ERR';
  }

  const now = new Date();
  // Use UTC methods to ensure global consistency
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0'); // 'min' is a better name than 'mm' for minutes
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  const ms = String(now.getUTCMilliseconds()).padStart(3, '0');

  // Generate a cryptographically secure 4-character random alphanumeric string (A-Z, 0-9).
  // This is more robust than Math.random() and significantly reduces collision probability.
  const randomLength = 4;
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const charactersLength = characters.length;
  let random = '';

  // Use crypto.getRandomValues for secure randomness if available.
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomBytes = new Uint8Array(randomLength);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < randomLength; i++) {
      random += characters.charAt(randomBytes[i] % charactersLength);
    }
  } else {
    // Fallback to Math.random() if crypto API is not available (e.g., non-secure contexts).
    random = Math.random().toString(36).substring(2, 2 + randomLength).toUpperCase();
  }

  return `${entityType}-${yyyy}${mm}${dd}-${hh}${min}${ss}-${ms}-${random}`;
}