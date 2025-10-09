import { fetchUserById, updateUser } from '../../utils/data-manager.js';
import { uploadToCloudinary, buildCloudinaryUrl, deleteFromCloudinary } from '../../api/cloudinary.js';
import { showToast } from '../../utils/toast.js';
import { routeManager } from '../../main.js';

let currentUser = null;
let newAvatarFile = null;
let initialFormData = {}; // NEW: To store initial form state for change detection

async function loadUserData() {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) {
        showToast('error', 'User not found. Please log in again.');
        routeManager.switchView('guest', 'account');
        return;
    }

    currentUser = await fetchUserById(userId);
    if (!currentUser) {
        showToast('error', 'Failed to load user data.');
        return;
    }

    populateForm(currentUser);
}

function populateForm(user) {
    // Header
    document.getElementById('display-nickName').innerText = user.info.nickName || user.info.fullName;
    document.getElementById('display-username').innerText = `@${user.info.username || 'username'}`;
    // Use buildCloudinaryUrl to correctly display the avatar
    // --- FIX: Use the full public_id from the database, don't split it. ---
    // The database stores the full public_id like 'assets/users/avatars/username_profile_pic'.
    // buildCloudinaryUrl needs this full ID to construct the correct URL.
    const publicId = user.info.avatar;
    const avatarPreview = document.getElementById('avatar-preview');
    const iconPlaceholder = document.getElementById('avatar-icon-placeholder');

    if (publicId) {
        const avatarUrl = buildCloudinaryUrl(publicId);
        avatarPreview.src = avatarUrl;
        avatarPreview.style.display = 'block';
        iconPlaceholder.style.display = 'none';
        avatarPreview.onerror = () => {
            avatarPreview.style.display = 'none';
            iconPlaceholder.style.display = 'block';
        };
    } else {
        avatarPreview.style.display = 'none';
        iconPlaceholder.style.display = 'block';
    }
    // Personal Info
    document.getElementById('fullName').value = user.info.fullName || '';
    document.getElementById('nickName').value = user.info.nickName || '';
    document.getElementById('dob').value = user.info.dob || '';
    document.getElementById('gender').value = user.info.gender || 'prefer_not_to_say';
    document.getElementById('bio').value = user.info.bio || '';

    // Address (assuming first address)
    const address = user.address?.[0] || {};
    document.getElementById('street').value = address.street || '';
    document.getElementById('city').value = address.city || '';
    document.getElementById('state').value = address.state || '';
    document.getElementById('zipCode').value = address.zipCode || '';

    // Contact
    document.getElementById('email').value = user.info.email || '';
    // --- FIX: Split phone number into country code and number ---
    const fullPhoneNumber = user.info.phone || '';
    const phoneCountryCodeEl = document.getElementById('phone-country-code');
    const phoneNumberInput = document.getElementById('phone');
    
    if (fullPhoneNumber.startsWith('+91')) {
        phoneCountryCodeEl.textContent = '+91';
        phoneNumberInput.value = fullPhoneNumber.replace('+91', '').trim();
    } else {
        phoneCountryCodeEl.textContent = ''; // Or a default if needed
        phoneNumberInput.value = fullPhoneNumber;
    }

    // Check username edit eligibility
    checkUsernameEligibility(user);

    // NEW: Store initial state and set save button state
    storeInitialFormData();
}

function checkUsernameEligibility(user) {
    const editBtn = document.getElementById('edit-username-btn');
    const usernameUpdatedAt = user.info.usernameUpdatedAt;
    const usernameModalInput = document.getElementById('username-modal-input');
    const saveUsernameBtn = document.getElementById('save-username-btn');
    const eligibilityMessage = document.getElementById('username-eligibility-message');

    if (!editBtn || !usernameModalInput || !saveUsernameBtn || !eligibilityMessage) return { isEligible: false };

    if (!usernameUpdatedAt) {
        // First time change is allowed
        usernameModalInput.disabled = false;
        saveUsernameBtn.disabled = false;
        eligibilityMessage.textContent = 'You can change your username. This can be done once every 90 days.';
        return { isEligible: true };
    }

    const lastUpdateDate = new Date(usernameUpdatedAt);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const isEligible = lastUpdateDate <= ninetyDaysAgo;
    usernameModalInput.disabled = !isEligible;
    saveUsernameBtn.disabled = !isEligible;

    if (isEligible) {
        eligibilityMessage.textContent = 'You are eligible to change your username.';
    } else {
        const nextEligibleDate = new Date(lastUpdateDate.setDate(lastUpdateDate.getDate() + 90));
        eligibilityMessage.textContent = `You can change your username again after ${nextEligibleDate.toLocaleDateString()}.`;
    }
    return { isEligible };
}

