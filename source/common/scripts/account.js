import { fetchUserById, fetchAccountById, fetchMerchantById } from '../../utils/data-manager.js';
import { routeManager } from '../../main.js';
import { showFeedbackModal } from '../../partials/modals/feedback.js';

/**
 * Renders the user's profile data onto the account page.
 */
async function renderProfileData() {
    const userId = localStorage.getItem('currentUserId');

    // Get DOM elements
    const nameDisplay = document.getElementById('profile-name-display');
    const usernameDisplay = document.getElementById('profile-username-display'); // NEW
    const tagsContainer = document.getElementById('profile-tags-container');
    const avatarImg = document.getElementById('profile-avatar-img');
    const defaultIcon = document.getElementById('profile-default-icon');
    // NEW: Get elements to hide for guest users
    const scrollableButtons = document.querySelector('.scrollable-buttons');
    const buttonsDivider = scrollableButtons?.nextElementSibling;

    if (!userId) {
        // --- NEW: Make the guest prompt clickable ---
        nameDisplay.textContent = 'Guest User';
        usernameDisplay.style.display = 'none'; // Hide username for guests
        tagsContainer.innerHTML = `<span class="clickable-link">Click to Log In or Sign Up</span>`;
        if (defaultIcon) defaultIcon.style.display = 'block';
        if (avatarImg) avatarImg.style.display = 'none';

        // --- FIX: Add click listener directly to the newly created span ---
        // Find the span that was just added.
        const loginLink = tagsContainer.querySelector('.clickable-link');
        // Add the event listener only to the link, not the whole container.
        loginLink.addEventListener('click', () => {
            routeManager.switchView('guest', 'account/authentication');
        });

        // --- NEW: Hide buttons and divider for guests ---
        if (scrollableButtons) scrollableButtons.style.display = 'none';
        return;
    }

    try {
        const user = await fetchUserById(userId);
        if (!user) throw new Error('User not found');

        // Fetch related data for the user
        const account = user.meta.links.accountId ? await fetchAccountById(user.meta.links.accountId) : null;
        const merchant = user.meta.links.merchantId ? await fetchMerchantById(user.meta.links.merchantId) : null;
        console.log('DEBUG: Fetched data in account.js:', { user, account, merchant });

        // --- NEW: Ensure buttons and divider are visible for logged-in users ---
        if (scrollableButtons) scrollableButtons.style.display = 'flex';

        usernameDisplay.style.display = 'block'; // Ensure username is visible for logged-in users

        // Update Name
        // FIX: Prioritize nickName over fullName for consistency with top-nav.
        nameDisplay.textContent = user.info?.nickName || user.info?.fullName || 'Anonymous User';

        // --- NEW: Display the @username ---
        if (user.info?.username) {
            usernameDisplay.textContent = `@${user.info.username}`;
        }

        // --- Collect and Render All Profile Tags using both user and account data ---
        const tags = [];

        // Use the centralized getTagsForRole function to ensure consistency.
        tagsContainer.innerHTML = getTagsForRole(user.meta?.primaryRole, user, account, merchant);

        // Render tags to the container

        // Update Profile Picture
        if (user.info?.avatar && avatarImg && defaultIcon) {
            // --- FIX: Prevent blinking on re-render ---
            // If the correct avatar is already displayed, do nothing.
            if (avatarImg.src === user.info.avatar && avatarImg.style.display === 'block') {
                return; // Exit to prevent re-loading and blinking
            }

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
        usernameDisplay.textContent = '';
        tagsContainer.innerHTML = `<span class="profile-tag">Could not load profile.</span>`;
    }
}

/**
 * Generates a display string of tags for a specific role based on user data.
 * This logic is now centralized to be used by both the profile header and the switch account modal.
 * @param {string} role - The role to generate tags for (e.g., consumer, 'admin').
 * @param {object} user - The full user data object.
 * @param {object|null} account - The full account data object.
 * @param {object|null} merchant - The full merchant data object.
 * @param {object} [options={ showPremium: true, showPrivilegeTags: true }] - Optional parameters to control tag generation.
 * @param {object} [options={}] - Optional parameters to control tag generation.
 * @returns {string} A dot-separated string of tags (e.g., "User • Consumer Account • Premium").
 */
function getTagsForRole(role, user, account, merchant, options = {}) {
    const tags = [];

    // Base tag for all users
    tags.push('User'); // Base tag for all

    // Add specific role account type
    if (role === 'consumer') {
        tags.push('Consumer Account');
    } else if (role === 'merchant') {
        tags.push('Merchant Account');
    } else if (role === 'admin') {
        tags.push('Admin Account');
    }

    // --- NEW: Control visibility of special privilege tags ---
    const showPrivilegeTags = options.showPrivilegeTags !== false; // Default to true

    // Add special privilege tags after the account type
    if (showPrivilegeTags) {
        if (user.meta?.flags?.isOwner) {
            // As per rule, Owner also gets 'Top Contributor'
            tags.push('Top Contributor');
        }
        // Rule: Super Admin (non-owner) gets a specific tag.
        // The 'else if' prevents 'Super Admin' from showing if 'Owner' is already shown.
        else if (user.meta?.flags?.isSuperAdmin) {
            tags.push('Super Admin');
        }
    }

    // Rule: Add Premium tag only for the 'merchant' role if applicable.
    // The options parameter can disable this for specific contexts like the account switcher modal.
    const showPremium = options.showPremium !== false; // Default to true

    if (showPremium && role === 'merchant' && merchant?.subscription?.status === 'active' && merchant?.subscription?.plan === 'Premium') {
        tags.push('Premium');
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
            // FIX: Use custom alert instead of native alert.
            window.showCustomAlert({
                title: 'Login Required',
                message: 'You need to be logged in to switch between account roles.',
                buttons: [
                    {
                        text: 'Log In',
                        class: 'primary',
                        onClick: () => { window.hideCustomAlert(); routeManager.switchView('guest', 'account/authentication'); }
                    }
                ]
            });
            return; // Stop execution
        }

        // --- NEW: Show skeleton loader instead of spinner ---
        let skeletonHtml = '';
        for (let i = 0; i < 2; i++) { // Show 2 skeleton items
            skeletonHtml += `
                <div class="switch-account-item skeleton-item">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="switch-account-details">
                        <div class="skeleton skeleton-text" style="width: 60%; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text" style="width: 80%; height: 0.8em;"></div>
                    </div>
                    <div class="skeleton" style="width: 20px; height: 20px; margin-left: 10px; border-radius: 50%;"></div>
                </div>`;
        }
        roleListContainer.innerHTML = skeletonHtml;
        modal.classList.add('visible');

        try {
            const user = await fetchUserById(userId);
            const account = user.meta.links.accountId ? await fetchAccountById(user.meta.links.accountId) : null;
            const merchant = user.meta.links.merchantId ? await fetchMerchantById(user.meta.links.merchantId) : null;

            let roles;
            if (user?.meta?.flags?.isSuperAdmin) {
                // If the user is a Super Admin, grant them access to all primary roles.
                roles = [consumer, 'merchant', 'admin'];
            } else {
                roles = user?.meta?.roles || [];
            }
            const currentRole = localStorage.getItem('currentUserType');

            const roleIcons = {
                consumer: 'fa-user',
                merchant: 'fa-user-tie',
                admin: 'fa-user-shield'
            };

            roleListContainer.innerHTML = ''; // Clear loader

            // Determine if the primary user account is suspended
            const isUserSuspended = user.meta?.flags?.isSuspended;

            roles.forEach(role => {
                const item = document.createElement('div');
                item.className = 'switch-account-item';
                item.dataset.role = role;

                // --- NEW: Logic for suspended accounts ---
                let isRoleSuspended = false;
                // For now, we assume only the entire user can be suspended.
                // In the future, you could have role-specific suspension flags.
                if (isUserSuspended) {
                    isRoleSuspended = true;
                }

                let statusIconHtml = '';
                if (isRoleSuspended) {
                    item.classList.add('disabled'); // Make it non-interactive
                    statusIconHtml = '<div class="status-icon suspended"><i class="fas fa-ban"></i></div>';
                } else if (role === currentRole) {
                    statusIconHtml = '<div class="status-icon active"><i class="fas fa-check-circle"></i></div>';
                }

                const avatarHtml = user.info?.avatar
                    ? `<img src="${user.info.avatar}" alt="Avatar">`
                    : `<i class="fas ${roleIcons[role] || 'fa-user-circle'}"></i>`;

                item.innerHTML = `
                    <div class="switch-account-avatar">${avatarHtml}</div>
                    <div class="switch-account-details">
                        <span class="user-full-name">${user.info?.nickName || user.info?.fullName || 'Apna User'}</span>
                        <span class="account-role-type">${getTagsForRole(role, user, account, merchant, { showPremium: false, showPrivilegeTags: false })}</span>
                    </div>
                    ${statusIconHtml}
                `;
                // Only add click listener if the role is not suspended
                if (!isRoleSuspended) {
                    item.addEventListener('click', () => switchRole(role));
                }
                roleListContainer.appendChild(item);
            });
        } catch (error) {
            console.error('Failed to fetch user roles:', error);
            roleListContainer.innerHTML = '<p>Could not load Accounts.</p>';
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

    // --- NEW: Specific handler for the Wishlist menu item ---
    const wishlistMenuItem = document.getElementById('wishlist-menu-item');
    if (wishlistMenuItem) {
        wishlistMenuItem.addEventListener('click', () => {
            // Get the current role from localStorage to navigate correctly
            const role = localStorage.getItem('currentUserType') || 'guest';
            // Navigate to the 'account/saved' view, which is a sub-view of account
            routeManager.switchView(role, 'account/saved');
        });
    }

    // --- NEW: Specific handler for the Feedback menu item ---
    const feedbackMenuItem = document.getElementById('account-feedback-btn');
    if (feedbackMenuItem) {
        feedbackMenuItem.addEventListener('click', (e) => {
            e.preventDefault();
            // Use the centralized function to show the modal for general feedback
            showFeedbackModal();
        });
    }

    // --- NEW: Specific handler for the Rate Us menu item ---
    const rateUsMenuItem = document.getElementById('account-rate-us-btn');
    if (rateUsMenuItem) {
        rateUsMenuItem.addEventListener('click', (e) => {
            e.preventDefault();
            const ratingModal = document.getElementById('rating-modal');
            if (ratingModal) {
                ratingModal.style.display = 'flex'; // Show the modal
            }
        });
    }

    // Generic interaction for other menu items (excluding wishlist and feedback)
    // FIX: Add event listener to the parent and delegate to the actual menu items.
    // This is more efficient and correctly targets only the items.
    const menuContainer = document.querySelector('.menu-list'); // Assuming a container like .menu-list exists
    if (menuContainer) {
        menuContainer.addEventListener('click', function (e) {
            const item = e.target.closest('.menu-item:not(#wishlist-menu-item):not(#account-feedback-btn)');
            if (item) {
                item.style.backgroundColor = 'rgba(255, 123, 0, 0.2)';
                setTimeout(() => {
                    item.style.backgroundColor = '';
                }, 300);
            }
        });
    }

    // Add animation to feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', function () {
            this.style.transform = 'scale(0.97)';
            setTimeout(() => {
                this.style.transform = '';
            }, 300);
        });
    });

    // Action buttons click handler
    // FIX: Use event delegation on the container to avoid capturing clicks on blank space.
    const scrollableButtonsContainer = document.querySelector('.scrollable-buttons');
    if (scrollableButtonsContainer) {
        scrollableButtonsContainer.addEventListener('click', function (e) {
            const btn = e.target.closest('.action-btn');
            if (btn) { // If a button was clicked
                if (btn.id === 'update-profile-btn') {
                    // If it's the update profile button, navigate
                    const role = localStorage.getItem('currentUserType') || 'guest';
                    routeManager.switchView(role, 'account/profile-update');
                } else if (btn.id !== 'switch-account-btn') { // For any other button except "Switch Account"
                    // Handle other placeholder buttons
                    window.showCustomAlert({
                        title: 'Feature Coming Soon',
                        message: `The "${btnText}" feature is currently under development.`
                    });
                }
            }
        });
    }
}