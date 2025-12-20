/**
 * Route Migration Handler
 * Manages user migration between different routing environments
 */

import { getAppConfig } from '../settings/main-config.js';

let migrationBanner = null;
let migrationModal = null;

export const showMigrationBanner = () => {
  const config = getAppConfig();

  // Check if migration is enabled and not already shown
  if (!config.migration?.enabled || document.querySelector('.migration-banner')) {
    return;
  }

  // Create banner element
  migrationBanner = document.createElement('div');
  migrationBanner.className = 'migration-banner';
  migrationBanner.innerHTML = `
    <div class="migration-content">
      <span class="migration-icon">🚀</span>
      <span class="migration-message">${config.migration.message || 'नया URL available है!'}</span>
      <div class="migration-actions">
        <button class="migration-btn primary" onclick="window.routeMigrationHandler.handleMigration()">
          अभी अपडेट करें
        </button>
        <button class="migration-btn secondary" onclick="window.routeMigrationHandler.dismissBanner()">
          बाद में
        </button>
      </div>
      <button class="migration-close" onclick="window.routeMigrationHandler.dismissBanner()">
        ×
      </button>
    </div>
  `;

  // Add styles
  migrationBanner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Style the content
  const content = migrationBanner.querySelector('.migration-content');
  content.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    margin: 0 auto;
    gap: 16px;
  `;

  // Style buttons
  const buttons = migrationBanner.querySelectorAll('.migration-btn');
  buttons.forEach(btn => {
    btn.style.cssText = `
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    `;
    if (btn.classList.contains('primary')) {
      btn.style.background = '#ffffff';
      btn.style.color = '#667eea';
    } else {
      btn.style.background = 'rgba(255,255,255,0.2)';
      btn.style.color = 'white';
      btn.style.border = '1px solid rgba(255,255,255,0.3)';
    }
  });

  // Style close button
  const closeBtn = migrationBanner.querySelector('.migration-close');
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    opacity: 0.8;
  `;

  // Add responsive styles for mobile
  if (window.innerWidth < 768) {
    content.style.flexDirection = 'column';
    content.style.textAlign = 'center';
    content.style.gap = '12px';
  }

  // Add to DOM
  document.body.appendChild(migrationBanner);

  // Make globally accessible
  window.routeMigrationHandler = {
    handleMigration,
    dismissBanner,
    showModal
  };

  console.log('📢 Migration banner displayed');
};

export const handleMigration = () => {
  const config = getAppConfig();

  if (config.migration?.newUrl) {
    // Track migration start
    console.log('🚀 Starting migration to:', config.migration.newUrl);

    // Analytics tracking (if available)
    if (window.gtag) {
      window.gtag('event', 'migration_started', {
        from_url: window.location.href,
        to_url: config.migration.newUrl
      });
    }

    // Open new URL in new tab
    window.open(config.migration.newUrl, '_blank');

    // Show confirmation
    setTimeout(() => {
      if (confirm('नया URL खुल गया है। क्या आप migration complete करना चाहते हैं?')) {
        completeMigration();
      }
    }, 2000);
  }
};

export const dismissBanner = () => {
  if (migrationBanner) {
    migrationBanner.remove();
    migrationBanner = null;

    // Store dismissal for 24 hours
    localStorage.setItem('migration_dismissed', Date.now().toString());

    console.log('📢 Migration banner dismissed');
  }
};

