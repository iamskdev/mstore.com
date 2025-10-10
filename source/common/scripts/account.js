import { fetchUserById, fetchAccountById, fetchMerchantById, localCache, fetchAllMerchants } from '../../utils/data-manager.js';
import { buildCloudinaryUrl } from '../../api/cloudinary.js';
import { routeManager } from '../../main.js';
import { showFeedbackModal } from '../../partials/modals/feedback.js';

/**
 * Renders the user's profile data onto the account page.
 */
async function renderProfileData() {
    const userId = localCache.get('currentUserId');
    const currentUserType = localCache.get('currentUserType');

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
        // --- FIX: Use Promise.allSettled for resilient data fetching ---
        // This ensures that even if fetching account or merchant data fails (e.g., due to missing
        // data sources), the primary user data will still be rendered, preventing a "Could not load" error.
        const [userResult, accountResult, merchantResult] = await Promise.allSettled([
            fetchUserById(userId),
            fetchAccountById(localCache.get('currentAccountId')),
            // Fetch current merchant data only if the active role is 'merchant'
            currentUserType === 'merchant' ? fetchMerchantById(localCache.get('currentMerchantId')) : Promise.resolve(null)
        ]);

        // Extract the data from the settled promises.
        const user = userResult.status === 'fulfilled' ? userResult.value : null;
        const account = accountResult.status === 'fulfilled' ? accountResult.value : null;
        const merchant = merchantResult.status === 'fulfilled' ? merchantResult.value : null;

        // If the essential user data could not be fetched, throw an error.
        if (!user) {
            // If the user fetch failed, log the reason and throw an error to show the failure UI.
            if (userResult.status === 'rejected') {
                console.error("Primary user fetch failed:", userResult.reason);
            }
            throw new Error('User not found');
        }
        console.log('DEBUG: Fetched data in account.js:', { user, account, merchant });

        // --- NEW: Ensure buttons and divider are visible for logged-in users ---
        if (scrollableButtons) scrollableButtons.style.display = 'flex';

        usernameDisplay.style.display = 'block'; // Ensure username is visible for logged-in users

        // Update Name
        // FIX: Prioritize nickName over fullName for consistency with top-nav.
        nameDisplay.textContent = user.info?.nickName || user.info?.fullName || 'Anonymous User';

        // --- NEW: Role-based header logic ---
        if (currentUserType === 'merchant' && merchant) {
            // For merchants, show their handle (without the extra @) and a "View Profile" link
            usernameDisplay.innerHTML = `
                <span>@${merchant.info.handle.replace('@', '')}</span>
                <span class="action-link" data-merchant-id="${merchant.meta.merchantId}">› View Profile</span>
            `;
            usernameDisplay.querySelector('.action-link').addEventListener('click', (e) => {
                const merchantId = e.target.dataset.merchantId;
                routeManager.switchView(currentUserType, `merchant-profile/${merchantId}`);
            });
        } else if (currentUserType === 'consumer') {
            // For consumers, show their username and potentially a "Create Business Profile" link
            const hasMerchantProfiles = user.meta?.links?.merchantIds && user.meta.links.merchantIds.length > 0;
            const username = user.info?.username ? `@${user.info.username}` : '';
            // FIX: Shorten the text to "Create Business"
            const createProfileLink = !hasMerchantProfiles
                ? `<span class="action-link" id="create-business-profile-link">› Create Business</span>`
                : '';
            usernameDisplay.innerHTML = `<span>${username}</span>${createProfileLink}`;

            if (!hasMerchantProfiles) {
                document.getElementById('create-business-profile-link')?.addEventListener('click', () => {
                    // Placeholder: In a real app, this would navigate to a merchant registration page
                    window.showCustomAlert({ title: 'Coming Soon', message: 'The business profile creation flow is under development.' });
                });
            }
        } else {
            // For other roles like admin, just show the username.
            const username = user.info?.username ? `@${user.info.username}` : '';
            usernameDisplay.innerHTML = `<span>${username}</span>`;
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

            // FIX: Check if the avatar is a Cloudinary public_id or a local path
            const isCloudinaryId = user.info.avatar && !user.info.avatar.startsWith('./');
            const avatarUrl = isCloudinaryId ? buildCloudinaryUrl(user.info.avatar) : user.info.avatar;
            avatarImg.src = avatarUrl;
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
        const userId = localCache.get('currentUserId');
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
            console.log(`[SwitchAccount] 1. Fetching user data for userId: ${userId}`);
            const user = await fetchUserById(userId);
            console.log('[SwitchAccount] 1a. User data fetched successfully:', user);

            // --- FIX: Securely fetch only the user's own merchant profiles ---
            // This avoids calling fetchAllMerchants(), which causes permission errors for non-admins.
            let merchantProfiles = [];
            const userMerchantIds = user.meta?.links?.merchantIds || [];
            console.log(`[SwitchAccount] 3. Found ${userMerchantIds.length} linked merchant IDs.`);
 
            if (userMerchantIds.length > 0) {
                console.log(`[SwitchAccount] 3a. Fetching individual merchant profiles...`);
                const merchantPromises = userMerchantIds.map(id => fetchMerchantById(id));
                merchantProfiles = (await Promise.all(merchantPromises)).filter(Boolean); // Filter out any null results
                console.log('[SwitchAccount] 3b. Merchant profiles fetched successfully:', merchantProfiles);
            }

            let roles;
            // FIX: Use user.meta.roles as the source of truth, isSuperAdmin is for additional capabilities.
            roles = user?.meta?.roles || [];
            if (user?.meta?.flags?.isSuperAdmin && !roles.includes('admin')) {
                roles.push('admin'); // Ensure super admin always has admin role option
            }
            const currentRole = localCache.get('currentUserType');

            const roleIcons = {
                consumer: 'fa-user',
                merchant: 'fa-user-tie',
                admin: 'fa-user-shield'
            };

            roleListContainer.innerHTML = ''; // Clear loader

            // --- NEW: Final Role-based Modal Logic ---
            const isSuperAdmin = user?.meta?.flags?.isSuperAdmin;
            const currentMerchantId = localCache.get('currentMerchantId');

            if (isSuperAdmin) {
                // --- SUPER ADMIN VIEW ---
                // Always show all three primary roles for testing.
                ['consumer', 'merchant', 'admin'].forEach(role => {
                    // For the generic 'merchant' switch, don't pass a specific merchant object.
                    const item = createRoleItem({
                        role: role,
                        user: user,
                        isActive: currentRole === role && !currentMerchantId, // Active only if it's the generic role
                        currentRole: currentRole
                    });
                    roleListContainer.appendChild(item);
                });

                // Now, add the conditional action button based on the current role.
                if (currentRole === 'consumer') { // This was the block with the error
                    const createBtn = createActionRoleItem('fa-store', 'Create Business Profile', 'User • Merchant Account', () => {
                        window.showCustomAlert({ title: 'Coming Soon', message: 'The business profile creation flow is under development.' });
                        closeModal();
                    });
                    roleListContainer.appendChild(createBtn);
                } else if (currentRole === 'merchant') { // This was the block with the error
                    const addBtn = createActionRoleItem('fa-plus-circle', 'Add Another Business', 'User • Merchant Account', () => {
                        window.showCustomAlert({ title: 'Coming Soon', message: 'The flow to add another business is under development.' });
                        closeModal();
                    });
                    roleListContainer.appendChild(addBtn);
                }

            } else {
                // --- STANDARD USER VIEW (Consumer/Merchant) ---
                const consumerItem = createRoleItem({ role: 'consumer', user, isActive: currentRole === 'consumer', isSuspended: user.meta?.flags?.isSuspended, currentRole });
                roleListContainer.appendChild(consumerItem);

                if (userMerchantIds.length > 0) {
                    merchantProfiles.sort((a, b) => {
                        if (a.meta.merchantId === currentMerchantId) return -1;
                        if (b.meta.merchantId === currentMerchantId) return 1;
                        return a.info.storeName.localeCompare(b.info.storeName);
                    });
                    merchantProfiles.forEach(merchant => {
                        const merchantItem = createRoleItem({ role: 'merchant', user, merchant, isActive: currentRole === 'merchant' && currentMerchantId === merchant.meta.merchantId, isSuspended: user.meta?.flags?.isSuspended || merchant.meta?.flags?.isSuspended, currentRole });
                        roleListContainer.appendChild(merchantItem);
                    });
                    const addBusinessBtn = createActionRoleItem('fa-plus-circle', 'Add Another Business', 'User • Merchant Account', () => {
                        window.showCustomAlert({ title: 'Coming Soon', message: 'The flow to add another business is under development.' });
                        closeModal();
                    });
                    roleListContainer.appendChild(addBusinessBtn);
                } else if (roles.includes('consumer')) {
                    const createBusinessBtn = createActionRoleItem('fa-store', 'Create Business Profile', 'User • Merchant Account', () => {
                        window.showCustomAlert({ title: 'Coming Soon', message: 'The business profile creation flow is under development.' });
                        closeModal();
                    });
                    roleListContainer.appendChild(createBusinessBtn);
                }
            }
        } catch (error) {
            console.error('Failed to fetch user roles:', error);
            roleListContainer.innerHTML = '<p>Could not load Accounts.</p>';
        } // The misplaced brace was here, now it's correct.
    };

    const closeModal = () => modal.classList.remove('visible');
    
    const switchRole = (newRole, merchantId = null) => {
        const userId = localStorage.getItem('currentUserId');
        console.log(`Switching to role: ${newRole} for user: ${userId}`, merchantId ? `Merchant: ${merchantId}` : '');
        // The routeManager will handle updating localStorage and reloading the view.
        routeManager.handleRoleChange(newRole, userId, merchantId);
        closeModal();
    };

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => e.target === modal && closeModal());
}

