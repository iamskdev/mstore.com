import { fetchAllUsers, generateSequentialId } from '../../utils/data-manager.js';
import { createLog } from '../firestore/logs-collection.js';
import { showToast } from '../../utils/toast.js';
import { routeManager } from '../../main.js';
import { getAppConfig } from '../../settings/main-config.js';
import { auth, firestore, firebase } from '../firebase-config.js'; // ✅ Import services directly

export const AuthService = (() => {
    let errorTimeouts = {};
    let phoneConfirmationResult = null;
    let isPhoneVerified = false;

    // --- UI Helper Functions (Centralized) ---
    function showError(input, message, autoHide = true) {
        const inputGroup = input.closest('.input-group');
        if (!inputGroup) return;
        const errorElement = inputGroup.querySelector('.error-message');
        if (!errorElement) return;

        errorElement.textContent = message;
        inputGroup.classList.add('invalid');

        if (autoHide) {
            if (errorTimeouts[input.id]) {
                clearTimeout(errorTimeouts[input.id]);
            }
            errorTimeouts[input.id] = setTimeout(() => {
                inputGroup.classList.remove('invalid');
                errorElement.textContent = '';
                delete errorTimeouts[input.id];
            }, 5000);
        }
    }

    function clearError(input) {
        const inputGroup = input.closest('.input-group');
        if (!inputGroup) return;
        const errorElement = inputGroup.querySelector('.error-message');
        if (errorElement) {
            inputGroup.classList.remove('invalid');
            errorElement.textContent = '';
        }
        if (errorTimeouts[input.id]) {
            clearTimeout(errorTimeouts[input.id]);
            delete errorTimeouts[input.id];
        }
    }

    /**
     * A private helper to manage the loading state of a button.
     * @param {HTMLButtonElement} button - The button element to update.
     * @param {boolean} isLoading - True to show loading state, false to restore.
     * @param {string} [loadingText='Processing...'] - The text to show when loading.
     */
    function _setButtonLoading(button, isLoading, loadingText = 'Processing...') {
        if (!button) return;
        if (isLoading) {
            // Store the original content only if it hasn't been stored already
            if (!button.dataset.originalHtml) {
                button.dataset.originalHtml = button.innerHTML;
            }
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i>&nbsp; ${loadingText}`;
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalHtml || 'Submit'; // Fallback text
        }
    }

    /**
     * Determines the most privileged role from a user's metadata.
     * The hierarchy is admin > merchant > user. It also respects the `primaryRole` field.
     * @param {object} meta - The user's meta object from Firestore.
     * @returns {string} The determined role.
     * @private
     */
    function _determineBestRole(meta) {
        if (!meta) return 'guest'; // Should not happen for a logged-in user

        // 1. The `primaryRole` field is the most authoritative source.
        if (meta.primaryRole && routeManager.routeConfig[meta.primaryRole]) {
            return meta.primaryRole;
        }

        // 2. If no primaryRole, check the roles array in order of privilege.
        const roles = meta.roles || [];
        if (roles.includes('admin')) return 'admin';
        if (roles.includes('merchant')) return 'merchant';
        if (roles.includes('user')) return 'user';

        // 3. Fallback to a default role if no valid role is found.
        return 'user';
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validatePhone(phone) {
        // Simple validation for a 10-digit Indian mobile number.
        return /^\d{10}$/.test(phone);
    }

    function validateForm(form) {
        let isValid = true;
        const inputs = form.querySelectorAll('input[required]');
        inputs.forEach(input => {
            clearError(input);
            if (!input.value.trim()) {
                showError(input, 'This field is required');
                isValid = false;
            } else if (input.id === 'login-credential' && input.value.includes('@') && !validateEmail(input.value)) {
                // Specific validation for the login credential field if it looks like an email.
                showError(input, 'Please enter a valid email address');
                isValid = false;
            }
            else if (input.type === 'email' && !validateEmail(input.value)) {
                showError(input, 'Please enter a valid email');
                isValid = false;
            }
        });

        // Specific validation for the phone number (if it has a value)
        const phoneInput = form.querySelector('#register-phone');
        if (phoneInput && phoneInput.value.trim() && !validatePhone(phoneInput.value.trim())) {
            showError(phoneInput, 'Please enter a valid 10-digit phone number');
            isValid = false;
        }

        if (form.id === 'registerForm') {
            const passwordInput = form.querySelector('#register-password');
            const confirmPasswordInput = form.querySelector('#register-confirm-password');
            if (passwordInput && confirmPasswordInput && passwordInput.value !== confirmPasswordInput.value) {
                showError(confirmPasswordInput, 'Passwords do not match');
                isValid = false;
            }
        }
        return isValid;
    }

    /**
     * A centralized helper to create the user and account documents in a single atomic batch write.
     * This prevents partial data creation if an error occurs during the process.
     * @param {object} user - The Firebase Auth user object.
     * @param {object} [options={}] - Additional data for creation.
     * @param {string} [options.method='unknown'] - The registration method (e.g., 'email/password', 'google').
     * @param {string} [options.fullName=''] - The user's full name.
     * @param {string} [options.phone=''] - The user's phone number.
     * @param {string} [options.note='...'] - A note for the account document.
     * @returns {Promise<string>} The custom sequential ID of the new user.
     */
    async function _createFirestoreUserBundle(user, options = {}) {
        const { method = 'unknown', fullName = '', phone = '', note = 'Account created on user registration.' } = options;
        if (!firestore) throw new Error("Firestore not available for user creation.");

        // This function is no longer a single atomic batch due to security rule limitations.
        // It performs sequential writes, and the calling function (handleSignup) is responsible for rollback.
        let userId; // Declare userId here to make it available in the catch block.

        try {
            userId = await generateSequentialId('users', 'USR');
            const accountId = await generateSequentialId('accounts', 'ACC');

            // --- Step 1: Create and write the User Document ---
            const userRef = firestore.collection('users').doc(userId);
            const primaryRole = 'user';
            const providerName = method.includes('google') ? 'google.com' : (method.includes('apple') ? 'apple.com' : 'firebase');
            const userDocData = {
                meta: { userId, version: 1.0, primaryRole, roles: [primaryRole], registeredOn: new Date().toISOString(), links: { accountId }, flags: { isActive: true, isSuspended: false, isVerified: user.emailVerified, isCustomer: true, isAdmin: false, isMerchant: false, isAgent: false, isStaff: false }, lastUpdated: new Date().toISOString() },
                info: { fullName: fullName || user.displayName || '', nickName: '', gender: '', dob: '', avatar: user.photoURL || '', tagline: '', bio: '', email: user.email, phone: phone || user.phoneNumber || '' },
                auth: { login: { attempts: 0, method, password: { hash: '', updatedAt: new Date().toISOString() } }, provider: { name: providerName, uid: user.uid, fcmToken: '', lastUpdated: new Date().toISOString() }, flags: { twoFactorEnabled: false, emailVerified: user.emailVerified, phoneVerified: !!user.phoneNumber, accountLocked: false, tempPasswordUsed: false }, recovery: { email: '', phone: '', securityQuestions: [] } },
                address: [],
                subscription: { plan: "Free", type: null, startDate: null, endDate: null, status: "inactive", autoRenew: false, amount: 0 }
            };
            await userRef.set(userDocData); // First write operation

            // --- Step 2: Create and write the Account Document ---
            // This now works because the user document exists for the security rule 'get()' call.
            const accountRef = firestore.collection('accounts').doc(accountId);
            const userAgent = navigator.userAgent;
            const deviceType = /android/i.test(userAgent) ? 'android' : (/iphone|ipad|ipod/i.test(userAgent) ? 'ios' : 'web');
            const accountDocData = {
                meta: { accountId, createdOn: new Date().toISOString(), isGuest: false, links: { userId }, lastUpdated: new Date().toISOString(), note: note || "Account created on login.", ownerUID: user.uid },
                deviceInfo: [{ status: "active", isLoggedIn: true, deviceId: `DEV-${Date.now()}`, device: deviceType, model: null, platform: navigator.platform || '', browser: navigator.appName || '', name: null, ipAddress: null, location: null, loginTime: new Date().toISOString(), lastActive: new Date().toISOString(), sessionToken: `SST-${Date.now()}`, userAgent }],
                cart: { items: [] },
                saved: { items: [] },
                Alerts: { alertId: [], isCleared: false, updatedAt: null },
                settings: { language: "en", theme: "light", push: true, email: false, sms: false, clearSettings: false },
                privacy: { showOnline: true, personalizedAds: false },
                autoClear: { recentlyViewed: false, saved: false, notifications: false },
                searchHistory: [],
                personalized: { enabled: false, isCleared: false, users: [], merchants: [], brands: [], items: [], activeHours: [] },
                recentlyViewed: { items: [] }
            };
            await accountRef.set(accountDocData); // Second write operation

            // --- Log the event AFTER the batch is successful ---
            await createLog({
                ownerUID: user.uid, // Pass the auth UID for the security rule check
                userId: userId,
                action: 'user_registered',
                description: `New user registered via ${method}.`,
                details: { email: user.email, fullName: fullName || user.displayName || '' },
                tags: ['user', 'register', method.split('/')[0]] // e.g., ['user', 'register', 'email'] or ['user', 'register', 'google']
            });

            return userId;

        } catch (error) {
            console.error("Error in sequential user/account creation bundle:", error);
            // Attach the partially created userId to the error object so the rollback handler can find and delete it.
            if (userId) {
                error.createdUserId = userId;
            }
            throw error;
        }
    }

    // --- Core Authentication Logic ---
    async function handleLogin(form) {
        if (!validateForm(form)) return false;

        const credentialInput = form.querySelector('#login-credential');
        const passwordInput = form.querySelector('#login-password');
        const credentialValue = credentialInput.value;
        const passwordValue = passwordInput.value;
        const dataSource = getAppConfig().source.data || 'firebase';

        if (dataSource === 'localstore') {
            try {
                const users = await fetchAllUsers();
                const user = users.find(u => (u.info.email === credentialValue || u.info.phone === credentialValue) && u.auth.passwordHash === passwordValue);

                if (user) {
                    const role = user.meta?.roles?.[0] || 'user';
                    const userId = user.meta.userId;
                    routeManager.handleRoleChange(role, userId);
                    showToast('login');
                    return true;
                } else {
                    showError(credentialInput, 'Invalid credentials.');
                    return false;
                }
            } catch (error) {
                console.error("Local Login Error:", error);
                showError(credentialInput, 'An unexpected error occurred.');
                return false;
            }
        }

        try {
            if (!auth || !firestore) throw new Error('Firebase services not initialized');

            const isEmail = credentialValue.includes('@');
            let userEmail = credentialValue;

            if (!isEmail) {
                // BUG FIX: Password-based login with a phone number is insecure and was broken
                // because it required an unauthenticated database query, which security rules block.
                // This flow is now disabled to enforce security and guide users to log in with email.
                // The proper way to implement phone login is with OTP.
                showError(credentialInput, 'Login with phone number is not supported with a password. Please use your email address.');
                console.error("Attempted password-based phone login, which is disabled. The user must use their email.");
                return false;
            }

            const userCredential = await auth.signInWithEmailAndPassword(userEmail, passwordValue);
            const user = userCredential.user;

            if (user) {
                const usersRef = firestore.collection('users');
                let userDocQuery = await usersRef.where('auth.provider.uid', '==', user.uid).limit(1).get();

                // SELF-HEALING: If user is authenticated but has no Firestore document, create it.
                if (userDocQuery.empty) {
                    console.warn(`Data inconsistency for UID ${user.uid}. User exists in Auth but not Firestore. Attempting to self-heal.`);
                    
                    const newUserId = await _createFirestoreUserBundle(user, {
                        method: 'email/password',
                        note: 'Account self-healed on login.'
                    });

                    // Create a separate, specific log for the self-healing event.
                    await createLog({ userId: newUserId, action: 'user_self_heal_success', status: 'info', priority: 'high', description: `User document was missing and re-created upon login for UID ${user.uid}.` });

                    // Re-fetch the document to continue the login flow
                    userDocQuery = await usersRef.where('auth.provider.uid', '==', user.uid).limit(1).get();
                    if (userDocQuery.empty) throw new Error('Self-healing failed. Could not create user document.');
                }
                
                const userAccount = userDocQuery.docs[0].data();
                // FIX: Use a robust function to determine the highest-privilege role.
                const role = _determineBestRole(userAccount.meta);
                const userId = userAccount.meta?.userId;

                // NEW: Log the successful login event
                await createLog({
                    userId: userId,
                    action: 'user_login_success',
                    description: `User logged in successfully via ${isEmail ? 'email' : 'phone'}.`,
                    details: { method: isEmail ? 'email' : 'phone', credential: credentialValue }
                });
                // Centralized state update via routeManager
                routeManager.handleRoleChange(role, userId);
                showToast('login');
                return true;
            }
            return false;
        } catch (error) {
            console.error("Login Error:", error);
 
            const isDevMode = getAppConfig().app.environment === 'development';
            let prodMessage;
            let devMessage;
            let errorInput = credentialInput; // Default to the main credential input

            // Provide specific feedback for common login errors.
            // NOTE: Revealing "user not found" can be a minor security risk (email enumeration).
            // For this app's purpose, providing clear feedback is prioritized.
            switch (error.code) {
                case 'auth/invalid-email':
                    prodMessage = 'No account found with this email address.';
                    devMessage = `No account found with this email. (Code: ${error.code})`;
                    errorInput = credentialInput;
                    break;
                case 'auth/wrong-password':
                    prodMessage = 'Incorrect password. Please try again.';
                    devMessage = `Incorrect password. (Code: ${error.code})`;
                    errorInput = passwordInput; // Target the password field for this error
                    break;
                case 'auth/invalid-credential':
                    // This is a generic error from Firebase for security.
                    // It can mean wrong email or wrong password. We provide a helpful message.
                    prodMessage = 'The email or password you entered is incorrect.';
                    devMessage = `Invalid credential. This can be a wrong email or password. (Code: ${error.code})`;
                    errorInput = credentialInput;
                    break;
                case 'auth/user-disabled':
                    prodMessage = 'This account has been disabled.';
                    devMessage = `This account has been disabled. (Code: ${error.code})`;
                    errorInput = credentialInput;
                    break;
                default:
                    prodMessage = 'An unexpected error occurred. Please try again.';
                    // For generic errors, which are often network-related, show a toast.
                    showToast('error', 'Login failed. Please check your connection and try again.', 5000);
                    devMessage = `An unexpected error occurred. (Code: ${error.code})`;
                    errorInput = credentialInput;
                    break;
            }

            showError(errorInput, isDevMode ? devMessage : prodMessage);
            return false;
        }
    }

    async function handleSignup(form) {
        const emailInput = form.querySelector('#register-email');
        const passwordInput = form.querySelector('#register-password');
        const fullNameInput = form.querySelector('#register-full-name');
        const countryInput = form.querySelector('#register-country');
        const phoneInput = form.querySelector('#register-phone');
        const email = emailInput.value;
        const password = passwordInput.value;
        const fullName = fullNameInput.value;
        const countryName = countryInput.value;
        const phoneNumber = phoneInput.value.trim();

        // Helper map to convert country name to code. This is easily expandable.
        const countryCodeMap = {
            'India': '+91'
        };
        const phoneCode = countryCodeMap[countryName] || '';
        const phone = phoneNumber ? `${phoneCode}${phoneNumber}` : ''; // Combine code and number (E.164 standard)
        const dataSource = getAppConfig().source.data || 'firebase';
        
        if (dataSource === 'localstore') {
            // This is a simulation. For a real app, you'd need a backend to write to the JSON file.
            console.log('Simulating local signup...');
            showToast('account');
            // Simulate redirect or state change
            localStorage.setItem('currentUserType', 'user');
            localStorage.setItem('currentUserId', `USR${Date.now()}`);
            routeManager.handleRoleChange('user');
            return true;
        }

        // If verification is enabled, check if the phone has been verified.
        if (getAppConfig().flags.phoneVerification && phoneNumber && !isPhoneVerified) {
            showError(phoneInput, 'Please verify your phone number first by clicking the icon.');
            return false;
        }

        let user = null; // Keep user in the outer scope for the final catch block
        try {
            if (!auth || !firestore) throw new Error('Firebase services not initialized');

            // --- Step 1: Create Auth User ---
            // The most secure way to check for an existing email is to let Firebase Auth handle it.
            // It will throw 'auth/email-already-in-use' if the email is taken, which is caught below.
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            user = userCredential.user; // Assign to outer scope variable
            if (!user) {
                throw new Error('Failed to create user account.');
            }

            // --- Step 2: Phone Number Uniqueness Check (when verification is OFF) ---
            // This check runs AFTER Auth user creation but BEFORE Firestore document creation.
            // It leverages the temporary authenticated state to query the database.
            if (phone && !getAppConfig().flags.phoneVerification) {
                console.warn("Performing Firestore lookup for phone number uniqueness. This is for testing only.");
                const usersRef = firestore.collection('users');
                const phoneQuery = await usersRef.where('info.phone', '==', phone).limit(1).get();
                
                if (!phoneQuery.empty) {
                    // Throw a specific error to be caught by the main catch block, which will handle rollback.
                    const err = new Error('This phone number is already registered.');
                    err.code = 'auth/phone-number-already-exists'; // Custom error code
                    throw err;
                }
            }

            // --- Step 3: Create Firestore Documents ---
            const userId = await _createFirestoreUserBundle(user, {
                method: 'email/password',
                fullName: fullName,
                phone: phone,
                note: 'Account created on user registration.'
            });

            // --- Step 4: Post-creation Actions (Login & Verification) ---
            routeManager.handleRoleChange('user', userId);

            if (getAppConfig().flags.phoneVerification) {
                await user.sendEmailVerification();
                showToast('info', 'Account created! Please check your email to verify.', 6000);
            } else {
                showToast('account'); // "Account created successfully!"
            }
            return true;

        } catch (error) {
            console.error("Signup Error:", error);

            // --- MASTER ROLLBACK HANDLER ---
            // If we have a partially created Auth user and an error occurred, delete the Auth user.
            if (user) {
                await user.delete().catch(deleteError => {
                    console.error("CRITICAL: Failed to delete orphaned Auth user during signup rollback.", deleteError);
                });
                console.log(`Auth user for ${email} successfully rolled back due to error: ${error.message}`);
            }
            // If the Firestore user document was partially created before an error, delete it.
            // The `_createFirestoreUserBundle` function attaches the ID to the thrown error.
            if (error.createdUserId) {
                console.warn(`Attempting to roll back partially created Firestore user: ${error.createdUserId}`);
                await firestore.collection('users').doc(error.createdUserId).delete()
                    .then(() => {
                        console.log(`Firestore user ${error.createdUserId} successfully rolled back.`);
                    }).catch(deleteError => {
                        console.error(`CRITICAL: Failed to delete orphaned Firestore user ${error.createdUserId} during signup rollback.`, deleteError);
                    });
            }

            // --- UI Error Display ---
            if (error.code === 'auth/phone-number-already-exists') {
                showError(phoneInput, error.message);
            } else if (error.code === 'auth/email-already-in-use') {
                showError(emailInput, 'Email already in use.');
            } else if (error.code === 'auth/weak-password') {
                showError(passwordInput, 'Password must be at least 6 characters.');
            } else if (error.code === 'auth/invalid-email') {
                showError(emailInput, 'Invalid email address.');
            } else {
                // Generic error for other issues (like the re-thrown Firestore error)
                const message = error.code ? `Registration failed (${error.code}).` : 'Registration failed. Please try again.';
                // Also show a toast for these generic/unexpected errors.
                showToast('error', 'Registration failed. Please check your connection and try again.', 5000);
                showError(emailInput, message);
            }
            return false;
        }
    }

    async function initRecaptcha() {
        // Initialize reCAPTCHA only once. If it exists, we assume it's ready.
        if (window.recaptchaVerifier) return true;
        try {            if (!auth) throw new Error("Firebase Auth service not available for reCAPTCHA.");

            window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
                'recaptcha-container',
                { 'size': 'invisible' }
            );
            await window.recaptchaVerifier.render();
            console.log("reCAPTCHA verifier initialized.");
            return true;
        } catch (error) {
            console.error("reCAPTCHA initialization failed:", error);
            // Show a user-facing error. This often happens if the domain isn't authorized.
            showToast('error', 'Could not start verification. Please refresh and try again.', 6000);
            return false;
        }
    }

    async function sendVerificationOtp(phoneNumber) {
        // --- DEV MODE BYPASS ---
        // If in 'dev' mode, we simulate the OTP flow without sending a real SMS or using reCAPTCHA.
        if (getAppConfig().app.environment === 'development') {
            console.warn("DEV MODE: Bypassing real OTP sending. Simulating success.");
            showToast('info', 'DEV: OTP Sent (Simulated)');
            // The UI in account.js will handle showing the OTP field and auto-filling it.
            return true;
        }

        // --- PRODUCTION LOGIC ---
        const phoneInput = document.getElementById('register-phone');
        if (!window.recaptchaVerifier) {
            showError(phoneInput, 'Verification service not ready. Please refresh.');
            return false;
        }
        try {
            const fullPhoneNumber = `+91${phoneNumber}`;
            phoneConfirmationResult = await auth.signInWithPhoneNumber(fullPhoneNumber, window.recaptchaVerifier);
            showToast('success', 'OTP sent to your phone!');
            return true;
        } catch (error) {
            console.error("Send OTP Error:", error);
            // Provide more specific feedback based on the error code.
            let message = 'Failed to send OTP. Please try again.';
            if (error.code === 'auth/invalid-phone-number') {
                message = 'The phone number is not valid.';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Too many requests. Please try again later.';
            } else if (error.code === 'auth/network-request-failed') {
                message = 'Network error. Check your connection.';
            }
            showError(phoneInput, message);
            return false;
        }
    }

    async function verifyPhoneOtp(otpCode) {
        // --- DEV MODE BYPASS ---
        // In dev mode, we can use a fixed OTP to bypass the real verification.
        if (getAppConfig().app.environment === 'development') { // Check app mode
            if (otpCode === '123456') {
                console.warn("DEV MODE: Bypassing OTP verification. Simulating success.");
                isPhoneVerified = true;
                return true; // Return true to let the UI update
            } else {
                const otpInput = document.getElementById('phone-otp-input');
                showError(otpInput, 'DEV: Use code 123456');
                return false;
            }
        }

        // --- PRODUCTION LOGIC ---
        const otpInput = document.getElementById('phone-otp-input');
        if (!phoneConfirmationResult) {
            showError(otpInput, 'Please request an OTP first.');
            return false;
        }
        try {
            // This step confirms the OTP. It does NOT create the user yet.
            // It only proves the user owns the phone.
            await phoneConfirmationResult.confirm(otpCode);
            isPhoneVerified = true;
            showToast('success', 'Phone number verified!');
            return true;
        } catch (error) {
            console.error("Verify OTP Error:", error);
            showError(otpInput, 'Invalid OTP. Please try again.');
            isPhoneVerified = false;
            return false;
        }
    }

    async function signInWithGoogle() {
        const googleBtn = document.querySelector('.social-btn.google');
        _setButtonLoading(googleBtn, true);
        try {            if (!firestore || !auth) throw new Error('Firebase services not initialized');

            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            const googleUser = result.user;

            // --- Robust User Lookup ---
            // Always query by the definitive UID first. This handles account linking correctly.
            const usersRef = firestore.collection('users');
            const querySnapshot = await usersRef.where('auth.provider.uid', '==', googleUser.uid).limit(1).get();

            let userId;
            let userAccount;

            if (!querySnapshot.empty) {
                // User document found by UID, this is the correct path.
                const userDoc = querySnapshot.docs[0];
                userId = userDoc.id;
                userAccount = userDoc.data();
                // Optional: Update avatar if it has changed
                if (userAccount.info?.avatar !== googleUser.photoURL) await userDoc.ref.update({ 'info.avatar': googleUser.photoURL });
            } else {
                // BUG FIX: Was calling a non-existent function. Corrected to _createFirestoreUserBundle.
                userId = await _createFirestoreUserBundle(googleUser, {
                    method: 'google',
                    note: 'Account created on Google sign-in.'
                });

                // 6) Fetch the newly created user account data to proceed.
                const userDoc = await usersRef.doc(userId).get();
                userAccount = userDoc.data();
            }

            // FIX: Prioritize 'primaryRole' for correct role assignment.
            const role = userAccount.meta?.primaryRole || userAccount.meta?.roles?.[0] || 'user';
            routeManager.handleRoleChange(role, userId);
            showToast('login');

        } catch (error) {
            console.error("Google Sign-In Error:", error);
            // NEW: Handle the critical case where the user's email is already in use with another method (e.g., password)
            if (error.code === 'auth/account-exists-with-different-credential') {
                showToast('error', 'This email is already registered. Please sign in with your password, then link your Google account in settings.', 8000);
            } else if (error.code !== 'auth/popup-closed-by-user') {
                // Handle other errors, but ignore when the user simply closes the popup.
                showToast('error', 'An error occurred during Google Sign-In.');
            }
        } finally {
            _setButtonLoading(googleBtn, false);
        }
    }

    async function signInWithApple() {
        const appleBtn = document.querySelector('.social-btn.apple');
        _setButtonLoading(appleBtn, true);
        try {            if (!firestore || !auth) throw new Error('Firebase services not initialized');

            const provider = new firebase.auth.OAuthProvider('apple.com');
            const result = await auth.signInWithPopup(provider);
            const appleUser = result.user;

            // --- Robust User Lookup ---
            // Always query by the definitive UID first.
            const usersRef = firestore.collection('users');
            const querySnapshot = await usersRef.where('auth.provider.uid', '==', appleUser.uid).limit(1).get();

            let userId;
            let userAccount;

            if (!querySnapshot.empty) {
                // User document found by UID.
                const userDoc = querySnapshot.docs[0];
                userId = userDoc.id;
                userAccount = userDoc.data();
            } else {
                // --- Create new user if not found using the centralized bundle function ---
                userId = await _createFirestoreUserBundle(appleUser, {
                    method: 'apple',
                    note: 'Account created on Apple sign-in.'
                });

                // 6) Fetch the newly created user account data to proceed.
                const userDoc = await usersRef.doc(userId).get();
                userAccount = userDoc.data();
            }

            // FIX: Prioritize 'primaryRole' for correct role assignment.
            const role = userAccount.meta?.primaryRole || userAccount.meta?.roles?.[0] || 'user';
            routeManager.handleRoleChange(role, userId);
            showToast('login');

        } catch (error) {
            console.error("Apple Sign-In Error:", error);
            if (error.code === 'auth/account-exists-with-different-credential') {
                showToast('error', 'This email is already registered. Please sign in with your password, then link your Apple account in settings.', 8000);
            }
            else if (error.code !== 'auth/popup-closed-by-user') {
                showToast('error', 'An error occurred during Apple Sign-In.');
            }
        } finally {
            _setButtonLoading(appleBtn, false);
        }
    }

    async function handlePasswordReset(form) {
        const emailInput = form.querySelector('#reset-email');
        const email = emailInput.value.trim();

        clearError(emailInput);
        if (!email || !validateEmail(email)) {
            showError(emailInput, 'Please enter a valid email address.');
            return false; // Indicate failure
        }

        try {
            if (!auth) throw new Error('Firebase Auth service not initialized');

            await auth.sendPasswordResetEmail(email);
            
            showToast('success', 'Password reset link sent! Check your inbox.');
            return true; // Indicate success to the caller

        } catch (error) {
            console.error("Password Reset Error:", error);
            let message;
            // Provide specific feedback for common errors.
            // NOTE: Revealing "user not found" can be a minor security risk (email enumeration).
            // For this app's purpose, providing clear feedback is prioritized as requested.
            // For higher security, you could show a generic success message for both success and 'user-not-found' cases.
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'No account is registered with this email address.';
                    break;
                case 'auth/invalid-email':
                    // This case is already handled by client-side validation, but we include it for robustness.
                    message = 'The email address is not valid.';
                    break;
                case 'auth/network-request-failed':
                    message = 'Network error. Please check your connection and try again.';
                    break;
                default:
                    message = 'An unexpected error occurred. Please try again later.';
                    break;
            }
            showError(emailInput, message);
            return false; // Indicate failure
        }
    }

    /**
     * Handles the complete user logout process.
     * It signs the user out from Firebase and then updates the app's state to guest.
     * This is the single source of truth for logging out.
     */
    async function handleLogout() {
        try {
            // NEW: Immediately clear local storage to prevent any potential race conditions
            // or stale state issues, even before Firebase signOut completes.
            localStorage.removeItem('currentUserType');
            localStorage.removeItem('currentUserId');
            console.log("AuthService: Local storage cleared immediately on logout attempt.");

            if (getAppConfig().source.data !== 'localstore' && auth && auth.currentUser) {
                await auth.signOut();
                console.log("AuthService: Firebase user signed out successfully.");
            }
            // After successful sign-out (or for local mode), tell routeManager to switch to guest state.
            // No delay needed, as initializeAuthListener handles persistence on refresh.
            routeManager.handleRoleChange('guest');
            showToast('logout');
        } catch (error) {
            console.error("Logout Error:", error);
            showToast('error', 'Logout failed. Please try again.');
            // Even on failure, we should still try to reset the UI to the guest state.
            routeManager.handleRoleChange('guest');
        }
    }

    /**
     * Initializes the authentication state listener. This should be called once on app startup.
     * It synchronizes the app's local state with the Firebase Auth state to prevent race conditions.
     * @returns {Promise<void>} A promise that resolves when the initial auth state is known and handled.
     */
    function initializeAuthListener() {
        // This check is important because this function might be called before firebase-config has fully run.
        if (!auth) {
            console.error("Auth service not available for listener initialization.");
            // Resolve immediately to not block the app if Firebase isn't ready.
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            // onAuthStateChanged fires once on load with the current user or null.
            // We use it to get the definitive auth state from Firebase.
            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                console.log("Auth Listener: onAuthStateChanged fired. User:", user ? user.uid : 'null');

                try {
                    const savedRole = localStorage.getItem('currentUserType');
                    const savedUserId = localStorage.getItem('currentUserId');

                    if (user) {
                        // Firebase has an authenticated user.
                        console.log(`Auth Listener: Firebase user ${user.uid} is signed in.`);
                        // Now, we must ensure our app's localStorage is consistent with this reality.
                        try {
                            const usersRef = firestore.collection('users');
                            const userDocQuery = await usersRef.where('auth.provider.uid', '==', user.uid).limit(1).get();

                            if (!userDocQuery.empty) {
                                const userAccount = userDocQuery.docs[0].data();
                                const role = _determineBestRole(userAccount.meta);
                                const userId = userAccount.meta?.userId;
                                console.log(`Auth Listener: Determined role for ${user.uid}: ${role}, userId: ${userId}`);

                                // Sync localStorage if it's out of sync with the truth (Firebase).
                                if (savedRole !== role || savedUserId !== userId) {
                                    console.warn("Auth Listener: App state is out of sync. Updating session from Firebase state.");
                                    localStorage.setItem('currentUserType', role);
                                    localStorage.setItem('currentUserId', userId);
                                }
                            } else {
                                console.error(`Auth Listener: Critical data inconsistency. User ${user.uid} exists in Auth but not Firestore. Forcing logout.`);
                                showToast('error', 'User data missing. Logging out.', 5000);
                                await auth.signOut();
                                localStorage.removeItem('currentUserType');
                                localStorage.removeItem('currentUserId');
                            }
                        } catch (error) {
                            console.error("Auth Listener: Error fetching user document during state sync. Forcing logout.", error);
                            showToast('error', 'Session sync failed. Logging out.', 5000);
                            await auth.signOut().catch(() => {});
                            localStorage.removeItem('currentUserType');
                            localStorage.removeItem('currentUserId');
                        }
                    } else {
                        // Firebase has no authenticated user. If our localStorage still thinks a user is logged in, it's stale. Clear it.
                        console.log("Auth Listener: Firebase user is null. Checking localStorage for stale state.");
                        if (savedRole || savedUserId) {
                            console.warn("Auth Listener: App state is out of sync (shows logged in). Clearing stale session.");
                            localStorage.removeItem('currentUserType');
                            localStorage.removeItem('currentUserId');
                            console.log("Auth Listener: localStorage cleared. currentUserType: ", localStorage.getItem('currentUserType'), ", currentUserId: ", localStorage.getItem('currentUserId'));
                        }
                        console.log("Auth Listener: No Firebase user signed in.");
                    }
                } catch (e) {
                    console.error("Auth Listener: A critical unhandled error occurred. State may be inconsistent.", e);
                } finally {
                    // The state is now synchronized (or has failed gracefully). 
                    // Resolve the promise to allow the app initialization to proceed.
                    resolve();
                }
            });
        });
    }

    return {
        validateForm,
        handleLogin,
        handleLogout, // Export the new logout handler
        handleSignup,
        handlePasswordReset,
        initRecaptcha,
        sendVerificationOtp,
        verifyPhoneOtp,
        signInWithGoogle,
        signInWithApple,
        initializeAuthListener, // Export the new function
    };
})();