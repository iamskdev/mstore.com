import { routeManager } from '../../../main.js';
import { fetchMerchantById, localCache, updateMerchant, fetchAllMerchants } from '../../../utils/data-manager.js';
import { showToast } from '../../../utils/toast.js';
import { uploadToCloudinary, buildCloudinaryUrl, getCloudinaryPath } from '../../../api/cloudinary.js';

let currentStep = 1;
let formSteps = [];
let merchantData = null;
let initialHandle = ''; // To track if handle has changed
let handleCheckTimeout = null; // For debouncing handle check
let newLogoFile = null;
let newCoverFile = null;

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
    initialHandle = data.info.handle || ''; // Store initial handle
    document.getElementById('info-name').value = data.info.name || '';
    document.getElementById('info-handle').value = data.info.handle || '';
    document.getElementById('info-tagline').value = data.info.tagline || '';
    document.getElementById('info-description').value = data.info.description || '';

    // --- NEW: Populate Logo and Cover Image ---
    const logoImagePreview = document.getElementById('logo-image-preview');
    const coverImagePreview = document.getElementById('cover-image-preview');

    if (data.info.logo) {
        logoImagePreview.src = buildCloudinaryUrl(data.info.logo);
    } else {
        logoImagePreview.src = 'https://via.placeholder.com/150';
    }

    if (data.info.coverImage) {
        coverImagePreview.src = buildCloudinaryUrl(data.info.coverImage);
    } else {
        coverImagePreview.src = 'https://via.placeholder.com/600x200';
    }
    
    // --- REFACTORED: Populate structured opening hours ---
    const hoursContainer = document.getElementById('opening-hours-container');
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    hoursContainer.innerHTML = ''; // Clear existing

    daysOfWeek.forEach(day => {
        const dayData = data.openingHours?.days?.find(d => d.day === day);
        const isChecked = !!dayData;
        const startTime = dayData?.hours[0]?.open || '09:00';
        const endTime = dayData?.hours[0]?.close || '17:00';

        const row = document.createElement('div');
        row.className = 'day-row';
        row.innerHTML = `
            <input type="checkbox" id="day-${day.toLowerCase()}" data-day="${day}" ${isChecked ? 'checked' : ''} disabled>
            <label for="day-${day.toLowerCase()}" class="day-label">${day}</label>
            <div class="time-inputs">
                <input type="time" id="start-time-${day.toLowerCase()}" value="${startTime}" ${!isChecked ? 'disabled' : ''}>
                <span>-</span>
                <input type="time" id="end-time-${day.toLowerCase()}" value="${endTime}" ${!isChecked ? 'disabled' : ''}>
            </div>
        `;
        hoursContainer.appendChild(row);
    });

    const isOpen247 = data.openingHours?.isOpen247 || false;
    document.getElementById('open-24-7').checked = isOpen247;
    if (isOpen247) {
        document.querySelectorAll('.day-row input[type="time"], .day-row input[type="checkbox"]').forEach(el => el.disabled = true);
    }

    document.getElementById('opening-hours-note').value = data.openingHours?.note || '';

    // Original fields
    document.getElementById('address-street').value = data.addresses?.[0]?.street || '';
    document.getElementById('address-city').value = data.addresses?.[0]?.city || '';
    document.getElementById('address-zipCode').value = data.addresses?.[0]?.zipCode || '';
    document.getElementById('payment-cod').checked = data.paymentOptions?.acceptsCod || false;
    document.getElementById('payment-online').checked = data.paymentOptions?.acceptsOnline || false;
    document.getElementById('delivery-available').checked = data.deliveryInfo?.isAvailable || false;

    // Step 3: Legal & Social
    document.getElementById('legal-ownerName').value = data.legalInfo?.ownerName || '';
    document.getElementById('legal-gstin').value = data.legalInfo?.gstin || '';
    document.getElementById('social-facebook').value = data.social?.facebook || '';
    document.getElementById('social-instagram').value = data.social?.instagram || '';
    document.getElementById('social-twitter').value = data.social?.twitter || '';
    document.getElementById('social-whatsapp').value = data.social?.whatsapp || '';
}

