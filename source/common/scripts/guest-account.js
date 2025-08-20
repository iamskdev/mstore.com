// --- Resilient Guest Account Module ---
// This module is designed to be resilient to network failures.
// It dynamically imports the AuthService only when an action (like login or signup)
// is triggered. This ensures that the UI for this view can be rendered even if
// the Firebase services fail to load initially, preventing a blank screen for the user.

import { APP_CONFIG } from '../../utils/app-config.js';
import { showToast } from '../../utils/toast.js';

/**
 * एक सहायक फ़ंक्शन जो एक बटन की लोडिंग स्थिति को प्रबंधित करता है।
 * यह मूल सामग्री को संग्रहीत करता है और इसे पुनर्स्थापित करता है, जिससे स्थिति का नुकसान नहीं होता है।
 * @param {HTMLButtonElement} button - अपडेट करने के लिए बटन एलिमेंट।
 * @param {boolean} isLoading - लोडिंग स्थिति दिखाने के लिए सही, पुनर्स्थापित करने के लिए गलत।
 * @param {string} [loadingText='Processing...'] - लोडिंग के दौरान दिखाने के लिए टेक्स्ट।
 */
function setButtonLoading(button, isLoading, loadingText = 'Processing...') {
    if (!button) return;
    if (isLoading) {
        if (!button.dataset.originalHtml) {
            button.dataset.originalHtml = button.innerHTML;
        }
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i>&nbsp; ${loadingText}`;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalHtml || 'Submit'; // Fallback text
        delete button.dataset.originalHtml; // Clean up to prevent stale state
    }
}

/**
 * लॉगिन, रजिस्टर और रीसेट के बीच टैब स्विचिंग को सेट करता है।
 */
function setupAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab'); // HTML में .auth-tab से मैच करता है
    const forms = document.querySelectorAll('.auth-form');

    const showForm = (formId) => {
        forms.forEach(form => {
            // 'active' क्लास को मैनेज करें, 'hidden' को नहीं, क्योंकि CSS इसी पर निर्भर करता है
            form.classList.toggle('active', form.id === formId);
        });
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.form === formId);
        });
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const formId = tab.dataset.form;
            showForm(formId);
            sessionStorage.setItem('initialAuthTab', formId.replace('Form', ''));
        });
    });

    // sessionStorage के आधार पर प्रारंभिक टैब दिखाएं (जैसे ड्रॉअर से आने पर)
    const initialTab = sessionStorage.getItem('initialAuthTab') || 'login';
    showForm(`${initialTab}Form`);

    // "Forgot Password?" लिंक के लिए इवेंट लिस्नर
    document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        showForm('resetForm'); // 'resetForm' दिखाएं और सभी टैब को निष्क्रिय करें
    });

    // "Back to Login" लिंक के लिए इवेंट लिस्नर
    document.querySelector('.back-to-login-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        showForm('loginForm');
        sessionStorage.setItem('initialAuthTab', 'login'); // सेशन स्टोरेज को भी रीसेट करें
    });
}

/**
 * सभी पासवर्ड फ़ील्ड्स के लिए पासवर्ड दृश्यता टॉगल को सेट करता है।
 */
function setupPasswordToggles() {
    // पृष्ठ पर सभी पासवर्ड टॉगल बटनों का चयन करें
    const toggleButtons = document.querySelectorAll('.pw-toggle');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            // बटन के सबसे करीबी '.input-wrapper' को खोजें
            const inputWrapper = button.closest('.input-wrapper');
            if (!inputWrapper) return;

            // रैपर के अंदर पासवर्ड इनपुट और आइकन खोजें
            const passwordInput = inputWrapper.querySelector('input');
            const icon = button.querySelector('i');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
}

/**
 * फोन नंबर सत्यापन के लिए UI लॉजिक सेट करता है, जिसमें OTP बटन दिखाना/छिपाना शामिल है।
 * यह केवल तभी काम करता है जब app-config.js में verificationEnabled true हो।
 */
function setupPhoneVerificationUI() {
    // यदि वैश्विक कॉन्फ़िगरेशन में सत्यापन अक्षम है तो कुछ न करें।
    if (!APP_CONFIG.verificationEnabled) {
        return;
    }

    const phoneInput = document.getElementById('register-phone');
    const otpBtn = document.getElementById('phone-otp-btn');
    const otpSection = document.getElementById('phone-otp-section');
    const otpVerifyBtn = document.getElementById('phone-otp-verify-btn');
    const otpInput = document.getElementById('phone-otp-input');

    if (!phoneInput || !otpBtn || !otpSection || !otpVerifyBtn || !otpInput) {
        console.warn("Phone verification UI elements not found. Skipping setup.");
        return;
    }

    // 10-अंकीय भारतीय मोबाइल नंबर के लिए सरल सत्यापन।
    const validatePhone = (phone) => /^\d{10}$/.test(phone);

    // फ़ोन इनपुट की वैधता के आधार पर "Send OTP" बटन दिखाएं/छिपाएं।
    phoneInput.addEventListener('input', () => {
        const isValid = validatePhone(phoneInput.value);
        // यदि नंबर मान्य है तो 'hidden' क्लास हटाएं, अन्यथा जोड़ें।
        otpBtn.classList.toggle('hidden', !isValid);
    });

    // "Send OTP" बटन क्लिक को हैंडल करें।
    otpBtn.addEventListener('click', async () => {
        phoneInput.disabled = true; // बदलावों को रोकने के लिए इनपुट को अक्षम करें।
        otpBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`; // लोडिंग स्थिति दिखाएं।
        otpBtn.disabled = true;

        let success = false;
        try {
            const { AuthService } = await import('../../firebase/auth/auth.js');
            // --- DEV MODE BYPASS ---
            // If in 'dev' mode, we simulate the OTP flow without calling Firebase.
            if (APP_CONFIG.appMode !== 'dev') {
                // Only initialize reCAPTCHA in production mode.
                const recaptchaReady = await AuthService.initRecaptcha();
                if (!recaptchaReady) {
                    // Reset button if reCAPTCHA fails to initialize
                    throw new Error("reCAPTCHA initialization failed.");
                }
            }
            success = await AuthService.sendVerificationOtp(phoneInput.value);

        } catch (error) {
            console.error("Failed to load or execute OTP service:", error);
            showToast('error', 'Verification service failed. Please refresh.', 5000);
            success = false;
        }

        if (success) {
            otpSection.classList.remove('hidden'); // OTP इनपुट अनुभाग दिखाएं।
            otpInput.focus();
            otpBtn.innerHTML = `<i class="fas fa-check"></i>`; // सफलता का संकेत दें।

            // --- DEV MODE AUTO-FILL ---
            if (APP_CONFIG.appMode === 'dev') {
                otpInput.value = '123456'; // Auto-fill the test OTP
                showToast('info', 'DEV: Test OTP auto-filled.', 3000);
            }
        } else {
            // विफलता पर, इनपुट और बटन को रीसेट करें।
            phoneInput.disabled = false;
            otpBtn.innerHTML = `<i class="fas fa-paper-plane"></i>`;
            otpBtn.disabled = false;
        }
    });

    // "Verify OTP" बटन क्लिक को हैंडल करें।
    otpVerifyBtn.addEventListener('click', async () => {
        let success = false;
        try {
            const { AuthService } = await import('../../firebase/auth/auth.js');
            success = await AuthService.verifyPhoneOtp(otpInput.value);
        } catch (error) {
            console.error("Failed to load or execute OTP verification:", error);
            showToast('error', 'Verification service failed. Please refresh.', 5000);
        }
        if (success) {
            otpSection.classList.add('hidden');
            otpBtn.innerHTML = `<i class="fas fa-check-circle"></i>`;
            otpBtn.classList.add('verified');
            showToast('success', 'Phone number verified!');
        }
    });
}

