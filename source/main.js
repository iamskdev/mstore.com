
/**
 * @file View Manager
 * This module is the single source of truth for managing application views.
 * It handles view configuration, switching, content loading, and URL hash synchronization.
 * 
 * Forced update to bypass caching. (2025-08-17)
 */
import { APP_CONFIG } from './utils/app-config.js';
import { AuthService } from './firebase/auth/auth.js';
import { viewConfig, defaultViews } from './utils/view-config.js';
import { setDeferredPrompt } from './utils/pwa-manager.js';

class ViewManager {
  constructor() {
    // Initialize with a null state. The correct state will be determined
    // asynchronously by the init() method, preventing a "flash" of guest content.
    this.currentRole = 'guest';
    this.currentView = 'home';
    this.viewConfig = viewConfig; // Expose config if needed externally
    this.defaultViews = defaultViews;
    this.loadedViews = new Set();
    this.filterManager = null; // To be lazy-loaded
    this.footerHelper = null; // To be lazy-loaded for managing the footer
    this.subscribers = [];
  }

  /**
   * Allows components to subscribe to view changes.
   * If the manager already has a state, the callback is invoked immediately.
   * @param {function} callback - The function to call with the new state {role, view}.
   */
  subscribe(callback) {
    if (typeof callback !== 'function') return;
    this.subscribers.push(callback);

    // --- Immediate State Dispatch ---
    // If the view manager has already initialized and has a valid state,
    // immediately notify the new subscriber. This prevents race conditions where
    // a component subscribes *after* the initial view has been set.
    if (this.currentRole && this.currentView) {
      const config = this.viewConfig[this.currentRole]?.[this.currentView] || {};
      const state = { role: this.currentRole, view: this.currentView, config: config };
      callback(state);
    }
  }

  /** @private Notifies all subscribers about a state change. */
  _notifySubscribers() {
    console.log("ViewManager: Notifying subscribers about state change.");
    const config = this.viewConfig[this.currentRole]?.[this.currentView] || {};
    const state = { role: this.currentRole, view: this.currentView, config: config };
    this.subscribers.forEach(callback => callback(state));
  }

  /**
   * @private Loads and embeds the footer into a view element, then initializes its logic.
   * This helper centralizes the logic for both path-based and pathless views.
   * @param {HTMLElement} viewElement - The view container element.
   * @param {string} [existingHtml=''] - The existing HTML content of the view to prepend.
   */
  async _loadAndEmbedFooter(viewElement, role, existingHtml = '') {
    try {
      const footerResponse = await fetch('./source/components/footer.html');
      if (!footerResponse.ok) throw new Error('Footer HTML not found');

      const footerHtml = await footerResponse.text();
      // NEW: Wrap content in a div that can grow, ensuring the footer is pushed down.
      viewElement.innerHTML = `<div class="view-content-wrapper">${existingHtml}</div>` + footerHtml;
      viewElement.classList.add('view-with-embedded-footer'); // Add class for CSS layout targeting

      // Lazy-load and initialize footer logic
      if (!this.footerHelper) {
        const { initializeFooter } = await import('./utils/footer-helper.js');
        this.footerHelper = { initialize: initializeFooter };
      }
      this.footerHelper.initialize(viewElement, role);
    } catch (e) {
      console.warn(`ViewManager: Could not embed footer for ${viewElement.id}`, e);
    }
  }

