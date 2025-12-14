import { generateId } from '../../../../utils/idGenerator.js';
import { firestore } from '../../../../firebase/firebase-config.js';
import { fetchUserById } from '../../../../utils/data-manager.js';
import { localCache } from '../../../../utils/data-manager.js';

/**
 * Removes all undefined values from an object (Firebase doesn't accept undefined)
 * @param {any} obj - The object to clean
 * @returns {any} The cleaned object
 */
function removeUndefinedValues(obj) {
    if (obj === null || obj === undefined) {
        return null;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefinedValues(item));
    }

    if (typeof obj === 'object') {
        const cleaned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (value !== undefined) {
                    cleaned[key] = removeUndefinedValues(value);
                }
            }
        }
        return cleaned;
    }

    return obj;
}

/**
 * Generates a new item ID
 * @returns {string} The generated item ID
 */
export function generateNewItemId() {
    return generateId('ITM');
}

/**
 * Fetches an item by ID from Firestore
 * @param {string} itemId - The ID of the item to fetch
 * @returns {Promise<object|null>} The item data or null if not found
 */
export async function fetchItem(itemId) {
    try {
        if (!firestore) {
            console.warn("Firestore not available. Item was not fetched.");
            return null;
        }

        const itemDoc = await firestore.collection('items').doc(itemId).get();

        if (!itemDoc.exists) {
            console.warn(`Item with ID ${itemId} not found.`);
            return null;
        }

        return itemDoc.data();
    } catch (error) {
        console.error(`Error fetching item ${itemId}:`, error);
        return null;
    }
}

/**
 * Creates or updates an item in Firestore
 * @param {object} params - The parameters for saving the item
 * @param {object} params.formData - The form data containing item information
 * @param {string} [params.itemId] - The item ID (required for updates, auto-generated for new items)
 * @param {object} [params.currentEditItem] - The current item being edited (for updates)
 * @param {boolean} [params.isEditMode=false] - Whether this is an edit operation
 * @param {string} [params.currentUserId] - The current user ID
 * @param {string} [params.currentUserType] - The current user type (admin/merchant)
 * @param {string} [params.merchantId] - The merchant ID (optional, will be fetched if not provided)
 * @returns {Promise<object>} The saved item data
 */
