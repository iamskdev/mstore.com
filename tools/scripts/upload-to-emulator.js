/**
 * @file upload-to-emulator.js
 * This script uploads data from JSON files in the /localstore/jsons/ folder to the LOCAL FIRESTORE EMULATOR.
 * It can upload all JSON files in the directory or a single specified file.
 * It will overwrite existing documents with the same ID in the emulator.
 * To upload all files: node tools/scripts/upload-to-emulator.js
 * To upload a single file: node tools/scripts/upload-to-emulator.js users.json
 * PRE-REQUISITE: The Firebase Emulator Suite must be running (`firebase emulators:start`).
 */

import admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
// Path to your service account key file
const SERVICE_ACCOUNT_PATH = '../../source/firebase/serviceAccountKey.json';
// Input directory from which to read JSON files
const INPUT_DIR_PATH = '../../localstore/jsons';
// Firestore batch write limit
const BATCH_LIMIT = 500;
// Emulator host and port
const FIRESTORE_EMULATOR_HOST = "127.0.0.1:8090"; // Use 127.0.0.1 for better compatibility
const AUTH_EMULATOR_HOST = "127.0.0.1:9099"; // Default Firebase Auth Emulator host
// Optional: specify a single JSON file to upload (e.g., 'users.json') from the command line.
const SPECIFIC_FILE_TO_UPLOAD = process.argv[2] || '';


/**
 * Safely retrieves a nested property from an object.
 * @param {object} obj The object to query.
 * @param {string} path The dot-separated path to the property.
 * @returns {*} The value of the property or undefined if not found.
 */