  /**
   * Switches the active view with a transition.
   * @param {string} role The user role for the view.
   * @param {string} viewId The ID of the view to switch to.
   */
  async switchView(role, viewId) {
    // Validate the requested role and viewId. Fallback to a safe default if invalid.
    if (!this.viewConfig[role] || !this.viewConfig[role][viewId]) {
      console.warn(`ViewManager: Invalid role "${role}" or view "${viewId}". Falling back to default.`);
      role = 'guest'; // Safe fallback role
      viewId = this.defaultViews[role];
    }

    const config = this.viewConfig[role][viewId];
    const currentViewElement = document.querySelector('.view-container.view-active');
    const newViewElement = document.getElementById(config.id);

    if (!newViewElement) {
      console.error(`View element not found in DOM: #${config.id}`);
      return;
    }

    // If the requested view is already active, we don't need to re-render it.
    // However, we MUST re-dispatch the 'viewChanged' event. This allows components
    // within that view (like the auth form) to reset their state based on a new
    // user action (e.g., clicking 'Login' in the drawer).
    // FIX: Also ensure the view is actually visible. If not, make it active.
    if (currentViewElement === newViewElement) {
      if (!currentViewElement.classList.contains('view-active')) {
        currentViewElement.classList.add('view-active');
      }
      this._notifySubscribers(); // Re-notify for state resets
      return;
    }

    if (currentViewElement) currentViewElement.classList.remove('view-active');

    if (config.path && !this.loadedViews.has(config.id)) {
      await this.loadViewContent(newViewElement, config, role);
    }

    // Handle embedding the footer for views that don't have a content path but need a footer.
    // This ensures views like guest-home can have a footer without a dedicated HTML file.
    if (!config.path && config.embedFooter && !this.loadedViews.has(config.id)) {
      await this._loadAndEmbedFooter(newViewElement, role);
      this.loadedViews.add(config.id); // Mark as "loaded" to prevent re-embedding
    }

    newViewElement.classList.add('view-active');
    console.log(`Applied 'view-active' to ${newViewElement.id}. Class list:`, newViewElement.classList);
    this.currentRole = role;
    this.currentView = viewId;

    // --- Session Persistence ---
    // Save the last active state to localStorage. This is the key to remembering the
    // view across page reloads and app restarts.
    localStorage.setItem('lastActiveRole', role);
    localStorage.setItem('lastActiveView', viewId);


    // --- Manage Shared UI Components ---

    // 1. Manage the filter bar based on the new view's config
    if (!this.filterManager) {
      // Lazy-load the filter manager on first use to keep initial load light.
      const { filterManager } = await import('./utils/filter-helper.js');
      this.filterManager = filterManager;
    }
    this.filterManager.manageVisibility(config.showFilterBar || false);

    // Use the History API with a hash-based path for SPA compatibility on simple static servers.
    const hashPath = `/#/${role}/${viewId}`; // जैसे: #/guest/home

    // <base> टैग से बेस पाथ प्राप्त करें। यदि नहीं मिलता है तो '/' पर डिफ़ॉल्ट करें।
    let baseHref = document.querySelector('base')?.getAttribute('href') || '/';

    // --- baseHref को एक स्वच्छ, एब्सोल्यूट पाथ सुनिश्चित करने के लिए सैनिटाइज करें ---
    // 1. यदि अंत में स्लैश है तो उसे हटा दें, ताकि बाद में डबल स्लैश न बनें।
    if (baseHref.endsWith('/')) {
      baseHref = baseHref.slice(0, -1);
    }
    // 2. सुनिश्चित करें कि यह डोमेन रूट से एक एब्सोल्यूट पाथ बनाने के लिए स्लैश से शुरू होता है।
    if (!baseHref.startsWith('/')) {
      baseHref = '/' + baseHref;
    }

    const finalPath = `${baseHref}${hashPath}`;

    // केवल तभी एक नई स्थिति पुश करें जब पाथ वास्तव में बदल रहा हो।
    history.pushState({ role, view: viewId }, '', finalPath);
    console.log("pushing state", finalPath);
    this._notifySubscribers();
  }