function setSectionEditable(sectionName, editable) {
    const section = document.querySelector(`.profile-section[data-section-name="${sectionName}"]`);
    if (!section) return;

    const fields = section.querySelectorAll('input, textarea, select');
    const editBtn = section.querySelector('.edit-section-btn');
    const formActions = document.querySelector('.form-actions');

    // Don't enable/disable contact fields with this function anymore
    if (sectionName !== 'contact' && fields.length > 0) {
        fields.forEach(field => { field.disabled = !editable; });
    }

    section.classList.toggle('editing', editable);
    if (editBtn) {
        editBtn.classList.toggle('fa-edit', !editable);
        editBtn.classList.toggle('fa-times', editable); // Change to 'times' (X) icon
        editBtn.title = editable ? 'Cancel Editing' : `Edit ${sectionName} Info`;
    }
    
    const selectWrapper = section.querySelector('.select-wrapper');
    if(selectWrapper) selectWrapper.classList.toggle('editable', editable);

    // Handle phone group specifically
    // FIX: Only toggle the phone group's disabled state if we are editing the 'contact' section
    if (sectionName === 'contact') {
        const phoneGroup = document.getElementById('phone-group');
        if (phoneGroup) {
            phoneGroup.classList.toggle('disabled', !editable);
        }
    }
}

