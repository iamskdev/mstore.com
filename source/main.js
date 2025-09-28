/**
 * @file View Manager
 * This module is the single source of truth for managing application views.
 * It handles view configuration, switching, content loading, and URL hash synchronization.
 * 
 * Forced update to bypass caching. (2025-08-17)
 *  * Initializes a scroll-aware header behavior.
 * The header will move up/down based on the scroll direction of the page-view-area.
 
 */

import { AuthService } from './firebase/auth/auth.js';
import { routeConfig, defaultViews } from './routes.js';
import { setDeferredPrompt, setupPwaRefreshBlockers } from './utils/pwa-manager.js';
import { initializeFirebase } from './firebase/firebase-config.js';
import { setAppConfig, getAppConfig } from './settings/main-config.js';
import { initWishlistHandler } from './utils/saved-manager.js';
import { initAddToCartHandler } from './utils/cart-manager.js'; // Added this line
import { loadTopNavigation } from './partials/navigations/top-nav.js';
import { loadBottomNavigation } from './partials/navigations/bottom-nav.js';
import { getFooterHtml } from './partials/footer/footer.js';
import { loadDrawer } from './partials/drawer/drawer.js';

import { initializeSearch, setupSearchToggle } from './utils/search-handler.js';

class RouteManager {
  constructor() {
    // Initialize with a null state. The correct state will be determined
    // asynchronously by the init() method, preventing a "flash" of guest content.
    this.currentRole = 'guest';
    this.currentView = 'home';
    this.routeConfig = routeConfig; // Expose config if needed externally
    this.defaultViews = defaultViews;
    this.loadedViews = new Set();
    
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
      const config = this.routeConfig[this.currentRole]?.[this.currentView] || {};
      const state = { role: this.currentRole, view: this.currentView, config: config };
      callback(state);
    }
  }

  /** @private Notifies all subscribers about a state change. */
  _notifySubscribers() {
    console.log("routeManager: Notifying subscribers about state change.");
    const config = this.routeConfig[this.currentRole]?.[this.currentView] || {};
    const state = { role: this.currentRole, view: this.currentView, config: config };
    this.subscribers.forEach(callback => callback(state));
  }

  /**
   * @private Loads and embeds the footer into a view element, then initializes its logic.
   * This helper centralizes the logic for both path-based and pathless views.
   * @param {HTMLElement} viewElement - The view container element.
   * @param {string} [existingHtml=''] - The existing HTML content of the view to prepend.
   */
  async _loadAndEmbedFooter(role, existingHtml = '') {
    console.log(`routeManager: _loadAndEmbedFooter called for role: ${role}`);
    try {
      const footerHtml = await getFooterHtml(); // Use the new function
      return `<div class="view-content-wrapper">${existingHtml}</div>` + footerHtml;
    } catch (e) {
      console.warn(`routeManager: Could not embed footer`, e);
      return existingHtml;
    }
  }

  /**
   * @private Loads and embeds the filter bar into a view element, then initializes its logic.
   * @param {HTMLElement} viewElement - The view container element.
   * @param {string} [existingHtml=''] - The existing HTML content of the view to prepend.
   */
  async _loadAndEmbedFilterBar(existingHtml = '') {
    try {
      const filterBarResponse = await fetch('./source/partials/filter/filter-bar.html');
      if (!filterBarResponse.ok) throw new Error('Filter Bar HTML not found');

      const filterBarHtml = await filterBarResponse.text();
      // Prepend the filter bar HTML and wrap existing content
      return filterBarHtml + `<div class="view-content-wrapper">${existingHtml}</div>`; // Return the HTML
    } catch (e) {
      console.warn(`routeManager: Could not embed filter bar`, e); // Removed viewElement.id
      return existingHtml; // Return original HTML on error
    }
  }

  /**
   * Switches the active view with a transition.
   * @param {string} role The user role for the view.
   * @param {string} viewId The ID of the view to switch to.
   */
  async switchView(role, viewId) {
    console.log(`routeManager: Attempting to switch to role: ${role}, viewId: ${viewId}`); // Added log
    // --- FIX: Close any open modals before switching views ---
    window.dispatchEvent(new CustomEvent('toggleAdvancedFilter', { detail: { show: false } }));

    let config;
    let routeParams = {};

    // First, check for a direct match in the role-specific config
    if (this.routeConfig[role] && this.routeConfig[role][viewId]) {
      config = this.routeConfig[role][viewId];
    } else {
      // If not found, check for a parameterized route in commonViews
      const commonViewMatch = Object.keys(this.routeConfig.commonViews).find(key => {
        const keyParts = key.split('/');
        const viewIdParts = viewId.split('/');
        if (keyParts.length !== viewIdParts.length) {
          return false;
        }

        let isMatch = true;
        for (let i = 0; i < keyParts.length; i++) {
          if (keyParts[i].startsWith(':')) {
            const paramName = keyParts[i].substring(1);
            routeParams[paramName] = viewIdParts[i];
          } else if (keyParts[i] !== viewIdParts[i]) {
            isMatch = false;
            break;
          }
        }
        return isMatch;
      });

      if (commonViewMatch) {
        config = this.routeConfig.commonViews[commonViewMatch];
        this.routeParams = routeParams; // Store params for the view to access
      } else {
        console.warn(`routeManager: Invalid role "${role}" or view "${viewId}". Falling back to default.`);
        role = 'guest'; // Safe fallback role
        viewId = this.defaultViews[role];
        config = this.routeConfig[role][viewId];
      }
    }

    // Resolve view configuration, checking commonViews for paths if not present in role-specific config
    let resolvedConfig = { ...config }; // Start with role-specific config

    
    // --- NEW: Explicitly hide all view containers before switching ---
    document.querySelectorAll('.page-view-area').forEach(element => {
      element.style.display = 'none'; // Explicitly hide
      element.classList.remove('view-active'); // Also remove the class
    });
    // --- END NEW ---

    let newViewElement = document.getElementById(resolvedConfig.id);

    // Determine the target container based on the fullscreen flag
    const targetContainerId = resolvedConfig.fullscreen ? 'fullscreen-layout' : 'main-content';
    const targetContainer = document.getElementById(targetContainerId);

    // If the view element doesn't exist, create it dynamically
    if (!newViewElement) {
      newViewElement = document.createElement('div');
      newViewElement.id = config.id;
      newViewElement.classList.add('page-view-area'); // Add the class for styling and identification
      if (resolvedConfig.fullscreen) {
        newViewElement.classList.add('fullscreen-view'); // Add fullscreen-view class for styling
      }
      targetContainer.appendChild(newViewElement);
      console.log(`Dynamically created view element: #${config.id} in ${targetContainerId}`);
    }

    // Manage the fullscreen-active class on the body
    if (resolvedConfig.fullscreen) {
      document.body.classList.add('fullscreen-active');
    } else {
      document.body.classList.remove('fullscreen-active');
    }
  

    // If the requested view is already active, we don't need to re-render it.
    // However, we MUST re-dispatch the 'viewChanged' event. This allows components
    // within that view (like the auth form) to reset their state based on a new
    // user action (e.g., clicking 'Login' in the drawer).
    // FIX: Also ensure the view is actually visible. If not, make it active.
    if (newViewElement.classList.contains('view-active') && newViewElement.style.display !== 'none') {
      this._notifySubscribers(); // Re-notify for state resets
      return;
    }

    if (resolvedConfig.path) { // If the view has a path, always load its content
      await this.loadViewContent(newViewElement, resolvedConfig, role);
      this.loadedViews.add(resolvedConfig.id); // Mark as loaded after content is loaded
    } else if (!resolvedConfig.path && !this.loadedViews.has(resolvedConfig.id)) { // Handle views with path: null
      newViewElement.innerHTML = `<div class="view-placeholder" style="padding: 20px; text-align: center; color: var(--text-secondary); max-width: 80%; margin: auto;"><h3>${resolvedConfig.title} View</h3><p>This view is under development. Content will be available soon!</p></div>`;
      this.loadedViews.add(resolvedConfig.id); // Mark as loaded to prevent re-injection
    }

    // Handle embedding the footer for views that don't have a content path but need a footer.
    // This ensures views like guest-home can have a footer without a dedicated HTML file.
    if (!resolvedConfig.path && resolvedConfig.embedFooter && !this.loadedViews.has(resolvedConfig.id)) {
      await this._loadAndEmbedFooter(newViewElement, role);
      this.loadedViews.add(resolvedConfig.id); // Mark as "loaded" to prevent re-embedding
    }

    newViewElement.classList.add('view-active');
    newViewElement.style.display = 'flex'; // Explicitly show the new active view
    console.log(`Applied 'view-active' and 'display: flex' to ${newViewElement.id}. Class list:`, newViewElement.classList);
    this.currentRole = role;
    this.currentView = viewId;

    // --- Session Persistence ---
    // Save the last active state to localStorage. This is the key to remembering the
    // view across page reloads and app restarts.
    localStorage.setItem('lastActiveRole', role);
    localStorage.setItem('lastActiveView', viewId);


    // --- Manage Shared UI Components ---

    // The header component now listens for view changes and manages the filter bar itself.
    // We just need to ensure subscribers are notified of the change.

    // Use the History API with a hash-based path for SPA compatibility on simple static servers.
    const hashPath = `/#/${role}/${viewId}`; // जैसे: #/guest/home

    // Use the pageUrl from the loaded configuration as the base for the final path.
    const baseUrl = getAppConfig().urls.pageUrl;

    // Ensure baseUrl ends with a single slash for consistent path construction.
    const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const finalPath = `${sanitizedBaseUrl}${hashPath}`;

    // केवल तभी एक नई स्थिति पुश करें जब पाथ वास्तव में बदल रहा हो।
    history.pushState({ role, view: viewId }, '', finalPath);
    console.log("pushing state", finalPath);
    this._notifySubscribers();
  }

  async loadViewContent(viewElement, config, role) {
    showPageLoader(); // Show page loader at the beginning of content loading
    // Fetch data dependencies before loading view content
    if (config.dataDependencies && config.dataDependencies.length > 0) {
      await this._fetchDataDependencies(config.dataDependencies);
    }
    try {
      

      // 1. Load associated CSS file if it exists and isn't already loaded.
      // Use specific cssPath from config, or fall back to convention for other views.
      const cssPath = config.cssPath || config.path.replace('.html', '.css');
      console.log(`routeManager: Attempting to load CSS from: ${cssPath}`);
      if (!document.querySelector(`link[href="${cssPath}"]`)) {
        // Check if the CSS file actually exists before adding the link tag
        const cssCheck = await fetch(cssPath, { method: 'HEAD' });
        if (cssCheck.ok) {
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = cssPath;
          cssLink.id = `${config.id}-style`; // Give it an ID for potential removal later
          document.head.appendChild(cssLink);
          console.log(`routeManager: Successfully appended CSS: ${cssPath}`);
        } else {
          console.warn(`routeManager: CSS file not found or accessible: ${cssPath}. Status: ${cssCheck.status}`);
        }
      } else {
        console.log(`routeManager: CSS already loaded: ${cssPath}`);
      }

      // 2. Fetch and inject HTML content
      const htmlResponse = await fetch(config.path);
      if (!htmlResponse.ok) throw new Error(`HTML fetch failed: ${htmlResponse.status}`);
      let viewHtml = await htmlResponse.text();

      // FIX: Add a safeguard to prevent loading a full HTML document into a view.
      // This can break the entire DOM structure.
      if (viewHtml.trim().toLowerCase().startsWith('<html') || viewHtml.trim().toLowerCase().includes('<body')) {
        throw new Error(`Content from ${config.path} appears to be a full HTML document, not a view fragment. Aborting load.`);
      }

      // FIX: Add a safeguard to prevent loading a full HTML document into a view.
      // This can break the entire DOM structure.
      if (viewHtml.trim().toLowerCase().startsWith('<html') || viewHtml.trim().toLowerCase().includes('<body')) {
        throw new Error(`Content from ${config.path} appears to be a full HTML document, not a view fragment. Aborting load.`);
      }


      // If the view config requests an embedded filter bar, fetch and prepend it.
      let finalHtml = viewHtml; // Start with the base view HTML

      

      // If the view config requests an embedded footer, fetch and append it.
      if (config.embedFooter) {
        finalHtml = await this._loadAndEmbedFooter(role, finalHtml);
        viewElement.classList.add('embedded-footer'); // Add class here
      }

      // Set the final HTML content of the view element
      viewElement.innerHTML = finalHtml;

      console.log(`routeManager: Successfully loaded content for ${config.id} from ${config.path}`);

      // FilterModalManager will be initialized by individual views if they need a filter bar.

      // If the view has an embedded footer, initialize its interactive logic.
      if (config.embedFooter) {
        try {
          // The initialization is now handled here, after innerHTML is set
          if (!this.footerHelper) {
            const { initializeFooter } = await import('./partials/footer/footer.js');
            this.footerHelper = { initialize: initializeFooter };
          }
          console.log(`routeManager: Calling initializeFooter with role: ${role}`);
          this.footerHelper.initialize(document.getElementById('main-content'), role);
        } catch (e) {
          console.error(`routeManager: Failed to initialize embedded footer for ${config.id}`, e);
        }
      } else if (!config.showFilterBar) { // Only wrap if neither filter bar nor footer is embedded
        // Also wrap non-footer views for consistency, though it has less impact.
        viewElement.innerHTML = `<div class="view-content-wrapper">${viewHtml}</div>`;
      }

      // 3. Load and execute associated JS module if it exists.
      // Use specific jsPath from config, or fall back to convention.
      const jsPath = config.jsPath || config.path.replace('.html', '.js');
      console.log(`routeManager: Attempting to load JS from: ${jsPath}`);

      try {
        // The path from config is relative to the document root (index.html).
        // Dynamic import() resolves relative to the current module (main.js), which would fail.
        // We create an absolute URL to ensure the import path is always correct.
        const absoluteJsPath = new URL(jsPath, window.location.href).href;

        // Add cache-busting query parameter only in development mode to ensure fresh scripts
        // without breaking production caching.
        const modulePath = getAppConfig().app.environment === 'development' ? `${absoluteJsPath}?v=${new Date().getTime()}` : absoluteJsPath;
        const module = await import(modulePath);
        if (module.init && typeof module.init === 'function') {
          console.log(`routeManager: Calling init() for ${config.id}`);
          module.init();
          console.log(`routeManager: Successfully initialized JS for ${config.id}`);
        } else {
          console.warn(`routeManager: init() function not found or not a function in ${config.id} at ${jsPath}.`);
        }
      } catch (e) {
        // It's okay if a JS file doesn't exist for a simple view.
        // We only log an error if the import failed for a reason other than "not found".
        if (!e.message.includes('Failed to fetch') && !e.message.includes('404')) {
          console.error(`Error executing script for ${config.id} at ${jsPath}:`, e);
        } else {
          console.warn(`routeManager: JS file not found for ${config.id} at ${jsPath}. This might be expected for simple views.`);
        }
      }

      this.loadedViews.add(config.id);
    } catch (err) {
      console.error(`Failed to load view content for ${config.id}:`, err);
      viewElement.innerHTML = `<div class="view-error"><h3>Failed to load content</h3><p>${err.message}</p></div>`;
    } finally { // Added finally block
      hidePageLoader(); // Hide page loader after content loading (success or failure)
    }
  }

    /**
   * @private Fetches data based on the view's dataDependencies.
   * @param {Array<string>} dependencies - An array of data dependency names (e.g., ['items', 'users']).
   */
  async _fetchDataDependencies(dependencies) {
    console.log(`routeManager: Entering _fetchDataDependencies for: ${dependencies.join(', ')}`);
    if (!dependencies || dependencies.length === 0) {
      return;
    }

    console.log(`routeManager: Fetching data dependencies: ${dependencies.join(', ')}`);
    const fetchPromises = [];

    if (dependencies.includes('all')) {
      // If 'all' is specified, fetch all available data
      for (const key in dataFetchers) {
        if (Object.hasOwnProperty.call(dataFetchers, key)) {
          fetchPromises.push(dataFetchers[key]());
        }
      }
    } else {
      // Fetch only specified dependencies
      for (const dep of dependencies) {
        if (dataFetchers[dep]) {
          fetchPromises.push(dataFetchers[dep]());
        } else {
          console.warn(`routeManager: Unknown data dependency: ${dep}. Skipping fetch.`);
        }
      }
    }

    try {
      const results = await Promise.all(fetchPromises);
      console.log('routeManager: All data dependencies fetched successfully.', results); // Log the fetched data
    } catch (error) {
      console.error('routeManager: Error fetching data dependencies:', error);
      showToast('error', 'Failed to load some data. Please refresh.', 5000);
    }
  }

    handleRoleChange(newRole, userId = null) {
    console.trace(`routeManager: handleRoleChange called. New Role: ${newRole}, User ID: ${userId}`); // Added trace

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
    document.querySelectorAll('.page-view-area').forEach(container => {
      container.classList.remove('view-active');
    });
    // --- END NEW ---

    this.switchView(newRole, defaultView);
  }

  async init() {
      this.loadedViews.clear(); // Clear loaded views on init to ensure fresh content load
  
    // --- STEP 1: CRITICAL - Synchronize Auth State First ---
    // This is the most important step to prevent the "logout on refresh" bug.
    // We `await` the `initializeAuthListener`. This function returns a promise that
    // only resolves *after* Firebase has confirmed the user's authentication state
    // (either logged in or logged out) and has updated localStorage accordingly.
    // By waiting here, we ensure that when we read from localStorage in the next steps,
    // the data is guaranteed to be correct and not stale.
    // This check is skipped for 'localstore' data source mode where there's no live auth.
    if (getAppConfig().source.data !== 'localstore') {
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
    console.log(`main.js init: savedRole=${savedRole}, lastActiveRole=${lastActiveRole}, lastActiveView=${lastActiveView}`);

    // Priority 1: A valid, direct URL path takes precedence (e.g., user clicks a link or refreshes a specific page).
    if (pathRole && pathView && this.routeConfig[pathRole]?.[pathView]) {
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
    else if (lastActiveRole && lastActiveView && this.routeConfig[lastActiveRole]?.[lastActiveView] &&
      (lastActiveRole === savedRole || (lastActiveRole === 'guest' && !savedRole))) {

      initialRole = lastActiveRole; // Trust the last active role from storage.
      initialView = lastActiveView;
    }

    // Priority 3: If still no state, but the user is logged in, go to their default view.
    else if (savedRole && this.routeConfig[savedRole]) {
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
    // `await routeManager.init()`, the UI is in a ready state, preventing a blank screen.
    await this.switchView(initialRole, initialView);

    window.addEventListener('popstate', (e) => {
      console.log("Popstate event:", e);
       if (e.state && e.state.role && e.state.view) {
           console.log(`Switching view from popstate: Role=${e.state.role}, View=${e.state.view}`);
           this.switchView(e.state.role, e.state.view);
       }
    });
    

    console.log("👁️ View Manager Initialized.");
  }
}

export const routeManager = new RouteManager();
window.routeManager = routeManager;

import {
  fetchAllItems,
  fetchAllUsers,
  fetchAllMerchants,
  fetchAllCategories,
  fetchAllBrands,
  fetchAllUnits,
  fetchAllAlerts,
  fetchAllOrders,
  fetchAllPriceLogs,
  fetchAllLogs,
  fetchAllAccounts,
  fetchAllPromotions,
  fetchActivePromotion // Added this line
} from './utils/data-manager.js';
import { showToast } from './utils/toast.js';

// Map data dependency names to their respective fetch functions
const dataFetchers = {
  items: fetchAllItems,
  users: fetchAllUsers,
  merchants: fetchAllMerchants,
  categories: fetchAllCategories,
  brands: fetchAllBrands,
  units: fetchAllUnits,
  alerts: fetchAllAlerts,
  orders: fetchAllOrders,
  'price-logs': fetchAllPriceLogs,
  logs: fetchAllLogs,
  accounts: fetchAllAccounts,
  promotions: fetchAllPromotions,
};

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
 * Shows the page loader.
 */
function showPageLoader() { // Renamed function
  const pageLoader = document.querySelector('.view-loading'); // Renamed variable and class selector
  if (pageLoader) {
    pageLoader.classList.remove('hidden');
  }
  originalBodyPaddingRight = document.documentElement.style.paddingRight;
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.paddingRight = `${scrollbarWidth}px`;
}

/**
 * Hides the page loader with a fade-out animation.
 */
function hidePageLoader() { // Renamed function
  const pageLoader = document.querySelector('.view-loading'); // Renamed variable and class selector
  if (pageLoader) {
    pageLoader.classList.add('hidden');
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = originalBodyPaddingRight;
  }
}

/**
 * Updates the width of the splash screen progress bar.
 * @param {number} percentage - The percentage to set the progress bar width to (0-100).
 */
function updateSplashScreenProgressBar(percentage) {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
  }
}


let currentProgress = 0; // Keep track of the progress globally

/**
 * Smoothly animates the splash screen progress bar to a target percentage.
 * @param {number} targetPercentage - The percentage to animate to (0-100).
 * @returns {Promise<void>} A promise that resolves when the animation is complete.
 */
function simulateProgress(targetPercentage) {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (currentProgress >= targetPercentage) {
        clearInterval(interval);
        resolve();
      } else {
        // Increment by a small random amount to look more natural
        const increment = Math.random() * 2 + 1; // Increment between 1 and 3
        currentProgress = Math.min(currentProgress + increment, targetPercentage);
        updateSplashScreenProgressBar(currentProgress);
      }
    }, 80); // Update every 80ms
  });
}


