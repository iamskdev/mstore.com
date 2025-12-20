# mStore Configuration Guide (config.json) - Complete Reference

## 🚨 CRITICAL WARNINGS - अवश्य पढ़ें!

### ⚠️ **Production में Edit करने से पहले:**
```
❌ NEVER edit config.json directly in production
❌ Always backup before making changes
❌ Test changes in development environment first
❌ Have rollback plan ready
❌ Document all changes with reasons
```

### 🔥 **High Risk Changes:**
- **Routing URLs** - Can break all user access
- **Security Settings** - Can expose app to attacks
- **PWA Configuration** - Can break app installation
- **Migration Settings** - Can cause user confusion

### 💀 **Potential Disasters:**
- Wrong URL in routing → **App completely inaccessible**
- Disabled security → **Data breaches possible**
- Broken PWA config → **Users can't install app**
- Bad migration setup → **Mass user confusion**

---

## 📊 Current Implementation Status

### ✅ **Fully Working Sections:**
- `routing` - Environment detection & URL management
- `resilience` - PWA protection & auto-healing
- `security` - Basic security settings
- `pwa` - PWA features & caching
- `integrations` - Firebase & Cloudinary
- `features` - Feature toggles
- `limits` - System constraints
- `monitoring` - Error tracking
- `flags` - General toggles

### ⚠️ **Partially Working:**
- `migration` - UI components ready, backend integration pending
- `analytics` - Basic tracking works, advanced features pending
- `performance` - Basic settings work, advanced optimization pending

### ❌ **Not Yet Implemented:**
- `payment` - Razorpay integration
- `sms` - Twilio integration
- Advanced analytics features
- Multi-language support
- Social login integrations

---

## 📁 Complete Configuration Reference

### **📊 Source Configuration**
```json
{
  "source": {
    "data": "emulator",
    "offlineCache": true,
    "cacheStrategy": "network-first",
    "syncInterval": 300000,
    "maxCacheSize": 52428800,
    "compressionEnabled": true
  }
}
```

#### **कब Use करें:**
- Data source configuration के लिए
- Offline caching strategy set करने के लिए
- Performance optimization के लिए

#### **Field Details:**

| Field | Type | Current Value | Working | Description |
|-------|------|---------------|---------|-------------|
| `data` | string | "emulator" | ✅ | Data source type |
| `offlineCache` | boolean | true | ✅ | Enable offline caching |
| `cacheStrategy` | string | "network-first" | ✅ | Cache strategy |
| `syncInterval` | number | 300000 | ✅ | Sync interval (ms) |
| `maxCacheSize` | number | 52428800 | ✅ | Max cache size (bytes) |
| `compressionEnabled` | boolean | true | ✅ | Enable compression |

---

### **🎨 UI Configuration**
```json
{
  "ui": {
    "theme": "dark",
    "headerStyle": "logo",
    "splashEnabled": true,
    "animationsEnabled": true,
    "reducedMotion": false,
    "fontSize": "medium",
    "language": "hi",
    "timezone": "Asia/Kolkata",
    "currency": "INR",
    "dateFormat": "DD/MM/YYYY"
  }
}
```

#### **कब Use करें:**
- UI theme change करने के लिए
- Language settings के लिए
- Accessibility preferences के लिए

#### **Field Details:**

| Field | Type | Current Value | Working | Description |
|-------|------|---------------|---------|-------------|
| `theme` | string | "dark" | ✅ | UI theme (dark/light) |
| `headerStyle` | string | "logo" | ✅ | Header style |
| `splashEnabled` | boolean | true | ✅ | Show splash screen |
| `animationsEnabled` | boolean | true | ✅ | Enable animations |
| `reducedMotion` | boolean | false | ✅ | Reduce motion for accessibility |
| `fontSize` | string | "medium" | ✅ | Font size preference |
| `language` | string | "hi" | ✅ | App language |
| `timezone` | string | "Asia/Kolkata" | ✅ | User timezone |
| `currency` | string | "INR" | ✅ | Currency code |
| `dateFormat` | string | "DD/MM/YYYY" | ✅ | Date format |

---

