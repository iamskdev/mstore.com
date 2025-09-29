import { generateSequentialId } from '../../utils/data-manager.js';

const db = window._firestore;

/**
 * Creates a new user document in the 'users' collection in Firestore.
 * @param {object} user - The Firebase Auth user object from userCredential.user.
 * @param {object} providerData - Additional data like fullName, method, providerName.
 * @returns {Promise<string>} The custom sequential ID of the new user.
 */
export async function createUserDocument(user, { fullName, phone, method, providerName }) {
  try {
    if (!db) {
      console.error("Firestore is not initialized. Check firebase-config.js and script loading order.");
      throw new Error("Firestore not available");
    }

    const userId = await generateSequentialId('users', 'USR');

    // The primary role for a new user is 'user'.
    const primaryRole = 'user';

    const newUserAccount = {
      meta: {
        userId: userId,
        version: 1.0,
        primaryRole: primaryRole, // Added to match users.json schema
        roles: [primaryRole], // Roles should reflect the primary role initially
        registeredOn: new Date().toISOString(),
        links: { accountId: null }, // Will be populated after account creation
        flags: {
          isActive: true,
          isSuspended: false,
          isVerified: user.emailVerified,
          isCustomer: true, // A standard user is also a customer
          isAdmin: false,
          isMerchant: false,
          isAgent: false,
          isStaff: false
        },
        lastUpdated: new Date().toISOString()
      },
      info: {
        fullName: fullName || user.displayName || '',
        nickName: '',
        username: (user.email?.split('@')[0] || `user${Date.now()}`).replace(/[^a-zA-Z0-9_]/g, ''), // Auto-generate a username
        gender: '',
        dob: '',
        avatar: user.photoURL || '',
        tagline: '',
        bio: '',
        email: user.email,
        phone: phone || user.phoneNumber || '' // Form se mile phone number ko priority di
      },
      auth: {
        login: {
          attempts: 0,
          method: method,
          password: { hash: '', updatedAt: new Date().toISOString() }
        },
        provider: {
          name: providerName,
          uid: user.uid,

          lastUpdated: new Date().toISOString()
        },
        flags: {
          twoFactorEnabled: false,
          emailVerified: user.emailVerified,
          phoneVerified: !!user.phoneNumber,
          accountLocked: false,
          tempPasswordUsed: false
        },
        recovery: { email: '', phone: '', securityQuestions: [] }
      },
      address: [],

    };

    await db.collection("users").doc(userId).set(newUserAccount);
    console.log(`User document created with ID: ${userId}`);
    return userId;

  } catch (error) {
    console.error("Error creating user document:", error);
    throw error;
  }
}