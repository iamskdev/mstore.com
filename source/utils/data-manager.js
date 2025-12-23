/**
 * @file Centralized data fetching service for the application.
 * This module is the single source of truth for all data interactions, including:
 * - Fetching data from Firestore or local JSON mocks.
 * - Caching data aggressively in localStorage to minimize reads and improve performance.
 * - Providing a unified interface for client-side storage (localStorage and sessionStorage).
 */

import { getAppConfig } from '../settings/main-config.js';
import { firestore } from '../firebase/firebase-config.js'; // ✅ Import firestore service
import { routeManager } from '../main.js';

// ===================================================================================
// --- EMBEDDED CACHE MANAGER ---
// This logic was moved from cache-manager.js to keep all data-related logic in one file.
// It provides a safe and unified way to interact with browser storage.
// ===================================================================================

const createStorage = (storage) => ({
    /**
     * Retrieves an item from storage and deserializes it from JSON.
     * @param {string} key The key of the item to retrieve.
     * @returns {any | null} The retrieved item, or null if not found or if parsing fails.
     */
    get(key) {
        const itemStr = storage.getItem(key);
        if (!itemStr) return null;
        try {
            return JSON.parse(itemStr);
        } catch (e) {
            console.error(`CacheService: Error parsing JSON from key "${key}"`, e);
            storage.removeItem(key); // Remove corrupted item to prevent future errors.
            return null;
        }
    },

    /**
     * Serializes and adds an item to storage.
     * @param {string} key The key of the item to set.
     * @param {any} value The value to store.
     */
    set(key, value) {
        if (value === undefined || value === null) {
            storage.removeItem(key);
            return;
        }
        try {
            storage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`CacheService: Error setting item for key "${key}". Storage might be full.`, e);
        }
    },

    /**
     * Removes an item from storage.
     * @param {string} key The key of the item to remove.
     */
    remove(key) {
        storage.removeItem(key);
    },

    /**
     * Clears all items from the storage.
     */
    clear() {
        storage.clear();
    },
});

export const localCache = createStorage(localStorage);
export const sessionCache = createStorage(sessionStorage);

/**
 * A generic factory function to create a cached data fetcher for a specific collection.
 * This reduces code duplication and standardizes data fetching.
 * @param {string} collectionName - The name of the collection (e.g., 'items', 'users').
 * @param {string} idKey - The name of the ID field in the item's meta object (e.g., 'itemId', 'userId').
 * @returns {{fetchAll: Function, fetchById: Function}} An object with fetchAll and fetchById functions.
 */