function setupImageEditing() {
    // Prefer attaching the click to the visible edit icons so users can click the camera.
    const logoWrapper = document.querySelector('.logo-image-wrapper');
    const coverWrapper = document.querySelector('.cover-image-wrapper');
    const logoEditIcon = document.querySelector('.logo-edit-icon');
    const coverEditIcon = document.querySelector('.cover-edit-icon');
    const logoInput = document.getElementById('logo-image-input');
    const coverInput = document.getElementById('cover-image-input');

    // Guard: ensure inputs exist before adding listeners.
    if (logoInput) {
        // Clicking the wrapper or the camera icon should both trigger the file chooser.
        
        logoEditIcon && logoEditIcon.addEventListener('click', (ev) => {
            ev.stopPropagation();
            console.debug('logo edit icon clicked, triggering input');
            logoInput.click();
        });
        // Also listen for native input events to verify file dialog opened
        logoInput.addEventListener('click', () => console.debug('logo input clicked (native)'), { once: false });
        logoInput.addEventListener('change', (e) => console.debug('logo input change event', e.target.files && e.target.files.length ? e.target.files[0].name : 'no-file'));
    }
    if (coverInput) {
        
        coverEditIcon && coverEditIcon.addEventListener('click', (ev) => {
            ev.stopPropagation();
            console.debug('cover edit icon clicked, triggering input');
            coverInput.click();
        });
        coverInput.addEventListener('click', () => console.debug('cover input clicked (native)'), { once: false });
        coverInput.addEventListener('change', (e) => console.debug('cover input change event', e.target.files && e.target.files.length ? e.target.files[0].name : 'no-file'));
    }

    // (debug helper removed)

    logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        openEditorFor(file, 'logo');
        e.target.value = ''; // Reset input
    });

    coverInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        openEditorFor(file, 'cover');
        e.target.value = ''; // Reset input
    });
}

function openEditorFor(file, type) {
    if (!file) return;

    // Validation rules (cover images should follow recommended formats + max size)
    const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif'];
    const MAX_FILE_SIZE_MB = 6; // 6 MB

    if (type === 'cover') {
        if (!ACCEPTED_FORMATS.includes(file.type)) {
            showToast('error', 'Unsupported file type. Please use JPG, PNG, BMP or GIF.');
            return;
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            showToast('error', `File too large. Maximum ${MAX_FILE_SIZE_MB} MB allowed.`);
            return;
        }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const options = {
            title: `Update ${type === 'logo' ? 'Logo' : 'Cover Photo'}`,
            subtitle: 'Crop and adjust your image',
            onSave: (blob) => {
                const previewElement = document.getElementById(`${type}-image-preview`);
                previewElement.src = URL.createObjectURL(blob);
                if (type === 'logo') {
                    newLogoFile = blob;
                } else {
                    newCoverFile = blob;
                }
            },
            // Default controls layout: row 1 actions, row 2 ratios, row 3 final actions
            controls: [
                { zoom: true, rotate: true, flip: true, fit: true, reset: true },
                { ratios: true },
                { final: true }
            ]
        };

        if (type === 'logo') {
            options.initialAspectRatio = 1;
            options.isCircle = true;
            options.compression = { targetSizeKB: 100, minQuality: 0.7, format: 'image/jpeg' };
            // logos don't need safe area
            options.showSafeArea = false;
        } else { // cover
            options.initialAspectRatio = 16 / 9;
            options.isCircle = false;
            options.compression = { targetSizeKB: 300, minQuality: 0.7, format: 'image/jpeg' };
            // For cover we show safe area overlay (YouTube style - full width, partial height visible)
            options.showSafeArea = true;
            options.safeAreaAspectRatio = 16 / 9;

            // Pass YouTube-like recommendations so media editor can render the guideline correctly.
            options.recommendedSize = { width: 2560, height: 1440 };
            options.safeAreaPixels = { width: 1546, height: 423 };
            options.acceptedFormats = ACCEPTED_FORMATS.slice();
            options.maxFileSizeMB = MAX_FILE_SIZE_MB;

            // Add guideline toggle button for cover
            options.controls = [
                { zoom: true, rotate: true, flip: true, fit: true, reset: true },
                { guideline: true },  // Guideline toggle button
                { ratios: true },
                { final: true }
            ];
            // Pass current page cover container size so editor can simulate exact visible area
            try {
                const coverEl = document.querySelector('.cover-photo-container');
                if (coverEl) {
                    const rect = coverEl.getBoundingClientRect();
                    options.pageCover = { width: Math.round(rect.width), height: Math.round(rect.height) };
                }
            } catch (e) { /* ignore if not on page */ }
        }

        window.openPhotoEditor(event.target.result, options);
    };
    reader.readAsDataURL(file);
}

