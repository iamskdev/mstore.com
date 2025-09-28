 // Define the default "landing" view for each role.
// This makes the logic cleaner and easier to manage.
const defaultViews = {
  guest: 'home',
  user: 'home',
  merchant: 'add',
  admin: 'home' 
};

/**
 * @file View Configuration
 * Defines all possible views for each user role, their DOM IDs, and content paths.
 * This module is separated to be importable by both the main application and the Service Worker.
 */

const routeConfig = {
  guest: {
    account: {
      id: 'guest-account-view',
      path: './source/common/pages/authentication.html',
      cssPath: './source/common/styles/authentication.css',
      jsPath: './source/common/scripts/authentication.js',
      title: 'Account',
      dataDependencies: ['users', 'accounts', 'merchants']
    },
  },
  user: {
  },
  merchant: {
    home: {
      id: 'home-view',
      path: './source/common/pages/home.html',
      cssPath: './source/common/styles/home.css',
      jsPath: './source/common/scripts/home.js',
      
      embedFooter: true,
      title: 'Home',
      dataDependencies: ['items', 'promotions', 'categories', 'brands', 'orders', 'price-logs', 'alerts']
    },
    add: { id: 'merchant-add-view', path: null, title: 'Add', dataDependencies: ['categories', 'brands', 'units'] },
    analytics: { id: 'merchant-analytics-view', path: null, title: 'Analytics', dataDependencies: ['orders', 'price-logs', 'items'] },
  },
  admin: {
    home: {
      id: 'admin-home-view', 
      path: "./source/modules/admin/pages/admin-home.html",
      cssPath: "./source/modules/admin/pages/admin-home.css",
      jsPath: "./source/modules/admin/pages/admin-home.js",
      embedFooter: true,
      title: 'Home',
      dataDependencies: ['items', 'promotions', 'users', 'merchants', 'categories', 'brands', 'alerts', 'orders', 'logs', 'accounts', 'campaigns', 'counters']
    },
    users: { id: 'admin-users-view', path: null, title: 'User Data', dataDependencies: ['users', 'accounts'] },
    analytics: { id: 'admin-analytics-view', path: null, title: 'Analytics', dataDependencies: ['orders', 'price-logs', 'items', 'merchants', 'users', 'logs'] },
    requests: { id: 'admin-request-view', path: null, title: 'Request', dataDependencies: ['orders', 'users', 'merchants'] },
    logs: { id: 'admin-logs-view', path: null, title: 'Logs', dataDependencies: ['logs'] },
  },
  commonViews: {
    home: {
      id: 'home-view',
      path: './source/common/pages/home.html',
      cssPath: './source/common/styles/home.css',
      jsPath: './source/common/scripts/home.js',
      embedFooter: true,
      title: 'Home',
      dataDependencies: ['items', 'promotions', 'categories', 'brands']
    },
    chat: {
      id: 'chat-view',
      path: './source/common/pages/chat.html',
      cssPath: './source/common/styles/chat.css',
      jsPath: './source/common/scripts/chat.js',
      title: 'Chat',
      dataDependencies: ['merchants', 'users']
    },
    account: {
      id: 'account-view',
      path: './source/common/pages/account.html',
      cssPath: './source/common/styles/account.css',
      jsPath: './source/common/scripts/account.js',
      title: 'Account',
      dataDependencies: ['users', 'accounts', 'merchants']
    },
    cart: {
      id: 'cart-view',
      path: './source/common/pages/cart.html',
      cssPath: './source/common/styles/cart.css',
      jsPath: './source/common/scripts/cart.js',
      title: 'Cart',
      dataDependencies: []
    },
    'conversation/:id': {
      id: 'conversation-view',
      path: './source/common/pages/conversation.html',
      cssPath: './source/common/styles/conversation.css',
      jsPath: './source/common/scripts/conversation.js',
      title: 'Conversation',
      fullscreen: true, // Custom flag for the router
      dataDependencies: ['users'] // Example dependency
    },
    'merchant-profile/:id': {
      id: 'merchant-profile-view',
      path: null, // No HTML file yet, will show a placeholder
      title: 'Merchant Profile',
      fullscreen: false,
      dataDependencies: ['merchants'],
      fullscreen: true
    },
    saved: {
      id: 'wishlist-view',
      path: './source/common/pages/wishlist.html',
      cssPath: './source/common/styles/wishlist.css',
      jsPath: './source/common/scripts/wishlist.js',
      title: 'Saved Items',
      dataDependencies: ['items']
    },
    updates: {
      id: 'updates-view',
      path: null, // No HTML file yet, will show a placeholder
      title: 'Updates',
      dataDependencies: []
    },
    notifications: {
      id: 'notifications-view',
      path: './source/common/pages/notification.html',
      cssPath: './source/common/styles/notification.css',
      jsPath: './source/common/scripts/notification.js',
      title: 'Notifications',
      // Merged superset of all dependencies
      dataDependencies: ['alerts', 'promotions', 'orders', 'logs']
    }
  }
  };

export { routeConfig, defaultViews };