const createDataFetcher = (collectionName, idKey) => {
    const cacheKey = `data-cache-${collectionName}`; // Key for storing the collection data
    let unsubscribeListener = null; // To hold the Firestore listener unsubscribe function
    let isListenerActive = false; // Flag to prevent multiple listeners

    /**
     * Fetches all documents from a collection, from local mock or Firestore.
     * This function now establishes a real-time listener for Firebase sources.
     * @param {boolean} [force=false] - If true, forces a UI refresh with cached data. Not for re-fetching.
     * @returns {Promise<Array>} A promise that resolves to an array of documents.
     */
    const fetchAll = async (force = false) => {
        const dataSource = getAppConfig().source.data || 'firebase';

        // --- STRATEGY 1: Local Store (Simple Fetch & Cache) ---
        if (dataSource === 'localstore') {
            const cachedData = localCache.get(cacheKey);
            if (cachedData && !force) {
                return Promise.resolve(cachedData);
            }
            try {
                const response = await fetch(`../../localstore/jsons/${collectionName}.json`);
                if (!response.ok) throw new Error(`404`);
                const data = await response.json();
                localCache.set(cacheKey, data);
                return data;
            } catch (err) {
                if (err.message.includes('404')) {
                    console.warn(`Local data file not found: ${collectionName}.json. Returning empty array.`);
                } else {
                    console.error(`Error reading local data for ${collectionName}:`, err);
                }
                return [];
            }
        }

        // --- STRATEGY 2: Firebase (Real-time Listener & Smart Cache) ---
        if (dataSource === 'firebase' || dataSource === 'emulator') {
            // --- FIX: Add a security check for admin-only collections ---
            // Prevent non-admin users from trying to listen to collections they don't have access to.
            if (collectionName === 'ratings' || collectionName === 'logs') {
                const currentUserType = localCache.get('currentUserType');
                if (currentUserType !== 'admin') {
                    return Promise.resolve([]); // Return empty array for non-admins
                }
            }
            // --- Listener Setup Function (defined once, used in multiple places) ---
            // This function is defined here so it's in scope for both the "cached data" path and the "fresh fetch" path.
            const setupListener = (resolve, reject) => {
                if (!firestore) {
                    console.warn(`Firestore not available for ${collectionName} - using cached data only`);
                    // Return empty array if no cached data, or resolve with cached data if available
                    const cachedData = localCache.get(cacheKey);
                    if (cachedData) {
                        if (resolve) resolve(cachedData);
                        return;
                    }
                    // If reject is not provided, just return empty array
                    if (resolve) resolve([]);
                    return;
                }

                console.log(`[DataManager] 🎧 Setting up real-time listener for '${collectionName}'...`);
                const collectionRef = firestore.collection(collectionName);

                unsubscribeListener = collectionRef.onSnapshot(
                    (snapshot) => {
                        console.log(`[DataManager] ✨ Snapshot received for '${collectionName}'. Processing ${snapshot.docChanges().length} changes.`);
                        let currentCache = localCache.get(cacheKey) || [];

                        snapshot.docChanges().forEach(change => {
                            const data = change.doc.data();
                            const docId = data.meta?.[idKey] || change.doc.id;
                            const index = currentCache.findIndex(item => item.meta?.[idKey] === docId);

                            if (change.type === 'added') { if (index === -1) currentCache.push(data); }
                            if (change.type === 'modified') { if (index > -1) currentCache[index] = data; }
                            if (change.type === 'removed') { if (index > -1) currentCache.splice(index, 1); }
                        });

                        localCache.set(cacheKey, currentCache);

                        if (!isListenerActive) {
                            isListenerActive = true;
                            if (resolve) resolve(currentCache); // Resolve the promise on the very first fetch.
                        } else {
                            window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { collection: collectionName } }));
                        }
                    },
                    (error) => {
                        console.error(`[DataManager] Listener error for '${collectionName}':`, error);
                        isListenerActive = false; // Reset flag on error
                        if (reject) reject(error);
                    }
                );
            };

            // If a listener is already active, just return the latest data from the cache.
            if (isListenerActive) {
                return Promise.resolve(localCache.get(cacheKey) || []);
            }

            // If there's data in the cache, return it immediately for a fast UI response,
            // while the listener sets up in the background (only if online).
            const cachedData = localCache.get(cacheKey);
            if (cachedData) {
                console.log(`[DataManager] ⚡️ Serving '${collectionName}' from cache.`);
                // Only set up listener if not already active AND we're online - avoid unnecessary Firebase connections when offline
                if (!isListenerActive && navigator.onLine) {
                    console.log(`[DataManager] 🎧 Setting up background listener for '${collectionName}'...`);
                    setupListener(null, null);
                } else if (!navigator.onLine) {
                    console.log(`[DataManager] 🌐 Offline: Skipping listener setup for '${collectionName}'`);
                } else {
                    console.log(`[DataManager] ✅ Listener already active for '${collectionName}'`);
                }
                return Promise.resolve(cachedData);
            }

            // If no cached data and we're offline, return empty array
            if (!navigator.onLine) {
                console.log(`[DataManager] 🌐 Offline: No cached data for '${collectionName}', returning empty array`);
                return Promise.resolve([]);
            }

            // If no cached data and online, create a new promise and set up the listener.
            return new Promise(setupListener);
        }

        return Promise.resolve([]); // Fallback
    };

    /**
     * Fetches a single document by its ID.
     * @param {string} id - The ID of the document to fetch.
     * @returns {Promise<object|null>} A promise that resolves to the document object or null if not found.
     */
    const fetchById = async (id) => {
        if (!id) return null;
        const dataSource = getAppConfig().source.data || 'firebase';

        if (dataSource === 'localstore') {
            try {
                const allData = await fetchAll();
                const item = allData.find(d => d.meta[idKey] === id);
                return item || null;
            } catch (error) {
                return null;
            }
        } else if (dataSource === 'firebase' || dataSource === 'emulator') {
            if (!firestore) {
                console.warn(`Firestore not available for fetchById on ${collectionName} - returning null`);
                return null;
            }
            try {
                // Query based on the specific ID key within the 'meta' object
                const snapshot = await firestore.collection(collectionName)
                                                .where(`meta.${idKey}`, '==', id)
                                                .limit(1)
                                                .get();

                if (!snapshot.empty) {
                    const doc = snapshot.docs[0];
                    // Return doc.data() to maintain consistency with local JSON structure
                    return doc.data();
                } else {
                    // If not found by custom ID, try fetching by document ID as a fallback
                    const docById = await firestore.collection(collectionName).doc(id).get();
                    if (docById.exists) return docById.data();
                    return null;
                }
            } catch (error) {
                throw error;
            }
        } else {
            return null;
        }
    };

    return { fetchAll, fetchById };
};