/**
 * Helper function to create a role item for the switch account modal.
 * @param {object} config - Configuration for the item.
 * @returns {HTMLElement} The created DOM element.
 */
function createRoleItem({ role, user, merchant = null, isActive, isSuspended = false, currentRole }) {
    // --- FIX: Correctly determine active state for merchant accounts ---
    // The `isActive` flag passed in was not always correct for merchants.
    // We need to explicitly check if the current role is 'merchant' AND
    // if the current merchant ID matches the one for this item.
    const currentMerchantId = localCache.get('currentMerchantId');
    const isActuallyActive = (role === 'merchant' && merchant) ? (currentRole === 'merchant' && currentMerchantId === merchant.meta.merchantId) : isActive;

    const item = document.createElement('div');    
    item.className = 'switch-account-item';
    item.dataset.role = role;
    if (merchant) {
        item.dataset.merchantId = merchant.meta.merchantId;
    }
    
    let statusIconHtml = '';
    if (isSuspended) {
        item.classList.add('disabled');
        statusIconHtml = '<div class="status-icon suspended"><i class="fas fa-ban"></i></div>';    
    } else if (isActuallyActive) {
        statusIconHtml = '<div class="status-icon active"><i class="fas fa-check-circle"></i></div>';
    }

    let displayName, avatarHtml;

    if (role === 'merchant' && merchant) {
        // --- FIX: Use merchant's logo and name for merchant accounts ---
        displayName = merchant.info.name;
        // --- FIX: Differentiate between local paths and Cloudinary public_ids ---
        // Only build a Cloudinary URL if the path is not a local one (doesn't start with './' or '/').
        const logoPath = merchant.info.logo;
        let finalLogoUrl = null;
        if (logoPath) {
            finalLogoUrl = !logoPath.startsWith('./') && !logoPath.startsWith('/') ? buildCloudinaryUrl(logoPath) : logoPath;
        }
        avatarHtml = finalLogoUrl // FIX: Use the correct variable name 'finalLogoUrl' instead of 'logoUrl'
            ? `<img src="${finalLogoUrl}" alt="${displayName} Logo">`
            : `<i class="fas fa-store"></i>`; // Fallback icon for merchant
    } else {
        // For consumer and admin roles, use user's info
        displayName = user.info?.nickName || user.info?.fullName || 'Apna User';
        const avatarUrl = user.info?.avatar ? buildCloudinaryUrl(user.info.avatar) : null;
        avatarHtml = avatarUrl ? `<img src="${avatarUrl}" alt="Avatar">` : `<i class="fas fa-user-circle"></i>`;
    }
    const roleTags = getTagsForRole(role, user, null, merchant, { showPremium: false, showPrivilegeTags: false });

    item.innerHTML = `
        <div class="switch-account-avatar">${avatarHtml}</div>
        <div class="switch-account-details">
            <span class="user-full-name">${displayName}</span>
            <span class="account-role-type">${roleTags}</span>
        </div>
        ${statusIconHtml}
    `;

    if (!isSuspended) {
        item.addEventListener('click', () => {
            const newRole = item.dataset.role;
            const merchantId = item.dataset.merchantId || null;
            const currentMerchantId = localCache.get('currentMerchantId');

            // Prevent re-switching to the already active role/merchant
            if (newRole === currentRole && merchantId === currentMerchantId) {
                return;
            }
            routeManager.handleRoleChange(newRole, user.meta.userId, merchantId);
            document.getElementById('switch-account-modal').classList.remove('visible');
        });
    }
    return item;
}

