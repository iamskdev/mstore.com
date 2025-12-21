/**
 * Route URL Handler - Handles URL generation, parsing, and SEO optimization
 * Creates industry-standard URLs with proper context and parameters
 */

class RouteUrlHandler {
  constructor() {
    this.baseUrl = '';
    this.init();
  }

  init() {
    // Get base URL from updated routing config
    try {
      const config = window.getAppConfig?.() || {};
      this.baseUrl = config.routing?.githubPage || window.location.origin;
      this.basePath = config.routing?.basePath || '';
    } catch (error) {
      this.baseUrl = window.location.origin;
      this.basePath = '';
    }
  }

  /**
   * Get dynamic path for assets and resources
   * @param {string} staticPath - Static relative path (e.g., './source/assets/logo.png')
   * @returns {string} Dynamic path with correct base path
   */
  getDynamicPath(staticPath) {
    return staticPath.replace('./', this.basePath);
  }

  /**
   * Get full asset URL
   * @param {string} assetPath - Asset path (e.g., 'source/assets/logo.png')
   * @returns {string} Full URL with base path
   */
  getAssetUrl(assetPath) {
    return `${this.basePath}${assetPath}`.replace(/^\/+/, '/');
  }

  /**
   * Generate SEO-friendly URL for routes
   * @param {string} role - User role
   * @param {string} viewId - Route identifier
   * @param {object} params - Additional parameters
   * @returns {string} Generated URL hash
   */
  generateUrl(role, viewId, params = {}) {
    try {
      let url = '';

    // Keep hierarchical dashboard URLs for better navigation
    // #/merchant/dashboard/analytics (hierarchical) is better than #/merchant-analytics (SEO)
    if (role === 'merchant' && viewId.startsWith('dashboard/')) {
      // Keep the full hierarchical URL: merchant/dashboard/analytics
      url = viewId;
    } else {
        // Standard role-based URLs
        url = `${role}/${viewId}`;
      }

      // Add query parameters if provided
      if (params && Object.keys(params).length > 0) {
        const queryString = this.buildQueryString(params);
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      console.log('🔗 Generated URL:', url);
      return url;

    } catch (error) {
      console.error('❌ URL generation error:', error);
      return `${role}/${viewId}`;
    }
  }

  /**
   * Parse URL back to route components
   * @param {string} url - URL hash to parse
   * @returns {object|null} Parsed route object
   */
  parseUrl(url) {
    try {
      if (!url || !url.startsWith('/')) {
        return null;
      }

      // Remove leading slash
      const path = url.substring(1);

      // Handle query parameters
      const [routePart, queryPart] = path.split('?');

      // Parse route
      const route = this.parseRoutePart(routePart);

      // Parse query parameters
      const params = queryPart ? this.parseQueryString(queryPart) : {};

      return {
        ...route,
        params
      };

    } catch (error) {
      console.error('❌ URL parsing error:', error);
      return null;
    }
  }

  /**
   * Parse route part of URL
   * @param {string} routePart - Route part without query string
   * @returns {object} Route components
   */
  parseRoutePart(routePart) {
    // Handle SEO URLs first (backward compatibility)
    const reverseSeoMap = {
      'merchant-analytics': { role: 'merchant', viewId: 'dashboard/analytics' },
      'merchant-transactions': { role: 'merchant', viewId: 'dashboard/transactions' },
      'merchant-inventory': { role: 'merchant', viewId: 'dashboard/inventory' },
      'merchant-parties': { role: 'merchant', viewId: 'dashboard/parties' },
      'merchant-posts': { role: 'merchant', viewId: 'dashboard/posts' },
      'merchant-reports': { role: 'merchant', viewId: 'dashboard/reports' }
    };

    // Check if it's an SEO URL
    if (reverseSeoMap[routePart]) {
      return reverseSeoMap[routePart];
    }

    // Standard role/viewId parsing
    const parts = routePart.split('/');
    if (parts.length >= 2) {
      return {
        role: parts[0],
        viewId: parts.slice(1).join('/')
      };
    }

    // Fallback
    return {
      role: 'guest',
      viewId: routePart || 'home'
    };
  }

  /**
   * Build query string from parameters
   * @param {object} params - Parameters object
   * @returns {string} Query string
   */
  buildQueryString(params) {
    try {
      const queryParts = [];

      for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined) {
          // Handle different value types
          if (typeof value === 'object') {
            queryParts.push(`${key}=${encodeURIComponent(JSON.stringify(value))}`);
          } else {
            queryParts.push(`${key}=${encodeURIComponent(String(value))}`);
          }
        }
      }

      return queryParts.join('&');

    } catch (error) {
      console.error('❌ Query string build error:', error);
      return '';
    }
  }

  /**
   * Parse query string to parameters
   * @param {string} queryString - Query string
   * @returns {object} Parameters object
   */
  parseQueryString(queryString) {
    try {
      const params = {};

      if (!queryString) return params;

      const pairs = queryString.split('&');

      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          const decodedKey = decodeURIComponent(key);
          const decodedValue = decodeURIComponent(value);

          // Try to parse JSON values
          try {
            params[decodedKey] = JSON.parse(decodedValue);
          } catch {
            // If not JSON, use as string
            params[decodedKey] = decodedValue;
          }
        }
      }

      return params;

    } catch (error) {
      console.error('❌ Query string parse error:', error);
      return {};
    }
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} Is valid
   */
  validateUrl(url) {
    try {
      // Basic validation
      if (!url || typeof url !== 'string') return false;

      // Check for malicious patterns
      const maliciousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /<script/i
      ];

      for (const pattern of maliciousPatterns) {
        if (pattern.test(url)) {
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('❌ URL validation error:', error);
      return false;
    }
  }

  /**
   * Get full URL with base
   * @param {string} hash - Hash part
   * @returns {string} Full URL
   */
  getFullUrl(hash) {
    const cleanHash = hash.startsWith('#') ? hash : `#${hash}`;
    return `${this.baseUrl}${cleanHash}`;
  }

  /**
   * Clean URL for storage/sharing
   * @param {string} url - URL to clean
   * @returns {string} Clean URL
   */
  cleanUrl(url) {
    try {
      // Remove unnecessary parameters
      // Add URL cleaning logic here
      return url;
    } catch (error) {
      console.error('❌ URL cleaning error:', error);
      return url;
    }
  }
}

// Export singleton instance
export const urlHandler = new RouteUrlHandler();

// Export functions for direct use
export const generateUrl = (role, viewId, params) => urlHandler.generateUrl(role, viewId, params);
export const parseUrl = (url) => urlHandler.parseUrl(url);

export default urlHandler;