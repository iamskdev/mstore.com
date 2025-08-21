// ====================================================================
// 🚀 APNA STORE - GLOBAL APP CONFIGURATION
// ====================================================================
// यह एप्लिकेशन-व्यापी सेटिंग्स के लिए सत्य का एकमात्र स्रोत है।
// ऐप के व्यवहार को बदलने के लिए इन मानों को बदलें।
export const APP_CONFIG = {
  /**
   * - "dev":   Development mode. Shows dev switcher for all roles.
   * - "promo": Promotional mode. Activates promotional UI for a specific merchant.
   * - null:    Live/Production mode. Normal user flow.
   */
  appMode: 'dev',
  /**
   * - 'firebase':   Fetches data from the live Firebase database.
   * - 'emulator':   Fetches data from the local Firebase Emulator Suite.
   * - 'localstore': Fetches mock JSON data from local `/localstore/jsons/` folders.
   */
  dataSource: 'firebase',
  /**
   * - true:  Requires phone OTP and email verification for registration.
   * - false: Users can register directly without OTP or email verification.
   */
  verificationEnabled: true,
  /**
   * - 'logo': Shows the dynamic logo/avatar in the header.
   * - 'menu': Shows a static 3-line menu icon (hamburger menu).
   */
  headerStyle: 'menu',
};