/**
 * Updates a user document in Firestore.
 * @param {string} userId - The ID of the user to update.
 * @param {object} updateData - An object with fields to update, using dot notation for nested fields.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
export async function updateUser(userId, updateData) {
    const dataSource = getAppConfig().source.data || 'firebase';
    if (dataSource !== 'firebase' && dataSource !== 'emulator') {
        console.warn('Data source is not Firestore. Skipping user update.');
        // Simulate a successful update for localstore
        return Promise.resolve();
    }

    if (!firestore) {
        console.warn('Firestore not available - cannot update user offline');
        return false;
    }
    if (!userId || !updateData) {
        throw new Error('User ID and update data are required.');
    }

    console.log(`Firestore: Updating 'users/${userId}' with:`, updateData);
    const userRef = firestore.collection('users').doc(userId);
    await userRef.update(updateData);
}

/**
 * Updates a merchant document in Firestore.
 * @param {string} merchantId - The ID of the merchant to update.
 * @param {object} updateData - An object with fields to update, using dot notation for nested fields.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
export async function updateMerchant(merchantId, updateData) {
    const dataSource = getAppConfig().source.data || 'firebase';
    if (dataSource !== 'firebase' && dataSource !== 'emulator') {
        console.warn('Data source is not Firestore. Skipping merchant update.');
        return Promise.resolve();
    }

    if (!firestore) {
        throw new Error('Firestore is not initialized! Cannot update merchant.');
    }
    if (!merchantId || !updateData) {
        throw new Error('Merchant ID and update data are required.');
    }

    const merchantRef = firestore.collection('merchants').doc(merchantId);
    await merchantRef.update(updateData);
}

/**
 * A utility to wait for one or more data caches to be populated.
 * This is useful for views that are accessed immediately after login,
 * before the initial data fetch might be complete.
 * @param {Array<string>} dataKeys - Array of keys to wait for (e.g., ['merchants', 'users']).
 * @returns {Promise<void>} A promise that resolves when all specified data is cached.
 */
export async function waitForData(dataKeys) {
    const fetcherMap = {
        merchants: fetchAllMerchants,
        users: fetchAllUsers,
        items: fetchAllItems,
        // Add other fetchers here as needed
    };

    const promises = dataKeys.map(key => fetcherMap[key] ? fetcherMap[key]() : Promise.resolve());
    await Promise.all(promises);
}