function setupEventListeners() {
    const avatarModal = document.getElementById('avatar-actions-modal');
    const closeAvatarModalBtn = document.getElementById('close-avatar-actions-modal');
    const changePictureBtn = document.getElementById('change-picture-btn');
    const removePictureBtn = document.getElementById('remove-picture-btn');
    const avatarUploadInput = document.getElementById('avatar-upload');
    // Username Modal Elements
    const editUsernameBtn = document.getElementById('edit-username-btn');
    const usernameModal = document.getElementById('username-edit-modal');
    const closeUsernameModalBtn = document.getElementById('close-username-modal');

    // --- NEW: Section editing logic ---
    document.querySelectorAll('.edit-section-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Exclude the username edit button which has its own modal logic
            if (btn.id === 'edit-username-btn') {
                return;
            }
            const sectionToEdit = btn.dataset.sectionName;
            const isCurrentlyEditing = btn.classList.contains('fa-times');

            // First, disable all sections
            document.querySelectorAll('.profile-section').forEach(sec => {
                setSectionEditable(sec.dataset.sectionName, false);
            });

            // If we are not canceling, enable the target section
            if (!isCurrentlyEditing) {
                setSectionEditable(sectionToEdit, true);
            }
            // Re-check changes to enable/disable the save button
            updateSaveButtonState();
        });
    });

    // --- REFACTORED: Username editing logic moved to a modal ---
    editUsernameBtn.addEventListener('click', () => {
        const usernameModalInput = document.getElementById('username-modal-input');
        usernameModalInput.value = currentUser.info.username || '';
        checkUsernameEligibility(currentUser); // Update modal state based on eligibility
        usernameModal.style.display = 'flex';
    });

    const closeUsernameModal = () => { if(usernameModal) usernameModal.style.display = 'none'; };
    closeUsernameModalBtn.addEventListener('click', closeUsernameModal);
    usernameModal.addEventListener('click', (e) => { if (e.target === usernameModal) closeUsernameModal(); });

    // --- REFACTORED: Advanced logic for contact field edits ---
    document.querySelectorAll('.edit-field-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const fieldName = this.dataset.field;
            const input = document.getElementById(fieldName);
            const isEditing = !input.disabled;

            if (isEditing) {
                if (this.classList.contains('send-otp')) {
                    // --- NEW: Open the actual OTP modal ---
                    window.showOtpModal({
                        destination: input.value,
                        onVerify: (otp) => {
                            console.log(`Verifying ${fieldName} with OTP: ${otp}`);
                            // TODO: Add actual OTP verification logic here
                        },
                        onResend: () => console.log(`Resending OTP for ${fieldName} to ${input.value}`)
                    });
                } else {
                    // State: Cancel
                    input.disabled = true;
                    input.value = (fieldName === 'email') ? currentUser.info.email : currentUser.info.phone.replace('+91', '').trim();
                    this.className = 'fas fa-edit edit-field-btn'; // Revert to edit icon
                    this.title = `Change ${fieldName}`;
                    if (fieldName === 'phone') document.getElementById('phone-group').classList.remove('editing'); // Remove editing class from phone group
                }
            } else {
                // State: Start Editing
                input.disabled = false;
                input.focus();
                this.className = 'fas fa-times edit-field-btn'; // Change to cancel icon
                this.title = 'Cancel';
                if (fieldName === 'phone') document.getElementById('phone-group').classList.add('editing');
            }
        });
    });

    // Add input listeners to check for validity and change the icon
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const editEmailBtn = document.getElementById('edit-email-btn');
    const editPhoneBtn = document.getElementById('edit-phone-btn');

    emailInput.addEventListener('input', () => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);
        if (isValid && emailInput.value !== currentUser.info.email) {
            editEmailBtn.className = 'fas fa-paper-plane edit-field-btn send-otp';
            editEmailBtn.title = 'Send Verification OTP';
        } else {
            editEmailBtn.className = 'fas fa-times edit-field-btn';
            editEmailBtn.title = 'Cancel';
        }
    });

    phoneInput.addEventListener('input', () => {
        const isValid = /^\d{10}$/.test(phoneInput.value);
        const currentPhoneNumber = currentUser.info.phone.replace('+91', '').trim();
        if (isValid && phoneInput.value !== currentPhoneNumber) {
            editPhoneBtn.className = 'fas fa-paper-plane edit-field-btn send-otp';
            editPhoneBtn.title = 'Send Verification OTP';
        } else {
            editPhoneBtn.className = 'fas fa-times edit-field-btn';
            editPhoneBtn.title = 'Cancel';
        }
    });

    // Open the new actions modal when avatar is clicked
    document.getElementById('avatar-container').addEventListener('click', () => {
        // --- NEW: Populate modal with current avatar before showing ---
        const mainAvatarPreview = document.getElementById('avatar-preview');
        const modalAvatarPreview = document.getElementById('avatar-modal-preview');
        const modalIconPlaceholder = document.getElementById('avatar-modal-icon-placeholder');

        if (mainAvatarPreview.style.display === 'none' || !mainAvatarPreview.src) {
            modalAvatarPreview.style.display = 'none';
            modalIconPlaceholder.style.display = 'block';
        } else {
            modalAvatarPreview.src = mainAvatarPreview.src;
            modalAvatarPreview.style.display = 'block';
            modalIconPlaceholder.style.display = 'none';
        }
        if (avatarModal) avatarModal.style.display = 'flex';
    });

    // Close modal logic
    const closeModal = () => { if (avatarModal) avatarModal.style.display = 'none'; };
    closeAvatarModalBtn.addEventListener('click', closeModal);
    avatarModal.addEventListener('click', (e) => { if (e.target === avatarModal) closeModal(); });

    // "Change Picture" button is a label that triggers the hidden file input.
    // FIX: Prevent the default label behavior and handle it manually to ensure modal closes first.
    changePictureBtn.addEventListener('click', function(e) {
        e.preventDefault(); // Stop the label from immediately triggering the input
        closeModal();
        avatarUploadInput.click(); // Manually trigger the file input after closing the modal
    });

    // Listen for changes on the actual file input
    avatarUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            window.openPhotoEditor(event.target.result, {
                title: 'Update Avatar',
                subtitle: 'Select the best part of your photo',
                controls: [ { zoom: true, rotate: true, flip: true, final: true } ],
                initialAspectRatio: 1,
                isCircle: true,
                compression: { targetSizeKB: 50, minQuality: 0.1, format: 'image/jpeg' },
                onSave: (blob) => {
                    newAvatarFile = blob;
                    const avatarPreview = document.getElementById('avatar-preview');
                    avatarPreview.src = URL.createObjectURL(blob);
                    avatarPreview.style.display = 'block';
                    document.getElementById('avatar-icon-placeholder').style.display = 'none';
                    // FIX: Explicitly close the avatar actions modal after a successful edit.
                    // NEW: Check for changes to enable save button
                    updateSaveButtonState();
                    closeModal();
                }
            });
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset input to allow re-selecting the same file
    });

    document.getElementById('username-info-icon').addEventListener('click', () => {
        window.showCustomAlert({
            title: 'Username Policy',
            message: 'Your username can be changed once every 90 days. After your first change, you must wait 90 days for the next one.'
        });
    });

    // "Remove Picture" button logic
    removePictureBtn.addEventListener('click', () => {
        newAvatarFile = 'DELETE'; // Flag for deletion on save
        document.getElementById('avatar-preview').style.display = 'none';
        document.getElementById('avatar-icon-placeholder').style.display = 'block';
        document.getElementById('avatar-preview').src = '';
        showToast('info', 'Avatar will be removed on save.');
        // NEW: Check for changes to enable save button
        updateSaveButtonState();
        closeModal();
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        // Reset any open editing sections
        document.querySelectorAll('.profile-section.editing').forEach(sec => {
            setSectionEditable(sec.dataset.sectionName, false);
        });
        // NEW: Reset form to initial state on cancel
        populateForm(currentUser);
        routeManager.switchView(localStorage.getItem('currentUserType'), 'account');
    });

    document.getElementById('save-btn').addEventListener('click', saveProfile);

    // NEW: Add input listeners to all fields for change detection
    const fieldsToWatch = [
        'fullName', 'nickName', 'dob', 'gender', 'bio', // Keep bio here for change detection
        'street', 'city', 'state', 'zipCode'
    ];
    fieldsToWatch.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateSaveButtonState);
        }
    });
}

