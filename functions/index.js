const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cloudinary = require("cloudinary").v2;

admin.initializeApp();

/**
 * A callable function to securely check if a phone number already exists in the users collection.
 */
exports.checkIfPhoneExists = functions.https.onCall(async (data, context) => {
  const phoneNumber = data.phone;

  // Validate the input
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'phone' argument."
    );
  }

  const db = admin.firestore();
  const usersRef = db.collection("users");

  try {
    const snapshot = await usersRef.where("info.phone", "==", phoneNumber).limit(1).get();
    return { exists: !snapshot.empty };
  } catch (error) {
    console.error("Error checking phone number:", error);
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while checking the phone number."
    );
  }
});

/**
 * A callable function to generate a secure signature for direct uploads to Cloudinary.
 * This prevents exposing the API secret on the client-side.
 */
exports.generateCloudinarySignature = functions.https.onCall((data, context) => {
  // --- Security Check (Optional but Recommended) ---
  // Uncomment this block to ensure only authenticated users can get a signature.
  // if (!context.auth) {
  //   throw new functions.https.HttpsError(
  //     "unauthenticated",
  //     "The function must be called while authenticated."
  //   );
  // }

  // Get Cloudinary credentials from Firebase environment configuration.
  const cloudinaryConfig = functions.config().cloudinary;
  if (!cloudinaryConfig || !cloudinaryConfig.api_secret || !cloudinaryConfig.api_key || !cloudinaryConfig.cloud_name) {
    console.error("Cloudinary configuration is missing in Firebase Functions environment.");
    throw new functions.https.HttpsError(
      "internal",
      "Server configuration error. Unable to process upload signature."
    );
  }

  // The frontend will send any additional parameters for signing (e.g., folder).
  const paramsToSign = data.params || {};
  const timestamp = Math.round(new Date().getTime() / 1000);

  // Generate the signature using the Cloudinary Node.js SDK.
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      ...paramsToSign,
    },
    cloudinaryConfig.api_secret
  );

  // Return the necessary data to the client for the direct upload.
  return {
    signature: signature,
    timestamp: timestamp,
    api_key: cloudinaryConfig.api_key,
    cloud_name: cloudinaryConfig.cloud_name,
  };
});

/**
 * Cloud Function to update version deployment status in Firestore after a Firebase Hosting deployment.
 * This function is triggered by a Firebase Hosting deployment event.
 */
exports.onHostingDeploy = functions.hosting.site().onDeploy('default', async (event) => {
  const db = admin.firestore();
  const versionId = event.versionId; // This might be the hosting version ID, not our VRN ID.
                                    // We need to find the latest version entry in our 'versions' collection
                                    // and update its deployment status.

  console.log(`Firebase Hosting deployment event received for version: ${versionId}`);

  try {
    // Find the latest version entry in our 'versions' collection
    // Assuming the latest entry in our 'versions' collection is the one being deployed
    const versionsRef = db.collection('versions');
    const snapshot = await versionsRef.orderBy('audit.createdAt', 'desc').limit(1).get();

    if (snapshot.empty) {
      console.log('No version entries found in Firestore to update.');
      return null;
    }

    const latestVersionDoc = snapshot.docs[0];
    const latestVersionData = latestVersionDoc.data();

    // Update the deployment status
    const updatedAudit = {
      ...latestVersionData.audit,
      deployedBy: 'Firebase Hosting', // Or event.user if available and relevant
      deploymentDate: new Date().toISOString(),
      status: 'deployed' // Update the status field as well
    };

    await latestVersionDoc.ref.update({
      'audit': updatedAudit,
      'status': 'deployed' // Update the top-level status field
    });

    console.log(`Successfully updated deployment status for version ${latestVersionData.versionId}`);
    return null;

  } catch (error) {
    console.error('Error updating deployment status:', error);
    return null;
  }
});