### **🎯 App Configuration**
```json
{
  "app": {
    "owner": "santosh",
    "name": "mStore",
    "displayName": "mStore E-Commerce",
    "version": "0.32.1",
    "build": "2025.12.19",
    "environment": "development",
    "description": "Modern PWA E-commerce platform for local businesses",
    "keywords": ["ecommerce", "pwa", "local", "business", "store"],
    "category": "shopping",
    "platform": "web",
    "supportedBrowsers": ["chrome", "firefox", "safari", "edge"]
  }
}
```

#### **कब Use करें:**
- App version update करते समय
- App store submissions के लिए
- Branding changes के समय

#### **Field Details:**

| Field | Type | Current Value | Working | Description |
|-------|------|---------------|---------|-------------|
| `owner` | string | "santosh" | ✅ | App owner name |
| `name` | string | "mStore" | ✅ | Internal app identifier |
| `displayName` | string | "mStore E-Commerce" | ✅ | User-facing app name |
| `version` | string | "0.32.1" | ✅ | Semantic version number |
| `build` | string | "2025.12.19" | ✅ | Build date/timestamp |
| `environment` | string | "development" | ✅ | App environment setting |
| `description` | string | "Modern PWA..." | ✅ | App description for stores |
| `keywords` | array | ["ecommerce", "pwa", "local", "business", "store"] | ✅ | SEO keywords |
| `category` | string | "shopping" | ✅ | App store category |
| `platform` | string | "web" | ✅ | Platform identifier |
| `supportedBrowsers` | array | ["chrome", "firefox", "safari", "edge"] | ✅ | Supported browsers list |

---

### **🔗 Routing Configuration (Most Critical)**
```json
{
  "routing": {
    "localIp": "http://127.0.0.1:3000/",
    "githubPage": "https://iamskdev.github.io/mstore.com/",
    "fallbackUrl": "https://fallback.mystore.com",
    "customDomain": null,
    "localHost": "http://localhost:2201",
    "serveMode": "github-pages",
    "currentRepo": "mstore.com",
    "currentUsername": "iamskdev",
    "basePath": "/mstore.com/",
    "autoDetect": true,
    "lastEnvironmentCheck": "2025-12-19T14:25:11Z",
    "cdnUrl": "https://cdn.mystore.com",
    "apiUrl": "https://api.mystore.com"
  }
}
```

> 🚨 **DANGER ZONE!** Wrong routing config can make your app completely inaccessible!

#### **कब Use करें:**
- GitHub Pages से serve करते समय
- Custom domain पर migrate करते समय
- Repository name change करते समय
- Environment switching करते समय

#### **कैसे Use करें:**
```javascript
// GitHub Pages Mode:
{
  "serveMode": "github-pages",
  "githubPage": "https://username.github.io/repo-name/",
  "basePath": "/repo-name/"
}

// Custom Domain Mode:
{
  "serveMode": "custom-domain",
  "customDomain": "https://yourstore.com",
  "basePath": ""
}
```

#### **Field Details:**

| Field | Type | Working | Description | Example |
|-------|------|---------|-------------|---------|
| `localIp` | string | ✅ | Local development IP | `"http://127.0.0.1:3000/"` |
| `githubPage` | string/null | ✅ | GitHub Pages full URL | `"https://user.github.io/repo/"` |
| `fallbackUrl` | string | ❌ | Backup URL for failures | `"https://fallback.mystore.com"` |
| `customDomain` | string/null | ✅ | Custom domain URL | `"https://mystore.com"` |
| `localHost` | string | ✅ | Alternative localhost URL | `"http://localhost:2201"` |
| `serveMode` | string | ✅ | Current serving mode | `"github-pages"` or `"custom-domain"` |
| `currentRepo` | string/null | ✅ | GitHub repository name | `"mstore.com"` |
| `currentUsername` | string/null | ✅ | GitHub username | `"iamskdev"` |
| `basePath` | string | ✅ | URL base path | `"/repo-name/"` or `""` |
| `autoDetect` | boolean | ✅ | Auto environment detection | `true` |
| `lastEnvironmentCheck` | string | ✅ | Last environment check timestamp | ISO date string |
| `cdnUrl` | string | ❌ | CDN URL (future) | `"https://cdn.mystore.com"` |
| `apiUrl` | string | ❌ | API URL (future) | `"https://api.mystore.com"` |