function createActionItem(iconClass, text, onClick) {
    const item = document.createElement('div');
    item.className = 'switch-account-action-item';
    item.innerHTML = `<i class="fas ${iconClass}" style="margin-right: 15px; width: 20px; text-align: center;"></i> ${text}`;
    item.addEventListener('click', onClick);
    return item;
}

/**
 * NEW: Helper function to create an action item that looks like a role item.
 * @param {string} iconClass - Font Awesome icon class.
 * @param {string} title - The main text (e.g., "Create Business Profile").
 * @param {string} subtitle - The secondary text (e.g., "User • Merchant Account").
 * @param {function} onClick - The function to call on click.
 * @returns {HTMLElement} The created DOM element.
 */
function createActionRoleItem(iconClass, title, subtitle, onClick) {
    const item = document.createElement('div');
    item.className = 'switch-account-item action-item'; // Use same base class + an action identifier
    item.innerHTML = `
        <div class="switch-account-avatar"><i class="fas ${iconClass}"></i></div>
        <div class="switch-account-details">
            <span class="user-full-name">${title}</span>
            <span class="account-role-type">${subtitle}</span>
        </div>`;
    item.addEventListener('click', onClick);
    return item;
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
            // Get the current role from localCache to navigate correctly
            const role = localCache.get('currentUserType') || 'guest';
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
                    // If it's the update profile button, navigate to the profile update page
                    const role = localCache.get('currentUserType') || 'guest';
                    routeManager.switchView(role, 'account/profile-update');
                } else if (btn.id !== 'switch-account-btn') { // For any other button except "Switch Account"
                    // Handle other placeholder buttons
                    const btnText = btn.textContent.trim();
                    window.showCustomAlert({
                        title: 'Feature Coming Soon',
                        message: `The "${btnText}" feature is currently under development.`
                    });
                }
            }
        });

        // --- NEW: Add horizontal scroll with mouse wheel ---
        scrollableButtonsContainer.addEventListener('wheel', (e) => {
            // Prevent the default vertical scroll to avoid page scrolling
            e.preventDefault();
            // Scroll horizontally based on the vertical wheel movement
            scrollableButtonsContainer.scrollLeft += e.deltaY;
        });
    }
}