/**
 * @file Manages the OTP Verification Modal.
 * Provides a global function `showOtpModal` to open and handle the verification process.
 */

let otpModal, otpInput, verifyBtn, resendLink, resendTimer, otpDestinationEl;
let onVerifyCallback = null;
let onResendCallback = null;
let timerInterval = null;

function initOtpModalElements() {
    otpModal = document.getElementById('otp-verification-modal');
    otpInput = document.getElementById('otp-input');
    verifyBtn = document.getElementById('verify-otp-btn');
    resendLink = document.getElementById('resend-otp-link');
    resendTimer = document.getElementById('resend-timer');
    otpDestinationEl = document.getElementById('otp-destination');
    const closeModalBtn = document.getElementById('close-otp-modal');

    closeModalBtn.addEventListener('click', hideOtpModal);
    otpModal.addEventListener('click', (e) => {
        if (e.target === otpModal) hideOtpModal();
    });

    verifyBtn.addEventListener('click', () => {
        if (onVerifyCallback) {
            onVerifyCallback(otpInput.value);
        }
    });

    resendLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (onResendCallback) {
            onResendCallback();
        }
        startResendTimer();
    });

    otpInput.addEventListener('input', () => {
        // Enable verify button only when 6 digits are entered
        verifyBtn.disabled = otpInput.value.length !== 6;
    });
}

function startResendTimer(duration = 30) {
    resendLink.classList.add('hidden');
    resendTimer.classList.remove('hidden');
    let timeLeft = duration;

    timerInterval = setInterval(() => {
        timeLeft--;
        resendTimer.textContent = `Resend in ${timeLeft}s`;
        if (timeLeft <= 0) {
            stopResendTimer();
        }
    }, 1000);
}

function stopResendTimer() {
    clearInterval(timerInterval);
    resendLink.classList.remove('hidden');
    resendTimer.classList.add('hidden');
}

export function hideOtpModal() {
    if (otpModal) {
        otpModal.style.display = 'none';
        stopResendTimer();
        onVerifyCallback = null;
        onResendCallback = null;
    }
}

/**
 * Shows the OTP verification modal.
 * @param {object} options
 * @param {string} options.destination - The email or phone number where the OTP was sent.
 * @param {function} options.onVerify - Callback function executed when the user clicks "Verify". It receives the entered OTP.
 * @param {function} options.onResend - Callback function executed when the user clicks "Resend OTP".
 */
export function showOtpModal({ destination, onVerify, onResend }) {
    if (!otpModal) {
        console.error("OTP Modal not initialized.");
        return;
    }

    otpDestinationEl.textContent = destination;
    onVerifyCallback = onVerify;
    onResendCallback = onResend;

    otpInput.value = '';
    verifyBtn.disabled = true;

    otpModal.style.display = 'flex';
    otpInput.focus();
    startResendTimer();
}

/**
 * Initializes the OTP modal component.
 * This should be called once when the application starts.
 */
export function initOtpVerificationModal() {
    // Check if the modal HTML is in the DOM
    if (!document.getElementById('otp-verification-modal')) {
        console.error("OTP modal HTML not found in the DOM.");
        return;
    }
    initOtpModalElements();
    // Make the show function globally available
    window.showOtpModal = showOtpModal;
    console.log("✅ OTP Verification Modal Initialized.");
}