  async loadViewContent(viewElement, config, role) {
    try {
      viewElement.innerHTML = `<div class="view-placeholder"><div class="loading-spinner"><div class="spinner"></div></div></div>`;

      // 1. Load associated CSS file if it exists and isn't already loaded.
      // Use specific cssPath from config, or fall back to convention for other views.
      const cssPath = config.cssPath || config.path.replace('.html', '.css');
      console.log(`ViewManager: Attempting to load CSS from: ${cssPath}`);
      if (!document.querySelector(`link[href="${cssPath}"]`)) {
        // Check if the CSS file actually exists before adding the link tag
        const cssCheck = await fetch(cssPath, { method: 'HEAD' });
        if (cssCheck.ok) {
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = cssPath;
          cssLink.id = `${config.id}-style`; // Give it an ID for potential removal later
          document.head.appendChild(cssLink);
          console.log(`ViewManager: Successfully appended CSS: ${cssPath}`);
        } else {
          console.warn(`ViewManager: CSS file not found or accessible: ${cssPath}. Status: ${cssCheck.status}`);
        }
      } else {
        console.log(`ViewManager: CSS already loaded: ${cssPath}`);
      }

      // 2. Fetch and inject HTML content
      const htmlResponse = await fetch(config.path);
      if (!htmlResponse.ok) throw new Error(`HTML fetch failed: ${htmlResponse.status}`);
      let viewHtml = await htmlResponse.text();

      // If the view config requests an embedded footer, fetch and append it.
      // This is used for views where the footer should be part of the scrollable content.
      if (config.embedFooter) {
        await this._loadAndEmbedFooter(viewElement, role, viewHtml);
      }
      else {
        // Also wrap non-footer views for consistency, though it has less impact.
        viewElement.innerHTML = `<div class="view-content-wrapper">${viewHtml}</div>`;
      }
      console.log(`ViewManager: Successfully loaded content for ${config.id} from ${config.path}`);

      // If the view has an embedded footer, initialize its interactive logic.
      if (config.embedFooter) {
        try {
          // The initialization is now handled inside _loadAndEmbedFooter
        } catch (e) {
          console.error(`ViewManager: Failed to initialize embedded footer for ${config.id}`, e);
        }
      }

      // 3. Load and execute associated JS module if it exists.
      // Use specific jsPath from config, or fall back to convention.
      const jsPath = config.jsPath || config.path.replace('.html', '.js');
      console.log(`ViewManager: Attempting to load JS from: ${jsPath}`);

      try {
        // The path from config is relative to the document root (index.html).
        // Dynamic import() resolves relative to the current module (main.js), which would fail.
        // We create an absolute URL to ensure the import path is always correct.
        const absoluteJsPath = new URL(jsPath, window.location.href).href;

        // Add cache-busting query parameter only in development mode to ensure fresh scripts
        // without breaking production caching.
        const modulePath = APP_CONFIG.appMode === 'dev' ? `${absoluteJsPath}?v=${new Date().getTime()}` : absoluteJsPath;
        const module = await import(modulePath);
        if (module.init && typeof module.init === 'function') {
          console.log(`ViewManager: Calling init() for ${config.id}`);
          module.init();
          console.log(`ViewManager: Successfully initialized JS for ${config.id}`);
        } else {
          console.warn(`ViewManager: init() function not found or not a function in ${config.id} at ${jsPath}.`);
        }
      } catch (e) {
        // It's okay if a JS file doesn't exist for a simple view.
        // We only log an error if the import failed for a reason other than "not found".
        if (!e.message.includes('Failed to fetch') && !e.message.includes('404')) {
          console.error(`Error executing script for ${config.id} at ${jsPath}:`, e);
        } else {
          console.warn(`ViewManager: JS file not found for ${config.id} at ${jsPath}. This might be expected for simple views.`);
        }
      }

      this.loadedViews.add(config.id);
    } catch (err) {
      console.error(`Failed to load view content for ${config.id}:`, err);
      viewElement.innerHTML = `<div class="view-error"><h3>Failed to load content</h3><p>${err.message}</p></div>`;
    }
  }

    handleRoleChange(newRole, userId = null) {
    console.trace(`ViewManager: handleRoleChange called. New Role: ${newRole}, User ID: ${userId}`); // Added trace

    // Centralize state change. This is the single source of truth for the user's session role.
     if (newRole === 'guest') {
       // When logging out (switching to guest), clear the authenticated user's state completely.
       // Set or remove the userId based on whether it was provided.
       if (userId) {
         localStorage.setItem('currentUserId', userId);
      } else {
        // If a non-guest role is set without a specific ID, ensure the old one is cleared.
        localStorage.removeItem('currentUserId');
       }
     }

    // Get the default view for the new role from our config object.
    const defaultView = this.defaultViews[newRole] || 'home';

    // --- NEW: Explicitly hide all view containers before switching ---
    document.querySelectorAll('.view-container').forEach(container => {
      container.classList.remove('view-active');
    });
    // --- END NEW ---

    this.switchView(newRole, defaultView);
  }