function initializeFieldEditing(merchant) {
    // --- Disable all fields first (but keep file inputs enabled so native pickers work) ---
    const allEditableFields = document.querySelectorAll('input:not([type="time"]):not([type="file"]), textarea');
    allEditableFields.forEach(field => {
        field.disabled = true;
        // Store the initial value for cancellation
        field.dataset.originalValue = field.value;
    });
    // Handle checkboxes separately
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.disabled = true;
        cb.dataset.originalValue = cb.checked;
    });
    // Disable all opening hours controls initially
    document.querySelectorAll('#opening-hours-container input, #copy-first-day-btn, #open-24-7').forEach(el => {
        el.disabled = true;
    });

    const editButtons = document.querySelectorAll('.field-edit-btn');
    editButtons.forEach(btn => {
        // Show pencil icons, but re-attach listener only if not already attached
        btn.style.display = 'block'; 
        if (btn.dataset.listenerAttached) return;

        btn.addEventListener('click', () => {
            if (btn.classList.contains('disabled')) {
                showToast('info', 'This field cannot be edited right now.');
                return;
            }

            const fieldId = btn.dataset.field; // e.g., 'info-name' or 'opening-hours-container'

            // Special handling for containers like opening hours or payment options
            if (fieldId === 'opening-hours-container' || fieldId === 'payment-delivery-section') {
                const isEditing = btn.classList.contains('fa-times');
                const enable = !isEditing;

                // --- FIX: Make the selector dynamic to handle any section ---
                const section = document.getElementById(fieldId);
                if (section) {
                    // Enable/disable all input/button controls within the clicked section
                    section.querySelectorAll('input, button:not(.field-edit-btn)').forEach(el => {
                        el.disabled = !enable;
                    });
                }

                // FIX: Explicitly enable/disable the copy button if editing opening hours
                if (fieldId === 'opening-hours-container') {
                    const copyBtn = document.getElementById('copy-first-day-btn');
                    if (copyBtn) {
                        copyBtn.disabled = !enable;
                    }
                }

                if (enable && fieldId === 'opening-hours-container') {
                    handleDayCheckboxChange();
                }

                // Toggle the button icon
                btn.classList.toggle('fa-times', enable);
                btn.classList.toggle('fa-pen-to-square', !enable);
                btn.title = enable ? 'Finish Editing' : 'Edit Section';
                return; // Stop further execution for this specific button
            }

            // --- Logic for all other standard fields ---
            const field = document.getElementById(fieldId);
            if (field.disabled) {
                // --- START EDITING ---
                field.disabled = false;
                field.focus();
                btn.classList.remove('fa-pen-to-square');
                btn.classList.add('fa-times');
                btn.title = 'Cancel Edit';
            } else {
                // --- FINISH EDITING (Don't cancel changes) ---
                // The new value will be saved when the main "Submit" button is clicked.
                field.disabled = true;
                btn.classList.remove('fa-times');
                btn.classList.add('fa-pen-to-square');
                btn.title = 'Edit Field';
            }
        });
        btn.dataset.listenerAttached = 'true';
    });

    // Special rule for handle
    const handleEditBtn = document.querySelector('.field-edit-btn[data-field="info-handle"]');
    const handleEligibilityMsg = document.getElementById('handle-eligibility-message');
    const handleUpdatedAt = merchant.info?.handleUpdatedAt;

    if (handleUpdatedAt) {
        const lastUpdateDate = new Date(handleUpdatedAt);
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        if (lastUpdateDate > ninetyDaysAgo) {
            const nextEligibleDate = new Date(lastUpdateDate.setDate(lastUpdateDate.getDate() + 90));
            const disabledMessage = `You can change your handle again after ${nextEligibleDate.toLocaleDateString()}.`;
            
            // --- REFACTORED: Change to info icon if not eligible ---
            handleEditBtn.classList.remove('fa-pen-to-square');
            handleEditBtn.classList.add('fa-info-circle');
            handleEditBtn.classList.add('disabled');
            handleEditBtn.title = disabledMessage;
            handleEligibilityMsg.textContent = `Next change possible after ${nextEligibleDate.toLocaleDateString()}.`;

            // The generic click listener for '.disabled' buttons will show a toast, which is perfect.
        }
    }
}

