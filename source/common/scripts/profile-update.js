import { fetchUserById, updateUser } from '../../utils/data-manager.js';
import { uploadToCloudinary, buildCloudinaryUrl, deleteFromCloudinary } from '../../api/cloudinary.js';
import { showToast } from '../../utils/toast.js';
import { routeManager } from '../../main.js';

let currentUser = null;
let newAvatarFile = null;
let cropper = null;

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
    document.getElementById('username').value = user.info.username || '';
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
    document.getElementById('phone').value = user.info.phone || '';

    // Check username edit eligibility
    checkUsernameEligibility(user);
}

function checkUsernameEligibility(user) {
    const usernameInput = document.getElementById('username');
    const usernameUpdatedAt = user.info.usernameUpdatedAt;

    if (!usernameUpdatedAt) {
        // First time change is allowed
        usernameInput.readOnly = false;
        return;
    }

    const lastUpdateDate = new Date(usernameUpdatedAt);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    if (lastUpdateDate > ninetyDaysAgo) {
        // Not eligible to change yet
        usernameInput.readOnly = true;
    } else {
        // Eligible to change
        usernameInput.readOnly = false;
    }
}

function setupEventListeners() {
    const avatarModal = document.getElementById('avatar-modal');
    const avatarModalContent = document.getElementById('avatar-modal-content');
    const optionsView = document.getElementById('avatar-options-view');
    const cropperView = document.getElementById('avatar-cropper-view');

    // --- MODIFIED: Click on avatar opens the unified modal in "options" state ---
    document.getElementById('avatar-container').addEventListener('click', () => {
        const mainAvatarPreview = document.getElementById('avatar-preview');
        const modalAvatarPreview = document.getElementById('avatar-modal-preview');
        const modalIconPlaceholder = document.getElementById('avatar-modal-icon-placeholder');

        // --- FIX: Show icon in modal if main avatar is not visible ---
        if (mainAvatarPreview.style.display === 'none' || !mainAvatarPreview.src) {
            modalAvatarPreview.style.display = 'none';
            modalIconPlaceholder.style.display = 'block';
        } else {
            modalAvatarPreview.src = mainAvatarPreview.src;
            modalAvatarPreview.style.display = 'block';
            modalIconPlaceholder.style.display = 'none';
        }

        // Reset to options view
        optionsView.style.display = 'block';
        cropperView.style.display = 'none';
        avatarModal.style.display = 'flex';
    });

    // --- MODIFIED: "Remove" button handles avatar removal and closes modal ---
    document.getElementById('remove-avatar-btn').addEventListener('click', () => {
        // --- MODIFIED: Show icon instead of app logo on remove ---
        document.getElementById('avatar-preview').style.display = 'none';
        document.getElementById('avatar-icon-placeholder').style.display = 'block';
        document.getElementById('avatar-preview').src = ''; // Clear src
        newAvatarFile = 'DELETE';
        showToast('info', 'Avatar will be removed on save.');
        avatarModal.style.display = 'none'; // Hide modal
    });


    // --- MODIFIED: When a file is selected, switch to the cropper view inside the SAME modal ---
    document.getElementById('avatar-upload').addEventListener('change', (e) => {
        const file = event.target.files[0];
        if (file) {
            // Switch views inside the modal
            optionsView.style.display = 'none';
            cropperView.style.display = 'block';

            const imageToCrop = document.getElementById('image-to-crop');

            const reader = new FileReader();
            reader.onload = (e) => {
                imageToCrop.src = e.target.result;

                if (cropper) {
                    cropper.destroy();
                }

                cropper = new Cropper(imageToCrop, {
                    aspectRatio: 1,
                    viewMode: 1,
                    background: false,
                    autoCropArea: 0.8,
                });
            };
            reader.readAsDataURL(file);
        }
        // Reset input value to allow re-selecting the same file
        e.target.value = '';
    });

    // --- MODIFIED: Close buttons for the unified modal ---
    const closeModal = () => {
        avatarModal.style.display = 'none';
        if (cropper) cropper.destroy();
    };

    document.getElementById('close-avatar-modal-btn').addEventListener('click', closeModal);
    document.getElementById('close-cropper-view-btn').addEventListener('click', closeModal);

    // Close modal if clicking outside the content
    avatarModal.addEventListener('click', (e) => {
        if (e.target === avatarModal) {
            closeModal();
        }
    });
    // --- MODIFIED: Crop & Save button updates preview and closes modal ---
    document.getElementById('crop-and-save-btn').addEventListener('click', () => {
        if (cropper) {
            const canvas = cropper.getCroppedCanvas({ width: 512, height: 512 });
            // --- MODIFIED: Show image and hide icon after cropping ---
            document.getElementById('avatar-preview').style.display = 'block';
            document.getElementById('avatar-icon-placeholder').style.display = 'none';
            document.getElementById('avatar-preview').src = canvas.toDataURL();

            canvas.toBlob((blob) => {
                newAvatarFile = new File([blob], 'avatar.png', { type: 'image/png' });
            }, 'image/png');

            closeModal(); // Close the unified modal
        }
    });

    document.getElementById('username-info-icon').addEventListener('click', () => {
        window.showCustomAlert({
            title: 'Username Policy',
            message: 'Your username can be changed once every 90 days. After your first change, you must wait 90 days for the next one.'
        });
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        routeManager.switchView(localStorage.getItem('currentUserType'), 'account');
    });

    document.getElementById('save-btn').addEventListener('click', saveProfile);
}

async function saveProfile() {
    const saveBtn = document.getElementById('save-btn');
    const btnText = saveBtn.querySelector('.btn-text');
    const spinner = saveBtn.querySelector('.spinner');

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

        // Handle username update separately due to its special rules
        const newUsername = document.getElementById('username').value;
        const usernameInput = document.getElementById('username');
        if (newUsername !== currentUser.info.username && !usernameInput.readOnly) {
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
    if (cropper) cropper.destroy();
    cropper = null;
    // TODO: A more robust cleanup would remove all event listeners set in this module.
}