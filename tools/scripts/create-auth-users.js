import admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
const SERVICE_ACCOUNT_PATH = '../../source/firebase/serviceAccountKey.json';
const MOCK_USERS_PATH = '../../localstore/jsons/users.json';
const DEFAULT_PASSWORD = 'password123'; // Set a default password for all mock users

/**
 * Creates Firebase Authentication users from a mock JSON file and updates their
 * corresponding Firestore documents with the correct Auth UID.
 */
async function createAuthUsers() {
    try {
        // --- Initialize Firebase Admin SDK ---
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const serviceAccountKeyPath = path.resolve(__dirname, SERVICE_ACCOUNT_PATH);
        const serviceAccount = JSON.parse(await fs.readFile(serviceAccountKeyPath, 'utf8'));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        const auth = admin.auth();
        const db = admin.firestore();
        console.log('✅ Firebase Admin SDK initialized successfully.');

        // --- Read Mock Users ---
        const mockUsersPath = path.resolve(__dirname, MOCK_USERS_PATH);
        const usersFileContent = await fs.readFile(mockUsersPath, 'utf8');
        const mockUsers = JSON.parse(usersFileContent);

        if (!Array.isArray(mockUsers) || mockUsers.length === 0) {
            console.log('📂 No mock users found in users.json. Exiting.');
            return;
        }

        console.log(`🔥 Found ${mockUsers.length} mock users. Starting synchronization...`);

        // --- Synchronize Users ---
        for (const mockUser of mockUsers) {
            const email = mockUser.info?.email;
            const customUserId = mockUser.meta?.userId;
            const fullName = mockUser.info?.fullName;
            const roles = mockUser.meta?.roles || [];

            if (!email || !customUserId) {
                console.warn(`   - ⚠️ Skipping user due to missing email or userId:`, mockUser.info);
                continue;
            }

            try {
                // 1. Check if user already exists in Firebase Auth by email
                let userRecord;
                try {
                    userRecord = await auth.getUserByEmail(email);
                    console.log(`   - 👤 User ${email} already exists in Auth. UID: ${userRecord.uid}`);
                } catch (error) {
                    if (error.code === 'auth/user-not-found') {
                        // 2. If user does not exist, create them in Firebase Auth
                        console.log(`   - ➕ Creating Auth user for ${email}...`);
                        userRecord = await auth.createUser({
                            email: email,
                            emailVerified: true, // Assume mock users are verified
                            password: DEFAULT_PASSWORD,
                            displayName: fullName,
                            disabled: false,
                        });
                        console.log(`   - ✅ Successfully created Auth user for ${email}. UID: ${userRecord.uid}`);
                    } else {
                        throw error; // Re-throw other errors
                    }
                }

                // 3. Set custom claims if necessary (e.g., for super-admin)
                // This is crucial for security rules that check for admin privileges.
                if (roles.includes("admin")) {
                    // Get existing claims to avoid overwriting other potential claims.
                    const existingClaims = (await auth.getUser(userRecord.uid)).customClaims || {};
                    if (!existingClaims.isAdmin) {
                        console.log(`   - 👑 Setting super-admin custom claim for ${email}...`);
                        await auth.setCustomUserClaims(userRecord.uid, { ...existingClaims, isAdmin: true });
                        console.log(`   - ✅ Custom claim set. User must re-login for it to take effect.`);
                    } else {
                        console.log(`   - 👑 Super-admin custom claim already set for ${email}.`);
                    }
                }

                // 4. Update the corresponding Firestore document with the correct Auth UID
                const firestoreDocRef = db.collection('users').doc(customUserId);
                const doc = await firestoreDocRef.get();

                if (!doc.exists) {
                    console.warn(`   - ⚠️ Firestore document with ID ${customUserId} not found. Please run export-data.js first.`);
                    continue;
                }
                
                const firestoreUid = doc.data().auth?.provider?.uid;
                const firestoreProvider = doc.data().auth?.provider?.name;

                // Update if UID is missing/different or if provider name is not 'firebase'
                if (firestoreUid !== userRecord.uid || firestoreProvider !== 'firebase') {
                    console.log(`   - 🔄 Syncing Firestore document ${customUserId} with Auth UID ${userRecord.uid}...`);
                    await firestoreDocRef.update({ 
                        'auth.provider.uid': userRecord.uid,
                        'auth.provider.name': 'firebase' // Explicitly set the provider
                    });
                    console.log(`   - ✅ Firestore document updated.`);
                } else {
                    console.log(`   - 👍 Firestore document ${customUserId} is already in sync.`);
                }

                // 5. Check for and create the corresponding 'accounts' document if it doesn't exist.
                // This makes the script's behavior consistent with the live _createFirestoreUserBundle function.
                const accountId = doc.data().meta?.links?.accountId;
                if (accountId) {
                    const accountRef = db.collection('accounts').doc(accountId);
                    const accountDoc = await accountRef.get();

                    if (!accountDoc.exists) {
                        console.log(`   - 🏦 Account document ${accountId} not found. Creating it...`);
                        const accountDocData = {
                            meta: {
                                accountId,
                                createdOn: new Date().toISOString(),
                                isGuest: false,
                                links: { userId: customUserId },
                                lastUpdated: new Date().toISOString(),
                                note: "Account created via dev script (create-auth-users.js).",
                                ownerUID: userRecord.uid
                            },
                            // Add other essential fields with default values as needed
                            deviceInfo: [],
                            settings: { language: "en", theme: "light", push: true, email: false, sms: false },
                        };
                        await accountRef.set(accountDocData);
                        console.log(`   - ✅ Account document ${accountId} created successfully.`);
                    }
                } else {
                    console.warn(`   - ⚠️ No accountId link found in user document ${customUserId}. Cannot sync account document.`);
                }

            } catch (error) {
                console.error(`   - ❌ Failed to process user ${email}. Error:`, error.message);
            }
        }

        console.log(`\n🎉 Success! Firebase Authentication and Firestore users are synchronized.\n🔑 Default password for all new users is: "${DEFAULT_PASSWORD}"`);

    } catch (error) {
        console.error('❌ An unexpected error occurred during the script execution:', error);
    }
}

createAuthUsers();