// Create and export fetchers for all data collections.
// This makes the data manager complete and easy to extend.
export const { fetchAll: fetchAllItems, fetchById: fetchItemById } = createDataFetcher('items', 'itemId');
export const { fetchAll: fetchAllUsers, fetchById: fetchUserById } = createDataFetcher('users', 'userId');
export const { fetchAll: fetchAllMerchants, fetchById: fetchMerchantById } = createDataFetcher('merchants', 'merchantId');
export const { fetchAll: fetchAllCategories, fetchById: fetchCategoryById } = createDataFetcher('categories', 'categoryId');
export const { fetchAll: fetchAllBrands, fetchById: fetchBrandById } = createDataFetcher('brands', 'brandId');
export const { fetchAll: fetchAllUnits, fetchById: fetchUnitById } = createDataFetcher('units', 'unitId');
export const { fetchAll: fetchAllAlerts, fetchById: fetchAlertById } = createDataFetcher('alerts', 'alertId');
export const { fetchAll: fetchAllOrders, fetchById: fetchOrderById } = createDataFetcher('orders', 'orderId');
export const { fetchAll: fetchAllPriceLogs, fetchById: fetchPriceLogById } = createDataFetcher('price-logs', 'priceLogId');
export const { fetchAll: fetchAllLogs, fetchById: fetchLogById } = createDataFetcher('logs', 'logId');
export const { fetchAll: fetchAllAccounts, fetchById: fetchAccountById } = createDataFetcher('accounts', 'accountId');
export const { fetchAll: fetchAllPromotions, fetchById: fetchPromotionById } = createDataFetcher('promotions', 'promoId');
export const { fetchAll: fetchAllStories, fetchById: fetchStoryById } = createDataFetcher('stories', 'meta.links.merchantId');
export const { fetchAll: fetchAllFeedbacks, fetchById: fetchFeedbackById } = createDataFetcher('feedbacks', 'feedbackId');
export const { fetchAll: fetchAllRatings, fetchById: fetchRatingById } = createDataFetcher('ratings', 'ratingId');

/**
 * Simulates writing data to a local JSON file.
 * This function is for development/mocking purposes only and does not persist data across sessions.
 * In a real application, this would involve a backend API call.
 * @param {string} collectionName - The name of the collection (e.g., 'users', 'sessions', 'logs').
 * @param {object} newData - The new data object to add to the collection.
 * @returns {Promise<boolean>} A promise that resolves to true if the write was successful, false otherwise.
 */
