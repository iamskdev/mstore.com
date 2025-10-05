/**
 * @file export-data.js
 * This script uploads data from JSON files in the /localstore/jsons/ folder back to Firestore.
 * It can upload all JSON files in the directory or a single specified file.
 * It will overwrite existing documents with the same ID.
 *
 * To upload all files: node tools/scripts/export-data.js
 * To upload a single file: node tools/scripts/export-data.js users.json
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
 * Main function to upload data to Firestore.
 */
async function uploadDataToFirestore() {
    try {
        // --- Initialize Firebase Admin SDK ---
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const serviceAccountKeyPath = path.resolve(__dirname, SERVICE_ACCOUNT_PATH);
        
        const serviceAccount = JSON.parse(await fs.readFile(serviceAccountKeyPath, 'utf8'));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        const db = admin.firestore();
        console.log('✅ Firebase Admin SDK initialized successfully.');

        // --- Upload Data ---
        const inputDirPath = path.resolve(__dirname, INPUT_DIR_PATH);
        let filesToProcess;

        if (SPECIFIC_FILE_TO_UPLOAD) {
            console.log(`🔥 Preparing to upload specific file: ${SPECIFIC_FILE_TO_UPLOAD}`);
            const specificFilePath = path.join(inputDirPath, SPECIFIC_FILE_TO_UPLOAD);
            try {
                // Check if the file exists and is a JSON file before proceeding
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
            console.log(`🔥 Preparing to upload all JSON files from ${inputDirPath}...`);
            const allFiles = await fs.readdir(inputDirPath);
            filesToProcess = allFiles.filter(file => file.endsWith('.json') && file !== 'versioner.json' && file !== 'versions.json');
        }

        console.warn('⚠️  This script will OVERWRITE existing documents in Firestore with matching IDs.');

        if (filesToProcess.length === 0) {
            console.log(`📂 No JSON files found to upload in: ${inputDirPath}`);
            return;
        }

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
                "ratings": "meta.ratingId"
        };

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
                // Ensure docId is a string, as Firestore requires.
                const docId = String(getNestedValue(doc, idFieldPath) || doc.id);

                if (!docId || docId === 'undefined') {
                    console.warn(`     ⚠️ Document does not have a valid '${idFieldPath || 'id'}' field. Skipping:`, JSON.stringify(doc).substring(0, 100) + '...');
                    continue;
                }

                const docRef = collectionRef.doc(docId);
                batch.set(docRef, doc);
                docCountInBatch++;

                // When batch is full, commit it and start a new one
                if (docCountInBatch === BATCH_LIMIT) {
                    await batch.commit();
                    totalDocsUploaded += docCountInBatch;
                    console.log(`     - Committed a batch of ${docCountInBatch} documents.`);
                    // Reset for the next batch
                    batch = db.batch();
                    docCountInBatch = 0;
                }
            }

            // Commit the final batch if it has any documents
            if (docCountInBatch > 0) {
                await batch.commit();
                totalDocsUploaded += docCountInBatch;
            }
            console.log(`   ✅ Successfully uploaded ${totalDocsUploaded} documents to the '${collectionId}' collection.`);
        }

        console.log(`
🎉 Success! All data has been uploaded to Firestore.`);

    } catch (error) {
        console.error('❌ An error occurred during the upload process:', error);
        if (error.code === 'ENOENT') {
            if (error.path?.includes('serviceAccountKey.json')) {
                console.error('🔑 Please ensure that the `/source/firebase/serviceAccountKey.json` file exists.');
            } else if (error.path?.includes('imported')) {
                console.error(`📂 Input directory not found: ${INPUT_DIR_PATH}`);
            }
        }
    }
}
uploadDataToFirestore();