export const showModal = () => {
  const config = getAppConfig();

  if (!config.migration?.enabled || migrationModal) {
    return;
  }

  migrationModal = document.createElement('div');
  migrationModal.className = 'migration-modal-overlay';
  migrationModal.innerHTML = `
    <div class="migration-modal">
      <div class="migration-modal-header">
        <h3>🚀 अपडेट Available</h3>
        <button class="modal-close" onclick="window.routeMigrationHandler.closeModal()">×</button>
      </div>
      <div class="migration-modal-body">
        <p>${config.migration.message || 'हमने आपके लिए नया URL ready किया है!'}</p>
        <div class="migration-benefits">
          <div class="benefit-item">⚡ Faster loading</div>
          <div class="benefit-item">🛡️ Better security</div>
          <div class="benefit-item">📱 Improved PWA experience</div>
        </div>
        <div class="migration-url">
          <strong>New URL:</strong><br>
          <code>${config.migration.newUrl}</code>
        </div>
      </div>
      <div class="migration-modal-footer">
        <button class="modal-btn secondary" onclick="window.routeMigrationHandler.closeModal()">
          Skip for Now
        </button>
        <button class="modal-btn primary" onclick="window.routeMigrationHandler.handleMigration()">
          Update Now
        </button>
      </div>
    </div>
  `;

  // Add styles
  migrationModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const modal = migrationModal.querySelector('.migration-modal');
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  `;

  // Add modal content styles
  const style = document.createElement('style');
  style.textContent = `
    .migration-modal-header {
      padding: 20px 24px 16px;
      border-bottom: 1px solid #e1e5e9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .migration-modal-header h3 {
      margin: 0;
      color: #1a202c;
    }
    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #718096;
      padding: 0;
    }
    .migration-modal-body {
      padding: 24px;
    }
    .migration-benefits {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      margin: 16px 0;
    }
    .benefit-item {
      padding: 8px 12px;
      background: #f7fafc;
      border-radius: 6px;
      font-size: 14px;
    }
    .migration-url {
      margin-top: 16px;
      padding: 12px;
      background: #f1f5f9;
      border-radius: 6px;
    }
    .migration-url code {
      word-break: break-all;
      font-family: 'Monaco', 'Menlo', monospace;
    }
    .migration-modal-footer {
      padding: 16px 24px 24px;
      border-top: 1px solid #e1e5e9;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .modal-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }
    .modal-btn.primary {
      background: #667eea;
      color: white;
    }
    .modal-btn.secondary {
      background: #e2e8f0;
      color: #4a5568;
    }
    @media (max-width: 768px) {
      .migration-modal-footer {
        flex-direction: column;
      }
      .migration-benefits {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(migrationModal);

  console.log('📢 Migration modal displayed');
};

export const closeModal = () => {
  if (migrationModal) {
    migrationModal.remove();
    migrationModal = null;
    console.log('📢 Migration modal closed');
  }
};

export const completeMigration = () => {
  // Mark migration as completed
  localStorage.setItem('migration_completed', 'true');
  localStorage.setItem('migration_date', new Date().toISOString());

  // Analytics tracking
  if (window.gtag) {
    window.gtag('event', 'migration_completed', {
      method: 'user_initiated',
      timestamp: new Date().toISOString()
    });
  }

  // Hide UI elements
  dismissBanner();
  closeModal();

  // Show success message
  showToast('✅ Successfully migrated!', 'success');

  console.log('✅ Migration completed');
};

// Utility function (assuming toast system exists)
const showToast = (message, type = 'info') => {
  console.log(`📢 ${message}`);
  // Implement actual toast if available
};

// Check if migration should be shown
export const shouldShowMigration = () => {
  const config = getAppConfig();

  if (!config.migration?.enabled) {
    return false;
  }

  // Check if already dismissed recently
  const dismissedTime = localStorage.getItem('migration_dismissed');
  if (dismissedTime) {
    const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
    if (hoursSinceDismissed < 24) {
      return false; // Don't show for 24 hours after dismissal
    }
  }

  // Check if already completed
  if (localStorage.getItem('migration_completed')) {
    return false;
  }

  return true;
};

// Auto-initialize if migration should be shown
if (typeof window !== 'undefined') {
  setTimeout(() => {
    if (shouldShowMigration()) {
      showMigrationBanner();
    }
  }, 3000); // Show after 3 seconds
}