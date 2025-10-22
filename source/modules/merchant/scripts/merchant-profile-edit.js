import { routeManager } from '../../../main.js';
import { fetchMerchantById, localCache, updateMerchant } from '../../../utils/data-manager.js';
import { showToast } from '../../../utils/toast.js';

let currentStep = 1;
let formSteps = [];
let merchantData = null;

function updateFormSteps() {
    const prevBtn = document.querySelector('.btn-prev');
    const nextBtn = document.querySelector('.form-navigation .btn-next');
    const formNavigation = document.querySelector('.form-navigation');

    formSteps.forEach((step, index) => {
        step.classList.toggle('form-step-active', index + 1 === currentStep);
    });
    prevBtn.disabled = currentStep === 1;
    nextBtn.textContent = currentStep === formSteps.length ? 'Submit' : 'Next';
}

function updateProgressBar() {
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressBarLine = document.querySelector('.progress-bar-line');

    progressSteps.forEach((step, index) => {
        step.classList.toggle('active', index < currentStep);
    });

    const width = ((currentStep - 1) / (progressSteps.length - 1)) * 100;
    progressBarLine.style.width = `${width}%`;
}

function populateForm(data) {
    document.getElementById('info-name').value = data.info.name || '';
    document.getElementById('info-handle').value = data.info.handle || '';
    document.getElementById('info-tagline').value = data.info.tagline || '';
    document.getElementById('info-description').value = data.info.description || '';
    
    // Step 2: Operations
    document.getElementById('address-street').value = data.addresses?.[0]?.street || '';
    document.getElementById('address-city').value = data.addresses?.[0]?.city || '';
    document.getElementById('address-zipCode').value = data.addresses?.[0]?.zipCode || '';
    document.getElementById('opening-hours-note').value = data.openingHours?.note || '';
    document.getElementById('payment-cod').checked = data.paymentOptions?.acceptsCod || false;
    document.getElementById('payment-online').checked = data.paymentOptions?.acceptsOnline || false;
    document.getElementById('delivery-available').checked = data.deliveryInfo?.isAvailable || false;

    // Step 3: Legal & Social
    document.getElementById('legal-ownerName').value = data.legalInfo?.ownerName || '';
    document.getElementById('legal-gstin').value = data.legalInfo?.gstin || '';
    document.getElementById('social-facebook').value = data.social?.facebook || '';
    document.getElementById('social-instagram').value = data.social?.instagram || '';
}

async function handleSubmit() {
    const merchantId = localCache.get('currentMerchantId');
    if (!merchantId) {
        showToast('error', 'Cannot save. Merchant ID is missing.');
        return;
    }

    // Collect all data from the form fields
    const updatedData = {
        'info.name': document.getElementById('info-name').value,
        'info.handle': document.getElementById('info-handle').value,
        'info.tagline': document.getElementById('info-tagline').value,
        'info.description': document.getElementById('info-description').value,
        
        // Firestore dot notation for updating nested objects in an array is tricky.
        // It's often easier to read the whole document, modify the array in JS, and write it back.
        // For this fix, we'll assume a simple update for the first address.
        // A more robust solution would handle multiple addresses.
        'addresses.0.street': document.getElementById('address-street').value,
        'addresses.0.city': document.getElementById('address-city').value,
        'addresses.0.zipCode': document.getElementById('address-zipCode').value,

        'openingHours.note': document.getElementById('opening-hours-note').value,
        
        'paymentOptions.acceptsCod': document.getElementById('payment-cod').checked,
        'paymentOptions.acceptsOnline': document.getElementById('payment-online').checked,
        
        'deliveryInfo.isAvailable': document.getElementById('delivery-available').checked,

        'legalInfo.ownerName': document.getElementById('legal-ownerName').value,
        'legalInfo.gstin': document.getElementById('legal-gstin').value,

        'social.facebook': document.getElementById('social-facebook').value,
        'social.instagram': document.getElementById('social-instagram').value,

        // Crucially, update the status to 'active'
        'meta.status': 'active'
    };

    try {
        // Use updateMerchant instead of updateUser
        await updateMerchant(merchantId, updatedData);
        showToast('success', 'Profile updated successfully!');
        routeManager.switchView('merchant', `merchant-profile/${merchantId}`);
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('error', 'Failed to update profile.');
    }
}

export async function init() {
    const view = document.getElementById('merchant-profile-edit-view');
    if (!view || view.dataset.initialized) return;

    const merchantId = localCache.get('currentMerchantId');
    if (!merchantId) {
        showToast('error', 'Could not find merchant ID.');
        routeManager.switchView('merchant', 'dashboard'); // or some other default
        return;
    }

    try {
        merchantData = await fetchMerchantById(merchantId);
        if (merchantData) {
            populateForm(merchantData);
        }
    } catch (error) {
        console.error("Failed to load merchant data for editing:", error);
        showToast('error', 'Failed to load your business data.');
    }

    const prevBtn = document.querySelector('.btn-prev');
    const nextBtn = document.querySelector('.form-navigation .btn-next');
    formSteps = document.querySelectorAll('.form-step');

    nextBtn.addEventListener('click', () => {
        if (currentStep === formSteps.length) {
            handleSubmit();
        } else {
            currentStep++;
            updateFormSteps();
            updateProgressBar();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateFormSteps();
            updateProgressBar();
        }
    });

    // Initial setup
    currentStep = 1;
    updateFormSteps();
    updateProgressBar();

    view.dataset.initialized = 'true';
}

export function cleanup() {
    // Cleanup logic if needed
}