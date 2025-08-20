/**
 * @file upload-to-emulator.js
 * This script uploads data from JSON files in the /localstore/jsons/ folder to the LOCAL FIRESTORE EMULATOR.
 * It's designed for setting up a consistent development environment.
 * It will overwrite existing documents with the same ID in the emulator.
 * To run: node tools/scripts/upload-to-emulator.js
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
const FIRESTORE_EMULATOR_HOST = "localhost:8080"; // Correct port for Firestore Emulator service

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
 * Main function to upload data to the Firestore Emulator.
 */
async function uploadDataToEmulator() {
    try {
        // --- IMPORTANT: Set Emulator Host Environment Variable ---
        // This line tells the Firebase Admin SDK to connect to the local emulator
        // instead of the live Firestore database.
        process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
        console.log(`🔌 Targeting Firestore Emulator at: ${FIRESTORE_EMULATOR_HOST}`);

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

        const db = admin.firestore();
        console.log(`✅ Firebase Admin SDK initialized for EMULATOR. Project: ${serviceAccount.project_id}`);

        // --- Upload Data ---
        const inputDirPath = path.resolve(__dirname, INPUT_DIR_PATH);
        console.log(`\n🔥 Starting data synchronization with emulator from: ${inputDirPath}`);
        
        const files = await fs.readdir(inputDirPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        if (jsonFiles.length === 0) {
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
                "campaigns": "meta.campaignId"
        };

        for (const file of jsonFiles) {
            const collectionId = path.basename(file, '.json');
            const filePath = path.join(inputDirPath, file);

            // --- Step 1: Clear existing data in the emulator's collection ---
            console.log(`\n   - 🗑️  Clearing collection: '${collectionId}' in emulator...`);
            await deleteCollection(db, collectionId, BATCH_LIMIT);
            console.log(`   - ✅ Collection '${collectionId}' cleared.`);

            console.log(`\n   - Processing collection: ${collectionId}`);

            const fileContent = await fs.readFile(filePath, 'utf8');
            const documents = JSON.parse(fileContent);

            if (!Array.isArray(documents) || documents.length === 0) {
                console.warn(`     ⚠️ ${file} does not contain a non-empty array. Skipping.`);
                continue;
            }

            const idFieldPath = idFieldMap[collectionId];
            const collectionRef = db.collection(collectionId);
            let batch = db.batch();
            let docCountInBatch = 0;
            let totalDocsUploaded = 0;

            for (const doc of documents) {
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
                    console.log(`     - Committed a batch of ${docCountInBatch} documents to emulator.`);
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
