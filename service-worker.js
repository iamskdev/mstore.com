// --- Resilient Service Worker with Fallback Support ---
const CACHE_NAME = 'APNA_STORE_CACHE_V7.2.0'; // Cache version updated for new path strategy
const OFFLINE_PAGE = './source/common/pages/offline.html'; // Path from root
const RUNTIME_CACHE = 'runtime-cache';
const MAX_RUNTIME_CACHE_AGE = 24 * 60 * 60; // 24 hours in seconds

// Import necessary configurations from other modules
import { viewConfig } from './source/utils/view-config.js';

// Centralized configuration for all static partials.
const partialsMap = {
  'main-header-placeholder': { path: './source/components/header.html' },
  'drawer-placeholder': { path: './source/components/drawer.html' },
  'bottom-nav-placeholder': { path: './source/components/tab-nav.html' },
  'role-switcher-placeholder': { path: './source/components/role-switcher.html', devOnly: true }
};

// Helper to normalize URLs by removing query parameters and hash.
// This is crucial for caching assets that might have cache-busting parameters (e.g., ?v=timestamp).
function normalizeUrl(url) {
  const urlObj = new URL(url, self.location.origin); // Use self.location.origin for base URL
  urlObj.search = ''; // Remove query parameters
  urlObj.hash = '';   // Remove hash
  return urlObj.toString();
}

// --- App Shell + Critical Assets (Manually Maintained) ---
// This list must be manually updated when new critical utility scripts are added.
// A bundler like Webpack would handle this automatically, but for a no-bundler setup,
// this list is the single source of truth for what makes the app shell work offline.
const APP_SHELL_URLS_STATIC = [
  // Tier 1: Core App Shell - The absolute minimum to render the page.
  { url: './index.html', priority: 1 },
  { url: './manifest.json', priority: 1 },
  { url: OFFLINE_PAGE, priority: 1 },
  { url: './source/main.css', priority: 1 },
  { url: './source/assets/logos/app-logo-192.png', priority: 1 },
  { url: './source/assets/logos/app-logo-512.png', priority: 1 },

  // Tier 2: Core Scripts & Config - The main logic that boots the app.
  { url: './source/utils/app-config.js', priority: 2 },
  { url: './source/main.js', priority: 2 },
  { url: './source/firebase/firebase-config.js', priority: 2 },

  // Tier 3: Core Utility Modules - All the helper scripts the app depends on.
  { url: './source/utils/data-manager.js', priority: 4 },
  { url: './source/utils/filter-helper.js', priority: 3 },
  { url: './source/utils/footer-helper.js', priority: 3 },
  { url: './source/utils/formatters.js', priority: 3 },
  { url: './source/utils/pwa-manager.js', priority: 3 },
  { url: './source/utils/theme-switcher.js', priority: 4 },
  { url: './source/utils/toast.js', priority: 3 },
  
  
  // Tier 4: Firebase Modules & Other Logic
  { url: './source/firebase/auth/auth.js', priority: 4 },
  { url: './source/firebase/firestore/logs-collection.js', priority: 4 },
  { url: './source/firebase/firebase-credentials.js', priority: 4 },



  // Tier 6: Third-party Libraries
  { url: 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js', priority: 6 },
  { url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', priority: 6 },
  { url: 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap', priority: 6 }
];

// Dynamically generate URLs from partialsMap and viewConfig
const dynamicAppShellUrls = new Set();

// Add partials from partialsMap
for (const id in partialsMap) {
  dynamicAppShellUrls.add(normalizeUrl(partialsMap[id].path));
}

// Add view contents (HTML, CSS, JS) from viewConfig
for (const role in viewConfig) {
  for (const view in viewConfig[role]) {
    const config = viewConfig[role][view];
    if (config.path) {
      dynamicAppShellUrls.add(normalizeUrl(config.path));
    }
    if (config.cssPath) {
      dynamicAppShellUrls.add(normalizeUrl(config.cssPath));
    }
    if (config.jsPath) {
      dynamicAppShellUrls.add(normalizeUrl(config.jsPath));
    }
  }
}

// Convert dynamic set to array of objects with a default priority (e.g., Tier 3)
const APP_SHELL_URLS_DYNAMIC = Array.from(dynamicAppShellUrls).map(url => ({ url: url, priority: 3 }));

// Combine static and dynamic lists
const APP_SHELL_URLS = APP_SHELL_URLS_STATIC.concat(APP_SHELL_URLS_DYNAMIC);

// --- Improved Helper Functions ---
const isCacheable = (request) => {
  const url = new URL(request.url);
  return (
    request.method === 'GET' &&
    url.protocol.startsWith('http') &&
    !request.url.includes('firestore.googleapis.com') &&
    !request.url.includes('firebaseinstallations.googleapis.com') &&
    !request.url.includes('chrome-extension:') &&
    !request.url.includes('sockjs-node')
  );
};

const shouldCacheInRuntime = (request) => {
  return (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'script' ||
    request.destination === 'style'
  );
};

const addToCache = async (cacheName, request, response) => {
  if (response && response.ok) {
    try {
      const cache = await caches.open(cacheName); // Open the specified cache
      await cache.put(new Request(normalizeUrl(request.url), request), response.clone()); // Cache with normalized URL
      return true;
    } catch (error) { // Catch any errors during caching
      console.error(`Failed to cache ${request.url}:`, error);
      return false;
    }
  }
  return false;
};

const fromCache = async (request) => {
  try {
    const cache = await caches.open(CACHE_NAME); // Open the primary cache
    const cached = await cache.match(normalizeUrl(request.url)); // Match against normalized URL
    if (cached) return cached;
    
    const runtimeCache = await caches.open(RUNTIME_CACHE); // Open the runtime cache
    return await runtimeCache.match(normalizeUrl(request.url)); // Match against normalized URL
  } catch (error) {
    console.error('Cache access error:', error);
    return undefined;
  }
};

const fromNetwork = async (request, cacheName) => {
  try {
    const response = await fetch(request);
    const responseClone = response.clone();
    
    if (cacheName && shouldCacheInRuntime(request)) { // Only cache if it's a cacheable type
      await addToCache(cacheName, request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.warn(`Network request failed: ${request.url}`, error);
    throw error;
  }
};

// --- Resilient Installation ---
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing with new path strategy...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('Service Worker: Caching App Shell...');
        
        // Extract just the URLs from the configuration object
        const urlsToCache = APP_SHELL_URLS.map(item => item.url);
        
        await cache.addAll(urlsToCache);
        console.log('Service Worker: App Shell caching complete.');
        
        await self.skipWaiting();
      } catch (error) {
        console.error('Service Worker: Failed to cache App Shell during install.', error);
      }
    })()
  );
});

