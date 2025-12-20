/**
 * Route Config Healer
 * Automatically heals and updates routing configuration
 */

import { detectEnvironment } from './route-env-manager.js';
import { getAppConfig, setAppConfig } from '../settings/main-config.js';

export const healAppConfig = () => {
  const env = detectEnvironment();
  const currentConfig = getAppConfig();

  // Check if routing config needs healing
  const needsHealing =
    !currentConfig.routing ||
    currentConfig.routing.githubPage !== env.fullUrl ||
    currentConfig.routing.currentRepo !== env.repo ||
    currentConfig.routing.basePath !== env.basePath;

  if (needsHealing) {
    // Initialize routing section if it doesn't exist
    if (!currentConfig.routing) {
      currentConfig.routing = {};
    }

    // Heal routing configuration based on environment type
    let routingConfig = {
      ...currentConfig.routing,
      serveMode: env.type,
      basePath: env.basePath,
      autoDetect: true,
      lastEnvironmentCheck: new Date().toISOString()
    };

    // Set URLs based on environment type
    if (env.type === 'localhost') {
      routingConfig.githubPage = null;
      routingConfig.customDomain = null;
      routingConfig.currentRepo = null;
      routingConfig.currentUsername = null;
    } else if (env.type === 'github-pages') {
      routingConfig.githubPage = env.fullUrl;
      routingConfig.customDomain = null;
      routingConfig.currentRepo = env.repo;
      routingConfig.currentUsername = env.username;
    } else if (env.type === 'custom-domain') {
      routingConfig.githubPage = null;
      routingConfig.customDomain = env.fullUrl;
      routingConfig.currentRepo = null;
      routingConfig.currentUsername = null;
    }

    currentConfig.routing = routingConfig;

    // Save healed config
    setAppConfig(currentConfig);

    console.log('🔄 Config auto-healed for environment:', env.type);
    console.log('📍 Base path:', env.basePath);
    console.log('🌐 Full URL:', env.fullUrl);

    return true;
  }

  return false;
};

export const validateConfig = (config) => {
  if (!config) {
    console.error('❌ Config is null or undefined');
    return false;
  }

  // Check required sections
  const requiredSections = ['app', 'routing'];
  for (const section of requiredSections) {
    if (!config[section]) {
      console.error(`❌ Missing required config section: ${section}`);
      return false;
    }
  }

  // Validate routing section
  if (!config.routing.basePath) {
    console.warn('⚠️ Routing basePath is empty, using default');
  }

  if (!config.routing.githubPage) {
    console.warn('⚠️ Routing githubPage is empty');
  }

  return true;
};

export const getDynamicPath = (staticPath) => {
  const config = getAppConfig();
  const basePath = config.routing?.basePath || '';
  return staticPath.replace('./', basePath);
};

export const getAssetUrl = (assetPath) => {
  const config = getAppConfig();
  const basePath = config.routing?.basePath || '';
  return `${basePath}${assetPath}`.replace(/^\/+/, '/');
};

// Initialize healing on module load
if (typeof window !== 'undefined') {
  // Heal config when module loads
  setTimeout(() => {
    try {
      healAppConfig();
    } catch (error) {
      console.error('Config healing failed:', error);
    }
  }, 100);
}