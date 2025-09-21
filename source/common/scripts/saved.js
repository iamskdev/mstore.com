import { createListCard, initCardHelper } from '../../components/cards/card-helper.js';
import { getSavedItems, unsaveItem, updateSavedItemNote, updateSavedItemDate } from '../../utils/saved-manager.js';
import { addItemToCart, isItemInCart } from '../../utils/cart-manager.js';
import { fetchItemById, fetchAllItems, fetchAllCategories } from '../../utils/data-manager.js';
import { initializeFilterModalManager } from '../../components/filter/filter-modal.js';
import { initializeFilterBarManager } from '../../components/filter/filter-bar.js';

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

// Function to generate filter tabs based on saved items
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
                const displayText = note || 'No note added.';
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
            disabled: (item) => isItemInCart(item.meta.itemId)
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
            addItemToCart(item);
            renderSavedItems(); // Re-render to update the button state
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
    console.log('renderSavedItems called.');
    const savedItemsContainer = document.getElementById('saved-items-container');
    const emptyState = document.getElementById('empty-saved-view');

    if (!savedItemsContainer || !emptyState) {
        console.error('renderSavedItems: Missing savedItemsContainer or emptyState elements.');
        return;
    }

    const savedItemsData = getSavedItems();
    console.log('Saved Items Data:', savedItemsData);
    savedItemsContainer.innerHTML = '';

    if (savedItemsData.length === 0) {
        console.log('No saved items. Showing empty state.');
        emptyState.classList.remove('hidden');
        savedItemsContainer.classList.add('hidden');
        if (savedFilterBarManager) savedFilterBarManager.manageVisibility(false);
        return;
    }

    console.log('Saved items found. Hiding empty state.');
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
    console.log('Items to render after fetching details:', itemsToRender);

    // Apply filtering
    let filteredItems = itemsToRender;
    if (currentFilter !== 'all') {
        filteredItems = itemsToRender.filter(item => item.meta.type === currentFilter);
    }
    console.log('Filtered items:', filteredItems);

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
        console.log('Creating card for item:', item.meta.itemId);
        const cardElement = createListCard(item, savedViewConfig);
        if (cardElement) {
            console.log('Card element created:', cardElement);
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
            console.warn('createListCard returned null for item:', item.meta.itemId);
        }
    }
}

let isSavedInitialized = false;
export async function init() {
    console.log('Saved view init called.');
    if (isSavedInitialized) {
        console.log('Saved view already initialized. Re-rendering.');
        renderSavedItems();
        return;
    }

    await initCardHelper();

    const startShoppingBtn = document.getElementById('start-shopping-btn-saved');
    if(startShoppingBtn) {
        startShoppingBtn.addEventListener('click', () => {
            window.viewManager.switchView('guest', 'home');
        });
    }

    const filterBarPlaceholder = document.getElementById('saved-filter-bar');
    savedFilterBarManager = initializeFilterBarManager(filterBarPlaceholder, await getSavedFilterTabs(), 'saved');
    savedFilterBarManager.manageVisibility(getSavedItems().length > 0);

    const filterModalPlaceholder = document.getElementById('saved-filter-modal');
    console.log('Before initializeFilterModalManager call.');
    const initModalManager = initializeFilterModalManager();
    const savedFilterModalManager = initModalManager(filterModalPlaceholder);
    console.log('After initializeFilterModalManager call. savedFilterModalManager:', savedFilterModalManager);

    renderSavedItems();

    window.addEventListener('savedItemsChanged', async (event) => {
        console.log('savedItemsChanged event received. Performing targeted update.', event.detail);
        const { type, itemId } = event.detail;
        console.log('Event type:', type, 'Item ID:', itemId); // Added log
        const savedItemsContainer = document.getElementById('saved-items-container');
        const emptyState = document.getElementById('empty-saved-view');

        // Update filter bar regardless of change type, as available filters might change
        const filterBarPlaceholder = document.getElementById('saved-filter-bar');
        savedFilterBarManager = initializeFilterBarManager(filterBarPlaceholder, await getSavedFilterTabs(), 'saved');
        savedFilterBarManager.manageVisibility(getSavedItems().length > 0);

        if (type === 'remove') {
            console.log('Attempting to remove card for itemId:', itemId); // Added log
            const cardToRemove = savedItemsContainer.querySelector(`.card-body[data-item-id="${itemId}"]`);
            if (cardToRemove) {
                console.log('Card found, attempting to remove:', cardToRemove); // Added log
                cardToRemove.remove();
                console.log(`Removed card for item ${itemId}.`);
            } else {
                console.log('Card not found for itemId:', itemId); // Added log
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
                    console.log(`Added card for item ${itemId}.`);
                    emptyState.classList.add('hidden');
                    savedItemsContainer.classList.remove('hidden');
                }
            }
        } else if (type === 'update') { // For note or date updates
            const cardToUpdate = savedItemsContainer.querySelector(`.card[data-item-id="${itemId}"]`);
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
                        console.log(`Updated card for item ${itemId}.`);
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
            console.log('viewChanged to saved. Re-rendering.');
            renderSavedItems();
        }
    });

    window.addEventListener('filterChanged', (event) => {
        if (event.detail.viewId !== 'saved') return;
        console.log('filterChanged event received:', event.detail.filter);
        currentFilter = event.detail.filter;
        renderSavedItems();
    });

    window.addEventListener('advancedFilterApplied', (event) => {
        if (event.detail.viewId !== 'saved') return;
        console.log('advancedFilterApplied event received:', event.detail.sort);
        currentSort = event.detail.sort;
        renderSavedItems();
    });

    isSavedInitialized = true;
}


