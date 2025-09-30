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
      isMainTab: true, // This is a main tab for merchants if they land here
      dataDependencies: ['items', 'promotions', 'categories', 'brands', 'orders', 'price-logs', 'alerts']
    },
    add: { id: 'merchant-add-view', path: null, title: 'Add', isMainTab: true, dataDependencies: ['categories', 'brands', 'units'] },
  },
  admin: {
    home: {
      id: 'admin-home-view', 
      path: "./source/modules/admin/pages/admin-home.html",
      cssPath: "./source/modules/admin/pages/admin-home.css",
      jsPath: "./source/modules/admin/pages/admin-home.js",
      embedFooter: true,
      isMainTab: true,
      title: 'Home',
      dataDependencies: ['items', 'promotions', 'users', 'merchants', 'categories', 'brands', 'alerts', 'orders', 'logs', 'accounts', 'campaigns', 'counters']
    },
    users: { id: 'admin-users-view', path: null, isMainTab: true, title: 'User Data', dataDependencies: ['users', 'accounts'] },
    analytics: { id: 'admin-analytics-view', path: null, isMainTab: true, title: 'Analytics', dataDependencies: ['orders', 'price-logs', 'items', 'merchants', 'users', 'logs'] },
    requests: { id: 'admin-request-view', path: null, isMainTab: true, title: 'Request', dataDependencies: ['orders', 'users', 'merchants'] },
  },
  commonViews: {
    home: {
      id: 'home-view',
      path: './source/common/pages/home.html',
      cssPath: './source/common/styles/home.css',
      jsPath: './source/common/scripts/home.js',
      embedFooter: true,
      title: 'Home',
      isMainTab: true,
      dataDependencies: ['items', 'promotions', 'categories', 'brands']
    },
    chat: {
      id: 'chat-view',
      path: './source/common/pages/chat.html',
      cssPath: './source/common/styles/chat.css',
      jsPath: './source/common/scripts/chat.js',
      isMainTab: true,
      title: 'Chat',
      dataDependencies: ['merchants', 'users']
    },
    account: {
      id: 'account-view',
      path: './source/common/pages/account.html',
      cssPath: './source/common/styles/account.css',
      jsPath: './source/common/scripts/account.js',
      isMainTab: true,
      title: 'Account',
      dataDependencies: ['users', 'accounts', 'merchants']
    },
    cart: {
      id: 'cart-view',
      path: './source/common/pages/cart.html',
      cssPath: './source/common/styles/cart.css',
      jsPath: './source/common/scripts/cart.js',
      isMainTab: true,
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
    'account/saved': {
      id: 'wishlist-view',
      path: './source/common/pages/wishlist.html',
      cssPath: './source/common/styles/wishlist.css',
      jsPath: './source/common/scripts/wishlist.js',
      title: 'Saved items',
      dataDependencies: ['items'],
      isMainTab: false // It's a sub-view of Account, not a main tab itself
    },
    updates: {
      id: 'updates-view',
      path: './source/common/pages/updates.html',
      cssPath: './source/common/styles/updates.css',
      jsPath: './source/common/scripts/updates.js',
      isMainTab: true,
      title: 'Updates'
    },
    notifications: {
      id: 'notifications-view',
      path: './source/common/pages/notification.html',
      cssPath: './source/common/styles/notification.css',
      jsPath: './source/common/scripts/notification.js',
      title: 'Notifications',
      // Merged superset of all dependencies
      dataDependencies: ['alerts', 'promotions', 'orders', 'logs']
    },
    'account/authentication': {
      id: 'auth-view', // Uses the same element ID
      path: './source/common/pages/authentication.html',
      cssPath: './source/common/styles/authentication.css',
      jsPath: './source/common/scripts/authentication.js',
      title: 'Authentication'
    }
  }
  };

export { routeConfig, defaultViews };