import { generateSequentialId } from '../../utils/data-manager.js';

const db = window._firestore;

/**
 * Creates a new account document, which centrally stores all dynamic user information.
 * @param {string} userId - The ID of the user this account data belongs to.
 * @param {string} note - A note about how the account document was created.
 * @returns {Promise<string>} The ID of the newly created account document.
 */
export async function createAccountDocument(userId, note) {
  try {
    if (!db) {
      console.error("Firestore is not initialized. Check firebase-config.js and script loading order.");
      throw new Error("Firestore not available");
    }

    const accountId = await generateSequentialId('accounts', 'ACC');
    const userAgent = navigator.userAgent;
    const deviceType = /android/i.test(userAgent) ? 'android' : (/iphone|ipad|ipod/i.test(userAgent) ? 'ios' : 'web');

    // Account data object created dynamically
    const accountData = {
      meta: {
        accountId: accountId,
        createdOn: new Date().toISOString(), // Added to match accounts.json schema
        isGuest: false,
        links: { userId: userId },
        lastUpdated: new Date().toISOString(), // Added to match accounts.json schema
        note: note || "Account created on login."
      },
      deviceInfo: [
        {
          status: "active",
          isLoggedIn: true,
          deviceId: `DEV-${Date.now()}`,
          device: deviceType,
          model: null,
          platform: navigator.platform || '',
          browser: navigator.appName || '',
          name: null,
          ipAddress: null, // Should be determined server-side for accuracy
          location: null,  // Should be determined server-side or via Geolocation API
          loginTime: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          sessionToken: `SST-${Date.now()}`,
          fcmToken: '',
          userAgent: userAgent
        }
      ],

      Alerts: { alertId: [], isCleared: false, updatedAt: null },
      settings: {
        language: "en",
        theme: "light",
        push: true, // Default push notifications to on
        email: false, // Default email notifications to off, matching accounts.json
        sms: false,
        clearSettings: false
      },
      privacy: { showOnline: true, personalizedAds: false },
      autoClear: { recentlyViewed: false, saved: false, notifications: false },
      searchHistory: [],
      personalized: { enabled: false, isCleared: false, users: [], merchants: [], brands: [], items: [], activeHours: [] },
      recentlyViewed: { items: [] },
      subscription: {
        plan: "Free",
        type: "Monthly",
        startDate: null,
        endDate: null,
        status: "inactive",
        autoRenew: false,
        clearSettings: false
      }
    };

    await db.collection("accounts").doc(accountId).set(accountData);

    console.log("Account document created with ID:", accountId);
    return accountId;
  } catch (error) {
    console.error("Error creating account document:", error);
    throw error;
  }
}