// Listen for navigation requests from dynamically loaded views
window.addEventListener('requestViewChange', (e) => {
  const { role, view } = e.detail;
  if (routeManager.routeConfig[role]?.[view]) {
    routeManager.switchView(role, view);
  } else {
    console.warn(`View change request for a non-existent view was ignored: ${role}/${view}`);
  }
});








// Main application initialization function
export async function initializeApp() {
  console.log("🚀 🚀 Initializing App...");
  // Load application configuration
  let loadedConfig = {};
  try {
    const response = await fetch('./source/settings/config.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    loadedConfig = await response.json();
  } catch (error) {
    console.error("Error loading config.json:", error);
    // Provide a default or fallback configuration in case of error
    loadedConfig = {
      app: {},
      urls: {
        customDomain: "",
        pageUrl: window.location.origin + window.location.pathname // Fallback to current origin and path
      }
    };
  }
  setAppConfig(loadedConfig);
  initializeFirebase(loadedConfig);

  // Detect standalone mode for PWA and apply no-zoom styles
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
    document.documentElement.classList.add('standalone-no-zoom');

    // Dynamically update viewport meta tag to disable zoom in PWA mode
    const viewportMeta = document.getElementById('viewport-meta');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
  }

  // Ensure getAppConfig().urls exists
  if (!getAppConfig().urls) {
    getAppConfig().urls = {}; // Initialize if it doesn't exist
  }

  // Determine the base URL based on the environment
    if (window.location.hostname === '127.0.0.1') {
    getAppConfig().urls.pageUrl = loadedConfig.urls.localIp;
  } else if (window.location.hostname === 'localhost') {
    getAppConfig().urls.pageUrl = loadedConfig.urls.localHost;
  } else if (loadedConfig.urls.customDomain && loadedConfig.urls.customDomain !== "" && window.location.hostname === new URL(loadedConfig.urls.customDomain).hostname) {
    getAppConfig().urls.pageUrl = loadedConfig.urls.customDomain;
  } else if (window.location.hostname.endsWith('github.io') && window.location.pathname.length > 1) {
    // This is a GitHub Pages deployment in a subdirectory (e.g., https://username.github.io/repo-name/)
    // The base URL should include the repository name.
    const repoName = window.location.pathname.split('/')[1]; // Get the first part of the path after the leading slash
    getAppConfig().urls.pageUrl = `${window.location.origin}/${repoName}`;
  }
  else if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !loadedConfig.urls.customDomain) {
    // If it's not localhost, not 127.0.0.1, and not a custom domain, assume it's a local IP or root domain GitHub Pages
    getAppConfig().urls.pageUrl = window.location.origin;
  }
  else {
    // Default to the pageUrl specified in config.json (e.g., GitHub Pages URL for root domain or other custom setups)
    getAppConfig().urls.pageUrl = loadedConfig.urls.pageUrl;
  }

  // Handle fallback URL for old links/domains
  if (loadedConfig.urls.fallbackUrl && loadedConfig.urls.fallbackUrl !== "" && window.location.href.startsWith(loadedConfig.urls.fallbackUrl) && getAppConfig().urls.pageUrl !== loadedConfig.urls.fallbackUrl) {
    console.warn(`Redirecting from old URL: ${window.location.href} to ${getAppConfig().urls.pageUrl}`);
    window.location.replace(getAppConfig().urls.pageUrl);
    return; // Stop further initialization as we are redirecting
  }

  setupPwaRefreshBlockers();

  const splashEnabled = getAppConfig().ui?.splashEnabled;

  if (splashEnabled) {
    // --- Run with Splash Screen ---
    const splashScreen = document.getElementById('splashScreen');
    if (splashScreen) {
        splashScreen.style.display = 'flex'; // Make it visible
    }
    await simulateProgress(60);
    await simulateProgress(100);

    if (splashScreen) {
        // Wait for the splash screen to fully hide before proceeding with routeManager.init()
        await new Promise(resolve => {
            setTimeout(() => {
                splashScreen.classList.add('hidden'); // Start fade out
                setTimeout(() => {
                    splashScreen.style.display = 'none'; // Fully hide after transition
                    resolve(); // Resolve the promise after splash screen is hidden
                }, 800);
            }, 200);
        });
    }
  }

  // --- Common Initialization Steps (run after splash or immediately if no splash) ---
  await loadTopNavigation();
  setupSearchToggle(); // Initialize search toggle after top navigation is loaded
  await loadBottomNavigation();
  await routeManager.init(); // This ensures routeManager is always initialized
  initWishlistHandler();
  initAddToCartHandler(); // Added this line
  await loadDrawer();
  // --- End Common Initialization Steps ---

  // Load role-switcher directly if enabled in config (outside splashEnabled check)
  const roleSwitcherEnabled = getAppConfig().flags?.roleSwitcher;
  if (roleSwitcherEnabled) {
    const roleSwitcherElement = document.getElementById('role-switcher-placeholder');
    if (roleSwitcherElement) {
        try {
            const res = await fetch('./source/partials/role-switcher.html');
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            const html = await res.text();

            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = html;

            const scripts = Array.from(tempContainer.querySelectorAll('script'));
            scripts.forEach(s => s.remove());

            roleSwitcherElement.innerHTML = tempContainer.innerHTML;

            for (const script of scripts) {
              const newScript = document.createElement('script');
              script.getAttributeNames().forEach(attr => newScript.setAttribute(attr, script.getAttribute(attr)));
              newScript.textContent = script.textContent;
              roleSwitcherElement.appendChild(newScript);
            }
        } catch (err) {
            console.error('Failed to load role-switcher:', err);
            roleSwitcherElement.innerHTML = '<div style="color:red; padding:10px;">Failed to load role switcher.</div>';
        }
    }
  }


  // Set --top-height immediately after core components are loaded
  const headerContainer = document.querySelector('.app-header');
  if (headerContainer) {
    document.documentElement.style.setProperty('--top-height', `${headerContainer.offsetHeight}px`);
  }

  // Log the current configuration for easy debugging.
  if (getAppConfig().app.environment) {
    console.log(`%c🚀 App Mode: ${getAppConfig().app.environment.toUpperCase()}`, 'color: #448aff; font-weight: bold; font-size: 12px;');
  } else {
    console.log(`%c🚀 App Mode: PRODUCTION`, 'color: #4caf50; font-weight: bold; font-size: 12px;');
  }
  console.log(`%c💾 Data Source: ${getAppConfig().source.data.toUpperCase()}`, 'color: #ff9800; font-weight: bold; font-size: 12px;');
  console.log(`%c🔒 Verification Flow: ${getAppConfig().flags.phoneVerification ? 'ENABLED' : 'DISABLED'}`, 'color: #e91e63; font-weight: bold; font-size: 12px;');
  console.log(`%c🎨 Header Style: ${getAppConfig().ui.headerStyle.toUpperCase()}`, 'color: #9c27b0; font-weight: bold; font-size: 12px;');

  // Show maintenance mode toast if enabled
  const appConfig = getAppConfig();
  if (appConfig.flags.maintenanceMode) {
    const { showToast } = await import('./utils/toast.js');
    showToast('warning', 'Application is currently in maintenance mode. Some features may be unavailable.', 0);
  }

  try {
    console.log("initializeApp: Attempting to fetch all items...");
    const allItems = await fetchAllItems();
    console.log("initializeApp: Fetched items count:", allItems ? allItems.length : 0);
    sessionStorage.setItem('allItems', JSON.stringify(allItems));
    console.log("initializeApp: Items stored in sessionStorage. Initializing search...");
          initializeSearch(allItems); // Initialize search with fetched items
      console.log("initializeApp: Search initialized."); // Initialize search with fetched items

    // Fetch and dispatch active promotion regardless of appMode
    try {
      const promotionData = await fetchActivePromotion();
      if (promotionData) {
        console.log('🎉 Promotion Activated:', promotionData);
        window.dispatchEvent(new CustomEvent('promotionActivated', { detail: promotionData }));
      }
    } catch (error) {
        console.error("Failed to fetch active promotion:", error);
    }
  } catch (error) {
    console.error("❌ Failed to load item data:", error);
    showToast('error', 'Failed to load app data. Please refresh.', 5000);
    window.dispatchEvent(new CustomEvent('itemDataLoadError', {
      detail: { message: "Failed to load items. Please try again later." }
    }));
  } finally {
    initializePullToRefresh();
  }

  if (!sessionStorage.getItem('cart')) {
    sessionStorage.setItem('cart', '[]');
  }
  if (!sessionStorage.getItem('savedItems')) {
    sessionStorage.setItem('savedItems', '[]');
  }
}

