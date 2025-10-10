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
import { initMediaEditor } from './modals/media-editor/media-editor.js';
import { initOtpVerificationModal } from './modals/otp-verification-modal.js';
import { initWishlistHandler } from './utils/saved-manager.js';
import { initAddToCartHandler } from './utils/cart-manager.js'; // Added this line
import { loadTopNavigation } from './partials/navigations/top-nav.js';
import { loadBottomNavigation } from './partials/navigations/bottom-nav.js';
import { getFooterHtml } from './partials/footer/footer.js';
import { localCache, sessionCache } from './utils/data-manager.js'; // Import from the unified data-manager
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
    this.currentModule = null; // NEW: To hold the currently active view's module
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
    // --- FIX: Correctly resolve config from role-specific OR common views ---
    // This ensures that subscribers (like top-nav) always get the correct title and config,
    // even for parameterized routes like 'item-details/:id'.
    let config = this.routeConfig[this.currentRole]?.[this.currentView];

    if (!config) {
      // Try an exact match in commonViews first.
      config = this.routeConfig.commonViews?.[this.currentView];
      
      // If still not found, it might be a parameterized route.
      if (!config) {
        const viewParts = this.currentView.split('/');
        const commonViewMatch = Object.keys(this.routeConfig.commonViews).find(key => {
          const keyParts = key.split('/');
          if (keyParts.length !== viewParts.length) return false;
          // Check if the static parts of the path match.
          // e.g., 'item-details' in 'item-details/:id' matches 'item-details' in 'item-details/some-id'
          return keyParts.every((part, i) => part.startsWith(':') || part === viewParts[i]);
        });

        if (commonViewMatch) {
          config = this.routeConfig.commonViews[commonViewMatch];
        }
      }
    }
    config = config || {}; // Ensure config is at least an empty object
    const state = { role: this.currentRole, view: this.currentView, config: config };
    this.subscribers.forEach(callback => callback(state));
  }

  /**
   * Returns the current state of the router.
   * This is a getter method to be used by external modules like top-nav.
   * @returns {{role: string, view: string, config: object}} The current state object.
   */
  getCurrentState() {
    // This logic MUST mirror _notifySubscribers to ensure consistent state objects.
    let config = this.routeConfig[this.currentRole]?.[this.currentView];

    if (!config) {
      // Try an exact match in commonViews first.
      config = this.routeConfig.commonViews?.[this.currentView];

      // If still not found, it might be a parameterized route.
      if (!config) {
        const viewParts = this.currentView.split('/');
        const commonViewMatch = Object.keys(this.routeConfig.commonViews).find(key => {
          const keyParts = key.split('/');
          if (keyParts.length !== viewParts.length) return false;
          // Check if the static parts of the path match.
          return keyParts.every((part, i) => part.startsWith(':') || part === viewParts[i]);
        });

        if (commonViewMatch) {
          config = this.routeConfig.commonViews[commonViewMatch];
        }
      }
    }
    config = config || {}; // Ensure config is at least an empty object.
    const state = { role: this.currentRole, view: this.currentView, config: config };
    return state;
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
  _unloadViewCss(viewId) {
    const cssElement = document.getElementById(`${viewId}-style`);
    if (cssElement) {
      cssElement.remove();
      console.log(`routeManager: Unloaded CSS for view: ${viewId}`);
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

    // --- NEW: Unload CSS of the previous view ---
    // This prevents style conflicts, especially when moving between default and fullscreen layouts.
    if (this.currentView && this.currentView !== viewId) {
      let previousConfig;
      // First, try a direct match for the previous view
      previousConfig = this.routeConfig[this.currentRole]?.[this.currentView] || this.routeConfig.commonViews[this.currentView];

      // If not found, it might be a parameterized route (like 'conversation/:id')
      if (!previousConfig) {
        const commonViewMatch = Object.keys(this.routeConfig.commonViews).find(key => {
          // Simple check: does the start of the key match the start of the view?
          // e.g., key 'conversation/:id' starts with 'conversation' which matches this.currentView 'conversation/chat123'
          return key.split('/')[0] === this.currentView.split('/')[0];
        });
        if (commonViewMatch) {
          previousConfig = this.routeConfig.commonViews[commonViewMatch];
        }
      }

      if (previousConfig) {
        console.log(`routeManager: Found previous config for '${this.currentView}'. Unloading CSS for ID: '${previousConfig.id}'.`);
        this._unloadViewCss(previousConfig.id);
      }
    }

    // --- NEW: Cleanup the previous view's module ---
    // This is crucial to prevent memory leaks and event listener conflicts.
    if (this.currentModule && typeof this.currentModule.cleanup === 'function') {
      console.log(`routeManager: Cleaning up module for view: ${this.currentView}`);
      this.currentModule.cleanup();
    }
    
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
    localCache.set('lastActiveRole', role);
    localCache.set('lastActiveView', viewId);


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

  async loadViewContent(viewElement, config, role, force = false) {
    showPageLoader(); // Show page loader at the beginning of content loading
    // Fetch data dependencies before loading view content
    if (config.dataDependencies && config.dataDependencies.length > 0) {
      await this._fetchDataDependencies(config.dataDependencies, force);
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
          this.currentModule = module; // Store the loaded module
          console.log(`routeManager: Calling init() for ${config.id}`);
          // Pass a 'force' flag to the init function to bypass initialization checks.
          module.init(true); // Pass true to force re-initialization
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
          this.currentModule = null; // No module was loaded
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
  async _fetchDataDependencies(dependencies, force = false) {
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
          fetchPromises.push(dataFetchers[key](force));
        }
      }
    } else {
      // Fetch only specified dependencies
      for (const dep of dependencies) {
        if (dataFetchers[dep]) {
          fetchPromises.push(dataFetchers[dep](force));
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

    handleRoleChange(newRole, userId = null, merchantId = null) {
    console.trace(`routeManager: handleRoleChange called. New Role: ${newRole}, UserID: ${userId}, MerchantID: ${merchantId}`);

    // Centralize state change. This is the single source of truth for the user's session role.
    localCache.set('currentUserType', newRole);

    if (userId) {
      localCache.set('currentUserId', userId);
    } else {
      localCache.remove('currentUserId');
    }

    if (merchantId) {
      localCache.set('currentMerchantId', merchantId);
    } else {
      localCache.remove('currentMerchantId');
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
    if (getAppConfig().source.data !== 'localstore' && AuthService.initializeAuthListener) {
      await AuthService.initializeAuthListener();
    }

    // --- STEP 2: Read the now-synchronized state from localStorage and URL ---
    const savedRole = localCache.get('currentUserType'); // The role of the logged-in user
    const lastActiveRole = localCache.get('lastActiveRole');
    const lastActiveView = localCache.get('lastActiveView');

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
  fetchActivePromotion, // Added this line
  fetchAllFeedbacks,
  fetchAllRatings
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
  feedbacks: fetchAllFeedbacks,
  ratings: fetchAllRatings
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

/**
 * =========================================================================
 * --- GLOBAL CUSTOM ALERT ---
 * These functions are attached to the window object to be globally accessible.
 * =========================================================================
 */

/**
 * Displays the global custom alert.
 * @param {object} options
 * @param {string} options.title - The title of the alert.
 * @param {string} options.message - The message content of the alert.
 * @param {Array<object>} [options.buttons] - Array of button objects { text, class, onClick }.
 */
window.showCustomAlert = function({ title, message, buttons = [] }) {
    // --- FIX: z-index issue with other modals ---
    // Temporarily increase the z-index to ensure the alert is on top of any other
    // open modals (like the username edit modal which has a z-index of 10001).
    // The z-index is reset in hideCustomAlert.
    const alertOverlay = document.getElementById('custom-alert-popup');
    if (!alertOverlay) return;

    const titleEl = alertOverlay.querySelector('.alert-title');
    const messageEl = alertOverlay.querySelector('.alert-message');
    const actionsEl = alertOverlay.querySelector('.alert-actions');

    titleEl.textContent = title;
    messageEl.textContent = message;
    actionsEl.innerHTML = ''; // Clear old buttons

    const defaultClickHandler = () => window.hideCustomAlert();

    if (buttons.length === 0) {
        // Default button if none are provided
        buttons.push({ text: 'OK', class: 'primary', onClick: defaultClickHandler });
    }

    buttons.forEach(btnData => {
        const button = document.createElement('button');
        button.textContent = btnData.text;
        button.className = `alert-btn ${btnData.class || ''}`;
        button.onclick = btnData.onClick;
        actionsEl.appendChild(button);
    });

    alertOverlay.style.zIndex = '10011'; // Set z-index higher than other modals
    alertOverlay.classList.add('visible');
}

window.hideCustomAlert = function() {
    const alertOverlay = document.getElementById('custom-alert-popup');
    if (alertOverlay) {
        alertOverlay.classList.remove('visible');
        // Reset z-index after hiding
        alertOverlay.style.zIndex = '';
    }
}

// Listen for navigation requests from dynamically loaded views
window.addEventListener('requestViewChange', (e) => {
    const { role, view } = e.detail;
    // Pass the request directly to switchView. It has the logic to handle parameterized routes.
    routeManager.switchView(role, view);
});

// Main application initialization function
export async function initializeApp() {
  console.log("🚀 🚀 Initializing App...");
  setupPwaRefreshBlockers();

  // --- FIX: Smart Splash Screen & App Initialization Logic ---
  const splashScreen = document.getElementById('splashScreen');
  const splashEnabled = getAppConfig()?.ui?.splashEnabled;
  const isWarmStart = sessionStorage.getItem('isWarmStart') === 'true';

  // Show splash screen only on cold start (first visit), not on simple refreshes.
  if (splashEnabled && !isWarmStart) {
    if (splashScreen) {
        splashScreen.style.display = 'flex'; // Make it visible
    }
  }

  // --- STEP 1: Load config and initialize critical services ---
  const configResponse = await fetch('./source/settings/config.json');
  const loadedConfig = await configResponse.json();
  setAppConfig(loadedConfig);
  initializeFirebase(loadedConfig);

  // --- NEW: Load OTP Verification Modal HTML ---
  try {
    const response = await fetch('./source/modals/otp-verification-modal.html');
    if (response.ok) {
        const otpModalHtml = await response.text();
        document.body.insertAdjacentHTML('beforeend', otpModalHtml);
        // Initialize its JS now that the HTML is in the DOM
        initOtpVerificationModal();
    } else {
        console.error('Failed to load otp-verification-modal.html');
    }
  } catch (error) {
      console.error('Error loading OTP modal:', error);
  }

  // --- NEW: Load Media Editor HTML into the body ---
  // This is done early to ensure the `window.openPhotoEditor` function is available globally.
  try {
    const response = await fetch('./source/modals/media-editor/media-editor.html');
    if (response.ok) {
        const editorHtml = await response.text();
        document.body.insertAdjacentHTML('beforeend', editorHtml);
        // Now that the HTML is in the DOM, initialize its JavaScript
        initMediaEditor();
    } else {
        console.error('Failed to load media-editor.html');
    }
  } catch (error) {
      console.error('Error loading media editor:', error);
  }

  // --- FIX: Restore dynamic base URL detection ---
  // This logic correctly sets the app's base URL based on the environment (local, production, etc.),
  // preventing the cross-origin 'pushState' error.
  const appConfig = getAppConfig();
  if (!appConfig.urls) {
    appConfig.urls = {}; // Initialize if it doesn't exist
  }

  const currentHostname = window.location.hostname;
  const configUrls = loadedConfig.urls;

  // --- FIX: Handle local network IP addresses (like 192.168.x.x or 10.x.x.x) ---
  // This prevents the cross-origin 'pushState' error when testing on a mobile device.
  if (currentHostname.startsWith('192.168.') || currentHostname.startsWith('10.')) {
    appConfig.urls.pageUrl = `${window.location.protocol}//${window.location.host}`;
  } else if (currentHostname === '127.0.0.1' && configUrls.localIp) {
    appConfig.urls.pageUrl = configUrls.localIp;
  } else if (currentHostname === 'localhost' && configUrls.localHost) {
    appConfig.urls.pageUrl = configUrls.localHost;
  } else if (configUrls.customDomain && currentHostname === new URL(configUrls.customDomain).hostname) {
    appConfig.urls.pageUrl = configUrls.customDomain;
  } else if (currentHostname.endsWith('github.io')) {
    // Handle GitHub Pages deployments (both root and subdirectory)
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      // Subdirectory deployment (e.g., username.github.io/repo-name/)
      appConfig.urls.pageUrl = `${window.location.origin}/${pathSegments[0]}`;
    } else {
      // Root domain deployment (e.g., username.github.io/)
      appConfig.urls.pageUrl = window.location.origin;
    }
  } else {
    // Fallback to the URL specified in config.json or the current origin
    appConfig.urls.pageUrl = configUrls.pageUrl || window.location.origin;
  }
  console.log(`[main.js] Base URL determined: ${appConfig.urls.pageUrl}`);
  // --- END FIX ---

  if (splashEnabled && !isWarmStart) await simulateProgress(20);

  // --- STEP 2: Initialize the router to determine the correct state FIRST ---
  await routeManager.init();
  if (splashEnabled && !isWarmStart) await simulateProgress(50);

  // --- STEP 3: Load core UI shells now that the state is known ---
  await Promise.all([
    loadTopNavigation(),
    loadBottomNavigation(),
    loadDrawer()
  ]);
  setupSearchToggle();
  if (splashEnabled && !isWarmStart) await simulateProgress(80);

  // --- STEP 4: Initialize secondary handlers and fetch primary data ---
  initWishlistHandler();
  initAddToCartHandler();
  
  try {
    // Fetch and cache categories if not already in localStorage
    if (!localCache.get('allCategories')) {
      const allCategories = await fetchAllCategories();
      localCache.set('allCategories', allCategories);
    }
    const allItems = await fetchAllItems();
    localCache.set('allItems', allItems); // Use localCache for persistence
    initializeSearch(allItems);
    const promotionData = await fetchActivePromotion();
    if (promotionData) {
      window.dispatchEvent(new CustomEvent('promotionActivated', { detail: promotionData }));
    }
  } catch (error) {
    console.error("❌ Failed to load initial item/promotion data:", error);
    showToast('error', 'Failed to load app data. Please refresh.', 5000);
  }
  if (splashEnabled && !isWarmStart) await simulateProgress(100);

  // --- STEP 5: Hide splash screen and finalize ---
  if (splashEnabled && !isWarmStart) {
    if (splashScreen) {
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
  sessionStorage.setItem('isWarmStart', 'true'); // Mark that the app has started once.

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
  if (appConfig.flags.maintenanceMode) {
    const { showToast } = await import('./utils/toast.js');
    showToast('warning', 'Application is currently in maintenance mode. Some features may be unavailable.', 0);
  }
  initializePullToRefresh();

  if (!localCache.get('cart')) {
    localCache.set('cart', []);
  }
  if (!localCache.get('savedItems')) {
    localCache.set('savedItems', []);
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
      // FIX: Correctly resolve config from role-specific views OR commonViews.
      const config = routeManager.routeConfig[currentRole]?.[currentView] || routeManager.routeConfig.commonViews?.[currentView];

      // The view element ID is stored in the config.
      const newViewElement = config ? document.getElementById(config.id) : null;

      if (currentRole && currentView && config && newViewElement) {
        console.log(`Pull-to-Refresh: Forcing content reload for: ${currentRole}/${currentView}.`);

        // Wait for content to load AND for a minimum spinner display time
        await Promise.all([
          routeManager.loadViewContent(newViewElement, config, currentRole, true), // Pass force=true
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
