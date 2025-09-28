import { fetchUserById } from '../../utils/data-manager.js';
import { routeManager } from '../../main.js';

/**
 * Renders the user's profile data onto the account page.
 */
async function renderProfileData() {
    const userId = localStorage.getItem('currentUserId');

    // Get DOM elements
    const nameDisplay = document.getElementById('profile-name-display');
    const tagsContainer = document.getElementById('profile-tags-container');
    const avatarImg = document.getElementById('profile-avatar-img');
    const defaultIcon = document.getElementById('profile-default-icon');

    if (!userId) {
        nameDisplay.textContent = 'Guest User';
        tagsContainer.innerHTML = `<span class="profile-tag">Please log in</span>`;
        if (defaultIcon) defaultIcon.style.display = 'block';
        if (avatarImg) avatarImg.style.display = 'none';
        return;
    }

    try {
        const user = await fetchUserById(userId);
        if (!user) throw new Error('User not found');
        console.log('DEBUG: User data fetched in account.js:', user); // Debug: Check the full user object

        // Update Name
        nameDisplay.textContent = user.info?.fullName || 'Anonymous User';

        // --- Collect and Render All Profile Tags ---
        const tags = [];

        // Use the centralized getTagsForRole function to ensure consistency.
        tagsContainer.innerHTML = getTagsForRole(user.meta?.primaryRole, user);

        // Render tags to the container

        // Update Profile Picture
        if (user.info?.avatar && avatarImg && defaultIcon) {
            // FIX: Show image only after it has successfully loaded
            // to prevent showing a broken image icon.
            avatarImg.onload = () => {
                avatarImg.style.display = 'block';
                defaultIcon.style.display = 'none';
            };
            avatarImg.onerror = () => {
                console.error('Failed to load user avatar image.');
                // Keep the default icon visible if the image fails to load.
            };
            avatarImg.src = user.info.avatar;
        }
    } catch (error) {
        console.error('Failed to render profile data:', error);
        nameDisplay.textContent = 'Error';
        tagsContainer.innerHTML = `<span class="profile-tag">Could not load profile.</span>`;
    }
}

/**
 * Generates a display string of tags for a specific role based on user data.
 * This logic is now centralized to be used by both the profile header and the switch account modal.
 * @param {string} role - The role to generate tags for (e.g., 'user', 'admin').
 * @param {object} user - The full user data object.
 * @returns {string} A dot-separated string of tags (e.g., "User • Consumer Account • Premium").
 */
function getTagsForRole(role, user) {
    const tags = [];

    // 1. Special override for the owner.
    if (user.meta?.flags?.isOwner) {
        return 'User • Top Contributor';
    }

    // 2. General logic for all other roles
    tags.push('User'); // Base tag for all

    // 3. Add specific role account type
    if (role === 'user') {
        tags.push('Consumer Account');
    } else if (role === 'merchant') {
        tags.push('Merchant Account');
    } else if (role === 'admin') {
        tags.push('Admin Account');
    }

    // 4. Add Premium subscription tag
    if (user.subscription?.status === 'active' && user.subscription?.plan === 'Premium') {
        tags.push('Premium');
    }

    // 5. Add other custom tags like "Top Contributor" for non-owners
    if (user.info?.tags && Array.isArray(user.info.tags)) {
        tags.push(...user.info.tags);
    }

    // 6. Add other status flags like "Suspended"
    if (user.meta?.flags?.isSuspended) {
        tags.push('Suspended');
    }

    return tags.join(' • ');
}

/**
 * Initializes the logic for the "Switch Account" modal.
 */
