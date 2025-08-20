/**
 * @file Centralized data fetching service for the application.
 * Implements a caching mechanism to prevent redundant network requests for static data.
 */

import { APP_CONFIG } from './app-config.js';
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
        const dataSource = APP_CONFIG.dataSource || 'firebase';

        if (cachePromise && !force) {
            console.log(`✅ Returning cached ${dataSource} ${collectionName} data.`);
            return cachePromise;
        }

        console.log(`⏳ Fetching ${collectionName} data from ${dataSource.toUpperCase()}...`);

        const promise = (async () => {
            if (dataSource === 'localstore') {
                try {
                    const response = await fetch(`../../localstore/jsons/${collectionName}.json`);
                    if (!response.ok) throw new Error(`Failed to fetch local ${collectionName}.json: ${response.statusText}`);
                    const data = await response.json();
                    console.log(`Local mock ${collectionName}:`, data);
                    return data;
                } catch (err) {
                    console.error(`Local mock fetch error for ${collectionName}:`, err);
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
                    console.log(`Firestore ${collectionName}:`, data);
                    return data;
                } catch (err) {
                    console.error(`Firestore fetch error for ${collectionName}:`, err);
                    cachePromise = null; // Reset cache on error to allow retries
                    // Re-throw the error so the calling component can handle it (e.g., show an error message)
                    throw err;
                }
            } else {
                console.error(`Unknown data source: '${dataSource}'. Cannot fetch ${collectionName}.`);
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
        const dataSource = APP_CONFIG.dataSource || 'firebase';

        if (dataSource === 'localstore') {
            try {
                const allData = await fetchAll();
                const item = allData.find(d => d.meta[idKey] === id);
                return item || null;
            } catch (error) {
                console.error(`Error fetching ${id} from local mock ${collectionName}:`, error);
                return null;
            }
        } else if (dataSource === 'firebase' || dataSource === 'emulator') {
            if (!firestore) {
                console.error(`Firestore is not initialized for fetchById on ${collectionName}!`);
                throw new Error(`Firestore is not initialized for fetchById on ${collectionName}!`);
            }
            try {
                const doc = await firestore.collection(collectionName).doc(id).get();
                if (doc.exists) {
                    // FIX: Return only doc.data() to maintain consistency with the
                    // structure of local JSON files and the fetchAll function. The ID
                    // is already present within the document's `meta` object.
                    return doc.data();
                } else {
                    console.warn(`${collectionName} with ID ${id} not found in Firestore.`);
                    return null;
                }
            } catch (error) {
                console.error(`Error fetching ${id} from Firestore collection ${collectionName}:`, error);
                throw error;
            }
        } else {
            console.error(`Unknown data source: '${dataSource}'. Cannot fetch by ID from ${collectionName}.`);
            return null;
        }
    };

    return { fetchAll, fetchById };
};

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
            console.warn(`Local mock file not found for ${collectionName}.json. Creating new array.`);
        } else {
            throw new Error(`Failed to fetch local ${collectionName}.json: ${response.statusText}`);
        }

        data.push(newData);

        // In a real scenario, you would send this 'data' back to a server to write to the file.
        // For this simulation, we'll just log it and assume success.
        console.log(`Simulating write to ${collectionName}.json:`, data);
        return true;
    } catch (error) {
        console.error(`Error simulating local data write for ${collectionName}:`, error);
        return false;
    }
}

/**
 * Generates a new sequential ID for a given collection.
 * @param {string} collectionName - The name of the Firestore collection.
 * @param {string} prefix - The prefix for the ID (e.g., 'USR', 'LOG', 'SES').
 * @returns {Promise<string>} A promise that resolves to the new sequential ID.
 */
export async function generateSequentialId(collectionName, prefix) {
    if (!firestore) {
        throw new Error('Firestore is not initialized for ID generation!');
    }

    // Use a dedicated 'counters' collection and transactions for robust, atomic ID generation.
    // This avoids the "descending key scans" error and is the recommended pattern.
    const counterRef = firestore.collection('counters').doc(collectionName);

    try {
        let newIdNumber;
        await firestore.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            
            let lastIdNumber = 0;
            if (counterDoc.exists) {
                lastIdNumber = counterDoc.data().count || 0;
            }
            
            newIdNumber = lastIdNumber + 1;
            
            // Atomically update the counter.
            transaction.set(counterRef, { count: newIdNumber }, { merge: true });
        });

        if (newIdNumber === undefined) {
            throw new Error('Transaction failed to produce a new ID number.');
        }

        const paddedId = String(newIdNumber).padStart(12, '0');
        return `${prefix}${paddedId}`;

    } catch (error) {
        console.error(`Failed to generate sequential ID for ${collectionName}:`, error);
        // Re-throw the error to be handled by the calling function (e.g., the signup rollback)
        throw error;
    }
}

/**
 * Fetches the first active promotion.
 * This function has custom logic that doesn't fit the generic fetcher.
 * @returns {Promise<object|null>} The active promotion object or null.
 */
export async function fetchActivePromotion() {
    const dataSource = APP_CONFIG.dataSource || 'firebase';

    if (dataSource === 'localstore') {
        try {
            const promotions = await fetchAllPromotions();
            return promotions.find(p => p.meta.status.isActive === true) || null;
        } catch (error) {
            console.error("Error fetching local active promotion:", error);
            return null;
        }
    } else if (dataSource === 'firebase' || dataSource === 'emulator') {
        if (!firestore) {
            console.error("Firestore is not initialized for fetchActivePromotion!");
            return null;
        }
        try {
            const snapshot = await firestore.collection('promotions').where('meta.status.isActive', '==', true).limit(1).get();
            if (snapshot.empty) {
                return null;
            }
            const promoDoc = snapshot.docs[0];
            return { promoId: promoDoc.id, ...promoDoc.data() };
        } catch (error) {
            console.error("Failed to fetch active promotion from Firestore:", error);
            return null;
        }
    } else {
        console.error(`Unknown data source: '${dataSource}'. Cannot fetch active promotion.`);
        return null;
    }
}