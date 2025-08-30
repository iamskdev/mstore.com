// Define the default "landing" view for each role.
// This makes the logic cleaner and easier to manage.
const defaultViews = {
  guest: 'home',
  user: 'home',
  merchant: 'add',
  admin: 'home' // Changed from 'home' to 'admin-home'
};



/**
 * @file View Configuration
 * Defines all possible views for each user role, their DOM IDs, and content paths.
 * This module is separated to be importable by both the main application and the Service Worker.
 */

const viewConfig = {
  guest: {
    home: {
      id: 'home-view',
      path: './source/common/pages/home.html',
      cssPath: './source/common/styles/home.css',
      jsPath: './source/common/scripts/home.js',
      showFilterBar: true, // No filter bar on the welcome 
      embedFooter: true,
      title: 'Home'
    },
    chat: { id: 'guest-chat-view', path: null, title: 'Chat' },
    saved: { id: 'guest-saved-view', path: null, title: 'Saved' },
    cart: { id: 'guest-cart-view', path: null, title: 'Cart' },
    account: {
      id: 'guest-account-view',
      path: './source/common/pages/guest-account.html',
      cssPath: './source/common/styles/guest-account.css',
      jsPath: './source/common/scripts/guest-account.js',
      title: 'Account'
    },
    notifications: {
      id: 'notifications-view',
      path: './source/common/pages/notification-view.html',
      cssPath: './source/common/styles/notification-view.css',
      jsPath: './source/common/scripts/notification-view.js',
      title: 'Notifications',
      allowedTypes: ['promotions', 'general']
    }
  },
  user: {
    home: {
      id: 'home-view',
      path: './source/common/pages/home.html',
      cssPath: './source/common/styles/home.css',
      jsPath: './source/common/scripts/home.js',
      showFilterBar: true,
      embedFooter: true, // Embed it directly into the view content
      title: 'Home'
    },
    chat: { id: 'user-chat-view', path: null, title: 'Chat' },
    saved: { id: 'user-saved-view', path: null, title: 'Saved' },
    cart: { id: 'user-cart-view', path: null, title: 'Cart' },
    account: { id: 'user-account-view', path: null, title: 'Account' },
    notifications: {
      id: 'notifications-view',
      path: './source/common/pages/notification-view.html',
      cssPath: './source/common/styles/notification-view.css',
      jsPath: './source/common/scripts/notification-view.js',
      title: 'Notifications',
      allowedTypes: ['promotions', 'order_status', 'general']
    }
  },
  merchant: {
    home: {
      id: 'home-view',
      path: './source/common/pages/home.html',
      cssPath: './source/common/styles/home.css',
      jsPath: './source/common/scripts/home.js',
      showFilterBar: true,
      embedFooter: true,
      title: 'Home'
    },
    chat: { id: 'merchant-chat-view', path: null, title: 'Chat' },
    add: { id: 'merchant-add-view', path: null, title: 'Add' },
    analytics: { id: 'merchant-analytics-view', path: null, title: 'Analytics' },
    account: { id: 'merchant-account-view', path: null, title: 'Account' },
    notifications: {
      id: 'notifications-view',
      path: './source/common/pages/notification-view.html',
      cssPath: './source/common/styles/notification-view.css',
      jsPath: './source/common/scripts/notification-view.js',
      title: 'Notifications',
      allowedTypes: ['new_order', 'stock_alert', 'order_status']
    }
  },
  admin: {
    home: {
      id: 'admin-home-view', 
      path: "./source/modules/admin/pages/admin-home.html",
      cssPath: "./source/modules/admin/pages/admin-home.css",
      jsPath: "./source/modules/admin/pages/admin-home.js",
      showFooter: false,
      embedFooter: true,
      title: 'Home'
    },
    users: { id: 'admin-users-view', path: null, title: 'User Data' },
    analytics: { id: 'admin-analytics-view', path: null, title: 'Analytics' },
    requests: { id: 'admin-request-view', path: null, title: 'Request' },
    logs: { id: 'admin-logs-view', path: null, title: 'Logs' },
    promo: { id: 'admin-promo-view', path: null, title: 'Promo' },
    campaigns: { id: 'admin-campaigns-view', path: null, title: 'Campaigns' },
    account: { id: 'admin-account-view', path: null, title: 'Account' },
    notifications: {
      id: 'notifications-view',
      path: './source/common/pages/notification-view.html',
      cssPath: './source/common/styles/notification-view.css',
      jsPath: './source/common/scripts/notification-view.js',
      title: 'Notifications',
      allowedTypes: ['all']
    }
  },
  };

export { viewConfig, defaultViews };