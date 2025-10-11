/**
 * @file import-data.js
 * This script exports each collection from Firebase Firestore into a separate JSON file.
 * To run: node tools/scripts/import-data.js
 */

import admin from 'firebase-admin';
import fs from 'fs/promises'; // For asynchronous file operations
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
// Path to your service account key file (relative to this script)
const SERVICE_ACCOUNT_PATH = '../../source/firebase/serviceAccountKey.json';
// Output directory where JSON files will be saved
const OUTPUT_DIR_PATH = '../../localstore/jsons';
// Optional: specify a single collection to export from the command line.
const SPECIFIC_COLLECTION_TO_EXPORT = process.argv[2] ? path.basename(process.argv[2], '.json') : '';

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
 * Main function to export Firestore data to separate JSON files.
 */
async function exportCollectionsToFiles() {
    try {
        // --- Initialize Firebase Admin SDK ---
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const serviceAccountKeyPath = path.resolve(__dirname, SERVICE_ACCOUNT_PATH);

        const serviceAccount = JSON.parse(await fs.readFile(serviceAccountKeyPath, 'utf8'));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
            const db = admin.firestore();
        console.log('✅ Firebase Admin SDK initialized successfully.');

        // --- Ensure output directory exists ---
        const outputDirPath = path.resolve(__dirname, OUTPUT_DIR_PATH);
        await fs.mkdir(outputDirPath, { recursive: true });
        console.log(`📂 Output directory ensured: ${outputDirPath}`);

        // --- Determine which collections to process ---
        let collectionsToProcess;

        if (SPECIFIC_COLLECTION_TO_EXPORT) {
            console.log(`🔥 Fetching and exporting specific collection: ${SPECIFIC_COLLECTION_TO_EXPORT}...`);
            collectionsToProcess = [db.collection(SPECIFIC_COLLECTION_TO_EXPORT)];
        } else {
            console.log('🔥 Fetching and exporting all collections...');
            collectionsToProcess = await db.listCollections();
        }

        // --- Fetch data and write to files ---
        for (const collectionRef of collectionsToProcess) {
            const collectionId = collectionRef.id;
            console.log(`   - Processing collection: ${collectionId}`);

            const snapshot = await collectionRef.get();
            const collectionData = [];

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
                "feedbacks": "meta.feedbackId",
                "stories": "meta.links.merchantId",
                "ratings": "meta.ratingId",
                "posts": "meta.postId",
                "comments": "meta.commentId"
            };

            const idFieldPath = idFieldMap[collectionId];

            snapshot.forEach(doc => {
                const docData = doc.data();
                const internalId = getNestedValue(docData, idFieldPath);

                // --- DATA INTEGRITY CHECK ---
                // Verify that the document's ID matches the ID stored inside its data.
                // This helps catch inconsistencies. We do NOT overwrite the internal data.
                if (idFieldPath && internalId && internalId !== doc.id) {
                    console.warn(`     - ⚠️ ID Mismatch in '${collectionId}': Doc ID '${doc.id}' != Internal ID '${internalId}'. Using data as-is from Firestore.`);
                }

                collectionData.push(docData);
            });

            // Create file path for the collection
            const outputFilePath = path.join(outputDirPath, `${collectionId}.json`);

            // Write to JSON file
            await fs.writeFile(outputFilePath, JSON.stringify(collectionData, null, 2));
                console.log(`     ✔️  Saved ${collectionData.length} documents to ${collectionId}.json.`);
        }

        console.log(`\n🎉 Success! All data has been exported to: ${outputDirPath}`);

    } catch (error) {
        console.error('❌ An error occurred during the export process:', error);
        if (error.code === 'ENOENT' && error.path?.includes('serviceAccountKey.json')) {
            console.error('🔑 Please ensure that `/source/firebase/serviceAccountKey.json` file exists.');
        }
    }
}

exportCollectionsToFiles();
