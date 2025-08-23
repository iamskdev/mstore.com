/**
 * @file View Manager
 * This module is the single source of truth for managing application views.
 * It handles view configuration, switching, content loading, and URL hash synchronization.
 * 
 * Forced update to bypass caching. (2025-08-17)
 */
import { APP_CONFIG } from './utils/app-config.js';
window.APP_CONFIG = APP_CONFIG;
import { AuthService } from './firebase/auth/auth.js';
import { viewConfig, defaultViews } from './utils/view-config.js';
import { setDeferredPrompt, setupPwaRefreshBlockers } from './utils/pwa-manager.js';

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
      viewElement.classList.add('embedded-footer'); // Add class for CSS layout targeting

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
   * @private Loads and embeds the filter bar into a view element, then initializes its logic.
   * @param {HTMLElement} viewElement - The view container element.
   * @param {string} [existingHtml=''] - The existing HTML content of the view to prepend.
   */
  async _loadAndEmbedFilterBar(viewElement, existingHtml = '') {
    try {
      const filterBarResponse = await fetch('./source/components/filter-bar.html');
      if (!filterBarResponse.ok) throw new Error('Filter Bar HTML not found');

      const filterBarHtml = await filterBarResponse.text();
      // Prepend the filter bar HTML and wrap existing content
      viewElement.innerHTML = filterBarHtml + `<div class="view-content-wrapper">${existingHtml}</div>`;
      viewElement.classList.add('view-with-embedded-filter-bar'); // Add class for CSS layout targeting
    } catch (e) {
      console.warn(`ViewManager: Could not embed filter bar for ${viewElement.id}`, e);
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
    const currentViewElement = document.querySelector('.page-view-area.view-active');
    let newViewElement = document.getElementById(config.id);

    // If the view element doesn't exist, create it dynamically
    if (!newViewElement) {
      newViewElement = document.createElement('div');
      newViewElement.id = config.id;
      newViewElement.classList.add('page-view-area'); // Add the class for styling and identification
      document.getElementById('page-view-area').appendChild(newViewElement);
      console.log(`Dynamically created view element: #${config.id}`);
    }
    console.log(`DEBUG: switchView - Attempting to switch to role: ${role}, viewId: ${viewId}, config.id: ${config.id}`);
  

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

    console.log(`DEBUG: switchView - Current loadedViews:`, this.loadedViews);
    if (config.path && !this.loadedViews.has(config.id)) {
      console.log(`DEBUG: switchView - Calling loadViewContent for ${config.id}`);
      await this.loadViewContent(newViewElement, config, role);
    } else if (config.path && this.loadedViews.has(config.id)) {
      console.log(`DEBUG: switchView - Content for ${config.id} already loaded, skipping loadViewContent.`);
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

      // If the view config requests an embedded footer, fetch and append it.
      // This is used for views where the footer should be part of the scrollable content.
      // If the view config requests an embedded filter bar, fetch and prepend it.
      if (config.embedFilterBar) {
        await this._loadAndEmbedFilterBar(viewElement, viewHtml);
        // After embedding, initialize the filter bar logic for this specific view element
        // Lazy-load FilterManager if not already loaded
        if (!this.filterManager) {
          const { filterManager } = await import('./utils/filter-helper.js');
          this.filterManager = filterManager;
        }
        // Call a new method on filterManager to initialize the embedded filter bar
        this.filterManager.initializeEmbeddedFilterBar(viewElement);
      } else if (config.embedFooter) { // Existing footer embedding logic
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
    document.querySelectorAll('.page-view-area').forEach(container => {
      container.classList.remove('view-active');
    });
    // --- END NEW ---

    this.switchView(newRole, defaultView);
  }

  async init() {
    console.log("[Debug] D. viewManager.init() started.");
      this.loadedViews.clear(); // Clear loaded views on init to ensure fresh content load
  
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
  const loader = document.querySelector('.full-screen-loader');
  if (loader) {
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
  const loader = document.querySelector('.full-screen-loader');
  if (loader) {
    loader.classList.add('hidden');
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

// Centralized configuration for all static partials.
const partialsMap = {
  'main-header-placeholder': { path: './source/components/header.html' },
  'drawer-placeholder': { path: './source/components/drawer.html' },
  'bottom-nav-placeholder': { path: './source/components/tab-nav.html' },
  'role-switcher-placeholder': { path: './source/components/role-switcher.html', devOnly: true }
};

/**
 * A reusable function to load an HTML partial into a given element
 * and correctly execute any scripts within it.
 * @param {HTMLElement} element - The placeholder element to inject content into.
 * @param {string} path - The path to the HTML partial file.
 */
export async function loadComponent(element, path) {
  try {
    console.log(`Attempting to fetch partial from: ${new URL(path, window.location.origin).href}`);
    const res = await fetch(`${path}?v=${new Date().getTime()}`); // Cache bust
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    const html = await res.text();

    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html;

    // Separate scripts from the rest of the content
    const scripts = Array.from(tempContainer.querySelectorAll('script'));
    scripts.forEach(s => s.remove());

    // Inject the HTML content without the scripts
    element.innerHTML = tempContainer.innerHTML;

    // Execute scripts sequentially and wait for them to complete
    for (const script of scripts) {
      await new Promise((resolve, reject) => {
        const newScript = document.createElement('script');
        // Copy all attributes (like type="module")
        script.getAttributeNames().forEach(attr => newScript.setAttribute(attr, script.getAttribute(attr)));
        newScript.textContent = script.textContent;

        // For external scripts, we wait for the 'load' event.
        if (script.src) {
          newScript.onload = resolve;
          newScript.onerror = reject;
        }

        element.appendChild(newScript);

        // For inline scripts (both classic and module), they execute immediately upon
        // being added to the DOM. There is no 'load' event. So, we can resolve right away.
        if (!script.src) {
          resolve();
        }
      });
    }
  } catch (err) {
    console.error(`❌ Failed to load component from: ${path}`, err);
    element.innerHTML = `<div style="color:red; padding:10px;">Failed to load ${path}.</div>`;
    throw err;
  }
}

/**
 * Finds all elements with a `data-partial` attribute and loads them using the loadComponent helper.
 */
export async function loadCoreComponents() {
    // Show dev-only partials if appMode is 'dev' or 'promo'
    const allowDevOnly = APP_CONFIG.appMode === 'dev' || APP_CONFIG.appMode === 'promo';

    const promises = [];

    for (const [id, config] of Object.entries(partialsMap)) {
        const element = document.getElementById(id);

        if (!element) {
            // It's okay if a dev-only placeholder is not found in production.
            if (!config.devOnly) {
                console.warn(`Partial loader: Element with ID #${id} not found.`);
            }
            continue;
        }

        // Skip dev-only partials if not in the correct mode
        if (config.devOnly && !allowDevOnly) {
            element.remove(); // Clean up the placeholder
            continue;
        }

        // Use the reusable function for each partial
        promises.push(loadComponent(element, config.path));
    }

    // Wait for all partials to finish loading and executing their scripts
    await Promise.all(promises);
    // Dispatch a global event to notify that all initial partials are ready.
    window.dispatchEvent(new CustomEvent('partialsLoaded'));
}


// Main application initialization function
export async function initializeApp() {
  console.log("🚀 🚀 Initializing App...");
  setupPwaRefreshBlockers();
  showFullScreenLoader();

  // 1. Load core static components like header and navigation first.
  await loadCoreComponents();

  // Set --header-height immediately after core components are loaded
  const headerContainer = document.querySelector('.header-container');
  if (headerContainer) {
    document.documentElement.style.setProperty('--header-height', `${headerContainer.offsetHeight}px`);
  }

  // 2. Initialize the View Manager. This sets up the dynamic content views.
  await viewManager.init();
  
  

  // 3. Set up ResizeObservers to automatically adjust layout variables.
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
    hideFullScreenLoader();
  }

  // 6. Initialize cart and saved items in sessionStorage if they don't exist
  if (!sessionStorage.getItem('cart')) {
    sessionStorage.setItem('cart', '[]');
  }
  if (!sessionStorage.getItem('savedItems')) {
    sessionStorage.setItem('savedItems', '[]');
  }
}

function initializeLayoutObservers() {
  const header = document.querySelector('.header-container');
  const bottomBar = document.querySelector('.bottom-tab-bar');

  const observer = new ResizeObserver(entries => {
    for (let entry of entries) {
      const height = entry.contentRect.height;
      if (entry.target.matches('.header-container')) {
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      } else if (entry.target.matches('.bottom-tab-bar')) {
        document.documentElement.style.setProperty('--nav-tab-height', `${height}px`);
      }
    }
  });

  if (header) observer.observe(header);
  if (bottomBar) observer.observe(bottomBar);
}

function initializePullToRefresh() {
  const ptr = document.getElementById("pullToRefresh");
  const arrow = document.getElementById("arrowIcon");
  const spinner = document.getElementById("spinnerIcon");
  // Listen on the main content area, which contains the scrollable views.
  const mainContent = document.getElementById('page-view-area');

  if (!mainContent) {
    console.error("PTR Error: .page-view-area container not found.");
    return;
  }

  let startY = 0;
  let isPulling = false;
  const pullThreshold = 60;
  let currentHeaderHeight = 0;

  const updateHeaderHeight = () => {
    currentHeaderHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
    if (ptr.offsetHeight > 0) {
        ptr.style.top = `${currentHeaderHeight - ptr.offsetHeight}px`;
    }
  };

  window.addEventListener('partialsLoaded', updateHeaderHeight);
  window.addEventListener('resize', updateHeaderHeight);
  updateHeaderHeight();

  mainContent.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    isPulling = false; // Reset on every touch.
  }, { passive: true });

  mainContent.addEventListener('touchmove', e => {
    const activeView = mainContent.querySelector('.page-view-area.view-active');
    if (!activeView) return; // Exit if no active view. 

    const isAtTop = activeView.scrollTop === 0;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    // Condition to START a pull: active view is at the top, user is pulling down, and not already in a pull.
    if (isAtTop && diff > 5 && !isPulling) {
      isPulling = true;
      ptr.style.transition = 'none'; // Disable transition during pull for direct mapping.
    }

    if (isPulling) {
      e.preventDefault(); // Take control from browser.
      const pullDistance = Math.max(0, diff);
      ptr.style.top = `${currentHeaderHeight - ptr.offsetHeight + Math.min(pullDistance, 120)}px`;
      
      const rotation = Math.min((pullDistance / pullThreshold) * 180, 180);
      arrow.style.transform = `rotate(${rotation}deg)`;
    }
  }, { passive: false });

  mainContent.addEventListener('touchend', e => {
    if (!isPulling) return;

    const currentY = e.changedTouches[0].clientY;
    const diff = currentY - startY;
    
    isPulling = false;
    ptr.style.transition = 'top 0.3s ease'; // Restore animation.

    if (diff > pullThreshold) {
      // Trigger Refresh
      ptr.style.top = `${currentHeaderHeight}px`;
      arrow.style.display = "none";
      spinner.style.display = "inline-block";
      spinner.classList.add("spinning");

      window.dispatchEvent(new CustomEvent('appRefreshRequested'));

      setTimeout(() => {
        ptr.style.top = `${currentHeaderHeight - ptr.offsetHeight}px`;
        arrow.style.display = "inline-block";
        spinner.style.display = "none";
        spinner.classList.remove("spinning");
        arrow.style.transform = 'rotate(0deg)';
      }, 1500);
    } else {
      // Cancel pull, snap back.
      ptr.style.top = `${currentHeaderHeight - ptr.offsetHeight}px`;
      arrow.style.transform = 'rotate(0deg)';
    }
  });
}