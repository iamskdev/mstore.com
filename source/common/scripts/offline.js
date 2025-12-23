/**
 * @file Offline Management Module
 * Handles all offline-related functionality including connection monitoring,
 * offline UI, and retry mechanisms.
 */

// --- Connection Status Monitoring ---
// Provides real-time feedback to users about their internet connection status
let lastOnlineStatus = navigator.onLine;
let connectionToastShown = false;

/**
 * Updates the visual connection indicator and shows toast notifications
 */
function updateConnectionStatus() {
  const isOnline = navigator.onLine;
  const connectionIndicator = document.getElementById('connection-indicator');

  // Update visual indicator
  if (connectionIndicator) {
    if (!isOnline) {
      connectionIndicator.classList.remove('online', 'weak');
      connectionIndicator.classList.add('offline');
      connectionIndicator.setAttribute('title', 'Offline - Limited functionality');
    } else {
      connectionIndicator.classList.remove('offline', 'weak');
      connectionIndicator.classList.add('online');
      connectionIndicator.setAttribute('title', 'Online - All features available');
    }
  }

  // Only show toast if status actually changed and not on initial load
  if (isOnline !== lastOnlineStatus && connectionToastShown) {
    if (!isOnline) {
      // Went offline
      if (typeof showToast === 'function') {
        showToast('warning', '📵 You are offline - Some features may be limited', 4000);
      }
    } else {
      // Came back online
      if (typeof showToast === 'function') {
        showToast('success', '🌐 You are back online!', 3000);
      }
    }
  }

  lastOnlineStatus = isOnline;

  // Mark that we've shown initial connection status
  if (!connectionToastShown) {
    connectionToastShown = true;
  }
}

/**
 * Initializes offline monitoring system
 */
export function initializeOfflineMonitoring() {
  // Listen for online/offline events
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);

  // Also check connection status periodically (every 30 seconds) in case events are missed
  setInterval(updateConnectionStatus, 30000);

  // Initialize connection status on app load (without showing toast)
  lastOnlineStatus = navigator.onLine;
  connectionToastShown = true; // Don't show toast on initial load

  // Initialize visual indicator
  updateConnectionStatus();

  console.log('🌐 Offline monitoring initialized');
}

/**
 * Global function for offline retry functionality (used by offline.html)
 */
window.checkConnectionAndRetry = function(button) {
  // Change button to loading state
  button.innerHTML = '<span class="retry-icon">⏳</span>Checking...';
  button.disabled = true;

  // Check connection by trying to fetch a small resource
  fetch('./manifest.json', {
    method: 'HEAD',
    cache: 'no-cache'
  })
  .then(response => {
    if (response.ok) {
      // Online - reload only the current view, not the entire app
      button.innerHTML = '<span class="retry-icon">✅</span>Connected!';
      setTimeout(() => {
        // Check if we're in offline view context (from main.js switchView)
        if (window.routeManager) {
          // Reload current view instead of full page reload
          const currentView = window.routeManager.currentView;
          if (currentView) {
            window.routeManager.switchView(currentView, window.routeManager.currentRole);
          } else {
            // Fallback to page reload if no route manager available
            window.location.reload();
          }
        } else {
          // Fallback for standalone offline page
          window.location.reload();
        }
      }, 500);
    } else {
      throw new Error('Still offline');
    }
  })
  .catch(error => {
    console.log('Still offline:', error);
    // Still offline - reset button
    button.innerHTML = '<span class="retry-icon">❌</span>Still Offline';
    button.disabled = false;

    setTimeout(() => {
      button.innerHTML = '<span class="retry-icon">🔄</span>Retry Connection';
      button.disabled = false;
    }, 2000);
  });
};

/**
 * Checks if the user is currently online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Gets the last known connection status
 */
export function getLastOnlineStatus() {
  return lastOnlineStatus;
}

/**
 * Manually triggers connection status update
 */
export function refreshConnectionStatus() {
  updateConnectionStatus();
}

/**
 * Injects fallback CSS for views when their dedicated CSS fails to load
 * This ensures content remains styled even when CSS assets are unavailable
 */
export function injectFallbackCSS(config) {
  const fallbackCSS = `
    <style id="${config.id}-fallback-style">
      #${config.id} {
        padding: 20px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        color: var(--text-primary, #1c1e21);
        background: var(--bg-secondary, #ffffff);
        min-height: 200px;
      }
      #${config.id} * {
        box-sizing: border-box;
      }
      #${config.id} h1,
      #${config.id} h2,
      #${config.id} h3,
      #${config.id} h4 {
        color: var(--text-primary, #1c1e21);
        margin-bottom: 1rem;
        font-weight: 600;
      }
      #${config.id} p {
        line-height: 1.5;
        margin-bottom: 1rem;
        color: var(--text-secondary, #606770);
      }
      #${config.id} button,
      #${config.id} .btn {
        padding: 10px 20px;
        border: 1px solid var(--border-color, #e0e0e0);
        border-radius: 6px;
        background: var(--accent-primary, #4361ee);
        color: white;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      #${config.id} button:hover,
      #${config.id} .btn:hover {
        background: var(--accent-primary-hover, #3a53c4);
      }
      #${config.id} .card,
      #${config.id} .item-card {
        background: var(--bg-secondary, #ffffff);
        border: 1px solid var(--border-color, #e0e0e0);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      #${config.id} img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
      }
    </style>
  `;

  // Only inject if not already present
  if (!document.getElementById(`${config.id}-fallback-style`)) {
    document.head.insertAdjacentHTML('beforeend', fallbackCSS);
    console.log(`Offline: Injected fallback CSS for: ${config.id}`);
  }
}
