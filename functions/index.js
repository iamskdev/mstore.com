const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cloudinary = require("cloudinary").v2;
const cors = require('cors')({origin: true});

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
 * An onRequest function to generate a secure signature for direct uploads to Cloudinary.
 * Handles CORS manually to ensure compatibility with local development environments.
 */
exports.generateCloudinarySignature = functions.https.onRequest((request, response) => {
  // Wrap the function in the CORS middleware.
  cors(request, response, () => {
    try {
      // Get Cloudinary credentials from Firebase environment configuration.
      const cloudinaryConfig = functions.config().cloudinary;
      if (!cloudinaryConfig || !cloudinaryConfig.api_secret || !cloudinaryConfig.api_key || !cloudinaryConfig.cloud_name) {
        console.error("Cloudinary configuration is missing in Firebase Functions environment.");
        // Use the response object to send an error.
        return response.status(500).send({ 
          error: { message: "Server configuration error. Unable to process upload signature." } 
        });
      }

      // For onRequest, the client SDK sends data in request.body.data
      const paramsToSign = request.body.data.params || {};
      const timestamp = Math.round(new Date().getTime() / 1000);

      // Generate the signature.
      const signature = cloudinary.utils.api_sign_request(
        { timestamp, ...paramsToSign },
        cloudinaryConfig.api_secret
      );

      // Send the successful response, wrapped in a 'data' object to match client expectation.
      return response.status(200).send({
        data: {
          signature,
          timestamp,
          api_key: cloudinaryConfig.api_key,
          cloud_name: cloudinaryConfig.cloud_name,
        }
      });

    } catch (error) {
      console.error("Error generating Cloudinary signature:", error);
      return response.status(500).send({ 
        error: { message: error.message || "An error occurred while generating the signature." } 
      });
    }
  });
});

/**
 * A callable function to securely delete a resource from Cloudinary.
 */
exports.deleteCloudinaryResource = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated to prevent unauthorized deletions.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { publicId } = data;
  if (!publicId || typeof publicId !== 'string') {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'publicId' argument."
    );
  }

  try {
    const cloudinaryConfig = functions.config().cloudinary;
    if (!cloudinaryConfig || !cloudinaryConfig.api_secret) {
      console.error("Cloudinary API secret is missing.");
      throw new functions.https.HttpsError("internal", "Server configuration error.");
    }

    // Configure Cloudinary with your credentials
    cloudinary.config({
      cloud_name: cloudinaryConfig.cloud_name,
      api_key: cloudinaryConfig.api_key,
      api_secret: cloudinaryConfig.api_secret,
    });

    // Use the uploader's 'destroy' method to delete the resource
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: true, result };
  } catch (error) {
    console.error(`Error deleting resource ${publicId} from Cloudinary:`, error);
    throw new functions.https.HttpsError("internal", "Failed to delete resource.");
  }
});

/**
 * Cloud Function to update version deployment status in Firestore after a Firebase Hosting deployment.
 * This function is triggered by a Firebase Hosting deployment event.
 */
// exports.onHostingDeploy = functions.hosting.site().onDeploy('default', async (event) => {
//   const db = admin.firestore();
//   const versionId = event.versionId; // This might be the hosting version ID, not our VRN ID.
//                                     // We need to find the latest version entry in our 'versions' collection
//                                     // and update its deployment status.
// 
//   console.log(`Firebase Hosting deployment event received for version: ${versionId}`);
// 
//   try {
//     // Find the latest version entry in our 'versions' collection
//     // Assuming the latest entry in our 'versions' collection is the one being deployed
//     const versionsRef = db.collection('versions');
//     const snapshot = await versionsRef.orderBy('audit.createdAt', 'desc').limit(1).get();
// 
//     if (snapshot.empty) {
//       console.log('No version entries found in Firestore to update.');
//       return null;
//     }
// 
//     const latestVersionDoc = snapshot.docs[0];
//     const latestVersionData = latestVersionDoc.data();
// 
//     // Update the deployment status
//     const updatedAudit = {
//       ...latestVersionData.audit,
//       deployedBy: 'Firebase Hosting', // Or event.user if available and relevant
//       deploymentDate: new Date().toISOString(),
//       status: 'deployed' // Update the status field as well
//     };
// 
//     await latestVersionDoc.ref.update({
//       'audit': updatedAudit,
//       'status': 'deployed' // Update the top-level status field
//     });
// 
//     console.log(`Successfully updated deployment status for version ${latestVersionData.versionId}`);
//     return null;
// 
//   } catch (error) {
//     console.error('Error updating deployment status:', error);
//     return null;
//   }
// });