const getNestedValue = (obj, path) => {
    if (!path) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

/**
 * Deletes all documents in a specified collection using batched writes.
 * This is useful for clearing out old data before an import.
 * @param {FirebaseFirestore.Firestore} db The Firestore database instance.
 * @param {string} collectionPath The path of the collection to clear.
 * @param {number} batchSize The number of documents to delete in each batch.
 */
async function deleteCollection(db, collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    while (true) {
        const snapshot = await query.get();
        if (snapshot.size === 0) {
            return; // No more documents to delete.
        }
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
}

/**
 * Imports user records into the Firebase Auth emulator from a JSON file.
 * @param {admin.auth.Auth} auth The Firebase Auth instance.
 * @param {string} usersFilePath The file path to the users.json file.
 * @param {FirebaseFirestore.Firestore} db The Firestore database instance for UID syncing.
 */
async function createAuthUsersInEmulator(auth, usersFilePath, db) {
    console.log(`\n   - 🔑 Importing auth users from: ${path.basename(usersFilePath)}`);
    try {
        const fileContent = await fs.readFile(usersFilePath, 'utf8');
        const mockUsers = JSON.parse(fileContent);

        if (!Array.isArray(mockUsers) || mockUsers.length === 0) {
            console.log("     - No users found in users.json to import into Auth. Skipping.");
            return;
        }

        let successCount = 0;
        for (const mockUser of mockUsers) {
            const email = mockUser.info?.email;
            const customUserId = mockUser.meta?.userId;
            const fullName = mockUser.info?.fullName;
            const roles = mockUser.meta?.roles || [];

            if (!email || !customUserId) {
                console.warn(`     - ⚠️ Skipping user due to missing email or userId:`, JSON.stringify(mockUser).substring(0, 100));
                continue;
            }

            try {
                let userRecord;
                try {
                    userRecord = await auth.getUser(customUserId);
                    // console.log(`     - 👤 Auth user ${email} already exists in emulator.`);
                } catch (error) {
                    if (error.code === 'auth/user-not-found') {
                        // Create user in Auth Emulator if they don't exist
                        userRecord = await auth.createUser({
                            uid: customUserId,
                            email: email,
                            emailVerified: true,
                            password: 'password123',
                            displayName: fullName,
                            disabled: false,
                        });
                    } else {
                        throw error;
                    }
                }

                // Sync UID back to Firestore document (important for consistency)
                await db.collection('users').doc(customUserId).update({
                    'auth.provider.uid': userRecord.uid
                });

                // Set custom claims for admin users
                if (roles.includes("admin")) {
                    await auth.setCustomUserClaims(userRecord.uid, { isAdmin: true });
                }
                successCount++;
            } catch (error) {
                if (error.code !== 'auth/uid-already-exists' && error.code !== 'auth/email-already-exists') {
                    console.error(`     - ❌ Failed to create auth user for ${email}:`, error.message);
                } else {
                    // If user already exists, we can consider it a success for this script's purpose.
                    successCount++;
                }
            }
        }
        console.log(`   - ✅ Successfully created/verified ${successCount} users in Auth emulator.`);
    } catch (error) {
        console.error(`   - ❌ Error importing auth users:`, error.code === 'ENOENT' ? 'users.json not found.' : error.message);
    }
}
/**
 * Main function to upload data to the Firestore Emulator.
 */
async function uploadDataToEmulator() {
    try {
        // --- IMPORTANT: Set Emulator Host Environment Variable ---
        // These lines tell the Firebase Admin SDK to connect to the local emulators
        // instead of the live Firebase services.
        process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
        process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST;

        console.log(`🔌 Targeting Firestore Emulator at: ${FIRESTORE_EMULATOR_HOST}`);
        console.log(`🔌 Targeting Auth Emulator at: ${AUTH_EMULATOR_HOST}`);

        // --- Initialize Firebase Admin SDK ---
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const serviceAccountKeyPath = path.resolve(__dirname, SERVICE_ACCOUNT_PATH);
        
        const serviceAccount = JSON.parse(await fs.readFile(serviceAccountKeyPath, 'utf8'));

        // Use the actual project ID from the service account key.
        // This ensures the data is uploaded to the correct project namespace within the emulator,
        // matching what the Emulator UI (localhost:4000) expects.
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });

        // --- Upload Data ---
        const inputDirPath = path.resolve(__dirname, INPUT_DIR_PATH);
        console.log(`\n🔥 Starting data synchronization with emulator from: ${inputDirPath}`);

        let filesToProcess;

        if (SPECIFIC_FILE_TO_UPLOAD) {
            console.log(`🔥 Preparing to upload specific file to emulator: ${SPECIFIC_FILE_TO_UPLOAD}`);
            const specificFilePath = path.join(inputDirPath, SPECIFIC_FILE_TO_UPLOAD);
            try {
                await fs.access(specificFilePath);
                if (SPECIFIC_FILE_TO_UPLOAD.endsWith('.json')) {
                    filesToProcess = [SPECIFIC_FILE_TO_UPLOAD];
                } else {
                    console.error(`❌ Error: Specified file is not a .json file.`);
                    return;
                }
            } catch (e) {
                console.error(`❌ Error: Specified file not found at: ${specificFilePath}`);
                return;
            }
        } else {
            console.log(`🔥 Preparing to upload all JSON files to emulator...`);
            const allFiles = await fs.readdir(inputDirPath);
            filesToProcess = allFiles.filter(file => file.endsWith('.json') && file !== 'versioner.json' && file !== 'versions.json');
        }

        if (filesToProcess.length === 0) {
            console.log(`📂 No JSON files found to upload in: ${inputDirPath}`);
            return;
        }

        // --- Clear All Collections First ---
        const idFieldMap = {
                "items": "meta.itemId",
                "users": "meta.userId",
                "merchants": "meta.merchantId",
                "promotions": "meta.promoId",
                "orders": "meta.orderId",
                "logs": "meta.logId",
                "price-logs": "meta.priceLogId",
                "brands": "meta.brandId",
                "units": "meta.unitId",
                "categories": "meta.categoryId",
                "alerts": "meta.alertId",
                "accounts": "meta.accountId",
                "campaigns": "meta.campaignId",
                "stories": "meta.links.merchantId",
                "feedbacks": "meta.feedbackId",
                "ratings": "meta.ratingId",
                "posts": "meta.postId",
                "comments": "meta.commentId"
          
        };

        const db = admin.firestore();
        console.log(`✅ Firebase Admin SDK initialized for EMULATOR. Project: ${serviceAccount.project_id}`);

        console.log(`\n--- Step 1: Clearing All Collections in Emulator ---`);
        // If a specific file is being uploaded, only clear that collection.
        // Otherwise, clear all collections defined in the files to be processed.
        for (const file of filesToProcess) {
            const collectionId = path.basename(file, '.json');
            console.log(`   - 🗑️  Clearing collection: '${collectionId}'...`);
            await deleteCollection(db, collectionId, BATCH_LIMIT);
        }
        console.log(SPECIFIC_FILE_TO_UPLOAD
            ? `   - ✅ Collection '${path.basename(SPECIFIC_FILE_TO_UPLOAD, '.json')}' cleared.`
            : `   - ✅ All specified collections cleared.`
        );

        console.log(`\n--- Step 2: Uploading Data to Firestore Emulator ---`);
        for (const file of filesToProcess) {
            const collectionId = path.basename(file, '.json');
            const filePath = path.join(inputDirPath, file);
            console.log(`\n   - Processing collection: ${collectionId}`);

            const fileContent = await fs.readFile(filePath, 'utf8');
            const documents = JSON.parse(fileContent);

            // --- FIX: Handle both array of documents and single object documents (like stories.json) ---
            const docsToProcess = Array.isArray(documents) ? documents : [documents];

            if (docsToProcess.length === 0) {
                console.warn(`     ⚠️ ${file} is empty or invalid. Skipping.`);
                continue;
            }

            if (!Array.isArray(documents)) {
                console.log(`     ℹ️ Detected single object file. Processing as one document.`);
            }

            const idFieldPath = idFieldMap[collectionId];
            const collectionRef = db.collection(collectionId);
            let batch = db.batch();
            let docCountInBatch = 0;
            let totalDocsUploaded = 0;

            for (const doc of docsToProcess) {
                const docId = String(getNestedValue(doc, idFieldPath) || doc.id);

                if (!docId || docId === 'undefined') {
                    console.warn(`     ⚠️ Document does not have a valid '${idFieldPath || 'id'}' field. Skipping:`, JSON.stringify(doc).substring(0, 100) + '...');
                    continue;
                }

                const docRef = collectionRef.doc(docId);
                batch.set(docRef, doc);
                docCountInBatch++;

                if (docCountInBatch === BATCH_LIMIT) {
                    await batch.commit();
                    totalDocsUploaded += docCountInBatch;
                    // console.log(`     - Committed a batch of ${docCountInBatch} documents to emulator.`); // Reduced verbosity
                    batch = db.batch();
                    docCountInBatch = 0;
                }
            }

            if (docCountInBatch > 0) {
                await batch.commit();
                totalDocsUploaded += docCountInBatch;
            }
            console.log(`   - 📤 Successfully uploaded ${totalDocsUploaded} documents to the '${collectionId}' collection in the emulator.`);
        }

        // --- Step 3: Create Auth Users (if applicable) ---
        // This step should only run if we are doing a full upload OR if the specific file being uploaded is 'users.json'.
        if (!SPECIFIC_FILE_TO_UPLOAD || SPECIFIC_FILE_TO_UPLOAD === 'users.json') {
            console.log(`\n--- Step 3: Creating Authentication Users in Emulator ---`);
            const auth = admin.auth();
            const usersJsonPath = path.join(inputDirPath, 'users.json');
            await createAuthUsersInEmulator(auth, usersJsonPath, db);
        }

        console.log(`\n🎉 Success! All data has been uploaded to the Firestore Emulator.`);

    } catch (error) {
        console.error('❌ An error occurred during the emulator upload process:', error);
        if (error.code === 'ENOENT') {
            if (error.path?.includes('serviceAccountKey.json')) {
                console.error('🔑 Please ensure that the `/source/firebase/serviceAccountKey.json` file exists.');
            } else if (error.path?.includes('jsons')) {
                console.error(`📂 Input directory not found: ${INPUT_DIR_PATH}`);
            }
        } else if (error.code === 'ECONNREFUSED') {
            console.error('🔥 Connection refused. Is the Firestore Emulator running? Start it with `firebase emulators:start`.');
        }
    }
}

uploadDataToEmulator();
