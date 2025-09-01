// versioner/sync-to-firestore.js

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// It's recommended to load service account key securely, e.g., from an environment variable
// For local development, you might place serviceAccountKey.json in a secure location
// and load it, but for production, environment variables are preferred.
try {
    const serviceAccount = require('../source/firebase/serviceAccountKey.json'); // Load directly from file
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error("Error initializing Firebase Admin SDK. Ensure FIREBASE_SERVICE_ACCOUNT_KEY environment variable is set and valid JSON.", error);
    process.exit(1);
}

const db = admin.firestore();

async function runSyncToFirestore() {
    console.log("Running sync-to-firestore.js...");

    const versionsJsonPath = path.resolve(__dirname, '../localstore/jsons/versions.json');

    let versions = [];
    try {
        const versionsJsonContent = fs.readFileSync(versionsJsonPath, 'utf8');
        versions = JSON.parse(versionsJsonContent);
    } catch (error) {
        console.error('Error reading or parsing versions.json:', error);
        process.exit(1);
    }

    if (versions.length === 0) {
        console.log("No versions found in versions.json to sync.");
        return;
    }

    const latestVersion = versions[versions.length - 1];

    // Implement Firestore upload logic here
    // Upload latestVersion to Firestore using latestVersion.versionId as document ID

    console.log(`Attempting to sync version ${latestVersion.versionId} to Firestore...`);
    try {
        await db.collection('versions').doc(latestVersion.versionId).set(latestVersion, { merge: true });
        console.log(`Successfully synced version ${latestVersion.versionId} to Firestore.`);
    } catch (error) {
        console.error(`Error syncing version ${latestVersion.versionId} to Firestore:`, error);
        process.exit(1);
    }

    console.log("sync-to-firestore.js finished successfully.");
}

module.exports = {
    run: runSyncToFirestore
};