#### **⚠️ Critical Risk Fields:**
- **`githubPage`**: ❌ Wrong URL = **ALL USERS LOSE ACCESS**
- **`customDomain`**: ❌ Wrong URL = **ALL USERS LOSE ACCESS**
- **`serveMode`**: ❌ Wrong mode = **BROKEN ROUTING**

---

### **🚀 Migration Settings**
```json
{
  "migration": {
    "enabled": false,
    "urlMigration": false,
    "newUrl": null,
    "message": "🚀 नया URL available है! अपडेट करें",
    "urgency": "medium",
    "startDate": null,
    "endDate": null,
    "targetAudience": "all",
    "autoMigration": false,
    "progressTracking": true,
    "analyticsEnabled": true
  }
}
```

#### **कब Use करें:**
- Repository name change करते समय
- New domain पर move करते समय
- URL restructuring करते समय

#### **कैसे Use करें:**
```javascript
// Repository Rename Migration:
{
  "enabled": true,
  "urlMigration": true,
  "newUrl": "https://iamskdev.github.io/new-repo-name/",
  "message": "हमारे app का नया URL ready है! अपडेट करें",
  "urgency": "high",
  "startDate": "2025-12-20T00:00:00Z",
  "autoMigration": false
}
```

#### **Field Details:**

| Field | Type | Working | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | ⚠️ | Show migration notifications (UI ready) |
| `urlMigration` | boolean | ✅ | Enable URL migration features |
| `newUrl` | string/null | ⚠️ | Target URL for migration |
| `message` | string | ⚠️ | Custom notification message |
| `urgency` | string | ⚠️ | "low", "medium", "high" |
| `startDate` | string/null | ❌ | Migration start date (ISO format) |
| `endDate` | string/null | ❌ | Migration end date (ISO format) |
| `targetAudience` | string | ❌ | "all", "premium", "beta" |
| `autoMigration` | boolean | ❌ | Auto redirect users |
| `progressTracking` | boolean | ❌ | Track migration progress |
| `analyticsEnabled` | boolean | ❌ | Migration analytics |

---

### **🛡️ Resilience & PWA Protection**
```json
{
  "resilience": {
    "autoHealEnabled": true,
    "pwaResilience": true,
    "cacheInvalidation": "smart",
    "fallbackEnabled": true,
    "pwaUpdates": "background",
    "errorRecovery": true,
    "offlineSupport": true,
    "networkRetryAttempts": 3,
    "cacheMaxAge": 86400000,
    "serviceWorkerVersion": "v1.0.0"
  }
}
```

#### **कब Use करें:**
- PWA stability issues आते समय
- Offline functionality improve करने के लिए
- Cache problems solve करने के लिए

#### **Field Details:**

| Field | Type | Working | Description |
|-------|------|---------|-------------|
| `autoHealEnabled` | boolean | ✅ | Auto-fix config mismatches |
| `pwaResilience` | boolean | ✅ | PWA continuity protection |
| `cacheInvalidation` | string | ✅ | "smart", "aggressive", "manual" |
| `fallbackEnabled` | boolean | ✅ | Enable fallback pages |
| `pwaUpdates` | string | ✅ | "background", "prompt", "manual" |
| `errorRecovery` | boolean | ✅ | Auto error recovery |
| `offlineSupport` | boolean | ✅ | Offline functionality |
| `networkRetryAttempts` | number | ✅ | Network retry count |
| `cacheMaxAge` | number | ✅ | Cache expiration (ms) |
| `serviceWorkerVersion` | string | ✅ | SW version tracking |

---

### **⚡ Performance Optimization**
```json
{
  "performance": {
    "lazyLoading": true,
    "imageOptimization": true,
    "codeSplitting": true,
    "preloadCritical": true,
    "bundleAnalyzer": false,
    "performanceMonitoring": true,
    "errorTracking": true,
    "analyticsEnabled": true
  }
}
```

#### **कब Use करें:**
- App loading slow है तो
- Bundle size reduce करना है तो
- Performance monitoring enable करना है तो