  async init() {
    // --- STEP 1: CRITICAL - Synchronize Auth State First ---
    // This is the most important step to prevent the "logout on refresh" bug.
    // We `await` the `initializeAuthListener`. This function returns a promise that
    // only resolves *after* Firebase has confirmed the user's authentication state
    // (either logged in or logged out) and has updated localStorage accordingly.
    // By waiting here, we ensure that when we read from localStorage in the next steps,
    // the data is guaranteed to be correct and not stale.
    // This check is skipped for 'local' data source mode where there's no live auth.
    if (APP_CONFIG.dataSource !== 'local') {
      await AuthService.initializeAuthListener();
    }

    // --- STEP 2: Read the now-synchronized state from localStorage and URL ---
    const savedRole = localStorage.getItem('currentUserType'); // The role of the logged-in user
    const lastActiveRole = localStorage.getItem('lastActiveRole');
    const lastActiveView = localStorage.getItem('lastActiveView');

    // Get the state from the current URL path.
    const path = window.location.hash.substring(1); // Read from hash: '#/guest/account' -> '/guest/account'
    const [, pathRole, pathView] = path.split('/'); // The split results in ['', 'role', 'view']

    // --- STEP 3: Authoritative Role and View Determination ---
    console.groupCollapsed("Route Determination"); // Start a collapsed console group
    let initialRole = 'guest';
    let initialView = 'home';

    // Priority 1: A valid, direct URL path takes precedence (e.g., user clicks a link or refreshes a specific page).
    if (pathRole && pathView && this.viewConfig[pathRole]?.[pathView]) {
      // If the path role matches the saved logged-in role, or if there's no saved role, trust the URL.
      if (pathRole === savedRole || !savedRole) {
        console.log("Priority 1: Using URL path");
        initialRole = pathRole;
        initialView = pathView;
      } else {
        // Mismatch: URL says one role, but user is logged in as another.
        // The logged-in role is the source of truth. Redirect to its default view.
        initialRole = savedRole;
        initialView = this.defaultViews[savedRole] || 'home';
        console.warn(`Role mismatch between URL ('${pathRole}') and saved session ('${savedRole}'). Redirecting to session home.`);
      }
    }
    // Priority 2: localStorage (Last Active View). If no valid URL hash, restore the last known view.
    // This is the key for the PWA "reopen" experience, making the app feel like it never closed.
    // The condition now correctly handles the guest case where `savedRole` is null.

    // It restores if (A) the last role matches the logged-in role, OR (B) the last role was 'guest' and there's no logged-in user.
    else if (lastActiveRole && lastActiveView && this.viewConfig[lastActiveRole]?.[lastActiveView] &&
      (lastActiveRole === savedRole || (lastActiveRole === 'guest' && !savedRole))) {

      initialRole = lastActiveRole; // Trust the last active role from storage.
      initialView = lastActiveView;
    }

    // Priority 3: If still no state, but the user is logged in, go to their default view.
    else if (savedRole && this.viewConfig[savedRole]) {
      // This handles cases where lastActiveView might be missing or invalid.
      initialRole = savedRole;
      initialView = this.defaultViews[savedRole] || 'home';
    }

    // Priority 4: Fallback to guest home.
    else {
      initialRole = 'guest';
      initialView = this.defaultViews.guest;
    }

    // --- STEP 4: Switch to the determined initial view ---
    console.log(`Initial Role: ${initialRole}, Initial View: ${initialView}`);
    console.log(`Path Role: ${pathRole}, Path View: ${pathView}`);
    console.log(`Saved Role: ${savedRole}, Last Active Role: ${lastActiveRole}, Last Active View: ${lastActiveView}`);
    console.groupEnd(); // End the console group

    // This call MUST be awaited. `switchView` is an async function that might
    // need to fetch HTML/CSS/JS content over the network. The `init()` function
    // is not truly "initialized" until this first, critical view is loaded and
    // displayed. Awaiting it ensures that when `main.js` continues after
    // `await viewManager.init()`, the UI is in a ready state, preventing a blank screen.
    await this.switchView(initialRole, initialView);

    window.addEventListener('popstate', (e) => {
      console.log("Popstate event:", e);
       if (e.state && e.state.role && e.state.view) {
           console.log(`Switching view from popstate: Role=${e.state.role}, View=${e.state.view}`);
           this.switchView(e.state.role, e.state.view);
       }
      if (e.state && e.state.role && e.state.view) { this.switchView(e.state.role, e.state.view); } // This call in an event handler doesn't need to be awaited.
    });
    console.log("👁️ View Manager Initialized.");
  }
}