function enableAllFieldsForNewProfile() {
    const allFields = document.querySelectorAll('input, textarea, input[type="checkbox"]');
    allFields.forEach(field => {
        field.disabled = false;
    });
    
    document.querySelectorAll('.field-edit-btn').forEach(btn => {
        btn.style.display = 'none'; // Hide all pencil icons
    });
}

/**
 * NEW: Attaches the event listener for the copy timings button.
 * This is separated to prevent re-attaching listeners unnecessarily.
 */
function setupCopyTimeListener() {
    const copyBtn = document.getElementById('copy-first-day-btn');
    if (!copyBtn || copyBtn.dataset.listenerAttached === 'true') {
        return; // Exit if button doesn't exist or listener is already attached
    }

    const copyTimeHandler = () => {
        // Find the *first checked day* in the list, not just Monday.
        const firstCheckedRow = document.querySelector('.day-row input[type="checkbox"]:checked');

        if (!firstCheckedRow) {
            showToast('warning', 'Please select at least one day to copy timings from.');
            return;
        }

        // FIX: Get the start and end time from that first checked day's row AT THE MOMENT OF THE CLICK.
        // This ensures that any changes made by the user before clicking are captured.
        const sourceRow = firstCheckedRow.closest('.day-row');
        const startTimeToCopy = sourceRow.querySelector('input[type="time"]:first-of-type').value;
        const endTimeToCopy = sourceRow.querySelector('input[type="time"]:last-of-type').value;

        document.querySelectorAll('.day-row').forEach(row => {
            const dayCheckbox = row.querySelector('input[type="checkbox"]');
            if (dayCheckbox.checked) {
                row.querySelector('input[type="time"]:first-of-type').value = startTimeToCopy;
                row.querySelector('input[type="time"]:last-of-type').value = endTimeToCopy;
            }
        });
        showToast('info', 'Timings copied to all selected days.');
    };

    copyBtn.addEventListener('click', copyTimeHandler);
    copyBtn.dataset.listenerAttached = 'true'; // Mark that the listener has been attached
}

function setupOpeningHoursLogic() {
    const container = document.getElementById('opening-hours-container');
    const copyBtn = document.getElementById('copy-first-day-btn');
    const open247Checkbox = document.getElementById('open-24-7');

    container.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox' && e.target.id.startsWith('day-')) {
            handleDayCheckboxChange();
        }
    });

    open247Checkbox.addEventListener('change', () => {
        const is247 = open247Checkbox.checked;
        document.querySelectorAll('.day-row input').forEach(el => {
            el.disabled = is247;
            if (is247) el.checked = true; // Check all day boxes if 24/7
        });
    });

    // Call the new function to set up the copy button listener
    setupCopyTimeListener();
}

function handleDayCheckboxChange() {
    document.querySelectorAll('.day-row').forEach(row => {
        const dayCheckbox = row.querySelector('input[type="checkbox"]');
        const timeInputs = row.querySelectorAll('input[type="time"]');
        timeInputs.forEach(input => input.disabled = !dayCheckbox.checked);
    });
}

