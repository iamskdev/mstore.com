const APP_NAME = "mStore";
const APP_VERSION = "0.5.1"; // Auto bump by versioner.js
const APP_ENVIRONMENT = "development"; 
const CACHE_NAME = `${APP_NAME}_Cache_v${APP_VERSION}`;
const OFFLINE_PAGE = './source/common/pages/offline.html';
const RUNTIME_CACHE = 'runtime-cache';
const MAX_RUNTIME_CACHE_AGE = 24 * 60 * 60; // 24 hours in seconds

// --- App Shell + Critical Assets ---
// This list is now manually maintained. All critical app files must be listed here.
const APP_SHELL_URLS = [
  // Core App Shell
  './index.html',
  './manifest.json',
  OFFLINE_PAGE,
  './source/main.css',
  './source/common/styles/theme.css',
  './source/assets/logos/app-logo-192.png',
  './source/assets/logos/app-logo.png',

  // Core Scripts & Config
  './source/utils/app-config.js',
  './source/main.js',
  './source/firebase/firebase-config.js',

  // Core Utility Modules
  './source/utils/data-manager.js',
  './source/utils/filter-helper.js',
  './source/utils/footer-helper.js',
  './source/utils/formatters.js',
  './source/utils/pwa-manager.js',
  './source/utils/theme-switcher.js',
  './source/utils/toast.js',
  './source/utils/banner-mannager.js', // Added banner-mannager.js

  // Firebase Modules
  './source/firebase/auth/auth.js',
  './source/firebase/firestore/logs-collection.js',
  './source/firebase/firebase-credentials.js',

  // Components
  './source/components/header.html',
  './source/components/filter-bar.html',
  './source/components/footer.html',
  './source/components/drawer.html',
  './source/components/tab-nav.html',
  './source/components/role-switcher.html',
  './source/components/filter-modal.html',
  './source/components/cards/card-grid.html',
  './source/components/cards/banner.html', // Added banner.html

  // Pages & Associated Assets from view-config.
  './source/utils/view-config.js',
  './source/utils/card-helper.js',
  './source/common/pages/cart.html',
  './source/common/styles/cart.css',
  './source/common/scripts/cart.js',
  './source/common/pages/home.html',
  './source/common/styles/home.css',
  './source/common/scripts/home.js',
  './source/common/pages/guest-account.html',
  './source/common/styles/guest-account.css',
  './source/common/scripts/guest-account.js',
  './source/common/pages/notification-view.html',
  './source/common/styles/notification-view.css',
  './source/common/scripts/notification-view.js',
  './source/modules/admin/pages/admin-home.html',
  './source/modules/admin/pages/admin-home.css',
  './source/modules/admin/pages/admin-home.js',

  // Third-party Libraries
  'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap'
];

// Helper to normalize URLs for caching
function normalizeUrl(url) {
  const urlObj = new URL(url, self.location.origin);
  urlObj.search = '';
  urlObj.hash = '';
  return urlObj.toString();
}

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
      const cache = await caches.open(cacheName);
      await cache.put(new Request(normalizeUrl(request.url), request), response.clone());
      return true;
    } catch (error) {
      console.error(`Failed to cache ${request.url}:`, error);
      return false;
    }
  }
  return false;
};

const fromCache = async (request) => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(normalizeUrl(request.url));
    if (cached) return cached;
    
    const runtimeCache = await caches.open(RUNTIME_CACHE);
    return await runtimeCache.match(normalizeUrl(request.url));
  } catch (error) {
    console.error('Cache access error:', error);
    return undefined;
  }
};

const fromNetwork = async (request, cacheName) => {
  try {
    const response = await fetch(request);
    const responseClone = response.clone();
    
    if (cacheName && shouldCacheInRuntime(request)) {
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
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('Service Worker: Caching App Shell...');
        for (const url of APP_SHELL_URLS) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(`Service Worker: Successfully cached ${url}`);
            } else {
              console.warn(`Service Worker: Failed to cache ${url} - Response not OK: ${response.status}`);
            }
          } catch (error) {
            console.error(`Service Worker: Failed to cache ${url} - Network error or other issue:`, error);
          }
        }
        console.log('Service Worker: App Shell caching complete.');
        await self.skipWaiting();
      } catch (error) {
         // This catch block will now primarily catch errors from caches.open or self.skipWaiting
        console.error('Service Worker: Failed to open cache or skip waiting during install.', error);
      }
    })()
  );
});

// --- Activation ---
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
      
      const runtimeCache = await caches.open(RUNTIME_CACHE);
      const requests = await runtimeCache.keys();
      
      await Promise.all(
        requests.map(async request => {
          const response = await runtimeCache.match(request);
          if (response) {
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
              const date = new Date(dateHeader);
              if (!isNaN(date.getTime()) && (Date.now() - date.getTime() > MAX_RUNTIME_CACHE_AGE * 1000)) {
                await runtimeCache.delete(request);
              }
            }
          }
        })
      );
      
      await self.clients.claim();
      console.log('Service Worker: Activation completed');
    })().catch(err => {
      console.error('Activation failed:', err);
      return self.clients.claim();
    })
  );
});

// Listen for messages from clients (e.g., to request version info if not received initially)
self.addEventListener('message', (event) => {
  if (event.data === "GET_VERSION") {
    console.log('Service Worker: Sending version info', { app: APP_NAME, version: APP_VERSION, env: APP_ENVIRONMENT });
    event.source.postMessage({
      app: APP_NAME,
      version: APP_VERSION,
      env: APP_ENVIRONMENT
    });
  }
});

// --- Fetch Handling ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  if (!isCacheable(request)) return;

  const isAppShellAsset = APP_SHELL_URLS.some(
    asset => normalizeUrl(asset) === normalizeUrl(request.url)
  );

  if (request.url.includes('/api/')) {
    return;
  }

  if (isAppShellAsset) {
    event.respondWith(
      (async () => {
        const cached = await fromCache(request);
        if (cached) {
          event.waitUntil(fromNetwork(request, CACHE_NAME).catch(() => {}));
          return cached;
        }
        return fromNetwork(request, CACHE_NAME);
      })()
    );
    return;
  }

  event.respondWith(
    fromCache(request).then(
      (cachedResponse) => cachedResponse || fromNetwork(request, RUNTIME_CACHE)
    )
  );
});