#### **Field Details:**

| Field | Type | Working | Description |
|-------|------|---------|-------------|
| `lazyLoading` | boolean | ✅ | Load images on demand |
| `imageOptimization` | boolean | ❌ | Auto image optimization |
| `codeSplitting` | boolean | ✅ | Split code bundles |
| `preloadCritical` | boolean | ✅ | Preload critical resources |
| `bundleAnalyzer` | boolean | ❌ | Bundle size analysis |
| `performanceMonitoring` | boolean | ⚠️ | Monitor app performance |
| `errorTracking` | boolean | ✅ | Track JavaScript errors |
| `analyticsEnabled` | boolean | ⚠️ | Performance analytics |

---

### **🔒 Security Settings**
```json
{
  "security": {
    "httpsOnly": true,
    "contentSecurityPolicy": true,
    "xFrameOptions": "DENY",
    "hstsEnabled": true,
    "corsEnabled": false,
    "rateLimiting": true,
    "inputValidation": true,
    "xssProtection": true
  }
}
```

#### **कब Use करें:**
- Security vulnerabilities fix करते समय
- HTTPS enforcement के लिए
- XSS protection enable करते समय

#### **Field Details:**

| Field | Type | Working | Description |
|-------|------|---------|-------------|
| `httpsOnly` | boolean | ✅ | Force HTTPS connections |
| `contentSecurityPolicy` | boolean | ✅ | Enable CSP headers |
| `xFrameOptions` | string | ✅ | "DENY", "SAMEORIGIN", "ALLOW" |
| `hstsEnabled` | boolean | ✅ | HTTP Strict Transport Security |
| `corsEnabled` | boolean | ✅ | Cross-origin requests |
| `rateLimiting` | boolean | ❌ | API rate limiting |
| `inputValidation` | boolean | ✅ | Input sanitization |
| `xssProtection` | boolean | ✅ | XSS attack protection |

---

### **📱 PWA Configuration**
```json
{
  "pwa": {
    "enabled": true,
    "installPrompt": "auto",
    "updateStrategy": "background",
    "offlinePage": "/offline.html",
    "cacheStrategy": "network-first",
    "backgroundSync": true,
    "pushNotifications": false,
    "iconSizes": [192, 512]
  }
}
```

#### **कब Use करें:**
- PWA install prompt customize करना है तो
- Offline functionality control करना है तो
- Cache strategy change करना है तो

#### **Field Details:**

| Field | Type | Working | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | ✅ | Enable PWA features |
| `installPrompt` | string | ✅ | "auto", "manual", "aggressive" |
| `updateStrategy` | string | ✅ | "background", "prompt", "manual" |
| `offlinePage` | string | ✅ | Offline fallback page |
| `cacheStrategy` | string | ✅ | "network-first", "cache-first" |
| `backgroundSync` | boolean | ❌ | Background data sync |
| `pushNotifications` | boolean | ❌ | Push notification support |
| `iconSizes` | array | ✅ | Required icon sizes |

---

### **📊 Analytics & Tracking**
```json
{
  "analytics": {
    "enabled": true,
    "provider": "google-analytics",
    "trackingId": "GA_MEASUREMENT_ID",
    "anonymizeIp": true,
    "trackErrors": true,
    "trackPerformance": true,
    "customEvents": true,
    "userJourneyTracking": true
  }
}
```

#### **Field Details:**

| Field | Type | Working | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | ⚠️ | Enable analytics tracking |
| `provider` | string | ⚠️ | "google-analytics", "mixpanel" |
| `trackingId` | string | ⚠️ | Analytics tracking ID |
| `anonymizeIp` | boolean | ❌ | IP anonymization |
| `trackErrors` | boolean | ⚠️ | Error event tracking |
| `trackPerformance` | boolean | ⚠️ | Performance metrics |
| `customEvents` | boolean | ❌ | Custom event tracking |
| `userJourneyTracking` | boolean | ❌ | User journey analytics |

---