export async function simulateLocalDataWrite(collectionName, newData) {
    try {
        const response = await fetch(`../../localstore/jsons/${collectionName}.json`);
        let data = [];
        if (response.ok) {
            data = await response.json();
        } else if (response.status === 404) {
        } else {
            throw new Error(`Failed to fetch local ${collectionName}.json: ${response.statusText}`);
        }

        data.push(newData);

        // In a real scenario, you would send this 'data' back to a server to write to the file.
        // For this simulation, we'll just log it and assume success.
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Fetches the first active promotion, respecting the schedule.
 * This function has custom logic that doesn't fit the generic fetcher.
 * @returns {Promise<object|null>} The active promotion object or null.
 */
export async function fetchActivePromotion() {
    const dataSource = getAppConfig().source.data || 'firebase';
    const now = new Date(); // Get the current time

    try {
        if (dataSource === 'localstore') {
            const promotions = await fetchAllPromotions();
            // Find a promotion that is active AND within its schedule
            return promotions.find(p => {
                const status = p.meta?.status;
                const schedule = p.meta?.schedule;

                if (!status || status.isActive !== true) {
                    return false; // Must be active
                }

                // If a schedule exists, check if we are within the time frame
                if (schedule && schedule.start && schedule.end) {
                    const startDate = new Date(schedule.start);
                    const endDate = new Date(schedule.end);
                    return now >= startDate && now <= endDate;
                }

                // If it's active and has no schedule, it's always valid
                return true;
            }) || null;
        } else if (dataSource === 'firebase' || dataSource === 'emulator') {
            if (!firestore) {
                return null;
            }
            // Firestore query to get documents that are active and scheduled correctly.
            const snapshot = await firestore.collection('promotions')
                .where('meta.status.isActive', '==', true)
                .where('meta.schedule.start', '<=', now.toISOString())
                .get();

            if (snapshot.empty) {
                return null;
            }

            // Since Firestore can't do two inequality checks on different fields,
            // we filter the end date in the client.
            const validPromotion = snapshot.docs.find(doc => {
                const data = doc.data();
                const schedule = data.meta?.schedule;
                if (schedule && schedule.end) {
                    const endDate = new Date(schedule.end);
                    return now <= endDate;
                }
                // If no end date, it's considered valid.
                return true; 
            });

            return validPromotion ? { promoId: validPromotion.id, ...validPromotion.data() } : null;
        }
    } catch (error) {
        console.error("Error fetching or filtering active promotion:", error);
        return null;
    }
    return null;
}

/**
 * Generates a unique ID based on the project's standard format.
 * Format: TYPE-YYYYMMDD-HHMMSS-SSS-RRRR
 * @param {string} entityType - The 3-letter uppercase code for the entity (e.g., 'MRC', 'USR').
 * @returns {string} The generated unique ID.
 */
function generateId(entityType) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  const ms = String(now.getUTCMilliseconds()).padStart(3, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${entityType}-${yyyy}${mm}${dd}-${hh}${min}${ss}-${ms}-${random}`;
}

/**
 * Creates a new skeleton merchant profile, saves it to Firestore,
 * links it to the current user, and then switches the user's role to that new merchant.
 */
export async function createAndSwitchToNewMerchant() {
    const currentUserId = localCache.get('currentUserId');
    if (!currentUserId) {
        console.error("Cannot create business: User is not logged in.");
        window.showCustomAlert({ title: 'Login Required', message: 'You must be logged in to create a business profile.' });
        return;
    }

    const currentUser = await fetchUserById(currentUserId);
    if (!currentUser) {
        console.error("Cannot create business: Current user data not found.");
        window.showCustomAlert({ title: 'Error', message: 'Could not retrieve your user data. Please try again.' });
        return;
    }

    const newMerchantId = generateId('MRC');
    const now = new Date().toISOString();

    // --- FIX: Create a complete skeleton object matching the merchants.json schema ---
    const newMerchant = {
        meta: {
            merchantId: newMerchantId, version: 1, joinedAt: now, type: "Retailer", adminNote: "Newly created via Add Business flow.",
            status: 'incomplete', // This is the crucial flag for our flow
            flags: { isActive: true, isVerified: false, isPopular: false, isNew: true, isDeleted: false },
            links: { userId: currentUserId, staffIds: [] },
            ownerUID: currentUser.auth.provider.uid
        },
        info: {
            name: "My New Business", handle: `new-business-${newMerchantId.slice(-4).toLowerCase()}`, logo: null, qrCode: null,
            tagline: "Your amazing new business tagline!", description: "Complete your profile to add a detailed description about your business.",
            coverImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1974&auto=format&fit=crop",
            establishedAt: now, contact: { phone: null, email: null, whatsapp: null }
        },
        openingHours: { days: [], hours: [], isOpen: false, note: "" }, addresses: [],
        engagement: { rank: 0, rating: 0, reviews: 0, views: 0, followers: 0, items: 0 },
        social: { facebook: null, instagram: null, twitter: null, whatsapp: null },
        community: { description: "Welcome to the community!", activeMembers: [] },
        paymentOptions: { acceptsCod: false, acceptsOnline: false, acceptedGateways: [] },
        deliveryInfo: { isAvailable: false, deliveryRadiusKm: 0, minOrderValue: 0, deliveryFee: 0, freeDeliveryThreshold: 0 },
        legalInfo: { ownerName: currentUser.info.fullName || '', gstin: null, pan: { number: null }, aadhaar: { last4digits: null } },
        seo: { title: "My New Business", description: "", keywords: [] },
        subscription: { plan: "free", status: "active", startDate: now, endDate: null, autoRenew: false, amount: 0 },
        audit: { createdAt: now, createdBy: currentUserId, updatedAt: now, updatedBy: currentUserId }
    };

    try {
        const merchantRef = firestore.collection('merchants').doc(newMerchantId);
        await merchantRef.set(newMerchant);
        console.log(`[Firestore] ✅ New merchant document created: merchants/${newMerchantId}`);

        const userRef = firestore.collection('users').doc(currentUserId);
        await userRef.update({ 'meta.links.merchantIds': firebase.firestore.FieldValue.arrayUnion(newMerchantId) });
        console.log(`[Firestore] ✅ User document updated to link new merchant.`);

        const allMerchants = localCache.get('allMerchants') || [];
        allMerchants.push(newMerchant);
        localCache.set('allMerchants', allMerchants);

    } catch (error) {
        console.error("❌ Firestore Error: Failed to create new business.", error);
        window.showCustomAlert({ title: 'Database Error', message: 'Could not create your business profile. Please try again.' });
        return;
    }

    routeManager.handleRoleChange('merchant', currentUserId, newMerchantId);
}