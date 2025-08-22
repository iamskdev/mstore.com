/**
 * @file Manages all PWA-related functionality: Service Worker and Install Prompt.
 * This centralizes the logic, keeping index.html clean and making app startup more organized.
 */

import { showToast } from './toast.js';

// --- PWA Install Prompt State ---
// This variable holds the install prompt event. It's in the module scope
// so it can be captured by the early event listener below.
let deferredPrompt;
let handleInstallClick; // This will be defined inside initializePwaInstall and used by the toast

export function setDeferredPrompt(e) {
  deferredPrompt = e;
}

export function getDeferredPrompt() {
  return deferredPrompt;
}

/**
 * Shows a non-intrusive toast notification to prompt the user to install the PWA.
 * This is designed to be called after the 'beforeinstallprompt' event has fired.
 */
function showInstallPromptToast() {
  // 1. Check if the prompt should be shown.
  // Don't show if the app is already in standalone mode or if the prompt has been shown in this session.
  if (window.matchMedia('(display-mode: standalone)').matches || sessionStorage.getItem('installPromptShown')) {
    return;
  }

  // 2. Create the toast element dynamically.
  const toast = document.createElement('div');
  toast.className = 'install-prompt-toast';
  toast.innerHTML = `
    <div class="install-toast-content">
        <img src="./source/assets/logos/app-logo.png" alt="App Logo" class="install-toast-logo">
        <div class="install-toast-text">
            <strong>Add Apna Store to Home Screen</strong>
            <span>For a faster, full-screen experience.</span>
        </div>
    </div>
    <div class="install-toast-actions">
        <button id="install-toast-later" class="install-toast-btn later">Later</button>
        <button id="install-toast-install" class="install-toast-btn install">Install</button>
    </div>
  `;

  // 3. Add the toast to the body and make it visible.
  document.body.appendChild(toast);
  // A tiny delay ensures the browser has rendered the element before we trigger the transition.
  setTimeout(() => toast.classList.add('visible'), 50);

  // 4. Add event listeners for the toast buttons.
  const laterBtn = document.getElementById('install-toast-later');
  const installBtn = document.getElementById('install-toast-install');

  const dismissToast = () => {
    toast.classList.remove('visible');
    // Remove the element from the DOM after the transition ends.
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  };

  laterBtn.addEventListener('click', () => {
    dismissToast();
    // Remember that the user dismissed it for this session.
    sessionStorage.setItem('installPromptShown', 'true');
  });

  installBtn.addEventListener('click', () => {
    dismissToast();
    // Trigger the main install logic if it's available.
    if (handleInstallClick) {
      handleInstallClick();
    }
    sessionStorage.setItem('installPromptShown', 'true');
  });
}

/**
 * Sets up the PWA installation button and its logic.
 * This is the central place for PWA install handling.
 */
export function initializePwaInstall() {
  // Check if the app is already installed (running in standalone mode).
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('PWA is already running in standalone mode. Install prompt will not be shown.');
    // Dispatch an event to tell UI components to hide their install buttons permanently.
    window.dispatchEvent(new CustomEvent('pwaAlreadyInstalled'));
    return; // No need to set up install listeners.
  }

  // Define the core install logic here so it's in scope for the toast and drawer listeners.
  handleInstallClick = async () => {
    const currentDeferredPrompt = getDeferredPrompt();
    if (!currentDeferredPrompt) {
      // Provide more specific feedback to the user.
      // The most common reason for failure is not being on a secure (HTTPS) context.
      if (!window.isSecureContext) {
        showToast('error', 'Installation requires a secure (HTTPS) connection. Check the URL bar for a 🔒 icon.', 5000);
      } else {
        showToast('info', 'App is not installable right now. It might be already installed or the browser needs a refresh.', 5000);
      }
      return;
    }

    // Show the browser's native prompt.
    currentDeferredPrompt.prompt();
    const { outcome } = await currentDeferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // The deferredPrompt can only be used once. Clear it.
    setDeferredPrompt(null);

    // Notify the UI to hide the install buttons, regardless of the outcome.
    window.dispatchEvent(new CustomEvent('pwaAlreadyInstalled'));
  };

  // Listen for the event from index.html that the prompt is ready.
  window.addEventListener('pwaInstallReady', () => {
    // Show the toast after a short delay to be less intrusive.
    setTimeout(showInstallPromptToast, 3000);
  });

  // Use a single, delegated event listener for all drawer install buttons.
  const drawerContainer = document.getElementById('app-drawer');
  if (drawerContainer) {
    drawerContainer.addEventListener('click', (event) => {
      const installBtn = event.target.closest('.drawer-install-btn');
      if (installBtn) {
        handleInstallClick();
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed successfully.');
    // Dispatch an event to tell UI components to hide their install buttons.
    window.dispatchEvent(new CustomEvent('pwaAlreadyInstalled'));
    setDeferredPrompt(null);
  });
}

export function setupPwaRefreshBlockers() {
  // Check if the app is running in standalone mode (installed PWA)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log("PWA is in standalone mode. Disabling browser refresh.");

    // 1. Block keyboard refresh shortcuts (F5, Ctrl+R)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        console.log("Blocked Ctrl+R refresh.");
        e.preventDefault();
      }
      if (e.key === 'F5') {
        console.log("Blocked F5 refresh.");
        e.preventDefault();
      }
    });

    // 2. Block context menu (which contains the reload option)
    window.addEventListener('contextmenu', (e) => {
      console.log("Blocked context menu.");
      e.preventDefault();
    });
  }
}
