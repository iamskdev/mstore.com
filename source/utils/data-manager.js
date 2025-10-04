/**
 * @file Centralized data fetching service for the application.
 * Implements a caching mechanism to prevent redundant network requests for static data.
 */

import { getAppConfig } from '../settings/main-config.js';
import { firestore } from '../firebase/firebase-config.js'; // ✅ Import firestore service

/**
 * A generic factory function to create a cached data fetcher for a specific collection.
 * This reduces code duplication and standardizes data fetching.
 * @param {string} collectionName - The name of the collection (e.g., 'items', 'users').
 * @param {string} idKey - The name of the ID field in the item's meta object (e.g., 'itemId', 'userId').
 * @returns {{fetchAll: Function, fetchById: Function}} An object with fetchAll and fetchById functions.
 */
const createDataFetcher = (collectionName, idKey) => {
    let cachePromise = null;

    /**
     * Fetches all documents from a collection, from local mock or Firestore.
     * @param {boolean} [force=false] - If true, bypasses the cache and fetches fresh data.
     * @returns {Promise<Array>} A promise that resolves to an array of documents.
     */
    const fetchAll = (force = false) => {
        const dataSource = getAppConfig().source.data || 'firebase';

        if (cachePromise && !force) {
            return cachePromise;
        }
 
        const promise = (async () => {
            if (dataSource === 'localstore') {
                try {
                    const response = await fetch(`../../localstore/jsons/${collectionName}.json`);
                    if (!response.ok) throw new Error(`Failed to fetch local ${collectionName}.json: ${response.statusText}`);
                    const data = await response.json();
                    // --- FIX: Handle both array and single object JSON files ---
                    // stories.json is a single object, but the app expects an array of story collections.
                    // For consistency, we'll wrap the single object in an array if it's not already one.
                    if (collectionName === 'stories' && !Array.isArray(data)) {
                        // If data is a single object and not null/undefined, wrap it.
                        if (data && typeof data === 'object') {
                            return [data];
                        }
                        return []; // Return empty array if it's not a valid object
                    }
                    return data;
                } catch (err) {
                    // FIX: For localstore, if a file doesn't exist (like feedbacks.json or logs.json),
                    // it should not break the entire app. Log a warning and return an empty array.
                    if (err.message.includes('404')) { // Check if it's a file not found error
                        console.warn(`Local data file not found: ${collectionName}.json. Returning empty array.`);
                    } else {
                        console.error(`Error reading local data for ${collectionName}:`, err);
                    }
                    cachePromise = null; // Reset cache on error
                    return [];
                }
            } else if (dataSource === 'firebase' || dataSource === 'emulator') {
                if (!firestore) {
                    throw new Error(`Firestore is not initialized! Check Firebase CDN scripts and config for ${collectionName}.`);
                }
                try {
                    const snapshot = await firestore.collection(collectionName).get();
                    // FIX: Return only doc.data(). The document's data already contains the
                    // ID within its `meta` object (e.g., meta.userId). This ensures the
                    // data structure is identical to the local JSON mock files, preventing inconsistencies.
                    const data = snapshot.docs.map(doc => doc.data());
                    return data;
                } catch (err) {
                    cachePromise = null; // Reset cache on error to allow retries
                    // Re-throw the error so the calling component can handle it (e.g., show an error message)
                    throw err;
                }
            } else {
                return [];
            }
        })();

        cachePromise = promise;
        return cachePromise;
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
                throw new Error(`Firestore is not initialized for fetchById on ${collectionName}!`);
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