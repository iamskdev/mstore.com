/**
 * Route Manager - Main routing engine for the application
 * Handles route switching, state management, and navigation
 */

import { generateUrl, parseUrl } from './route-url-handler.js';
import { validateRoute, sanitizeParams } from './route-validator.js';

class RouteManager {
  constructor() {
    this.currentRoute = null;
    this.currentParams = {};
    this.routeHistory = [];
    this.isInitialized = false;

    this.init();
  }

  init() {
    if (this.isInitialized) return;

    // Listen for browser navigation events
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('🛣️ Route Manager initialized');
  }

  setupEventListeners() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      this.handlePopState(event);
    });

    // Handle hash changes
    window.addEventListener('hashchange', () => {
      this.handleHashChange();
    });
  }

  /**
   * Navigate to a new route
   * @param {string} role - User role (merchant, consumer, admin, guest)
   * @param {string} viewId - Route identifier
   * @param {object} params - Additional parameters
   */
  async navigate(role, viewId, params = {}) {
    try {
      // Validate the route
      if (!validateRoute(role, viewId)) {
        console.error('❌ Invalid route:', role, viewId);
        return false;
      }

      // Generate the URL
      const url = generateUrl(role, viewId, params);

      // Update browser history
      this.updateHistory(role, viewId, params, url);

      // Update current state
      this.currentRoute = { role, viewId };
      this.currentParams = params;

      // Navigate to the URL
      window.location.hash = url;

      console.log('✅ Navigated to:', role, viewId, params);
      return true;

    } catch (error) {
      console.error('❌ Navigation error:', error);
      return false;
    }
  }

  /**
   * Get current route information
   */
  getCurrentRoute() {
    return {
      ...this.currentRoute,
      params: this.currentParams
    };
  }

  /**
   * Handle browser back/forward navigation
   */
  handlePopState(event) {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const parsed = parseUrl(hash);
      if (parsed) {
        this.currentRoute = { role: parsed.role, viewId: parsed.viewId };
        this.currentParams = parsed.params || {};
        console.log('🔄 Popstate handled:', parsed);
      }
    }
  }

  /**
   * Handle hash changes
   */
  handleHashChange() {
    // Hash change logic if needed
    console.log('🔗 Hash changed:', window.location.hash);
  }

  /**
   * Update browser history
   */
  updateHistory(role, viewId, params, url) {
    // Store in our internal history
    this.routeHistory.push({
      role,
      viewId,
      params,
      url,
      timestamp: Date.now()
    });

    // Limit history size
    if (this.routeHistory.length > 50) {
      this.routeHistory = this.routeHistory.slice(-50);
    }
  }

  /**
   * Go back in history
   */
  goBack() {
    if (this.routeHistory.length > 1) {
      this.routeHistory.pop(); // Remove current
      const previous = this.routeHistory[this.routeHistory.length - 1];

      if (previous) {
        window.location.hash = previous.url;
        return true;
      }
    }
    return false;
  }

  /**
   * Get route history
   */
  getHistory() {
    return [...this.routeHistory];
  }

  /**
   * Reset route manager
   */
  reset() {
    this.currentRoute = null;
    this.currentParams = {};
    this.routeHistory = [];
    console.log('🔄 Route Manager reset');
  }
}

// Export singleton instance
export const routeManager = new RouteManager();
export default routeManager;