// NEW: Function to store the initial state of the form
function storeInitialFormData() {
    initialFormData = {
        fullName: document.getElementById('fullName').value,
        nickName: document.getElementById('nickName').value,
        dob: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        bio: document.getElementById('bio').value,
        street: document.getElementById('street').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        zipCode: document.getElementById('zipCode').value,
        avatar: currentUser.info.avatar, // Store initial avatar public_id
        username: currentUser.info.username || '',
    };
    updateSaveButtonState(); // Initial check
}

// NEW: Function to check for changes and update the save button
function updateSaveButtonState() {
    const saveBtn = document.getElementById('save-btn');
    if (!saveBtn) return;

    let hasChanged = newAvatarFile !== null; // Change if a new avatar is staged or marked for deletion

    for (const key in initialFormData) {
        if (key === 'avatar' || key === 'username') continue; // Skip special fields
        const currentVal = document.getElementById(key).value;
        if (currentVal !== initialFormData[key]) hasChanged = true;
    }

    saveBtn.disabled = !hasChanged;
}

async function saveProfile() {
    const saveBtn = document.getElementById('save-btn');
    const btnText = saveBtn.querySelector('.btn-text');
    const spinner = saveBtn.querySelector('.spinner');

    // Final check to prevent saving if nothing changed (e.g., if button was enabled via dev tools)
    if (saveBtn.disabled) {
        showToast('info', 'No changes to save.');
        return;
    }
    saveBtn.disabled = true;
    btnText.textContent = 'Saving...';
    spinner.style.display = 'inline-block';

    try {
        let newAvatarUrl = currentUser.info.avatar;

        if (newAvatarFile === 'DELETE') {
            // --- AVATAR DELETION LOGIC ---
            const oldPublicId = currentUser.info.avatar;
            if (oldPublicId) {
                showToast('info', 'Deleting old profile picture...');
                await deleteFromCloudinary(oldPublicId);
            }
            newAvatarUrl = ''; // Set avatar to empty string in Firestore

        } else if (newAvatarFile) {
            // --- AVATAR UPLOAD LOGIC (existing) ---
            showToast('info', 'Uploading new profile picture...');

            // --- NEW FOLDER STRUCTURE ---
            // Use the username for a more descriptive public_id.
            // The public_id will be clean, without a timestamp.
            // Format: assets/users/avatars/USERNAME_profile_pic
            const username = currentUser.info.username || currentUser.meta.userId;
            const customPublicId = `assets/users/avatars/${username}_profile_pic`;

            const uploadOptions = {
                public_id: customPublicId,
                overwrite: true, // This will replace the old image with the new one.
                invalidate: true // This tells the CDN to fetch the new version immediately.
            };
            const uploadResult = await uploadToCloudinary(newAvatarFile, uploadOptions, 'image');
            // FIX: Store only the public_id, not the full URL.
            // This allows us to use buildCloudinaryUrl for transformations later.
            if (uploadResult && uploadResult.public_id) {
                newAvatarUrl = uploadResult.public_id;
            } else {
                throw new Error('Image upload failed.');
            }
        }

        const updatedData = {
            'info.fullName': document.getElementById('fullName').value,
            'info.nickName': document.getElementById('nickName').value,
            'info.bio': document.getElementById('bio').value,
            'info.dob': document.getElementById('dob').value,
            'info.gender': document.getElementById('gender').value,
            'info.avatar': newAvatarUrl,
            // Update the first address in the array.
            // Note: A more robust solution would handle multiple addresses.
            'address.0.street': document.getElementById('street').value,
            'address.0.city': document.getElementById('city').value,
            'address.0.state': document.getElementById('state').value,
            'address.0.zipCode': document.getElementById('zipCode').value,
        };
        
        // --- FIX: Re-assemble the full phone number before saving ---
        const countryCode = document.getElementById('phone-country-code').textContent;
        updatedData['info.phone'] = `${countryCode}${document.getElementById('phone').value.trim()}`;

        // Handle username update separately due to its special rules
        const newUsername = document.getElementById('username-modal-input').value.trim();
        const { isEligible } = checkUsernameEligibility(currentUser);
        if (newUsername && newUsername !== currentUser.info.username && isEligible) {
            // In a real app, you MUST check for username uniqueness on the backend here.
            // For now, we'll assume it's unique.
            updatedData['info.username'] = newUsername;
            updatedData['info.usernameUpdatedAt'] = new Date().toISOString();
            showToast('info', 'Username will be updated.');
        }

        // Call the new updateUser function from data-manager
        await updateUser(currentUser.meta.userId, updatedData);

        // Force a refresh of the cached user data so changes are reflected immediately
        await fetchUserById(currentUser.meta.userId, true);

        newAvatarFile = null; // Reset staged avatar file after successful save
        showToast('success', 'Profile updated successfully!');
        
        routeManager.switchView(localStorage.getItem('currentUserType'), 'account');

    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('error', 'Failed to save profile. Please try again.');
    } finally {
        saveBtn.disabled = false;
        btnText.textContent = 'Save Changes';
        spinner.style.display = 'none';
    }
}

export function init() {
    loadUserData();
    setupEventListeners();
}

export function cleanup() {
    // --- FIX: Reset avatar preview on cleanup to avoid showing stale changes ---
    // If the user navigates away without saving, this ensures the avatar
    // reverts to its original state for the next time the view is loaded.
    if (currentUser) {
        const publicId = currentUser.info.avatar;
        const avatarPreview = document.getElementById('avatar-preview');
        const iconPlaceholder = document.getElementById('avatar-icon-placeholder');

        if (avatarPreview && iconPlaceholder) {
            if (publicId) {
                avatarPreview.src = buildCloudinaryUrl(publicId);
                avatarPreview.style.display = 'block';
                iconPlaceholder.style.display = 'none';
            } else {
                avatarPreview.style.display = 'none';
                iconPlaceholder.style.display = 'block';
            }
        }
    }

    currentUser = null;
    newAvatarFile = null;
    // TODO: A more robust cleanup would remove all event listeners set in this module.
}