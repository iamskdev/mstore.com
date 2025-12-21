/**
 * Route Validator - Security and validation for routing
 * Ensures routes are safe, valid, and properly authorized
 */

class RouteValidator {
  constructor() {
    this.allowedRoles = ['guest', 'consumer', 'merchant', 'admin'];
    this.allowedRoutes = this.loadAllowedRoutes();
    this.securityRules = this.loadSecurityRules();
  }

  /**
   * Load allowed routes configuration
   */
  loadAllowedRoutes() {
    // In a real app, this would come from a config file
    return {
      guest: ['home'],
      consumer: ['home', 'cart', 'item-details/:id', 'conversation/:id', 'merchant-profile/:id', 'account', 'wishlist', 'updates', 'notifications'],
      merchant: ['home', 'dashboard', 'dashboard/analytics', 'dashboard/transactions', 'dashboard/inventory', 'dashboard/parties', 'dashboard/posts', 'dashboard/reports', 'add-item', 'add-item/:itemId', 'profile-edit', 'add-invoice'],
      admin: ['home', 'users', 'analytics', 'requests']
    };
  }

  /**
   * Load security rules
   */
  loadSecurityRules() {
    return {
      // Routes that require authentication
      requiresAuth: ['account', 'cart', 'dashboard', 'add-item', 'profile-edit', 'add-invoice'],

      // Routes that require specific roles
      roleRequired: {
        'dashboard': ['merchant'],
        'add-item': ['merchant'],
        'add-invoice': ['merchant'],
        'users': ['admin'],
        'analytics': ['admin'],
        'requests': ['admin']
      },

      // Parameter validation rules
      paramRules: {
        id: /^[a-zA-Z0-9_-]+$/,
        merchantId: /^[0-9]+$/,
        itemId: /^[0-9]+$/
      }
    };
  }

  /**
   * Validate a route
   * @param {string} role - User role
   * @param {string} viewId - Route identifier
   * @param {object} params - Route parameters
   * @returns {boolean} Is valid
   */
  validateRoute(role, viewId, params = {}) {
    try {
      // 1. Validate role
      if (!this.validateRole(role)) {
        console.error('❌ Invalid role:', role);
        return false;
      }

      // 2. Validate route exists
      if (!this.validateRouteExists(role, viewId)) {
        console.error('❌ Route not allowed:', role, viewId);
        return false;
      }

      // 3. Validate permissions
      if (!this.validatePermissions(role, viewId)) {
        console.error('❌ Insufficient permissions:', role, viewId);
        return false;
      }

      // 4. Validate parameters
      if (!this.validateParameters(viewId, params)) {
        console.error('❌ Invalid parameters:', params);
        return false;
      }

      // 5. Security checks
      if (!this.runSecurityChecks(role, viewId, params)) {
        console.error('❌ Security check failed');
        return false;
      }

      console.log('✅ Route validated:', role, viewId);
      return true;

    } catch (error) {
      console.error('❌ Route validation error:', error);
      return false;
    }
  }

  /**
   * Validate user role
   * @param {string} role - Role to validate
   * @returns {boolean} Is valid
   */
  validateRole(role) {
    return this.allowedRoles.includes(role);
  }