### **🔗 Third-Party Integrations**
```json
{
  "integrations": {
    "firebase": {
      "enabled": true,
      "emulatorMode": true,
      "auth": true,
      "firestore": true,
      "functions": true,
      "storage": false
    },
    "cloudinary": {
      "enabled": true,
      "cloud_name": "dq3xqcpqg",
      "base_url": "https://res.cloudinary.com",
      "uploadPreset": "mstore-uploads",
      "maxFileSize": 10485760,
      "allowedFormats": ["jpg", "png", "webp"]
    },
    "payment": {
      "enabled": false,
      "provider": "razorpay",
      "testMode": true,
      "supportedMethods": ["card", "upi", "netbanking"]
    },
    "sms": {
      "enabled": false,
      "provider": "twilio",
      "verificationEnabled": true
    }
  }
}
```

#### **Firebase Integration:**
| Field | Working | Description |
|-------|---------|-------------|
| `enabled` | ✅ | Enable Firebase services |
| `emulatorMode` | ✅ | Use local emulators |
| `auth` | ✅ | Firebase Authentication |
| `firestore` | ✅ | Cloud Firestore database |
| `functions` | ✅ | Cloud Functions |
| `storage` | ❌ | Cloud Storage |

#### **Cloudinary Integration:**
| Field | Working | Description |
|-------|---------|-------------|
| `enabled` | ✅ | Enable image hosting |
| `cloud_name` | ✅ | Cloudinary cloud name |
| `base_url` | ✅ | Cloudinary base URL |
| `uploadPreset` | ✅ | Upload preset name |
| `maxFileSize` | ✅ | Max file size (bytes) |
| `allowedFormats` | ✅ | Allowed image formats |

#### **Payment Integration (Future):**
- Razorpay integration not yet implemented
- All payment fields marked as ❌

#### **SMS Integration (Future):**
- Twilio integration not yet implemented
- All SMS fields marked as ❌

---

### **🎛️ Feature Toggles**
```json
{
  "features": {
    "userAuth": true,
    "multiLanguage": false,
    "darkMode": true,
    "offlineMode": true,
    "pushNotifications": false,
    "socialLogin": false,
    "guestCheckout": true,
    "wishlist": true,
    "cart": true,
    "reviews": true,
    "search": true,
    "filters": true,
    "sorting": true,
    "pagination": true
  }
}
```

#### **कब Use करें:**
- Features temporarily disable करना है तो
- A/B testing के लिए
- Beta features rollout के लिए

#### **Field Details:**

| Feature | Working | Description |
|---------|---------|-------------|
| `userAuth` | ✅ | User login/signup system |
| `multiLanguage` | ❌ | Multi-language support |
| `darkMode` | ✅ | Dark theme support |
| `offlineMode` | ✅ | Offline functionality |
| `pushNotifications` | ❌ | Push notifications |
| `socialLogin` | ❌ | Google/Facebook login |
| `guestCheckout` | ✅ | Checkout without login |
| `wishlist` | ✅ | Product wishlist |
| `cart` | ✅ | Shopping cart |
| `reviews` | ✅ | Product reviews |
| `search` | ✅ | Product search |
| `filters` | ✅ | Search filters |
| `sorting` | ✅ | Sort products |
| `pagination` | ✅ | Page navigation |

---

### **📏 System Limits**
```json
{
  "limits": {
    "maxCartItems": 50,
    "maxWishlistItems": 100,
    "maxSearchResults": 100,
    "maxFileUploads": 10,
    "sessionTimeout": 3600000,
    "apiTimeout": 30000,
    "cacheTimeout": 86400000
  }
}
```

#### **कब Use करें:**
- System abuse prevent करने के लिए
- Performance optimize करने के लिए
- Resource usage control करने के लिए

#### **Field Details:**

| Field | Type | Working | Description | Unit |
|-------|------|---------|-------------|------|
| `maxCartItems` | number | ✅ | Maximum cart items | items |
| `maxWishlistItems` | number | ✅ | Maximum wishlist items | items |
| `maxSearchResults` | number | ✅ | Search result limit | results |
| `maxFileUploads` | number | ✅ | File upload limit | files |
| `sessionTimeout` | number | ✅ | Auto-logout time | milliseconds |
| `apiTimeout` | number | ✅ | API call timeout | milliseconds |
| `cacheTimeout` | number | ✅ | Cache expiration | milliseconds |