export const viewManager = new ViewManager();

import { fetchAllItems, fetchActivePromotion } from './utils/data-manager.js';
import { showToast } from './utils/toast.js';

let originalBodyPaddingRight = '';
let scrollbarWidth = 0;

function getScrollbarWidth() {
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll'; // forcing scrollbar to appear
  document.body.appendChild(outer);
  const inner = document.createElement('div');
  outer.appendChild(inner);
  scrollbarWidth = (outer.offsetWidth - inner.offsetWidth);
  outer.parentNode.removeChild(outer);
}

// Calculate scrollbar width once on load
getScrollbarWidth();

/**
 * Shows the full-screen loader.
 */
function showFullScreenLoader() {
  const loader = document.getElementById('full-screen-loader');
  if (loader) {
    loader.style.display = 'flex'; // Ensure it's displayed before removing 'hidden'
    loader.classList.remove('hidden');
  }
  originalBodyPaddingRight = document.documentElement.style.paddingRight;
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.paddingRight = `${scrollbarWidth}px`;
}

/**
 * Hides the full-screen loader with a fade-out animation.
 */
function hideFullScreenLoader() {
  const loader = document.getElementById('full-screen-loader');
  if (loader) {
    loader.classList.add('hidden');
    // After the transition, set display to none to completely remove it from layout and rendering.
    // The transition duration is 0.3s (300ms).
    setTimeout(() => {
      loader.style.display = 'none';
    }, 300);
  }
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingRight = originalBodyPaddingRight;
}





// Listen for navigation requests from dynamically loaded views
window.addEventListener('requestViewChange', (e) => {
  const { role, view } = e.detail;
  if (viewManager.viewConfig[role]?.[view]) {
    viewManager.switchView(role, view);
  } else {
    console.warn(`View change request for a non-existent view was ignored: ${role}/${view}`);
  }
});

