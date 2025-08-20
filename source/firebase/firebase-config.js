import { showToast } from '../utils/toast.js';
import { APP_CONFIG } from '../utils/app-config.js'; // ✅ Import config directly
import { firebaseConfig } from './firebase-credentials.js'; // ✅ Import config from a separate, untracked file.

// Firebase SDKs ko import karein.
// Note: Ye CDN se import ho rahe hain, jo vanilla JS projects ke liye theek hai jisme bundler nahi hota.
// The compat libraries are imported for their side-effects, which create a global `firebase` object.
import "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js";
import "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js";
import "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";
import "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions-compat.js";

// Initialize variables to hold Firebase services.
// These are exported, so they must be at the top level.
let app, firestore, auth, functions;
let firebase;

// Check if we are in a browser environment before trying to access `window`.
// This prevents the service worker from crashing when it imports this file.
if (typeof window !== 'undefined') {
  // After the compat scripts are imported, they create a global `firebase` object on the `window`.
  // We assign it to a local const for use within this module. This is the standard
  // way to use the compat libraries when loaded from the CDN.
  firebase = window.firebase;

  try {
    // Initialize Firebase
    app = firebase.initializeApp(firebaseConfig);
    firestore = firebase.firestore();
    auth = firebase.auth();
    functions = firebase.functions();

    // --- Set Auth Persistence ---
    // This ensures the user's session is saved in the browser's local storage
    // and persists across browser sessions (tabs/windows). This is the default,
    // but setting it explicitly makes the behavior clear and robust.
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch((error) => {
        console.error("Auth persistence error:", error.code, error.message);
      });

    console.log("🔥 Firebase services initialized successfully.");

    // --- Emulator Suite Connection ---
    // If the app config specifies 'emulator', connect to the local emulators.
    // This allows for rapid, offline, and cost-free development and testing.
    // IMPORTANT: Run `firebase emulators:start` in your terminal before running the app.  
    if (APP_CONFIG.dataSource === 'emulator') {
      console.warn("🔌 App is configured to use EMULATOR data source. Connecting to local Firebase Emulators...");
      // Note: The host for firestore is just 'localhost', not a full URL.
      firestore.useEmulator('localhost', 8080); 
      auth.useEmulator('http://localhost:9099');
      functions.useEmulator('localhost', 5001);
      console.log("✅ Connected to local Firestore, Auth, and Functions emulators.");
      showToast('info', '⚡️ Emulator Mode: Connected to local Firebase.', 6000);    

      // --- Hide Emulator UI Bar (Aggressive Polling Method) ---
      // This method repeatedly checks for the emulator bar and hides it.
      // It's a robust solution for the race condition where the bar is injected unpredictably.
      if (typeof document !== 'undefined') {
        let attempts = 0;
        const maxAttempts = 100; // Try for 5 seconds (100 * 50ms)
        const hideInterval = setInterval(() => {
            const emulatorBar = document.getElementById('firebase-emulator-container');
            if (emulatorBar) {
                emulatorBar.style.setProperty('display', 'none', 'important');
                console.log(`✅ Firebase Emulator UI bar hidden after ${attempts + 1} attempts.`);
                clearInterval(hideInterval);
            } else if (attempts++ > maxAttempts) {
                console.warn('Could not find emulator bar to hide after 5 seconds.');
                clearInterval(hideInterval);
            }
        }, 50); // Check every 50ms
      }
    }
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

// ✅ Export the initialized services for other modules to import.
// This avoids polluting the global 'window' object.
export { app, firestore, auth, functions, firebase };