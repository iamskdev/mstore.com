/**
 * @file backup-data.js
 * This script exports each collection from Firebase Firestore into a directory structure
 * mirroring the Firestore collections and documents.
 * To run: node tools/scripts/backup-data.js
 */

import admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
// Path to your service account key file (relative to this script)
const SERVICE_ACCOUNT_PATH = '../../source/firebase/serviceAccountKey.json';
// Output directory where collection directories and JSON files will be saved
const OUTPUT_DIR_PATH = '../../localstore';
// Get collection ID from command-line arguments, or leave blank to export all
const COLLECTION_ID_TO_EXPORT = process.argv[2] || ''; // e.g., 'items'
const DOCUMENT_ID_TO_EXPORT = process.argv[3] || ''; // e.g., 'item123'


/**
 * Main function to export Firestore data to a directory structure with JSON files.
 */
async function exportCollectionsToDirectoryStructure() {
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

        // --- Fetch data and write to files ---
        if (COLLECTION_ID_TO_EXPORT && DOCUMENT_ID_TO_EXPORT) {
            console.log(`🔥 Fetching and exporting document: ${DOCUMENT_ID_TO_EXPORT} from collection: ${COLLECTION_ID_TO_EXPORT}...`);
            const docRef = db.collection(COLLECTION_ID_TO_EXPORT).doc(DOCUMENT_ID_TO_EXPORT);
            const doc = await docRef.get();
            if (!doc.exists) {
                console.log('No such document!');
                return;
            }
            const docData = doc.data();
            const collectionDir = path.join(outputDirPath, COLLECTION_ID_TO_EXPORT);
            await fs.mkdir(collectionDir, { recursive: true });
            const docPath = path.join(collectionDir, `${DOCUMENT_ID_TO_EXPORT}.json`);
            await fs.writeFile(docPath, JSON.stringify(docData, null, 2));
            console.log(`     ✔️  Saved document ${DOCUMENT_ID_TO_EXPORT} to ${COLLECTION_ID_TO_EXPORT}/${DOCUMENT_ID_TO_EXPORT}.json`);

        } else if (COLLECTION_ID_TO_EXPORT) {
            console.log(`🔥 Fetching and exporting collection: ${COLLECTION_ID_TO_EXPORT}...`);
            const collectionRef = db.collection(COLLECTION_ID_TO_EXPORT);
            const collections = [collectionRef];
            for (const collectionRef of collections) {
                const collectionId = collectionRef.id;
                console.log(`   - Processing collection: ${collectionId}`);
    
                const collectionDir = path.join(outputDirPath, collectionId);
                await fs.mkdir(collectionDir, { recursive: true });
    
                const snapshot = await collectionRef.get();
    
                for (const doc of snapshot.docs) {
                    const docData = doc.data();
                    // Add the collection name to the document data
                    const docFilename = doc.id;
                    docData["collectionName"] = collectionId;                
                    docData["documentId"] = docFilename;
                    const docPath = path.join(collectionDir, `${docFilename}.json`);
    
                    // Write document data to JSON file
                    await fs.writeFile(docPath, JSON.stringify(docData, null, 2));
                    console.log(`     ✔️  Saved document ${docFilename} to ${collectionId}/${docFilename}.json`);
                }
    
                console.log(`   ✅ Collection ${collectionId} export complete.`);
            }
        } else {
            console.log('🔥 Fetching and exporting all collections...');
            const collections = await db.listCollections();
            for (const collectionRef of collections) {
                const collectionId = collectionRef.id;
                console.log(`   - Processing collection: ${collectionId}`);
    
                const collectionDir = path.join(outputDirPath, collectionId);
                await fs.mkdir(collectionDir, { recursive: true });
    
                const snapshot = await collectionRef.get();
    
                for (const doc of snapshot.docs) {
                    const docData = doc.data();
                    // Add the collection name to the document data
                    const docFilename = doc.id;
                    docData["collectionName"] = collectionId;                
                    docData["documentId"] = docFilename;
                    const docPath = path.join(collectionDir, `${docFilename}.json`);
    
                    // Write document data to JSON file
                    await fs.writeFile(docPath, JSON.stringify(docData, null, 2));
                    console.log(`     ✔️  Saved document ${docFilename} to ${collectionId}/${docFilename}.json`);
                }
    
                console.log(`   ✅ Collection ${collectionId} export complete.`);
            }
        }

        console.log(`\n🎉 Success! All data has been exported to: ${outputDirPath}`);

    } catch (error) {
        console.error('❌ An error occurred during the export process:', error);
        if (error.code === 'ENOENT') {
            if (error.path?.includes('serviceAccountKey.json')) {
                console.error('🔑 Please ensure that `/source/firebase/serviceAccountKey.json` file exists.');
            }
        }
    }
}


exportCollectionsToDirectoryStructure();