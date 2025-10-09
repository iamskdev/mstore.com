import { setTheme, getCurrentTheme } from '../../utils/theme-switcher.js';
import { fetchUserById } from '../../utils/data-manager.js';
import { buildCloudinaryUrl } from '../../api/cloudinary.js';
import { formatPhoneNumberWithSpace } from '../../utils/formatters.js';
import { showToast } from '../../utils/toast.js';
import { AuthService } from '../../firebase/auth/auth.js';
import { routeManager } from '../../main.js';
import { getDeferredPrompt, initializePwaInstall } from '../../utils/pwa-manager.js';
import { getAppConfig } from '../../settings/main-config.js';
import { loadFeedbackModal, showFeedbackModal } from '../modals/feedback.js';
import { loadRatingModal, initRatingModal } from '../../modals/rating/rating-modal.js';

export function initializeDrawer() {
  /**
   * Updates the version information in the drawer footer.
   */
  function updateVersionInfo() {
    const config = getAppConfig();
    const appName = config.app.name || 'mStore';
    const appVersion = config.app.version || '0.0.0';
    const appEnvironment = config.app.environment || 'development';

    document.querySelectorAll(".app-version").forEach(el => {
      el.innerHTML = `© 2025 ${appName} | v${appVersion} | ${appEnvironment}`;
    });
  }

  /**
   * Checks if the app is installable and updates the visibility of all install buttons in the drawer.
   */
  function manageInstallButtonVisibility() {
    const isInstallable = !!getDeferredPrompt();
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const installButtons = document.querySelectorAll('.drawer-install-btn');

    if (isInstallable && !isInstalled) {
      installButtons.forEach(btn => btn.classList.remove('hidden'));
    } else {
      installButtons.forEach(btn => btn.classList.add('hidden'));
    }
  }

  /**
   * Updates the entire drawer UI based on the current user's role.
   * It fetches user data and displays the correct view (Guest, User, Merchant, etc.).
   * @param {object} state - The current state from the routeManager.
   * @param {string} state.role - The current user role.
   */
  async function updateDrawerUI({ role, view }) {
    const userType = role;
    const userId = localStorage.getItem('currentUserId');

    // Get all drawer views
    const guestView = document.getElementById('drawer-guest');
    const userView = document.getElementById('drawer-user');
    const merchantView = document.getElementById('drawer-merchant');
    const adminView = document.getElementById('drawer-admin');

    // Hide all views first to ensure a clean state
    guestView.classList.add('hidden');
    userView.classList.add('hidden');
    merchantView.classList.add('hidden');
    adminView.classList.add('hidden');

    if (userType === 'guest' || !userId) {
      guestView.classList.remove('hidden');

      // Get the current hour in Indian Standard Time (IST) for accurate greetings
      const now = new Date();
      const options = { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false };
      const hour = parseInt(new Intl.DateTimeFormat('en-IN', options).format(now), 10);

      const greetingEl = document.getElementById('guest-greeting');
      if (greetingEl) {
        if (hour < 12) greetingEl.textContent = 'Good Morning 👋';
        else if (hour < 17) greetingEl.textContent = 'Good Afternoon 👋'; // Adjusted for typical Indian afternoon
        else greetingEl.textContent = 'Good Evening 👋';
      }
    } else {
      // This logic handles all logged-in users (user, merchant, super-admin)
      let userData = null; // Initialize userData to null
      try {
        // Attempt to fetch user data. This might fail if not authenticated (e.g., using dev switcher after logout).
        userData = await fetchUserById(userId);
      } catch (error) {
        // userData remains null, and the UI will gracefully use fallback values below.
      }

      // A helper function to populate the user info sections
      const populateUserInfo = (prefix) => {
        const avatarEl = document.getElementById(`drawer-${prefix}-avatar`);
        const nameEl = document.getElementById(`drawer-${prefix}-name`);
        const emailEl = document.getElementById(`drawer-${prefix}-email`);
        const phoneEl = document.getElementById(`drawer-${prefix}-phone`);

        // Updated to use the new user schema
        if (avatarEl) {
          // --- FIX: Use buildCloudinaryUrl to construct the correct URL from the public_id ---
          const avatar = userData?.info?.avatar;
          if (avatar) {
            const isCloudinaryId = !avatar.startsWith('./') && !avatar.startsWith('http');
            const avatarUrl = isCloudinaryId ? buildCloudinaryUrl(avatar, {
              width: 256, height: 256, crop: 'fill', quality: 'auto'
            }) : avatar;
            avatarEl.style.backgroundImage = `url('${avatarUrl}')`;
            avatarEl.classList.remove('fallback-icon');
          } else {
            avatarEl.style.backgroundImage = 'none'; // Ensure no background image
            avatarEl.classList.add('fallback-icon');
          }
        }
                if (nameEl) nameEl.textContent = userData?.info?.nickName || userData?.info?.fullName || 'Apna User';
        if (emailEl) emailEl.textContent = userData?.info?.email || 'No email provided';
        if (phoneEl) {
            const formattedPhone = formatPhoneNumberWithSpace(userData?.info?.phone);
            phoneEl.textContent = formattedPhone || 'No phone number provided';
        }
      };

      // --- Refactored View Switching Logic ---
      // This data-driven approach is cleaner and more scalable than a long if-else chain.
      const roleToViewMap = {
        'consumer': userView,
        'merchant': merchantView,
        'admin': adminView
      };

      const viewToShow = roleToViewMap[userType];

      if (viewToShow) {
        viewToShow.classList.remove('hidden');
        // FIX: The drawer's HTML uses 'user' as the prefix for consumer elements (e.g., 'drawer-user-avatar').
        // Map the 'consumer' role to the 'user' prefix for the UI.
        populateUserInfo(userType === 'consumer' ? 'user' : userType);
      } else {
        // Fallback to guest view if the role is unknown or doesn't have a specific drawer.
        guestView.classList.remove('hidden');
      }
    }

    // Highlight the active navigation item in the drawer
    const navItems = document.querySelectorAll('.drawer-item[data-path]');
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.path === view && item.dataset.role === role);
    });

    // After updating the main drawer view, always check and manage the install button visibility.
    manageInstallButtonVisibility();
  }

  // Drawer open/close logic
  const drawer = document.getElementById('app-drawer');
  const overlay = document.getElementById('drawerOverlay');

  function toggleDrawer() {
    drawer.classList.toggle('open');
    overlay.classList.toggle('visible');
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('visible');
  }
  overlay.addEventListener('click', closeDrawer);

  // Listen for the request from the header to toggle the drawer
  window.addEventListener('toggleDrawerRequest', toggleDrawer);

  // --- Auth Modal Triggers ---
  // This function dispatches an event to request the auth modal.
  function requestAuth(formType) {
    sessionStorage.setItem('initialAuthTab', formType); // Use sessionStorage to reliably set the initial tab
    routeManager.switchView('guest', 'account/authentication');
    closeDrawer();
  }

  // Guest: Login or Sign Up button
  document.getElementById('drawer-login-signup-btn')?.addEventListener('click', () => requestAuth('login'));

  // Logout logic (sabhi roles ke liye)
  function logout() {
    AuthService.handleLogout(); // Call the centralized logout handler
    // The AuthService.handleLogout will now manage routeManager.handleRoleChange and showToast

    // Close the drawer
    closeDrawer();
  }
  document.querySelectorAll('.drawer-logout-btn').forEach(btn => {
    btn.addEventListener('click', logout);
  });

  // --- Dev Quick Actions for Admin ---
  document.getElementById('dev-clear-storage')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all local and session storage? This will log you out.')) {
      localStorage.clear();
      sessionStorage.clear();
      location.reload();
    }
  });

  document.getElementById('dev-force-reload')?.addEventListener('click', () => {
    location.reload(true);
  });

  document.getElementById('dev-test-toast')?.addEventListener('click', () => {
    // Use the imported showToast function for consistency
    showToast('info', 'This is a test toast! 🚀', 3000);
    closeDrawer();
  });

  // --- "Coming Soon" Feature Toasts ---
  // This adds a listener to all drawer items that are not yet implemented.
  // It provides user feedback instead of the button doing nothing.
  function setupComingSoonListeners() {
    document.querySelectorAll('.feature-not-implemented').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default action, especially for <a> tags
        e.stopPropagation(); // Stop the event from bubbling up
        showToast('info', 'New festure arrival soon ✨', 3000);
        closeDrawer();
      });
    });
  }
  // Call this function once the DOM is ready.
  // It's safe to call it here as the script runs after the HTML.
  setupComingSoonListeners()

  // --- Web Share API for the "Share App" button ---
  // This modern PWA feature provides a native sharing experience.
  function setupShareButton() {
    const shareButtons = document.querySelectorAll('.app-share-btn');

    shareButtons.forEach(button => {
      // Check if the Web Share API is supported by the browser
      if (navigator.share) {
        button.addEventListener('click', async () => {
          try {
            await navigator.share({
              title: 'mStore - Your Digital Marketplace',
              text: 'Buy, sell, and discover products or services with ease, anytime, anywhere.',
              url: window.location.origin, // Shares the main URL of the app
            });
            console.log('App shared successfully!');
          } catch (error) {
            // Show a toast only if the error is not an AbortError (user cancelled the share)
            if (error.name !== 'AbortError') {
              showToast('error', 'Could not share the app.');
            }
          }
          closeDrawer(); // Close the drawer after the share action
        });
      }
    });
  }
  setupShareButton();

  // --- Drawer Navigation Logic ---
  // This handles clicks on any drawer item that has data-role and data-path attributes.
  function setupDrawerNavigation() {
    const drawerElement = document.getElementById('app-drawer');
    if (!drawerElement) return;

    drawerElement.addEventListener('click', (e) => {
      // Find the closest ancestor that is a drawer-item with the required data attributes
      const navItem = e.target.closest('.drawer-item[data-role][data-path]');
      if (navItem) {
        e.preventDefault(); // Prevent default action for <a> tags
        const role = navItem.dataset.role;
        const viewId = navItem.dataset.path;

        // Tell the view manager to switch views
        routeManager.switchView(role, viewId);
        closeDrawer(); // Close the drawer after navigation
      }
    });
  }
  setupDrawerNavigation();

  // --- Theme Toggle Logic ---
  // This logic needs to run for all drawers (guest, user, etc.)
  function setupThemeToggles() {
    const currentTheme = getCurrentTheme();
    const checkboxes = document.querySelectorAll('.theme-toggle-checkbox');

    checkboxes.forEach(checkbox => {
      // Set initial state of the checkbox
      checkbox.checked = currentTheme === 'dark';

      // Add event listener
      checkbox.addEventListener('change', () => {
        const newTheme = checkbox.checked ? 'dark' : 'light';
        setTheme(newTheme);
      });
    });

    // Also, listen for theme changes from other sources to keep all toggles in sync.
    window.addEventListener('themeChanged', (event) => {
      const theme = event.detail.theme;
      checkboxes.forEach(checkbox => { checkbox.checked = theme === 'dark'; });
    });
  }
  setupThemeToggles();

  // --- PWA Install Button Management ---
  // Listen for the events from the PWA manager to update button visibility in real-time.
  window.addEventListener('pwaInstallReady', manageInstallButtonVisibility);
  window.addEventListener('pwaAlreadyInstalled', manageInstallButtonVisibility);
  // Initialize the PWA install logic which sets up the click handlers for the buttons.
  initializePwaInstall();

  // --- Feedback Modal Trigger --- <-- Added this section
  // Attach event listeners to all feedback buttons to show the modal
  document.querySelectorAll('.feedback-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Use the new centralized function to show the modal. It handles everything.
      showFeedbackModal(); // No context is needed for general feedback.
      closeDrawer(); // Close the drawer when feedback modal is opened
    });
  });

  // --- Rating Modal Trigger ---
  document.querySelectorAll('.rate-us-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ratingModal = document.getElementById('rating-modal');
      if (ratingModal) {
        ratingModal.style.display = 'flex';
      }
      closeDrawer();
    });
  });


  // Subscribe to the routeManager for state changes. This is the single source of truth.
  // It will provide the initial state immediately and all subsequent state changes.
  routeManager.subscribe(updateDrawerUI);

  // --- Initialize Version Info ---
  updateVersionInfo();

  console.log("✅ Drawer: Subscribed to routeManager for state updates.");
}