  /**
   * Check if route exists for role
   * @param {string} role - User role
   * @param {string} viewId - Route identifier
   * @returns {boolean} Route exists
   */
  validateRouteExists(role, viewId) {
    const allowedRoutes = this.allowedRoutes[role] || [];

    // Check exact match
    if (allowedRoutes.includes(viewId)) {
      return true;
    }

    // Check parameterized routes
    for (const allowedRoute of allowedRoutes) {
      if (this.matchParameterizedRoute(allowedRoute, viewId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Match parameterized route pattern
   * @param {string} pattern - Route pattern (e.g., 'item-details/:id')
   * @param {string} route - Actual route (e.g., 'item-details/123')
   * @returns {boolean} Matches
   */
  matchParameterizedRoute(pattern, route) {
    const patternParts = pattern.split('/');
    const routeParts = route.split('/');

    if (patternParts.length !== routeParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const routePart = routeParts[i];

      if (patternPart.startsWith(':')) {
        // Parameter placeholder - validate parameter type
        const paramName = patternPart.substring(1);
        if (!this.validateParameterValue(paramName, routePart)) {
          return false;
        }
      } else if (patternPart !== routePart) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate user permissions for route
   * @param {string} role - User role
   * @param {string} viewId - Route identifier
   * @returns {boolean} Has permission
   */
  validatePermissions(role, viewId) {
    // Check if route requires specific role
    const requiredRoles = this.securityRules.roleRequired[viewId];
    if (requiredRoles && !requiredRoles.includes(role)) {
      return false;
    }

    // Check if route requires authentication
    if (this.securityRules.requiresAuth.includes(viewId)) {
      // In a real app, check if user is authenticated
      const isAuthenticated = this.checkAuthentication();
      if (!isAuthenticated) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate route parameters
   * @param {string} viewId - Route identifier
   * @param {object} params - Parameters object
   * @returns {boolean} Parameters valid
   */
  validateParameters(viewId, params) {
    try {
      // Sanitize all parameters first
      const sanitized = this.sanitizeParams(params);

      // Validate each parameter
      for (const [key, value] of Object.entries(sanitized)) {
        if (!this.validateParameterValue(key, value)) {
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('❌ Parameter validation error:', error);
      return false;
    }
  }

  /**
   * Validate individual parameter value
   * @param {string} paramName - Parameter name
   * @param {*} value - Parameter value
   * @returns {boolean} Is valid
   */
  validateParameterValue(paramName, value) {
    const rule = this.securityRules.paramRules[paramName];

    if (!rule) {
      // No specific rule, basic validation
      return this.basicValidation(value);
    }

    // Apply specific regex rule
    return rule.test(String(value));
  }

  /**
   * Basic parameter validation
   * @param {*} value - Value to validate
   * @returns {boolean} Is valid
   */
  basicValidation(value) {
    // Check for null/undefined
    if (value === null || value === undefined) {
      return true; // Allow optional params
    }

    // Check type
    const validTypes = ['string', 'number', 'boolean'];
    if (!validTypes.includes(typeof value)) {
      return false;
    }

    // String-specific checks
    if (typeof value === 'string') {
      // Check length
      if (value.length > 1000) {
        return false;
      }

      // Check for suspicious content
      const suspicious = ['<script', 'javascript:', 'onload=', 'onerror='];
      for (const pattern of suspicious) {
        if (value.toLowerCase().includes(pattern)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Sanitize parameters
   * @param {object} params - Parameters to sanitize
   * @returns {object} Sanitized parameters
   */
  sanitizeParams(params) {
    const sanitized = {};

    for (const [key, value] of Object.entries(params)) {
      // Basic sanitization
      if (typeof value === 'string') {
        sanitized[key] = value
          .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .trim();
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Run additional security checks
   * @param {string} role - User role
   * @param {string} viewId - Route identifier
   * @param {object} params - Route parameters
   * @returns {boolean} Security check passed
   */
  runSecurityChecks(role, viewId, params) {
    try {
      // Rate limiting check (basic implementation)
      if (!this.checkRateLimit()) {
        return false;
      }

      // Business rule validation
      if (!this.validateBusinessRules(role, viewId, params)) {
        return false;
      }

      return true;

    } catch (error) {
      console.error('❌ Security check error:', error);
      return false;
    }
  }

  /**
   * Check rate limiting (basic implementation)
   * @returns {boolean} Within limits
   */
  checkRateLimit() {
    // In a real app, implement proper rate limiting
    // For now, always allow
    return true;
  }

  /**
   * Validate business rules
   * @param {string} role - User role
   * @param {string} viewId - Route identifier
   * @param {object} params - Route parameters
   * @returns {boolean} Business rules valid
   */
  validateBusinessRules(role, viewId, params) {
    // Add business-specific validation here
    // For example:
    // - Merchant can only access their own data
    // - Item IDs must exist
    // - Date ranges must be valid

    return true; // Placeholder
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Is authenticated
   */
  checkAuthentication() {
    // In a real app, check authentication status
    // For now, assume authenticated
    return true;
  }

  /**
   * Get validation errors
   * @returns {Array} List of validation errors
   */
  getValidationErrors() {
    // Return accumulated errors if needed
    return [];
  }
}

// Export singleton instance
export const routeValidator = new RouteValidator();

// Export functions for direct use
export const validateRoute = (role, viewId, params) => routeValidator.validateRoute(role, viewId, params);
export const sanitizeParams = (params) => routeValidator.sanitizeParams(params);

export default routeValidator;