async function initSwitchAccountModal() {
    const modalPlaceholder = document.getElementById('account-modal-placeholder');
    const openBtn = document.getElementById('switch-account-btn');

    if (!modalPlaceholder || !openBtn) {
        console.warn('Switch Account modal elements not found. Feature disabled.');
        return;
    }

    // Load modal HTML dynamically
    try {
        const response = await fetch('./source/modals/account-switcher.html');
        if (!response.ok) throw new Error('Failed to fetch modal HTML');
        modalPlaceholder.innerHTML = await response.text();
    } catch (error) {
        console.error('Could not load switch account modal:', error);
        return;
    }

    // Now that HTML is loaded, get the modal elements
    const modal = document.getElementById('switch-account-modal');
    const closeBtn = document.getElementById('switch-account-close-btn');
    const roleListContainer = document.getElementById('switch-account-list');

    const openModal = async () => {
        const userId = localStorage.getItem('currentUserId');
        if (!userId) {
            alert('You must be logged in to switch roles.');
            return;
        }

        roleListContainer.innerHTML = '<div class="spinner"></div>'; // Show loader
        modal.classList.add('visible');

        try {
            const user = await fetchUserById(userId);
            const roles = user?.meta?.roles || [];
            const currentRole = localStorage.getItem('currentUserType');

            const roleIcons = {
                user: 'fa-user',
                merchant: 'fa-user-tie',
                admin: 'fa-user-shield'
            };

            roleListContainer.innerHTML = ''; // Clear loader

            roles.forEach(role => {
                const item = document.createElement('div');
                item.className = 'switch-account-item';
                item.dataset.role = role;
                const avatarHtml = user.info?.avatar
                    ? `<img src="${user.info.avatar}" alt="Avatar">`
                    : `<i class="fas ${roleIcons[role] || 'fa-user-circle'}"></i>`;

                item.innerHTML = `
                    <div class="switch-account-avatar">${avatarHtml}</div>
                    <div class="switch-account-details">
                        <span class="user-full-name">${user.info?.fullName || 'Apna User'}</span>
                        <span class="account-role-type">${getTagsForRole(role, user)}</span>
                    </div>
                    ${role === currentRole ? '<div class="active-role-tick"><i class="fas fa-check-circle"></i></div>' : ''}
                `;
                item.addEventListener('click', () => {
                    switchRole(role);
                });
                roleListContainer.appendChild(item);
            });
        } catch (error) {
            console.error('Failed to fetch user roles:', error);
            roleListContainer.innerHTML = '<p>Could not load roles.</p>';
        }
    };

    const closeModal = () => modal.classList.remove('visible');

    const switchRole = (newRole) => {
        const userId = localStorage.getItem('currentUserId');
        console.log(`Switching to role: ${newRole} for user: ${userId}`);
        // The routeManager will handle updating localStorage and reloading the view.
        routeManager.handleRoleChange(newRole, userId);
        closeModal();
    };

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => e.target === modal && closeModal());
}

export function init() {
    // Render dynamic data first
    renderProfileData();

    // Listen for auth state changes to re-render the profile data.
    // This is crucial for immediate UI updates on login/logout without a page refresh.
    window.addEventListener('authStateChanged', () => {
        console.log('Account page: Auth state changed, re-rendering profile data.');
        renderProfileData();
    });

    // Initialize the switch account modal logic
    initSwitchAccountModal();

    // Simple interaction for menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function () {
            this.style.backgroundColor = 'rgba(255, 123, 0, 0.2)';
            setTimeout(() => {
                this.style.backgroundColor = '';
            }, 300);
        });
    });

    // Add animation to feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', function () {
            this.style.transform = 'scale(0.97)';
            setTimeout(() => {
                this.style.transform = '';
            }, 300);
        });
    });

    // Profile image click handler
    document.getElementById('profile-image-container').addEventListener('click', function () {
        alert('Profile image clicked! Would you like to change your profile picture?');
    });

    // Profile name click handler
    document.getElementById('profile-name-display').addEventListener('click', function () {
        alert('Profile options would appear here');
    });

    // Action buttons click handler
    // FIX: Exclude the switch account button which has its own specific handler.
    document.querySelectorAll('.action-btn:not(#switch-account-btn)').forEach(btn => {
        btn.addEventListener('click', function () {
            const btnText = this.textContent.trim();
            alert(`You clicked: ${btnText}`);
        });
    });
}