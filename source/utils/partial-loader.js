/**
 * @file A robust module to load HTML partials/components and correctly execute their scripts.
 */
import { APP_CONFIG } from './app-config.js';

// Centralized configuration for all static partials.
// Maps the placeholder element's ID to the path of its HTML content.
const partialsMap = {
  'main-header-placeholder': { path: './source/components/header.html' },
  'drawer-placeholder': { path: './source/components/drawer.html' },
  'bottom-nav-placeholder': { path: './source/components/tab-nav.html' },
  'role-switcher-placeholder': { path: './source/components/role-switcher.html', devOnly: true }
};

export { partialsMap }; // Export the map for use in other modules (e.g., service worker)

/**
 * A reusable function to load an HTML partial into a given element
 * and correctly execute any scripts within it. This is the core logic.
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
        newScript.onload = resolve;
        newScript.onerror = reject;
        element.appendChild(newScript); // Append to the element itself for better encapsulation
        if (!script.src && script.type !== 'module') resolve(); // Inline classic scripts execute synchronously
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
export async function loadSmartPartials() {
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