---

### **👀 Monitoring & Logging**
```json
{
  "monitoring": {
    "enabled": true,
    "logLevel": "info",
    "errorReporting": true,
    "performanceTracking": true,
    "userAnalytics": true,
    "crashReporting": true,
    "uptimeMonitoring": false,
    "alertsEnabled": false
  }
}
```

#### **Field Details:**

| Field | Type | Working | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | ✅ | Enable monitoring |
| `logLevel` | string | ✅ | "error", "warn", "info", "debug" |
| `errorReporting` | boolean | ✅ | Report JavaScript errors |
| `performanceTracking` | boolean | ⚠️ | Track performance metrics |
| `userAnalytics` | boolean | ⚠️ | User behavior analytics |
| `crashReporting` | boolean | ❌ | App crash reporting |
| `uptimeMonitoring` | boolean | ❌ | Server uptime monitoring |
| `alertsEnabled` | boolean | ❌ | Alert notifications |

---

### **🚀 Deployment Settings**
```json
{
  "deployment": {
    "environment": "development",
    "branch": "main",
    "buildCommand": "npm run build",
    "deployCommand": "npm run deploy",
    "rollbackEnabled": true,
    "autoDeploy": false,
    "healthCheckUrl": "/health",
    "maintenancePage": "/maintenance.html"
  }
}
```

#### **Field Details:**

| Field | Type | Working | Description |
|-------|------|---------|-------------|
| `environment` | string | ✅ | Current environment |
| `branch` | string | ❌ | Deployment branch |
| `buildCommand` | string | ❌ | Build command |
| `deployCommand` | string | ❌ | Deploy command |
| `rollbackEnabled` | boolean | ❌ | Enable rollbacks |
| `autoDeploy` | boolean | ❌ | Auto deployment |
| `healthCheckUrl` | string | ❌ | Health check endpoint |
| `maintenancePage` | string | ❌ | Maintenance page |

---

### **🔧 Development Settings**
```json
{
  "development": {
    "debugMode": false,
    "betaFeatures": false,
    "experimentalUI": false,
    "consoleLogging": true,
    "errorReporting": true,
    "performanceMetrics": true
  }
}
```

#### **Field Details:**

| Field | Type | Working | Description |
|-------|------|---------|-------------|
| `debugMode` | boolean | ✅ | Enable debug features |
| `betaFeatures` | boolean | ✅ | Enable beta features |
| `experimentalUI` | boolean | ✅ | Enable experimental UI |
| `consoleLogging` | boolean | ✅ | Console log output |
| `errorReporting` | boolean | ✅ | Error reporting |
| `performanceMetrics` | boolean | ✅ | Performance logging |

---

### **🎛️ General Flags**
```json
{
  "flags": {
    "maintenanceMode": false,
    "phoneVerification": true,
    "roleSwitcher": true,
    "ptrEnabled": true,
    "promotionEnabled": false
  }
}
```

#### **Field Details:**

| Field | Type | Working | Description |
|-------|------|---------|-------------|
| `maintenanceMode` | boolean | ✅ | Show maintenance page |
| `phoneVerification` | boolean | ✅ | Phone number verification |
| `roleSwitcher` | boolean | ✅ | Role switching UI |
| `ptrEnabled` | boolean | ✅ | Pull-to-refresh |
| `promotionEnabled` | boolean | ❌ | Promotional features |

---

### **📝 Audit Trail**
```json
{
  "audit": {
    "createdAt": "2025-09-08T09:56:14Z",
    "createdBy": "Santosh",
    "modifyAt": "2025-12-19T14:25:11Z",
    "modifyBy": "System",
    "lastConfigUpdate": "2025-12-19T14:25:11Z",
    "configVersion": "2.0",
    "changeHistory": []
  }
}
```

#### **Field Details:**

| Field | Type | Working | Description |
|-------|------|---------|-------------|
| `createdAt` | string | ✅ | Config creation date |
| `createdBy` | string | ✅ | Creator name |
| `modifyAt` | string | ✅ | Last modification date |
| `modifyBy` | string | ✅ | Last modifier |
| `lastConfigUpdate` | string | ✅ | Last config update |
| `configVersion` | string | ✅ | Configuration version |
| `changeHistory` | array | ❌ | Change history log |

