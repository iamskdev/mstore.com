import { fetchUserById, fetchMerchantById } from '../../utils/data-manager.js';
import { getAppConfig } from '../../settings/main-config.js';
import { routeManager } from '../../main.js'; // DEFINITIVE FIX: Import routeManager directly

export function initializeTopNavigation() {
    // --- Elements ---
    const topNav = document.getElementById('top-nav');
    const searchToggleBtn = document.getElementById('search-toggle');    
    const searchInput = document.getElementById('header-search-input');
    const searchClearBtn = document.getElementById('search-clear');
    
    const settingsIcon = document.getElementById('settings-icon'); // NEW: Get settings icon
    const notificationIcon = document.getElementById('notification-icon');
    const bellIcon = notificationIcon?.querySelector('i');
    const badge = notificationIcon?.querySelector('.notification-badge');
    const logoEl = document.querySelector('.logo-container img');
    const nameEl = document.getElementById('header-name');
    const menuIconEl = document.getElementById('header-menu-icon');
    const logoContainer = document.querySelector('.logo-container');

    // NEW: Universal Back Button for secondary views
    const viewBackBtn = document.getElementById('view-back-btn');

    const notificationHeaderContent = document.querySelector('.notification-header-content');
    const notificationBackBtn = document.getElementById('notification-back-btn');
    const notificationTitle = document.getElementById('notification-title');

    // --- Functions ---
    function initializeHeaderStyle() {
      // NEW: Handles 'logo', 'menu', and 'both' styles.
      if (logoContainer && menuIconEl) {
        const headerStyle = getAppConfig().ui.headerStyle || 'logo';

        // Determine visibility based on the style
        const showLogo = (headerStyle === 'logo' || headerStyle === 'both');
        const showMenu = (headerStyle === 'menu' || headerStyle === 'both');

        // Apply the 'hidden' class based on the logic
        logoContainer.classList.toggle('hidden', !showLogo);
        menuIconEl.classList.toggle('hidden', !showMenu);

        // This function is only for main views, so the universal back button is always hidden.
        // The secondary view logic handles showing it.
        viewBackBtn.classList.add('hidden');
      }
    }

    function openSearchView() {
      topNav.classList.add('search-active');
      searchInput.value = '';
      // Show the universal back button for search mode
      viewBackBtn.classList.remove('hidden');
      searchInput.focus();
    }

    /**
     * Closes the search view and correctly restores the header's state.
     * FIX: This function now re-evaluates the header UI based on the current view
     * to prevent the bug where the wrong icon (e.g., menu icon) appears after search.
     */
    function closeSearchView() {
      searchClearBtn.style.display = 'none';
      const suggestionsBox = document.getElementById('search-suggestions');
      if (suggestionsBox) {
        suggestionsBox.style.display = 'none';
        suggestionsBox.innerHTML = '';
      }

      topNav.classList.remove('search-active');
      updateHeaderUI(routeManager.getCurrentState());
    }

    function updateHeaderUI({ role, view, config }) {
      const userType = role;
      const appMode = getAppConfig().app.environment;
      const userId = localStorage.getItem('currentUserId');
      const defaultLogo = './source/assets/logos/app-logo.png';
      const defaultName = 'mStore';

      const setLogo = (logoUrl) => {
        const finalLogoUrl = logoUrl || defaultLogo;
        logoEl.src = finalLogoUrl;
        logoContainer.classList.toggle('is-avatar', !finalLogoUrl.includes('app-logo.png'));
        logoContainer.classList.remove('is-loading-avatar');
      };

      // --- NEW: Dynamic Header Logic based on View Type ---
      // FIX: Check the config of the *exact* view, not just the base path.
      // This correctly distinguishes 'account' (main tab) from 'account/authentication' (secondary view).
      // The config object passed here is already correctly resolved by the routeManager.
      const isMainTabView = config.isMainTab === true;

      if (isMainTabView) {
        // --- Main Tab View (e.g., Home, Account) ---
        nameEl.textContent = defaultName; // Always show app name
        setLogo(defaultLogo); // Always show app logo
        
        // DEFINITIVE FIX: Directly control visibility like the settings icon.
        // This avoids all CSS race conditions and complexity.
        const headerStyle = getAppConfig().ui.headerStyle || 'logo';
        const showLogo = (headerStyle === 'logo' || headerStyle === 'both');
        const showMenu = (headerStyle === 'menu' || headerStyle === 'both');

        // 1. Hide both first to ensure a clean state.
        logoContainer.classList.add('hidden');
        menuIconEl.classList.add('hidden');
        // 2. Then, explicitly un-hide the correct one(s).
        logoContainer.classList.toggle('hidden', !showLogo);
        menuIconEl.classList.toggle('hidden', !showMenu);

        // On a main tab, the back button should be hidden (unless search is active, which is handled by open/closeSearchView).
        viewBackBtn.classList.add('hidden');
      } else {
        // --- Secondary View (e.g., Notifications, Login, Conversation) ---
        nameEl.textContent = config?.title || defaultName; // Use view-specific title

        // Show the universal back button
        viewBackBtn.classList.remove('hidden');

        // Hide the main branding items (logo and menu icon)
        logoContainer.classList.add('hidden');
        menuIconEl.classList.add('hidden');
      }

      // Reset indicators
      if (bellIcon && badge) {
        bellIcon.className = 'fas fa-bell';
        badge.className = 'notification-badge hidden';
        badge.textContent = '3';
        notificationIcon.title = '';
      }

      // Set indicators based on mode/role
      if (getAppConfig().flags.maintenanceMode) {
        if (bellIcon && badge) {
          badge.textContent = 'M'; // Example: Use 'M' for maintenance
          badge.className = 'notification-badge maintenance-indicator'; // New class for maintenance
          notificationIcon.title = 'Maintenance mode is active.';
        }
      } else if (appMode === 'development') {
        if (bellIcon && badge) {
          badge.textContent = '!';
          badge.className = 'notification-badge dev-indicator';
          notificationIcon.title = 'Developer mode is active.';
        }
      } else if (getAppConfig().flags.promotionEnabled) {
        if (bellIcon && badge) {
          badge.textContent = '★';
          badge.className = 'notification-badge storefront-indicator';
          notificationIcon.title = 'You are viewing a featured store.';
        }
      } else if (userType === 'admin') {
        if (bellIcon && badge) {
          badge.textContent = 'A'; // Example: Use 'A' for admin
          badge.className = 'notification-badge admin-indicator'; // New class for admin
          notificationIcon.title = 'Admin panel is active.';
        }
      }

      // --- NEW: Show/Hide Settings Icon ---
      // Show the settings icon only when the current view is 'account'.
      if (settingsIcon) {
        settingsIcon.classList.toggle('hidden', view !== 'account');
      }
    }

    // NEW: Function to update the notification icon's UI
    function updateNotificationIconUI({ view }) {
      if (notificationIcon) {
        if (view === 'notifications') {
          notificationIcon.classList.add('active-notification');
          if (bellIcon) {
            bellIcon.classList.add('bell-shake');
            setTimeout(() => {
              bellIcon.classList.remove('bell-shake');
            }, 500); // Remove shake after 0.5 seconds
          }
        } else {
          notificationIcon.classList.remove('active-notification');
        }
      }
    }

    // --- Event Listeners ---
    document.querySelectorAll('#header-logo-container, #header-menu-icon').forEach(el => {
      el.addEventListener('click', () => window.dispatchEvent(new CustomEvent('toggleDrawerRequest')));
    });

    // NEW: Add click listener for the universal back button
    if (viewBackBtn) {
        viewBackBtn.addEventListener('click', () => {
            // If search is active, the button's job is to close the search.
            if (topNav.classList.contains('search-active')) {
                closeSearchView();
            } else {
                // Otherwise, its job is to go back in history.
                window.history.back();
            }
        });
    }

    if (searchToggleBtn) searchToggleBtn.addEventListener('click', openSearchView);    
    window.addEventListener('closeSearchViewRequest', closeSearchView);

    // NEW: Add a click listener for the settings icon
    if (settingsIcon) {
      settingsIcon.addEventListener('click', () => {
        // Use the new global custom alert
        window.showCustomAlert({
          title: 'Settings',
          message: 'This feature is under development. Account settings will appear here soon!',
          buttons: [
            {
              text: 'Got It',
              class: 'primary',
              onClick: () => window.hideCustomAlert()
            }
          ]
        });
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchClearBtn.style.display = searchInput.value ? 'block' : 'none';
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        searchClearBtn.style.display = 'none';
        const suggestionsBox = document.getElementById('search-suggestions');
        if (suggestionsBox) suggestionsBox.style.display = 'none';
      });
    }

    if (notificationIcon) {
      notificationIcon.addEventListener('click', (e) => {
        // Ripple effect for notification icon
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        // Calculate size for ripple (based on notificationIcon dimensions)
        const size = Math.max(notificationIcon.offsetWidth, notificationIcon.offsetHeight) * 1.5;

        ripple.style.width = ripple.style.height = `${size}px`;
        // Position the ripple in the center of the notificationIcon
        ripple.style.left = `${(notificationIcon.offsetWidth - size) / 2}px`;
        ripple.style.top = `${(notificationIcon.offsetHeight - size) / 2}px`;

        notificationIcon.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600); // Remove after animation

        // NEW LOGIC: Check current view before dispatching
        if (routeManager.currentView === 'notifications') {
          // If already in notifications view, go back
          window.history.back();
        } else {
          // Otherwise, open notifications view
          const currentRole = routeManager.currentRole;
          window.dispatchEvent(new CustomEvent('requestViewChange', {
            detail: { role: currentRole, view: 'notifications' }
          }));
        }
      });
    }

    // --- Initialization ---
    routeManager.subscribe(updateHeaderUI);
    // NEW: Subscribe the notification icon UI update function
    routeManager.subscribe(updateNotificationIconUI);
    console.log("✅ Header: Subscribed to routeManager for state updates.");
}

// NEW: Function to load the HTML and then initialize the existing logic
/**
 * Fetches and loads the top navigation bar HTML into the #top-nav element,
 * then initializes its dynamic behavior using the existing initializeTopNavigation function.
 */
export async function loadTopNavigation() {
  const topNavContainer = document.getElementById('top-nav');
  if (!topNavContainer) {
    console.error('The #top-nav element was not found in the DOM.');
    return;
  }

  try {
    const response = await fetch('./source/partials/navigations/top-nav.html');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    topNavContainer.innerHTML = html;
    console.log('Top navigation HTML loaded.');

    // Call the existing initialization function after HTML is loaded
    initializeTopNavigation();

  } catch (error) {
    console.error('Could not load or initialize the top navigation:', error);
  }
}