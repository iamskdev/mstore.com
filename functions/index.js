const functions = require("firebase-functions");
const admin = require("firebase-admin");

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