// --- Activation ---
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
      
      // Clean up expired runtime cache entries
      const runtimeCache = await caches.open(RUNTIME_CACHE);
      const requests = await runtimeCache.keys();
      
      await Promise.all(
        requests.map(async request => {
          const response = await runtimeCache.match(request);
          if (response) {
            const date = new Date(response.headers.get('date'));
            if (Date.now() - date > MAX_RUNTIME_CACHE_AGE * 1000) {
              await runtimeCache.delete(request);
            }
          }
        })
      );
      
      await self.clients.claim();
      console.log('Service Worker: Activation completed');
    })().catch(err => {
      console.error('Activation failed:', err);
      // Even if cleanup fails, we still want to activate
      return self.clients.claim();
    })
  );
});

// --- Fetch Handling ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  if (!isCacheable(request)) return;

  const isAppShellAsset = APP_SHELL_URLS.some(
    asset => normalizeUrl(asset.url) === normalizeUrl(request.url)
  );

  // API requests (Network only, no caching)
  if (request.url.includes('/api/')) {
    // Let the browser handle it, don't intercept
    return;
  }

  if (isAppShellAsset) {
    event.respondWith(
      (async () => {
        const cached = await fromCache(request);
        if (cached) {
          // Serve from cache immediately, then update in the background
          event.waitUntil(fromNetwork(request, CACHE_NAME).catch(() => { /* Ignore background update failures */ }));
          return cached;
        }
        // If not in cache, fetch from network and add to cache
        return fromNetwork(request, CACHE_NAME);
      })()
    );
    return;
  }

  // All other assets (Cache-first, falling back to network)
  event.respondWith(
    fromCache(request).then(
      (cachedResponse) => cachedResponse || fromNetwork(request, RUNTIME_CACHE)
    )
  );
});