function initializeLayoutObservers() {
  const header = document.querySelector('.app-header');
  const bottomBar = document.querySelector('.app-tab-nav');

  const observer = new ResizeObserver(entries => {
    for (let entry of entries) {
      const height = entry.contentRect.height;
      if (entry.target.matches('.app-header')) {
        document.documentElement.style.setProperty('--top-height', `${height}px`);
      } else if (entry.target.matches('.app-tab-nav')) {
        document.documentElement.style.setProperty('--bottom-height', `${height}px`);
      }
    }
  });

  if (header) observer.observe(header);
  // Removed ResizeObserver for bottomBar as its height is controlled by a CSS variable
  // and observing it could lead to circular dependencies or unexpected behavior.
}

function initializePullToRefresh() {
  // Only initialize Pull-to-Refresh if ptrEnabled flag is true in config.json
  const appConfig = getAppConfig();
  if (!appConfig.flags.ptrEnabled) {
    return;
  }
  const ptr = document.getElementById("pullToRefresh");
  const arrow = document.getElementById("arrowIcon");
  arrow.style.transition = 'transform 0.2s ease-out'; // Add a smooth transition for rotation
  const spinner = document.getElementById("spinnerIcon");
  const mainContent = document.getElementById('main-content');

  if (!mainContent) {
    return;
  }

  let startY = 0;
  let isPulling = false;
  let ptrActive = false; // New flag to prevent rapid re-triggering
  const pullThreshold = 100;
  let currentHeaderHeight = 0;

  const updateHeaderHeight = () => {
    currentHeaderHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-height')) || 0;
    if (ptr.offsetHeight > 0) {
        // FIX: Set top to a negative value to hide it completely above the screen
        ptr.style.top = `-${ptr.offsetHeight}px`;
    }
  };

  window.addEventListener('partialsLoaded', updateHeaderHeight);
  window.addEventListener('resize', updateHeaderHeight);
  updateHeaderHeight();

  // Listen for touchstart on the main content area
  mainContent.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    isPulling = false; // Reset on every touch.
  }, { passive: true }); // Keep passive: true for touchstart

  // Global touchmove listener (passive: true) - allows normal scrolling
  window.addEventListener('touchmove', e => {
    // This listener is now passive and does not prevent default behavior.
    // It's here primarily for consistency or if other non-blocking logic is needed.
  }, { passive: true });

  // Existing touchmove listener for custom PTR animation
  mainContent.addEventListener('touchmove', e => {
    if (ptrActive) return;

    const activeView = mainContent.querySelector('.page-view-area.view-active');
    if (!activeView) return;

    const isAtTop = window.scrollY === 0; // Changed to window.scrollY
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    // If we are pulling down and at the top
    if (isAtTop && diff > 0) {
      e.preventDefault(); // Prevent default scrolling immediately if at top and pulling down

      // If not already pulling, and diff exceeds threshold, start pulling
      if (!isPulling && diff > 50) {
        isPulling = true;
        ptr.style.transition = 'none';
      }

      if (isPulling) {
        const pullDistance = Math.max(0, diff);
        ptr.style.top = `${-ptr.offsetHeight + Math.min(pullDistance, 250)}px`;
        const rotation = (pullDistance / pullThreshold) * 180;
        arrow.style.transform = `rotate(${rotation}deg)`;
      }
    } else {
      // If not at top, or scrolling up, ensure pulling is reset and PTR is hidden
      if (isPulling) {
        isPulling = false;
        ptr.style.transition = 'top 0.3s ease';
        ptr.style.top = `-${ptr.offsetHeight}px`;
        arrow.style.transform = 'rotate(0deg)';
      }
    }
  }, { passive: false }); // Must be passive: false to allow preventDefault

  mainContent.addEventListener('touchend', async e => { // Added async here
    if (!isPulling) return;

    const currentY = e.changedTouches[0].clientY;
    const diff = currentY - startY;
    
    isPulling = false;
    ptr.style.transition = 'top 0.3s ease'; // Restore animation.

    if (diff > pullThreshold) {
      ptrActive = true; // Set flag to true when refresh is triggered
      // Trigger Refresh: Position it below the header
      ptr.style.top = `${currentHeaderHeight}px`;
      arrow.style.display = "none";
      spinner.style.display = "inline-block";
      spinner.classList.add("spinning"); // Start spinning

      window.dispatchEvent(new CustomEvent('appRefreshRequested'));

      // Trigger a refresh of the current view
      const currentRole = routeManager.currentRole;
      const currentView = routeManager.currentView;
      const config = routeManager.routeConfig[currentRole]?.[currentView];
      const newViewElement = document.getElementById(config.id);

      if (currentRole && currentView && config && newViewElement) {
        console.log(`Pull-to-Refresh: Forcing content reload for: ${currentRole}/${currentView}.`);

        // Wait for content to load AND for a minimum spinner display time
        await Promise.all([
          routeManager.loadViewContent(newViewElement, config, currentRole),
          new Promise(resolve => setTimeout(resolve, 500)) // Minimum 0.5 second display for spinner
        ]);

        console.log(`Pull-to-Refresh: Successfully refreshed view content: ${currentRole}/${currentView}.`);
      } else {
        console.warn(`Pull-to-Refresh: Could not determine current view for refresh.`);
      }

      // Hide the PTR animation after content is loaded and minimum display time is met
      ptr.style.top = `-${ptr.offsetHeight}px`; // Hide it above the screen again
      arrow.style.display = "inline-block";
      spinner.style.display = "none";
      spinner.classList.remove("spinning");
      arrow.style.transform = 'rotate(0deg)';
      ptrActive = false; // Reset flag after refresh is complete
    } else {
      // Cancel pull, snap back.
      // FIX: Hide it above the screen again
      ptr.style.top = `-${ptr.offsetHeight}px`;
      arrow.style.transform = 'rotate(0deg)';
    }
  });
}
