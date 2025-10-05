import { fetchUserById, updateUser } from '../../utils/data-manager.js';
import { uploadToCloudinary, buildCloudinaryUrl } from '../../api/cloudinary.js';
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
    const avatarUrl = user.info.avatar?.includes('cloudinary') ? buildCloudinaryUrl(user.info.avatar.split('/').pop()) : (user.info.avatar || './localstore/images/users/dev.png');
    document.getElementById('avatar-preview').src = avatarUrl;

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
    document.getElementById('avatar-container').addEventListener('click', () => {
        document.getElementById('avatar-upload').click();
    });

    // --- MODIFIED: Handle file selection for cropping ---
    document.getElementById('avatar-upload').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const cropModal = document.getElementById('crop-modal');
            const imageToCrop = document.getElementById('image-to-crop');

            const reader = new FileReader();
            reader.onload = (e) => {
                imageToCrop.src = e.target.result;
                cropModal.style.display = 'flex';

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
        event.target.value = '';
    });

    // --- NEW: Event listeners for the crop modal ---
    const cropModal = document.getElementById('crop-modal');
    document.getElementById('close-crop-modal-btn').addEventListener('click', () => {
        cropModal.style.display = 'none';
        if (cropper) cropper.destroy();
    });

    document.getElementById('crop-and-save-btn').addEventListener('click', () => {
        if (cropper) {
            const canvas = cropper.getCroppedCanvas({ width: 512, height: 512 });
            document.getElementById('avatar-preview').src = canvas.toDataURL();

            canvas.toBlob((blob) => {
                newAvatarFile = new File([blob], 'avatar.png', { type: 'image/png' });
            }, 'image/png');

            cropModal.style.display = 'none';
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
        if (newAvatarFile) {
            showToast('info', 'Uploading new profile picture...');
            const uploadResult = await uploadToCloudinary(newAvatarFile, { folder: `mstore/users/${currentUser.meta.userId}` }, 'image');
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
    // TODO: Remove event listeners to prevent memory leaks
    currentUser = null;
    newAvatarFile = null;
    if (cropper) cropper.destroy();
    cropper = null;
}