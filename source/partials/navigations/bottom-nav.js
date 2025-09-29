import { fetchUserById } from '../../utils/data-manager.js';

/**
 * Initializes the dynamic behavior of the bottom navigation bar.
 * This function should be called AFTER the HTML content of the bottom navigation
 * has been loaded into the DOM.
 */
export function initializeBottomNavigationLogic() {
  // --- Initialization Guard ---
  // This flag is now managed within the JS module, not globally on window.
  // This prevents re-initialization if the module is imported multiple times,
  // though in a typical SPA setup, it should only be imported once.
  if (initializeBottomNavigationLogic.initialized) {
    return;
  }
  initializeBottomNavigationLogic.initialized = true;

  const navBar = document.getElementById('bottom-nav');

  // --- UI Update Function ---
  async function updateNavUI({ role, view }) {
    console.log(`TabNav: updateNavUI called with role: ${role}, view: ${view}`);
    // If promo is active, don't run the standard UI update logic.
    if (navBar.dataset.promoActive === "true") {
      return;
    }

    // Standard UI update logic
    navBar.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('hidden', btn.dataset.role !== role);
      const isCorrectRole = btn.dataset.role === role;
      const isCorrectView = btn.dataset.path === view;
      btn.classList.toggle('active', isCorrectRole && isCorrectView);
    });
    navBar.classList.toggle('dev-mode', role === 'admin');

    // --- Dynamic Account Icon Logic ---
    // This function is now separate to be called more selectively.
    updateAccountAvatar(role);
  }

  async function updateAccountAvatar(role) {
    const accountBtn = navBar.querySelector(`.nav-btn[data-role="${role}"][data-path="account"]`);
    if (accountBtn) {
      const defaultIcon = accountBtn.querySelector('.default-icon');
      const accountIconImg = accountBtn.querySelector('.account-icon');
      const userId = localStorage.getItem('currentUserId');

      if (userId && (role === 'user' || role === 'merchant' || role === 'admin')) {
        // Only fetch and update if the avatar isn't already set.
        // This prevents blinking on every navigation click.
        if (accountIconImg && accountIconImg.src && accountIconImg.style.display === 'inline-block') {
          return; // Avatar is already visible, no need to update.
        }
        try {
          const userData = await fetchUserById(userId);
          const avatarUrl = userData?.info?.avatar;
          if (avatarUrl && defaultIcon && accountIconImg) {
            accountIconImg.src = avatarUrl;
            accountIconImg.style.display = 'inline-block';
            if (defaultIcon) defaultIcon.style.display = 'none';
          }
        } catch (error) {
          console.error('BottomNav: Failed to fetch user avatar.', error);
        }
      }
    }
  }

  // Listen for a promotion to be activated
  window.addEventListener('promotionActivated', (e) => {
      const promo = e.detail;
      if (!promo || !promo.bottomNav || !Array.isArray(promo.bottomNav) || promo.bottomNav.length === 0) {
          return;
      }

      console.log('Tab-nav responding to promotion:', promo.bottomNav);
      navBar.dataset.promoActive = "true";
      navBar.innerHTML = ''; // Clear existing buttons

      promo.bottomNav.forEach(item => {
          const btn = document.createElement('button');
          btn.className = 'nav-btn';
          btn.dataset.role = 'guest';
          btn.dataset.path = item.link;
          btn.innerHTML = `<div class=\"icon-container\"><i class=\"${
            item.icon
          }\"></i></div><span>${item.label}</span>`;
          
          btn.addEventListener('click', (clickEvent) => {
              clickEvent.preventDefault();
              window.open(item.link, '_blank');
          });

          navBar.appendChild(btn);
      });
  });

  // --- Event Listeners ---
  navBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;

    // a. Ripple effect - Centered on Icon
    const iconContainer = btn.querySelector('.icon-container');
    if (iconContainer) {
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');

      const rect = iconContainer.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.5;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${(iconContainer.offsetWidth - size) / 2}px`;
      ripple.style.top = `${(iconContainer.offsetHeight - size) / 2}px`;

      iconContainer.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }

    // b. Tell the view manager to switch views
    const role = btn.dataset.role;
    const viewId = btn.dataset.path;
    routeManager.switchView(role, viewId);
  });

  // 2. Listen for view changes FROM the routeManager to keep the UI in sync
  routeManager.subscribe(updateNavUI);
  console.log("✅ TabNav: Subscribed to routeManager for state updates.");

  // 3. Listen for authentication state changes to force a UI refresh.
  // This solves the issue where the avatar doesn't update immediately after login.
  window.addEventListener('authStateChanged', (e) => {
    console.log('BottomNav: Auth state changed, forcing UI update.', e.detail);
    const currentState = routeManager.getCurrentState();
    
    // Reset avatar on logout/auth change to show default icon
    const accountIconImg = navBar.querySelector('.account-icon');
    const defaultIcon = navBar.querySelector('.default-icon');
    if (accountIconImg) accountIconImg.style.display = 'none';
    if (defaultIcon) defaultIcon.style.display = 'inline-block';

    updateNavUI(currentState);
  });
}

/**
 * Fetches and loads the bottom navigation bar HTML into the #bottom-nav element,
 * then initializes its dynamic behavior.
 */
export async function loadBottomNavigation() {
  const bottomNavContainer = document.getElementById('bottom-nav');
  if (!bottomNavContainer) {
    console.error('The #bottom-nav element was not found in the DOM.');
    return;
  }

  try {
    const response = await fetch('./source/partials/navigations/bottom-nav.html');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    let html = await response.text();

    // Remove the script block from the HTML before injecting
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const scriptTag = tempDiv.querySelector('script[type="module"]');
    if (scriptTag) {
      scriptTag.remove();
    }
    html = tempDiv.innerHTML;

    bottomNavContainer.innerHTML = html;
    console.log('Bottom navigation HTML loaded.');

    // Initialize dynamic logic after HTML is loaded
    initializeBottomNavigationLogic();

  } catch (error) {
    console.error('Could not load or initialize the bottom navigation:', error);
  }
}