---

## 🎯 Common Configuration Scenarios

### **1. GitHub Pages Setup (Current):**
```json
{
  "routing": {
    "serveMode": "github-pages",
    "githubPage": "https://iamskdev.github.io/mstore.com/",
    "basePath": "/mstore.com/"
  }
}
```

### **2. Custom Domain Migration:**
```json
{
  "routing": {
    "serveMode": "custom-domain",
    "customDomain": "https://mystore.com",
    "basePath": ""
  },
  "migration": {
    "enabled": true,
    "newUrl": "https://mystore.com"
  }
}
```

### **3. Production Security:**
```json
{
  "security": {
    "httpsOnly": true,
    "contentSecurityPolicy": true,
    "hstsEnabled": true
  },
  "deployment": {
    "environment": "production"
  }
}
```

### **4. Performance Optimization:**
```json
{
  "performance": {
    "lazyLoading": true,
    "codeSplitting": true,
    "preloadCritical": true
  }
}
```

---

## 🔧 How to Modify Configuration

### **🛑 CRITICAL SAFETY RULES:**
1. ✅ **BACKUP FIRST:** `cp config.json config.json.backup`
2. ✅ **TEST LOCALLY:** Use `npm run dev`
3. ✅ **VALIDATE JSON:** Check syntax
4. ✅ **DOCUMENT CHANGES:** Why did you change?
5. ✅ **TEST IMPACT:** Check affected features

### **Editing Guidelines:**
```javascript
// ✅ SAFE CHANGES:
- Change feature toggles
- Update UI settings
- Modify limits within reason
- Enable/disable monitoring

// ⚠️ REQUIRES TESTING:
- URL changes
- Security settings
- PWA configuration
- Integration settings

// ❌ HIGH RISK - TEST EXTENSIVELY:
- Routing configuration
- Migration settings
- Production environment settings
```

### **Validation Commands:**
```bash
# Check JSON syntax
cat config.json | jq . >/dev/null && echo "Valid JSON" || echo "Invalid JSON"

# Test locally
npm run dev

# Check console for errors
# Test affected features
```

---

## 🚨 Emergency Rollback

### **If Something Breaks:**
```bash
# Immediate rollback
cp config.json.backup config.json

# Or revert git changes
git checkout -- source/settings/config.json

# Restart app
npm run dev
```

### **Common Issues & Fixes:**

| Problem | Symptom | Solution |
|---------|---------|----------|
| App not loading | White screen | Check routing URLs |
| PWA not working | Can't install | Verify PWA settings |
| Images not loading | Broken images | Check Cloudinary config |
| Auth not working | Login fails | Verify Firebase settings |
| Slow performance | Laggy UI | Check performance settings |

---

## 📊 Configuration Priority Levels

### **🔴 CRITICAL - Test Before Deploy:**
- `routing.*` - App accessibility
- `security.*` - Data protection
- `pwa.*` - App installability
- `migration.*` - User experience

### **🟡 IMPORTANT - Monitor After Change:**
- `integrations.*` - Third-party services
- `performance.*` - App speed
- `analytics.*` - User tracking

### **🟢 LOW RISK - Usually Safe:**
- `features.*` - Feature toggles
- `ui.*` - UI preferences
- `limits.*` - System constraints

---

## 📞 Support & Troubleshooting

### **Getting Help:**
1. Check this documentation first
2. Review browser console errors
3. Test in development mode
4. Check GitHub issues
5. Create detailed bug report

### **Debug Checklist:**
- [ ] JSON syntax valid?
- [ ] All required fields present?
- [ ] URLs correct and accessible?
- [ ] Integration credentials valid?
- [ ] Tested locally first?
- [ ] Backup created?
- [ ] Rollback plan ready?

---

*Config Version: 2.0*
*Last Updated: December 2025*
*Maintained by: mStore Development Team*

**⚠️ Remember: Configuration changes can break your app. Always test, backup, and have a rollback plan!**