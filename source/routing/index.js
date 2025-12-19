/**
 * Routing Module - Public API and Integration Layer
 * Connects the new routing system with the existing application
 */

import { routeManager } from './route-manager.js';

// Re-export main functions for easy access
export { routeManager as default };
export { routeManager };

// Export convenience functions
export const navigate = (role, viewId, params) => routeManager.navigate(role, viewId, params);
export const getCurrentRoute = () => routeManager.getCurrentRoute();
export const goBack = () => routeManager.goBack();

// Backward compatibility - alias for existing code
export const switchView = (role, viewId, params) => routeManager.navigate(role, viewId, params);

// Integration with existing RouteManager
export const integrateWithExistingSystem = () => {
  // Make new routing available globally
  window.routeManagerV2 = routeManager;

  // Override existing routeManager methods if needed
  if (window.routeManager && window.routeManager.switchView) {
    const originalSwitchView = window.routeManager.switchView;

    window.routeManager.switchView = async (role, viewId, fromPopState = false) => {
      try {
        // Try new routing system first
        const success = await routeManager.navigate(role, viewId);
        if (success) {
          return;
        }
      } catch (error) {
        console.warn('New routing failed, falling back to old system:', error);
      }

      // Fallback to old system
      return originalSwitchView.call(window.routeManager, role, viewId, fromPopState);
    };
  }

  console.log('🔗 Routing systems integrated');
};

// Auto-integrate when imported
integrateWithExistingSystem();