const OFFLINE_PAGE = './source/common/pages/offline.html';
const RUNTIME_CACHE = 'runtime-cache';
const MAX_RUNTIME_CACHE_AGE = 24 * 60 * 60; // 24 hours in seconds

let dynamicCacheName;

// --- App Shell + Critical Assets ---
const APP_SHELL_URLS = [
  // Core App Shell
  './index.html',
  './manifest.json',
  OFFLINE_PAGE,
  './source/main.css',
  './source/common/styles/theme.css',
  './source/assets/logos/app-logo.png',

  // Core Scripts & Config
  './source/settings/config.json',
  './source/settings/main-config.js',
  './source/main.js',
  './source/firebase/firebase-config.js',

  // Core Utility Modules
  './source/utils/data-manager.js',
  './source/api/cloudinary.js',
  './source/partials/filter/filter-bar.js',
  './source/partials/filter/filter-modal.js',
  './source/utils/formatters.js',
  './source/utils/pwa-manager.js',
  './source/utils/theme-switcher.js',
  './source/utils/toast.js',
  './source/templates/banner.js',
  './source/utils/search-handler.js',
  './source/utils/cart-manager.js',
  './source/utils/cursor-zoom.js',
  './source/utils/image-zoom.js',

  // Firebase Modules
  './source/firebase/auth/auth.js',
  './source/firebase/firestore/logs-collection.js',
  './source/firebase/firebase-credentials.js',

  // Components
  './source/partials/navigations/top-nav.js',
  './source/partials/navigations/top-nav.html',
  './source/partials/navigations/bottom-nav.js',
  './source/partials/navigations/bottom-nav.html',
  './source/partials/drawer/drawer.js',
  './source/partials/drawer/drawer.html',
  './source/partials/footer/footer.html',
  './source/partials/footer/footer.js',
  './source/partials/filter/filter-bar.html',
  './source/partials/filter/filter-modal.html',
  './source/partials/role-switcher.html',
  './source/partials/modals/feedback.html',
  './source/partials/modals/feedback.js',
  './source/templates/cards/card-grid.html',
  './source/templates/banner.html',
  './source/templates/cards/card-list.html',

  // Pages & Associated Assets from view-config.
  './source/routes.js',
  './source/templates/cards/card-helper.js',
  './source/common/pages/cart.html',
  './source/common/styles/cart.css',
  './source/common/scripts/cart.js',
  './source/common/pages/home.html',
  './source/common/styles/home.css',
  './source/common/scripts/home.js',
  './source/common/pages/wishlist.html',
  './source/common/scripts/wishlist.js',
  './source/common/styles/wishlist.css',
  './source/utils/saved-manager.js',
  './source/common/pages/authentication.html',
  './source/common/styles/authentication.css',
  './source/common/scripts/authentication.js',
  './source/common/pages/notification.html',
  './source/common/styles/notification.css',
  './source/common/scripts/notification.js',
  './source/modules/admin/pages/admin-home.html',

  // Item Details View
  './source/common/pages/item-details.html',
  './source/common/styles/item-details.css',
  './source/common/scripts/item-details.js',

  // Profile Edit View
  './source/common/pages/profile-update.html',
  './source/common/styles/profile-update.css',
  './source/common/scripts/profile-update.js',

  // Merchant Profile View
  './source/common/pages/merchant-profile.html',
  './source/common/styles/merchant-profile.css',
  './source/common/scripts/merchant-profile.js',
  
  // Updates View
  './source/common/pages/updates.html',
  './source/common/styles/updates.css',
  './source/common/scripts/updates.js',
  './source/modules/admin/styles/admin-home.css',
  './source/modules/admin/scripts/admin-home.js',

  // Merchant Add View
  './source/modules/merchant/pages/add.html',
  './source/modules/merchant/styles/add.css',
  './source/modules/merchant/scripts/add.js',
  
  // Merchant Profile Edit View
  './source/modules/merchant/pages/merchant-profile-edit.html',
  './source/modules/merchant/styles/merchant-profile-edit.css',
  './source/modules/merchant/scripts/merchant-profile-edit.js',

  //Modals
  './source/modals/account-switcher.html',
  './source/modals/rating/rating-modal.html',
  './source/modals/rating/rating-modal.js',  
  './source/modals/story-viewer/story-viewer.html',
  './source/modals/story-viewer/story-viewer.js',

  // Chat feature
  './source/common/pages/chat.html',
  './source/common/styles/chat.css',
  './source/common/scripts/chat.js',
  './source/common/pages/conversation.html',
  './source/common/styles/conversation.css',
  './source/common/scripts/conversation.js',

  // Media Editor
  './source/modals/media-editor/media-editor.html',
  './source/modals/media-editor/media-editor.js',

  // OTP Modal
  './source/modals/otp-verification-modal.html',
  './source/modals/otp-verification-modal.js',

  // Third-party Libraries
  'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap'
];

async function getCacheName() {
    if (dynamicCacheName) {
        return dynamicCacheName;
    }
    try {
        const response = await fetch('./source/settings/config.json');
        const config = await response.json();
        dynamicCacheName = `${config.app.name}_Cache_v${config.app.version}`;
        return dynamicCacheName;
    } catch (error) {
        console.error('Failed to fetch config to generate cache name. Using a default.', error);
        return 'mStore_Cache_v_default';
    }
}

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
    const cacheName = await getCacheName();
    const cache = await caches.open(cacheName);
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
        const cacheName = await getCacheName();
        const cache = await caches.open(cacheName);
        console.log('Service Worker: Caching App Shell...');
        for (const url of APP_SHELL_URLS) {
          try {
            console.log(`Service Worker: Attempting to cache ${url}`); // Added log
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
        const currentCacheName = await getCacheName();
        console.log(`Service Worker activated. Using cache: ${currentCacheName}`);
        const keys = await caches.keys();
        await Promise.all(
            keys.map(key => {
                if (key !== currentCacheName && key !== RUNTIME_CACHE) {
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

// --- Fetch Handling ---
self.addEventListener('message', async (event) => {
  console.log('Service Worker: Received message:', event.data);
  if (event.data && event.data.command === 'GET_CACHE_NAME') {
    const cacheName = await getCacheName();
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ command: 'CACHE_NAME_RESPONSE', cacheName: cacheName });
    }
  } else if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({ status: 'Service Worker: Message received' });
  }
});

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
        const cacheName = await getCacheName();
        const cached = await fromCache(request);
        if (cached) {
          event.waitUntil(fromNetwork(request, cacheName).catch(() => {}));
          return cached;
        }
        return fromNetwork(request, cacheName);
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