// Main application initialization function
async function initializeApp() {
  console.log("🚀 🚀 Initializing App...");
  showFullScreenLoader();

  // 1. Initialize the View Manager first. This sets up the core navigation.
  // FIX: Await the viewManager's initialization. This is CRITICAL.
  // It ensures that the correct view is determined and rendered *before* the rest of the
  // app logic runs and before the full-screen loader is hidden, preventing a blank screen flash.
  await viewManager.init();
  
  // Set up ResizeObservers to automatically adjust layout variables.
  initializeLayoutObservers();

  // Log the current configuration for easy debugging.
  if (APP_CONFIG.appMode) {
    console.log(`%c🚀 App Mode: ${APP_CONFIG.appMode.toUpperCase()}`, 'color: #448aff; font-weight: bold; font-size: 12px;');
  } else {
    console.log(`%c🚀 App Mode: PRODUCTION`, 'color: #4caf50; font-weight: bold; font-size: 12px;');
  }
  console.log(`%c💾 Data Source: ${APP_CONFIG.dataSource.toUpperCase()}`, 'color: #ff9800; font-weight: bold; font-size: 12px;');
  console.log(`%c🔒 Verification Flow: ${APP_CONFIG.verificationEnabled ? 'ENABLED' : 'DISABLED'}`, 'color: #e91e63; font-weight: bold; font-size: 12px;');
  console.log(`%c🎨 Header Style: ${APP_CONFIG.headerStyle.toUpperCase()}`, 'color: #9c27b0; font-weight: bold; font-size: 12px;');

  try {
    // 2. Fetch all data using the centralized data service.
    // FIX: The fetchAllItems function returns an array directly, not an object.
    // Using destructuring `{ allItems }` was causing `allItems` to be undefined.
    const allItems = await fetchAllItems();
    // Store the full list in sessionStorage for all pages (unified)
    sessionStorage.setItem('allItems', JSON.stringify(allItems));

    // 3. Initialize data-dependent modules
    

    // 4. Handle special app modes like 'promo'
    if (APP_CONFIG.appMode === 'promo') {
      const promotionData = await fetchActivePromotion();
      if (promotionData) {
        console.log('🎉 Promotion Activated:', promotionData);
        window.dispatchEvent(new CustomEvent('promotionActivated', { detail: promotionData }));
      }
    }

    

  } catch (error) {
    console.error("❌ Failed to load item data:", error);
    showToast('error', 'Failed to load app data. Please refresh.', 5000);
    // Dispatch an event to notify the explore view of the error.
    window.dispatchEvent(new CustomEvent('itemDataLoadError', {
      detail: { message: "Failed to load items. Please try again later." }
    }));
    // The explore view will handle displaying the error message.
  } finally {
    // A small delay to make the transition smoother and prevent jarring flashes
    // Hide the loader regardless of success or failure.
    initializePullToRefresh(); // Initialize pull-to-refresh
    setTimeout(hideFullScreenLoader, 300);
  }

  // 6. Initialize cart and saved items in sessionStorage if they don't exist
  if (!sessionStorage.getItem('cart')) {
    sessionStorage.setItem('cart', '[]');
  }
  if (!sessionStorage.getItem('savedItems')) {
    sessionStorage.setItem('savedItems', '[]');
  }
}

/**
 * Sets up ResizeObservers to dynamically update layout CSS variables (--header-height, --bottom-height)
 * whenever the header or bottom navigation bar changes size. This is more efficient and reliable
 * than using window.resize or custom events, as it reacts to content changes (like banners).
 */
function initializeLayoutObservers() {
  const header = document.querySelector('.header-container');
  const bottomBar = document.querySelector('.bottom-tab-bar');

  const observer = new ResizeObserver(entries => {
    for (let entry of entries) {
      const height = entry.contentRect.height;
      if (entry.target.matches('.header-container')) {
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      } else if (entry.target.matches('.bottom-tab-bar')) {
        document.documentElement.style.setProperty('--bottom-height', `${height}px`);
      }
    }
  });

  if (header) observer.observe(header);
  if (bottomBar) observer.observe(bottomBar);
}

/* app intialization */
initializeApp();

function initializePullToRefresh() {
  const ptr = document.getElementById("pullToRefresh");
  const arrow = document.getElementById("arrowIcon");
  const spinner = document.getElementById("spinnerIcon");

  let startY = 0;
  let isPulling = false;

  window.addEventListener("touchstart", e => {
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY;
      isPulling = true;
    }
  });

  window.addEventListener("touchmove", e => {
    if (!isPulling) return;
    let currentY = e.touches[0].clientY;
    let diff = currentY - startY;

    if (diff > 0) {
      let pull = Math.min(diff, 120);
      ptr.style.top = (pull - 60) + "px";

      // Rotate arrow only (spinner hidden)
      let rotation = Math.min(pull * 1.5, 180);
      arrow.style.transform = `rotate(${rotation}deg)`;
    }
  });

  window.addEventListener("touchend", () => {
    if (!isPulling) return;
    isPulling = false;

    if (parseInt(ptr.style.top) > 30) {
      ptr.style.top = "0px";

      // Switch arrow -> spinner
      arrow.style.display = "none";
      spinner.style.display = "inline-block";
      spinner.classList.add("spinning");

      // Simulate loading
      setTimeout(() => {
        location.reload(); // Or fetch new data
      }, 1500);

    } else {
      ptr.style.top = "-60px";
      arrow.style.transform = "rotate(0deg)";
    }
  });
}