export async function loadDrawer() {
  const drawerPlaceholder = document.getElementById('app-drawer');
  if (!drawerPlaceholder) {
    console.error('The #app-drawer element was not found in the DOM.');
    return;
  }

  try {
    const response = await fetch('./source/partials/drawer/drawer.html');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();

    // Create a temporary container to hold the new content
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html;

    // Replace the placeholder with the new nodes from the fetched HTML
    // This prevents creating a nested element with a duplicate ID.
    drawerPlaceholder.replaceWith(...tempContainer.childNodes);

    console.log('Drawer HTML loaded and replaced placeholder.');
    
    // FIX: Isolate the feedback modal initialization in its own try-catch block.
    // This ensures that if the feedback modal fails to initialize, it does not
    // prevent the main drawer from rendering and functioning.
    // --- Load Modals ---
    // Load modal HTML. The JS logic (showFeedbackModal, etc.) will handle initialization on first use.
    await loadFeedbackModal();
    const ratingModalElement = await loadRatingModal();
    setTimeout(() => {
      try {
        initRatingModal(ratingModalElement);
      } catch (e) {
        console.error("Drawer Warning: Failed to initialize rating modal logic.", e);
      }
    }, 0);

    initializeDrawer(); // Initialize the drawer's own logic

  } catch (error) {
    console.error('Could not load or initialize the drawer:', error);
  }
}