import { generateId } from '../../utils/idGenerator.js';
import { firestore } from '../firebase-config.js'; // ✅ Import firestore service
import { getAppConfig } from '../../settings/main-config.js';

/**
 * Creates a generic log entry in Firestore. This is the central function for all logging.
 * @param {object} logData - The data for the log.
 * @param {string} logData.userId - The custom ID of the user associated with the event (e.g., 'USR-...') or 'system'.
 * @param {string} [logData.ownerUID] - The Firebase Auth UID of the user performing the action. Crucial for security rules.
 * @param {string} logData.action - A specific code for the action (e.g., 'user_login_success', 'item_update').
 * @param {string} [logData.type='user'] - The type of log (e.g., 'user', 'order', 'system', 'security').
 * @param {string} [logData.priority='medium'] - The priority ('low', 'medium', 'high', 'critical').
 * @param {string} [logData.status='success'] - The status of the event ('success', 'fail', 'info').
 * @param {string} [logData.description] - A human-readable description of the event.
 * @param {object} [logData.details={}] - Any additional structured data about the event.
 * @param {object} [logData.links={}] - Any additional linked document IDs.
 * @param {Array<string>} [logData.tags] - Custom tags to override default tag generation.
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
        ownerUID, // NEW: Capture the Firebase Auth UID for security.
        action,        
        type = 'consumer', // FIX: Default log type for user-centric actions is now 'consumer'.
        priority = 'medium',
        status = 'success',
        description = '',
        details = {},
        links = {},
        tags // Allow passing custom, more descriptive tags.
    } = logData;

    if (!userId || !action) {
        console.error(`Log creation failed: 'userId' and 'action' are required. Received userId: ${userId}, action: ${action}`);
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
        ownerUID: ownerUID || null, // NEW: Store the owner's Auth UID.
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
        // FIX: Get the role from localStorage for better context.
        performedBy: { role: localStorage.getItem('currentUserType') || 'unknown', id: userId, name: details.fullName || (userId === 'system' ? 'System' : 'User Action') },
        details
      },
      source: {
        device: deviceType,
        platform: navigator.platform || '',
        browser: navigator.appName || '',
        appVersion: getAppConfig()?.app?.version || 'unknown',
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