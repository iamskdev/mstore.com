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
  const now = new Date();
  // Use UTC methods to ensure global consistency
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  const ms = String(now.getUTCMilliseconds()).padStart(3, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${entityType}-${yyyy}${mm}${dd}-${hh}${min}${ss}-${ms}-${random}`;
}