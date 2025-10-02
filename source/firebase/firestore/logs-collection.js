import { generateId } from '../../utils/idGenerator.js';
import { firestore } from '../firebase-config.js'; // ✅ Import firestore service

/**
 * Creates a generic log entry in Firestore. This is the central function for all logging.
 * @param {object} logData - The data for the log.
 * @param {string} logData.userId - The ID of the user associated with the event. Can be 'system' for non-user events.
 * @param {string} logData.action - A specific code for the action (e.g., 'user_login_success', 'item_update').
 * @param {string} [logData.type='user'] - The type of log (e.g., 'user', 'order', 'system', 'security').
 * @param {string} [logData.priority='medium'] - The priority ('low', 'medium', 'high', 'critical').
 * @param {string} [logData.status='success'] - The status of the event ('success', 'fail', 'info').
 * @param {string} [logData.description] - A human-readable description of the event.
 * @param {object} [logData.details={}] - Any additional structured data about the event.
 * @returns {Promise<string>} The ID of the newly created log document.
 */
export async function createLog(logData) {
  try {
    if (!firestore) {
      // Silently fail if firestore is not ready, logging shouldn't break the app.
      console.warn("Firestore not available for logging. Log was not created.");
      return null;
    }

    const {
        userId,
        action,
        type = 'user',
        priority = 'medium',
        status = 'success',
        description = '',
        details = {},
        links = {},
        tags // Allow passing custom, more descriptive tags.
    } = logData;

    if (!userId || !action) {
        console.error('userId and action are required for creating a log.');
        return null;
    }

    const logId = generateId('LOG');
    const userAgent = navigator.userAgent;
    const deviceType = /android/i.test(userAgent) ? 'android' : (/iphone|ipad|ipod/i.test(userAgent) ? 'ios' : 'web');

    const newLogEntry = {
      meta: {
        logId,
        type,
        action: action,
        priority,
        // Use provided tags if available, otherwise generate them more robustly.
        tags: tags || [...new Set([type, ...action.split('_')])],
        note: description,
        version: 1,
        links: { userId, ...links } // Merge provided links with the mandatory userId.
      },
      event: {
        timestamp: new Date().toISOString(),
        serverTime: new Date().toISOString(),
        status,
        description: description || `Log for action: ${action}`,
        // Use the full name from details if available, otherwise use a sensible default.
        performedBy: { role: userId === 'system' ? 'system' : 'user', id: userId, name: details.fullName || (userId === 'system' ? 'System' : 'User Action') },
        details
      },
      source: {
        device: deviceType,
        platform: navigator.platform || '',
        browser: navigator.appName || '',
        appVersion: '1.0.0',
        address: null,
        geolocation: null,
        network: null,
        ipAddress: null, // Should be determined server-side
        userAgent: userAgent
      },
      audit: {
        createdBy: userId,
        createdAt: new Date().toISOString(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        updatedAt: null,
        updatedBy: null
      }
    };

    await firestore.collection("logs").doc(logId).set(newLogEntry);
    console.log(`Log created with ID: ${logId} for action: ${action}`);
    return logId;

  } catch (error) {
    console.error(`Error creating log for action ${logData.action}:`, error);
    // Don't re-throw, as logging failure shouldn't break the main flow.
    return null;
  }
}