/**
 * गेस्ट अकाउंट व्यू के लिए मुख्य इनिशियलाइज़ेशन फ़ंक्शन।
 */
export function init() {
    console.log("✅ Guest Account view initialized.");

    setupAuthTabs();
    setupPasswordToggles(); // पासवर्ड टॉगल कार्यक्षमता जोड़ें
    setupPhoneVerificationUI(); // फ़ोन सत्यापन UI लॉजिक जोड़ें

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const resetForm = document.getElementById('resetForm');

    // लॉगिन फॉर्म सबमिशन
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        setButtonLoading(submitBtn, true, 'Logging in...');
        try {
            const { AuthService } = await import('../../firebase/auth/auth.js');
            await AuthService.handleLogin(loginForm);
        } catch (error) {
            console.error("Failed to load or execute AuthService for login:", error);
            showToast('error', 'Cannot connect to services. Check connection.', 5000);
        } finally {
            setButtonLoading(submitBtn, false);
        }
    });

    // रजिस्टर फॉर्म सबमिशन
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        setButtonLoading(submitBtn, true, 'Creating account...');
        try {
            const { AuthService } = await import('../../firebase/auth/auth.js');
            // Validation must also happen inside the try block, as it's part of the service.
            if (!AuthService.validateForm(registerForm)) {
                setButtonLoading(submitBtn, false); // Immediately stop loading if client-side validation fails
                return;
            }
            await AuthService.handleSignup(registerForm);
        } catch (error) {
            console.error("Failed to load or execute AuthService for signup:", error);
            showToast('error', 'Cannot connect to services. Check connection.', 5000);
        } finally {
            // The signup flow handles its own button state on success, so we only
            // need to handle the failure case here. The button might already be reset.
            if (submitBtn.disabled) {
                setButtonLoading(submitBtn, false);
            }
        }
    });

    // पासवर्ड रीसेट फॉर्म सबमिशन
    resetForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = resetForm.querySelector('button[type="submit"]');
        setButtonLoading(submitBtn, true, 'Sending link...');
        try {
            const { AuthService } = await import('../../firebase/auth/auth.js');
            await AuthService.handlePasswordReset(resetForm);
        } catch (error) {
            console.error("Failed to load or execute AuthService for password reset:", error);
            showToast('error', 'Cannot connect to services. Check connection.', 5000);
        } finally {
            setButtonLoading(submitBtn, false);
        }
    });

    // सोशल लॉगिन बटन
    document.querySelector('.social-btn.google')?.addEventListener('click', async () => {
        try {
            const { AuthService } = await import('../../firebase/auth/auth.js');
            await AuthService.signInWithGoogle();
        } catch (error) {
            console.error("Failed to load Google Sign-In service:", error);
            showToast('error', 'Cannot connect to Google. Check connection.', 5000);
        }
    });
    document.querySelector('.social-btn.apple')?.addEventListener('click', async () => {
        try {
            const { AuthService } = await import('../../firebase/auth/auth.js');
            await AuthService.signInWithApple();
        } catch (error) {
            console.error("Failed to load Apple Sign-In service:", error);
            showToast('error', 'Cannot connect to Apple. Check connection.', 5000);
        }
    });
}