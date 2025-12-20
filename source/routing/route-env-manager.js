/**
 * Route Environment Manager
 * Detects and manages routing environments (GitHub Pages vs Custom Domain)
 */

export const detectEnvironment = () => {
  const hostname = window.location.hostname;
  const currentOrigin = window.location.origin;
  const currentPath = window.location.pathname;

  // Localhost/Development Detection (FIRST priority)
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost')) {
    return {
      type: 'localhost',
      hostname: hostname,
      basePath: '',
      fullUrl: currentOrigin,
      isDevelopment: true,
      detectedAt: new Date().toISOString()
    };
  }

  // GitHub Pages Detection
  if (currentOrigin.includes('github.io')) {
    const pathParts = currentPath.split('/').filter(part => part);
    const username = hostname.split('.')[0];
    const repo = pathParts[0] || 'mstore.com';

    return {
      type: 'github-pages',
      username: username,
      repo: repo,
      basePath: `/${repo}/`,
      fullUrl: `${currentOrigin}/${repo}/`,
      detectedAt: new Date().toISOString()
    };
  }

  // Custom Domain Detection (real domains only)
  return {
    type: 'custom-domain',
    domain: hostname,
    basePath: '',
    fullUrl: currentOrigin,
    detectedAt: new Date().toISOString()
  };
};

export const getBasePath = () => {
  const env = detectEnvironment();
  return env.basePath;
};

export const getFullUrl = () => {
  const env = detectEnvironment();
  return env.fullUrl;
};

export const isGitHubPages = () => {
  const env = detectEnvironment();
  return env.type === 'github-pages';
};

export const isCustomDomain = () => {
  const env = detectEnvironment();
  return env.type === 'custom-domain';
};

// Cache environment detection for performance
let cachedEnv = null;
let cacheTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export const getCachedEnvironment = () => {
  const now = Date.now();
  if (!cachedEnv || (now - cacheTime) > CACHE_DURATION) {
    cachedEnv = detectEnvironment();
    cacheTime = now;
  }
  return cachedEnv;
};