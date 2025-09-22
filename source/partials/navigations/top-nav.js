import { fetchUserById, fetchMerchantById } from '../../utils/data-manager.js';
import { getAppConfig } from '../../settings/main-config.js';

export function initializeTopNavigation() {
    // --- Elements ---
    const topNav = document.getElementById('top-nav');
    const searchToggleBtn = document.getElementById('search-toggle');
    const searchBackBtn = document.getElementById('search-back');
    const searchInput = document.getElementById('header-search-input');
    const searchClearBtn = document.getElementById('search-clear');
    
    const notificationIcon = document.getElementById('notification-icon');
    const bellIcon = notificationIcon?.querySelector('i');
    const badge = notificationIcon?.querySelector('.notification-badge');
    const logoEl = document.querySelector('.logo-container img');
    const nameEl = document.getElementById('header-name');
    const logoContainer = document.querySelector('.logo-container');

    const notificationHeaderContent = document.querySelector('.notification-header-content');
    const notificationBackBtn = document.getElementById('notification-back-btn');
    const notificationTitle = document.getElementById('notification-title');

    // --- Functions ---
    function initializeHeaderStyle() {
      const headerStyle = getAppConfig().ui.headerStyle || 'logo';
      const menuIconEl = document.querySelector('[data-header-item="menu"]');
      if (logoContainer && menuIconEl) {
        logoContainer.classList.toggle('hidden', headerStyle === 'menu');
        menuIconEl.classList.toggle('hidden', headerStyle !== 'menu');
      }
    }

    function openSearchView() {
      topNav.classList.add('search-active');
      searchInput.value = '';
      searchInput.focus();
    }

    function closeSearchView() {
      topNav.classList.remove('search-active');
      searchClearBtn.style.display = 'none';
      const suggestionsBox = document.getElementById('search-suggestions');
      if (suggestionsBox) {
        suggestionsBox.style.display = 'none';
        suggestionsBox.innerHTML = '';
      }
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

      // Dynamic Branding Logic
      if (userType === 'user' && userId) {
        logoContainer.classList.add('is-loading-avatar');
        nameEl.textContent = 'User Panel';
        fetchUserById(userId).then(userData => {
          if (userData) {
            nameEl.textContent = userData.info?.nickName || userData.info?.fullName || 'Apna User';
            setLogo(userData.info?.avatar);
          }
        });
      } else if (userType === 'merchant' && userId) {
        logoContainer.classList.add('is-loading-avatar');
        nameEl.textContent = 'User Panel';
        (async () => {
          try {
            const userData = await fetchUserById(userId);
            if (!userData) throw new Error("User data not found for merchant.");
            const merchantId = userData.meta?.links?.merchantId;
            if (merchantId) {
              const merchantData = await fetchMerchantById(merchantId);
              if (merchantData) {
                nameEl.textContent = merchantData.meta?.info?.name || 'Merchant Store';
                setLogo(merchantData.meta?.info?.logo);
              } else {
                nameEl.textContent = userData.info?.fullName || 'Merchant Panel';
                setLogo(userData.info?.avatar);
              }
            } else {
              nameEl.textContent = userData.info?.fullName || 'Merchant Panel';
              setLogo(userData.info?.avatar);
            }
          } catch (error) {
            console.error("Header: Failed to fetch merchant branding.", error);
            nameEl.textContent = 'Merchant Panel';
            setLogo(defaultLogo);
          }
        })();
      } else {
        setLogo(defaultLogo);
        nameEl.textContent = defaultName;
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

      // Re-apply header style
      initializeHeaderStyle();
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

    if (searchToggleBtn) searchToggleBtn.addEventListener('click', openSearchView);
    if (searchBackBtn) searchBackBtn.addEventListener('click', closeSearchView);
    window.addEventListener('closeSearchViewRequest', closeSearchView);

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
        if (window.routeManager.currentView === 'notifications') {
          // If already in notifications view, go back
          window.history.back();
        } else {
          // Otherwise, open notifications view
          const currentRole = window.routeManager.currentRole;
          window.dispatchEvent(new CustomEvent('requestViewChange', {
            detail: { role: currentRole, view: 'notifications' }
          }));
        }
      });
    }

    // --- Initialization ---
    window.routeManager.subscribe(updateHeaderUI);
    // NEW: Subscribe the notification icon UI update function
    window.routeManager.subscribe(updateNotificationIconUI);
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