async function handleSubmit() {
    const merchantId = localCache.get('currentMerchantId');
    if (!merchantId) {
        showToast('error', 'Cannot save. Merchant ID is missing.');
        return;
    }

    const newHandle = document.getElementById('info-handle').value;
    if (newHandle && newHandle !== initialHandle) {
        const allMerchants = await fetchAllMerchants();
        const isHandleTaken = allMerchants.some(m => m.info.handle === newHandle && m.meta.merchantId !== merchantId);
        if (isHandleTaken) {
            showToast('error', 'This handle is already taken. Please choose another one.');
            // Highlight the handle field
            const handleInput = document.getElementById('info-handle');
            handleInput.focus();
            handleInput.style.borderColor = 'var(--accent-danger)';
            return;
        }
    }

    try {
        let newLogoUrl = merchantData.info.logo;
        let newCoverUrl = merchantData.info.coverImage;
        const uploadPromises = [];

        if (newLogoFile) {
            uploadPromises.push(
                uploadToCloudinary(newLogoFile, {
                    public_id: getCloudinaryPath('MERCHANT_LOGO', { merchantId: merchantData.meta.merchantId }),
                    overwrite: true,
                    invalidate: true
                }, 'image').then(result => {
                    if (result && result.public_id) {
                        newLogoUrl = result.public_id;
                    } else {
                        throw new Error('Logo upload failed.');
                    }
                })
            );
        }

        if (newCoverFile) {
            uploadPromises.push(
                uploadToCloudinary(newCoverFile, {
                    public_id: getCloudinaryPath('MERCHANT_COVER', { merchantId: merchantData.meta.merchantId }),
                    overwrite: true,
                    invalidate: true
                }, 'image').then(result => {
                    if (result && result.public_id) {
                        newCoverUrl = result.public_id;
                    } else {
                        throw new Error('Cover image upload failed.');
                    }
                })
            );
        }

        if (uploadPromises.length > 0) {
            showToast('info', 'Uploading images...');
            await Promise.all(uploadPromises);
        }
    // --- NEW: Helper function to collect current form data in the same structure as merchantData ---
    const collectCurrentData = () => {
        const addressesArray = [{
            street: document.getElementById('address-street').value,
            city: document.getElementById('address-city').value,
            zipCode: document.getElementById('address-zipCode').value,
            isPrimary: true, label: 'Main Address'
        }];

        const openingHoursData = { days: [], note: document.getElementById('opening-hours-note').value, isOpen247: document.getElementById('open-24-7').checked };
        document.querySelectorAll('.day-row').forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox.checked) {
                const day = checkbox.dataset.day;
                const startTime = row.querySelector('input[type="time"]:first-of-type').value;
                const endTime = row.querySelector('input[type="time"]:last-of-type').value;
                openingHoursData.days.push({ day: day, hours: [{ open: startTime, close: endTime }] });
            }
        });

        return {
            'info.name': document.getElementById('info-name').value,
            'info.handle': document.getElementById('info-handle').value,
            'info.tagline': document.getElementById('info-tagline').value,
            'info.description': document.getElementById('info-description').value,
            'addresses': addressesArray, 'openingHours': openingHoursData,
            'paymentOptions.acceptsCod': document.getElementById('payment-cod').checked,
            'paymentOptions.acceptsOnline': document.getElementById('payment-online').checked,
            'deliveryInfo.isAvailable': document.getElementById('delivery-available').checked,
            'legalInfo.ownerName': document.getElementById('legal-ownerName').value, 'legalInfo.gstin': document.getElementById('legal-gstin').value,
            'social.facebook': document.getElementById('social-facebook').value, 'social.instagram': document.getElementById('social-instagram').value,
            'social.twitter': document.getElementById('social-twitter').value, 'social.whatsapp': document.getElementById('social-whatsapp').value,
        };
    };
    // Collect all data from the form fields.
    // Create a full addresses array to prevent Firestore from creating an object.
    const addressesArray = [
        {
            street: document.getElementById('address-street').value,
            city: document.getElementById('address-city').value,
            zipCode: document.getElementById('address-zipCode').value,
            // Add other address fields here if they exist in the schema
            isPrimary: true,
            label: 'Main Address'
        }
    ];

    // --- REFACTORED: Collect structured opening hours data ---
    const openingHoursData = {
        days: [],
        note: document.getElementById('opening-hours-note').value,
        isOpen247: document.getElementById('open-24-7').checked
    };
    document.querySelectorAll('.day-row').forEach(row => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            const day = checkbox.dataset.day;
            const startTime = row.querySelector('input[type="time"]:first-of-type').value;
            const endTime = row.querySelector('input[type="time"]:last-of-type').value;
            openingHoursData.days.push({
                day: day,
                hours: [{ open: startTime, close: endTime }]
            });
        }
    });

    // --- FIX: Check for changes before submitting ---
    const currentDataForUpdate = collectCurrentData();
    let hasChanges = false;
    // Compare simple fields
    for (const key in currentDataForUpdate) {
        if (key === 'addresses' || key === 'openingHours') continue; // Skip complex objects for now
        const path = key.split('.');
        const originalValue = path.reduce((o, i) => o?.[i], merchantData);
        if (originalValue !== currentDataForUpdate[key]) {
            hasChanges = true;
            break;
        }
    }
    // Compare complex objects (a simple but effective way)
    if (!hasChanges && JSON.stringify(merchantData.addresses) !== JSON.stringify(currentDataForUpdate.addresses)) hasChanges = true;
    if (!hasChanges && JSON.stringify(merchantData.openingHours) !== JSON.stringify(currentDataForUpdate.openingHours)) hasChanges = true;

    if (!hasChanges && !newLogoFile && !newCoverFile) {
        showToast('info', 'No changes were made to the profile.');
        routeManager.switchView('merchant', `merchant-profile/${merchantId}`); // Navigate back without saving
        return;
    }

    const updatedData = {
        'info.name': document.getElementById('info-name').value,
        'info.handle': document.getElementById('info-handle').value,
        'info.tagline': document.getElementById('info-tagline').value,
        'info.description': document.getElementById('info-description').value,
        'info.logo': newLogoUrl,
        'info.coverImage': newCoverUrl,
        
        // Replace the entire addresses array. This is the correct way.
        'addresses': addressesArray,
        
        'openingHours': openingHoursData,

        'paymentOptions.acceptsCod': document.getElementById('payment-cod').checked,
        'paymentOptions.acceptsOnline': document.getElementById('payment-online').checked,
        'deliveryInfo.isAvailable': document.getElementById('delivery-available').checked,
        'legalInfo.ownerName': document.getElementById('legal-ownerName').value,
        'legalInfo.gstin': document.getElementById('legal-gstin').value,
        'social.facebook': document.getElementById('social-facebook').value,
        'social.instagram': document.getElementById('social-instagram').value,
        'social.twitter': document.getElementById('social-twitter').value,
        'social.whatsapp': document.getElementById('social-whatsapp').value,
        // Crucially, update the status to 'active'
        'meta.status': 'active'
    };

    // Add handleUpdatedAt only if the handle has changed
    if (newHandle && newHandle !== initialHandle) {
        updatedData['info.handleUpdatedAt'] = new Date().toISOString();
    }

    
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
            // Check if it's a new profile or an existing one being edited.
            if (merchantData.meta.status === 'incomplete') {
                enableAllFieldsForNewProfile();
            } else {
                initializeFieldEditing(merchantData);
            }
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

    setupOpeningHoursLogic();
    setupImageEditing();

    // Initial setup
    currentStep = 1;
    updateFormSteps();
    updateProgressBar();

    view.dataset.initialized = 'true';
}

export function cleanup() {
    const view = document.getElementById('merchant-profile-edit-view');
    if (view) {
        view.removeAttribute('data-initialized');
    }
    newLogoFile = null;
    newCoverFile = null;
}
