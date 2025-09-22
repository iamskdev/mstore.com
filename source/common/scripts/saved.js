import { createListCard, initCardHelper } from '../../components/cards/card-helper.js';
import { getSavedItems, unsaveItem, updateSavedItemNote, updateSavedItemDate } from '../../utils/saved-manager.js';
import { addItemToCart, isItemInCart } from '../../utils/cart-manager.js';
import { fetchItemById, fetchAllItems, fetchAllCategories } from '../../utils/data-manager.js';
import { initializeFilterModalManager } from '../../components/filter/filter-modal.js';
import { initializeFilterBarManager } from '../../components/filter/filter-bar.js';
import { showToast } from '../../utils/toast.js';

// Local utility to format slug for display
function _formatSlugForDisplay(slug = '') {
    if (!slug) return '';
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Local utility to get category info by ID
async function getCategoryInfoByCategoryId(categoryId) {
    if (!categoryId) return null;
    const allCategories = await fetchAllCategories(true);
    return allCategories.find(cat => cat.meta.categoryId === categoryId) || null;
}

let savedFilterBarManager;
let currentFilter = "all";
let currentSort = "relevance";

// Function to generate filter tabs based on wishlist items
async function getSavedFilterTabs() {
    const savedItems = getSavedItems();
    if (savedItems.length === 0) return [];

    const itemIds = savedItems.map(i => i.itemId);
    const allItems = await fetchAllItems(); // Assuming fetchAllItems gets all items
    const itemsInSaved = allItems.filter(item => itemIds.includes(item.meta.itemId));

    const customTabs = [{ label: 'All', filter: 'all' }];

    const hasProducts = itemsInSaved.some(item => item.meta.type === 'product');
    const hasServices = itemsInSaved.some(item => item.meta.type === 'service');

    if (hasProducts) {
        customTabs.push({ label: 'Products', filter: 'product' });
    }

    if (hasServices) {
        customTabs.push({ label: 'Services', filter: 'service' });
    }

    // Only add category-specific tabs if there are items in saved
    if (itemsInSaved.length > 0) {
        const categoryIdsInSaved = new Set(itemsInSaved.map(item => item.meta.links.categoryId));
        for (const categoryId of categoryIdsInSaved) {
            const category = await getCategoryInfoByCategoryId(categoryId);
            if (category && !customTabs.some(tab => tab.filter === category.meta.slug)) {
                const hasItemsInThisCategory = itemsInSaved.some(item => item.meta.links.categoryId === categoryId);
                if (hasItemsInThisCategory) {
                    customTabs.push({ label: _formatSlugForDisplay(category.meta.slug), filter: category.meta.slug });
                }
            }
        }
    }
    
    return customTabs;
}

// Helper: format date
function formatDate(value) {
    if (!value) return 'Select Date';
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
}

const savedViewConfig = {
    fields: [
        { key: 'info.name', selector: '.card-title', visible: true },
        { key: 'media.thumbnail', selector: '.card-image', type: 'image', default: './localstore/images/default-product.jpg' },
        { key: 'pricing.sellingPrice', selector: '.selling-price', visible: true, formatter: (price) => `₹${price.toFixed(2)}` },
        { key: 'pricing.mrp', selector: '.max-price', visible: (item) => item.pricing.mrp > item.pricing.sellingPrice, formatter: (mrp) => `₹${mrp.toFixed(2)}` },
        { key: 'analytics.rating', selector: '.stars', visible: true },
        { key: 'pricing.costPrice', selector: '.cost-price', visible: false }, // Explicitly hide cost-price
        { key: 'stock.status', selector: '.stock-status', visible: true },
        {
            key: 'note',
            selector: '.card-note',
            visible: true,
            formatter: (note) => {
                const displayText = note || 'Click to add a note';
                return `<span class="note-label clickable">Note:</span> <span class="note-content">${displayText}</span>`;
            }
        },
        { 
            key: 'pricing.mrp',
            selector: '.card-discount', 
            visible: (item) => item.pricing.mrp > item.pricing.sellingPrice,
            formatter: (mrp, item) => {
                const discount = ((mrp - item.pricing.sellingPrice) / mrp) * 100;
                return `${discount.toFixed(0)}% off`;
            }
        },
    ],
    buttons: [
        {
            label: (item) => item.selectedDate ? formatDate(item.selectedDate) : 'Select Date',
            action: 'SELECT_SERVICE_DATE',
            class: 'btn-secondary select-date-btn', // Add a class to easily identify the button
            visible: true
        },
        {
            label: (item) => isItemInCart(item.meta.itemId) ? 'Added to Cart' : 'Add to Cart',
            action: 'ADD_TO_CART',
            class: 'btn-primary',
            visible: true,
            
        },
        { label: 'Share Me', action: 'SHARE_ITEM', class: 'btn-secondary', visible: true },
        { label: 'Remove', action: 'REMOVE_ITEM', class: 'btn-danger', visible: true }
    ],
    actionHandlers: {
        'SELECT_SERVICE_DATE': (item, targetButton) => {
            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.style.position = 'absolute';
            dateInput.style.left = '-9999px'; // Hide it off-screen
            dateInput.style.top = '-9999px';
            dateInput.value = item.selectedDate || ''; // Set initial value if exists

            document.body.appendChild(dateInput);

            dateInput.onchange = (event) => {
                const selectedDate = event.target.value;
                if (selectedDate) {
                    updateSavedItemDate(item.meta.itemId, selectedDate);
                    renderSavedItems(); // Re-render to update the button label
                }
                document.body.removeChild(dateInput); // Clean up the hidden input
            };

            dateInput.click(); // Programmatically click to open date picker
        },
        'ADD_TO_CART': (item) => {
            const itemId = item.meta.itemId;
            const itemAlreadyInCart = isItemInCart(itemId);

            if (itemAlreadyInCart) {
                showToast('info', 'Item already in cart list');
                return;
            }

            addItemToCart(item, 1, item.note); // Pass the item and its note
            // No need to call renderSavedItems() here, cartItemsChanged listener will handle UI update
        },
        'SHARE_ITEM': (item) => {
            if (navigator.share) {
                navigator.share({
                    title: item.info.name,
                    text: `Check out this item: ${item.info.name}`,
                    url: window.location.href,
                }).catch(console.error);
            } else {
                alert('Web Share API not supported.');
            }
        },
        'REMOVE_ITEM': (item) => {
            unsaveItem(item.meta.itemId);
            // No need to call renderSavedItems() here, the event listener will handle it
        },
    }
};

async function renderSavedItems() {
    const savedItemsContainer = document.getElementById('wishlist-items-container');
    const emptyState = document.getElementById('empty-wishlist-view');

    if (!savedItemsContainer || !emptyState) {
        return;
    }

    const savedItemsData = getSavedItems();
    savedItemsContainer.innerHTML = '';

    if (savedItemsData.length === 0) {
        emptyState.classList.remove('hidden');
        savedItemsContainer.classList.add('hidden');
        if (savedFilterBarManager) savedFilterBarManager.manageVisibility(false);
        return;
    }

    emptyState.classList.add('hidden');
    savedItemsContainer.classList.remove('hidden');
    if (savedFilterBarManager) savedFilterBarManager.manageVisibility(true);

    let itemsToRender = [];
    for (const savedItem of savedItemsData) {
        const item = await fetchItemById(savedItem.itemId);
        if (item) {
            itemsToRender.push({ ...item, note: savedItem.note, cart: { selectedDate: savedItem.selectedDate } });
        }
    }

    // Apply filtering
    let filteredItems = itemsToRender;
    if (currentFilter !== 'all') {
        if (currentFilter === 'product' || currentFilter === 'service') {
            filteredItems = itemsToRender.filter(item => item.meta.type === currentFilter);
        } else { // Assume it's a category slug
            const allCategories = await fetchAllCategories(true);
            const categoryToFilter = allCategories.find(cat => cat.meta.slug === currentFilter);
            if (categoryToFilter) {
                filteredItems = itemsToRender.filter(item => item.meta.links.categoryId === categoryToFilter.meta.categoryId);
            } else {
                filteredItems = []; // No items if category not found
            }
        }
    }

    // Apply sorting
    if (currentSort && currentSort !== 'relevance') {
        filteredItems.sort((a, b) => {
            switch (currentSort) {
                case 'price-asc': return a.pricing.sellingPrice - b.pricing.sellingPrice;
                case 'price-desc': return b.pricing.sellingPrice - a.pricing.sellingPrice;
                case 'rating-desc': return (b.analytics?.rating || 0) - (a.analytics?.rating || 0);
                default: return 0;
            }
        });
    }

    // Clear existing cards ONLY AFTER all async operations and filtering/sorting are done
    savedItemsContainer.innerHTML = '';

    for (const item of filteredItems) {
        const cardElement = createListCard(item, savedViewConfig);
        if (cardElement) {
            savedItemsContainer.appendChild(cardElement);
            const noteElement = cardElement.querySelector('.note-label');
            if (noteElement) {
                noteElement.addEventListener('click', () => {
                    const newNote = prompt('Edit your note for this item:', item.note || '');
                    if (newNote !== null) {
                        updateSavedItemNote(item.meta.itemId, newNote);
                        // The 'savedItemsChanged' event will trigger a re-render to show the updated note
                    }
                });
            }
        } else {
        }
    }
}

let renderTimeout;
/**
 * Debounces the renderSavedItems function to prevent multiple rapid re-renders.
 */
function requestRenderSavedItems() {
    if (renderTimeout) {
        clearTimeout(renderTimeout);
    }
    renderTimeout = setTimeout(() => {
        renderSavedItems();
    }, 10); // Small delay to batch rapid calls
}

let isSavedInitialized = false;
export async function init() {
    if (isSavedInitialized) {
        requestRenderSavedItems();
        return;
    }

    await initCardHelper();

    const startShoppingBtn = document.getElementById('start-shopping-btn');
    if(startShoppingBtn) {
        startShoppingBtn.addEventListener('click', () => {
            window.viewManager.switchView('guest', 'home');
        });
    }

    const filterBarPlaceholder = document.getElementById('wishlist-filter-bar');
    savedFilterBarManager = initializeFilterBarManager(filterBarPlaceholder, await getSavedFilterTabs(), 'saved');
    savedFilterBarManager.manageVisibility(getSavedItems().length > 0);

    const filterModalPlaceholder = document.getElementById('wishlist-filter-modal');
    const initModalManager = initializeFilterModalManager();
    const savedFilterModalManager = initModalManager(filterModalPlaceholder);

    requestRenderSavedItems();

    window.addEventListener('savedItemsChanged', async (event) => {
        const { type, itemId } = event.detail;
        const savedItemsContainer = document.getElementById('wishlist-items-container');
        const emptyState = document.getElementById('empty-wishlist-view');

        // Update filter bar regardless of change type, as available filters might change
        const filterBarPlaceholder = document.getElementById('wishlist-filter-bar');
        savedFilterBarManager = initializeFilterBarManager(filterBarPlaceholder, await getSavedFilterTabs(), 'saved');
        savedFilterBarManager.manageVisibility(getSavedItems().length > 0);

        if (type === 'remove') {
            const cardToRemove = savedItemsContainer.querySelector(`.card-body[data-item-id="${itemId}"]`);
            if (cardToRemove) {
                cardToRemove.remove();
            } else {
            }
            // Check if container is empty after removal
            if (getSavedItems().length === 0) {
                emptyState.classList.remove('hidden');
                savedItemsContainer.classList.add('hidden');
            }
        } else if (type === 'add') {
            const item = await fetchItemById(itemId);
            if (item) {
                const savedItem = getSavedItems().find(s => s.itemId === itemId);
                const itemToRender = { ...item, note: savedItem?.note || '', cart: { selectedDate: savedItem?.selectedDate } };
                const newCard = createListCard(itemToRender, savedViewConfig);
                if (newCard) {
                    savedItemsContainer.appendChild(newCard);
                    // Re-attach event listeners for the new card's note
                    const noteElement = newCard.querySelector('.note-label');
                    if (noteElement) {
                        noteElement.addEventListener('click', () => {
                            const newNote = prompt('Edit your note for this item:', itemToRender.note || '');
                            if (newNote !== null) {
                                updateSavedItemNote(itemToRender.meta.itemId, newNote);
                            }
                        });
                    }
                    emptyState.classList.add('hidden');
                    savedItemsContainer.classList.remove('hidden');
                }
            }
        } else if (type === 'update') { // For note or date updates
            const cardToUpdate = savedItemsContainer.querySelector(`.card-body[data-item-id="${itemId}"]`);
            if (cardToUpdate) {
                const item = await fetchItemById(itemId);
                if (item) {
                    const savedItem = getSavedItems().find(s => s.itemId === itemId);
                    const itemToRender = { ...item, note: savedItem?.note || '', cart: { selectedDate: savedItem?.selectedDate } };
                    const updatedCard = createListCard(itemToRender, savedViewConfig);
                    if (updatedCard) {
                        cardToUpdate.replaceWith(updatedCard);
                        // Re-attach event listeners for the updated card's note
                        const noteElement = updatedCard.querySelector('.note-label');
                        if (noteElement) {
                            noteElement.addEventListener('click', () => {
                                const newNote = prompt('Edit your note for this item:', itemToRender.note || '');
                                if (newNote !== null) {
                                    updateSavedItemNote(itemToRender.meta.itemId, newNote);
                                }
                            });
                        }
                    }
                }
            }
        }
        // After any change, re-evaluate empty state and filter bar visibility
        if (getSavedItems().length === 0) {
            emptyState.classList.remove('hidden');
            savedItemsContainer.classList.add('hidden');
            savedFilterBarManager.manageVisibility(false);
        } else {
            emptyState.classList.add('hidden');
            savedItemsContainer.classList.remove('hidden');
            savedFilterBarManager.manageVisibility(true);
        }
    });

    window.addEventListener('viewChanged', (event) => {
        if (event.detail.view === 'saved') {
            requestRenderSavedItems();
        }
    });

    window.addEventListener('filterChanged', (event) => {
        if (event.detail.viewId !== 'saved') return;
        currentFilter = event.detail.filter;
        requestRenderSavedItems();
    });

    window.addEventListener('advancedFilterApplied', (event) => {
        if (event.detail.viewId !== 'saved') return;
        currentSort = event.detail.sort;
        requestRenderSavedItems();
    });

    window.addEventListener('cartItemsChanged', async (event) => {
        const { type, item, itemId } = event.detail; // item for 'add'/'update', itemId for 'remove'

        let targetItemId = itemId || item?.meta?.itemId; // Get itemId from either

        if (targetItemId) {
            const savedItemsContainer = document.getElementById('wishlist-items-container');
            // Find the card element by its data-item-id
            const cardToUpdate = savedItemsContainer?.querySelector(`.card-body[data-item-id="${targetItemId}"]`);

            if (cardToUpdate) {
                // Fetch the latest item data to ensure accurate re-rendering
                const fullItem = await fetchItemById(targetItemId);
                if (fullItem) {
                    const savedItem = getSavedItems().find(s => s.itemId === targetItemId);
                    // Combine item data with saved-specific properties like note and selectedDate
                    const itemToRender = { ...fullItem, note: savedItem?.note || '', cart: { selectedDate: savedItem?.selectedDate } };
                    
                    // Create a new card element with the updated data
                    const updatedCard = createListCard(itemToRender, savedViewConfig);
                    
                    if (updatedCard) {
                        // Replace the old card with the new one
                        cardToUpdate.replaceWith(updatedCard);
                        
                        // Re-attach event listeners for the updated card's note
                        const noteElement = updatedCard.querySelector('.note-label');
                        if (noteElement) {
                            noteElement.addEventListener('click', () => {
                                const newNote = prompt('Edit your note for this item:', itemToRender.note || '');
                                if (newNote !== null) {
                                    updateSavedItemNote(itemToRender.meta.itemId, newNote);
                                }
                            });
                        }
                    }
                }
            }
        }
    });

    isSavedInitialized = true;
}