export async function saveItem({
    formData,
    itemId = null,
    currentEditItem = null,
    isEditMode = false,
    currentUserId = null,
    currentUserType = null,
    merchantId = null
}) {
    try {
        if (!firestore) {
            throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
        }

        // Get current user info if not provided
        if (!currentUserId) {
            currentUserId = localCache.get('currentUserId');
        }
        if (!currentUserType) {
            currentUserType = localCache.get('currentUserType');
        }

        const now = new Date().toISOString();

        // Generate itemId if it's a new item
        const finalItemId = itemId || (isEditMode ? null : generateId('ITM'));
        if (!finalItemId) {
            throw new Error('Item ID is required for saving.');
        }

        // Get merchantId from current user (required for merchants)
        let finalMerchantId = merchantId || localCache.get('currentMerchantId');

        // If merchantId is not in cache, fetch it from user data
        if (currentUserType === 'merchant' && !finalMerchantId && currentUserId) {
            try {
                const userData = await fetchUserById(currentUserId);
                // Try both merchantId (singular) and merchantIds (array) for compatibility
                finalMerchantId = userData?.meta?.links?.merchantId || userData?.meta?.links?.merchantIds?.[0] || null;

                // Save to cache for future use
                if (finalMerchantId) {
                    localCache.set('currentMerchantId', finalMerchantId);
                    console.log(`✅ Retrieved merchantId from user data: ${finalMerchantId}`);
                }
            } catch (error) {
                console.error('Error fetching user data for merchantId:', error);
            }
        }

        if (currentUserType === 'merchant' && !finalMerchantId) {
            throw new Error('Merchant ID not found. Please ensure you are properly logged in as a merchant and have a merchant profile.');
        }

        // Build complete item object
        const itemData = {
            meta: {
                itemId: finalItemId,
                type: formData.meta.type,
                version: isEditMode ? (currentEditItem?.meta?.version || 1) + 1 : 1,
                priority: 'normal',
                flags: {
                    isActive: formData.meta.flags.isActive,
                    isDeleted: false,
                    isArchived: false,
                    isPopular: false,
                    isTrending: false,
                    isFeatured: false,
                    isOnsite: false,
                    isPremium: false,
                    isVerified: false,
                    isPublic: formData.meta.flags.isPublic
                },
                links: {
                    merchantId: finalMerchantId || formData.links.merchantId || null,
                    brandId: formData.links.brandId || null,
                    unitId: formData.links.unitId || null,
                    categoryId: formData.links.categoryId || null,
                    secondaryUnitId: formData.links.secondaryUnitId || null
                },
                visibility: formData.meta.visibility
            },
            info: {
                name: formData.info.name,
                sku: formData.info.sku || null,
                hsnCode: formData.info.hsnCode || null,
                barcode: formData.info.itemCode || null,
                itemCode: formData.info.itemCode || null,
                note: formData.info.note || null,
                description: formData.info.description || null,
                attributes: formData.info.attributes || {}
            },
            pricing: {
                mrp: formData.pricing.mrp || null,
                costPrice: formData.pricing.costPrice || 0,
                sellingPrice: formData.pricing.sellingPrice || 0,
                currency: 'INR',
                discounts: [],
                wholesalePrice: formData.pricing.wholesalePrice || null,
                gstRate: formData.pricing.gstRate || 0
            },
            inventory: {
                stockQty: formData.inventory.stockQty || null,
                batchId: formData.inventory.batchId || null,
                expiryDate: formData.inventory.expiryDate || null,
                lowStockThreshold: formData.inventory.lowStockThreshold || null,
                reorderQuantity: formData.inventory.reorderQuantity || null,
                maxStockLevel: formData.inventory.maxStockLevel || null,
                stockLocation: formData.inventory.stockLocation || null,
                conversionFactor: formData.inventory.conversionFactor || null,
                isLowStock: formData.inventory.stockQty !== null && formData.inventory.lowStockThreshold !== null
                    ? formData.inventory.stockQty <= formData.inventory.lowStockThreshold
                    : false,
                isAvailable: formData.inventory.stockQty !== null ? formData.inventory.stockQty > 0 : true
            },
            media: formData.media || {
                thumbnail: null,
                gallery: [],
                video: null
            },
            analytics: isEditMode ? (currentEditItem?.analytics || {
                rating: 0,
                numReviews: 0,
                views: 0,
                saved: 0,
                carted: 0,
                totalSales: 0
            }) : {
                rating: 0,
                numReviews: 0,
                views: 0,
                saved: 0,
                carted: 0,
                totalSales: 0
            },
            seo: {
                title: formData.info.name,
                keywords: formData.seo.keywords || [],
                description: formData.info.description || null
            },
            audit: {
                createdAt: isEditMode ? (currentEditItem?.audit?.createdAt || now) : now,
                createdBy: isEditMode ? (currentEditItem?.audit?.createdBy || {
                    userId: currentUserId || 'unknown',
                    role: currentUserType || 'unknown',
                    name: 'Unknown User'
                }) : {
                    userId: currentUserId || 'unknown',
                    role: currentUserType || 'unknown',
                    name: 'Unknown User'
                },
                updatedAt: now,
                updatedBy: {
                    userId: currentUserId || 'unknown',
                    role: currentUserType || 'unknown',
                    name: 'Unknown User'
                }
            }
        };

        // Remove all undefined values from the object (Firebase doesn't accept undefined)
        const cleanItemData = removeUndefinedValues(itemData);

        // Save to Firestore
        const itemRef = firestore.collection('items').doc(finalItemId);
        await itemRef.set(cleanItemData);

        console.log(`✅ Item ${isEditMode ? 'updated' : 'saved'} successfully with ID: ${finalItemId}`);

        // Update local cache
        const allItems = localCache.get('allItems') || [];
        if (isEditMode) {
            const itemIndex = allItems.findIndex(item => item.meta.itemId === finalItemId);
            if (itemIndex > -1) {
                allItems[itemIndex] = cleanItemData;
            } else {
                allItems.push(cleanItemData);
            }
        } else {
            allItems.push(cleanItemData);
        }
        localCache.set('allItems', allItems);

        return cleanItemData;
    } catch (error) {
        console.error('Error saving item:', error);
        throw error;
    }
}