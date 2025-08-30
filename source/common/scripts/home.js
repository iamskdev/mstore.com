import { fetchAllItems, fetchUserById } from '../../utils/data-manager.js';

let cardGridTemplate = ''; // Global variable to store the template
const DEFAULT_PRODUCT_IMAGE = './localstore/images/default-product.jpg';
const DEFAULT_SERVICE_IMAGE = './localstore/images/default-service.jpg';

/**
 * Creates a card element from the card-grid.html template.
 * @param {object} item - The item data (product or service).
 * @param {boolean} isSkeleton - If true, returns a skeleton card.
 * @returns {HTMLElement} The card element.
 */
function createCardFromTemplate(item, isSkeleton = false) {
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'card-wrapper'; // A wrapper for grid display

    if (isSkeleton) {
        cardWrapper.innerHTML = `
            <a class="card skeleton-card">
                <div class="card-image-wrapper skeleton-image"></div>
                <div class="card-info">
                    <div class="name skeleton-text"></div>
                    <div class="price-container skeleton-text short"></div>
                    <div class="stock-status skeleton-text micro"></div>
                    <button class="add-to-cart skeleton-button"></button>
                </div>
            </a>
        `;
        return cardWrapper;
    }

    // Determine image source based on item type
    const imageSrc = item.media?.thumbnail || (item.type === 'product' ? DEFAULT_PRODUCT_IMAGE : DEFAULT_SERVICE_IMAGE);

    // Determine original and current prices
    const originalPrice = item.pricing?.mrp;
    const currentPrice = item.pricing?.sellingPrice;

    // Determine stock status
    let stockStatusText = '';
    let stockStatusClass = '';
    let stockIconClass = '';
    let addToCartDisabled = '';
    let addToCartText = 'Add to Cart';
    let addToCartIconClass = 'fas fa-shopping-cart';

    if (item.inventory?.stockQty > 0) {
        stockStatusText = 'In Stock';
        stockStatusClass = 'in';
        stockIconClass = 'fas fa-check-circle';
    } else {
        stockStatusText = 'Out of Stock';
        stockStatusClass = 'out';
        stockIconClass = 'fas fa-times-circle';
        addToCartDisabled = 'disabled';
        addToCartText = 'Out of Stock';
        addToCartIconClass = 'fas fa-exclamation-circle';
    }

    // Construct the Href for item details
    const itemHref = `item-details.html?itemId=${item.meta.itemId}`;

    let populatedTemplate = cardGridTemplate
        .replace(/{{HREF}}/g, itemHref)
        .replace(/{{IMAGE_SRC}}/g, imageSrc)
        .replace(/{{ITEM_NAME}}/g, item.info.name)
        .replace(/{{CURRENT_PRICE}}/g, currentPrice.toFixed(2))
        .replace(/{{ORIGINAL_PRICE}}/g, originalPrice && originalPrice > currentPrice ? originalPrice.toFixed(2) : '')
        .replace(/{{UNIT}}/g, item.info.attributes?.weight || item.info.attributes?.volume || item.meta.type === 'service' ? '' : 'unit') // Use weight/volume for products, empty for services
        .replace(/{{STOCK_STATUS_CLASS}}/g, stockStatusClass)
        .replace(/{{STOCK_ICON_CLASS}}/g, stockIconClass)
        .replace(/{{STOCK_STATUS_TEXT}}/g, stockStatusText)
        .replace(/{{DESCRIPTION}}/g, item.info.description || '')
        .replace(/{{ADD_TO_CART_DISABLED}}/g, addToCartDisabled)
        .replace(/{{ADD_TO_CART_ICON_CLASS}}/g, addToCartIconClass)
        .replace(/{{ADD_TO_CART_TEXT}}/g, addToCartText)
        .replace(/{{DEFAULT_IMAGE_SRC}}/g, item.type === 'product' ? DEFAULT_PRODUCT_IMAGE : DEFAULT_SERVICE_IMAGE)
        .replace(/{{WISHLIST_ACTIVE_CLASS}}/g, '') // Default empty for now
        .replace(/{{WISHLIST_ICON_CLASS}}/g, 'far fa-heart'); // Default empty for now

    // Handle conditional rendering for ORIGINAL_PRICE
    if (!(originalPrice && originalPrice > currentPrice)) {
        populatedTemplate = populatedTemplate.replace(/{{#if ORIGINAL_PRICE}}[\s\S]*?{{\/if}}/g, '');
    }

    cardWrapper.innerHTML = populatedTemplate;

    // Add event listeners for the card (navigation and add to cart)
    const cardElement = cardWrapper.querySelector('.card');
    if (cardElement) {
        cardElement.addEventListener('click', (e) => {
            // Prevent navigation if add to cart or wishlist button is clicked
            if (e.target.closest('.add-to-cart') || e.target.closest('.wishlist-btn')) {
                e.preventDefault();
                e.stopPropagation();
                // Handle add to cart/wishlist logic here if needed
                if (e.target.closest('.add-to-cart')) {
                    console.log(`Added ${item.info.name} to cart.`);
                    // showToast('Added to cart'); // Example toast
                } else if (e.target.closest('.wishlist-btn')) {
                    console.log(`Toggled wishlist for ${item.info.name}.`);
                }
            } else {
                // Navigate to item details page
                sessionStorage.setItem('selectedItem', JSON.stringify(item));
                window.dispatchEvent(new CustomEvent('navigateToItem', { detail: item }));
            }
        });
    }

    return cardWrapper;
}

/**
 * Populates a grid with data, showing skeletons while loading.
 * @param {string} gridId - The ID of the grid element to populate.
 * @param {string} itemType - 'product' or 'service'.
 * @param {number} limit - The maximum number of items to display.
 */
async function populateGrid(gridId, itemType, limit = 4) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    // 1. Show skeletons
    grid.innerHTML = '';
    for (let i = 0; i < limit; i++) {
        grid.appendChild(createCardFromTemplate(null, true)); // Pass true for skeleton
    }

    try {
        // 2. Fetch data
        const allItems = await fetchAllItems();
        const items = allItems.filter(item => item.meta.type === itemType && item.meta.flags.isActive).slice(0, limit);

        // 3. Clear skeletons and populate real data
        grid.innerHTML = '';
        if (items.length === 0) {
            grid.innerHTML = `<p class="placeholder-text">No ${itemType}s found.</p>`;
            return;
        }
        const fragment = document.createDocumentFragment();
        for (const item of items) {
            const card = createCardFromTemplate(item);
            if (card) fragment.appendChild(card);
        }
        grid.appendChild(fragment);
    } catch (error) {
        console.error(`Failed to load ${itemType}s:`, error);
        grid.innerHTML = `<p class="error-message">Could not load ${itemType}s.</p>`;
    }
}

/**
 * Populates the "All Products & Services" grid with all available items.
 */
async function populateAllItemsGrid() {
    const grid = document.getElementById('all-products-grid');
    const countEl = document.getElementById('all-products-count');
    if (!grid || !countEl) return;

    // Show skeletons while loading
    grid.innerHTML = '';
    for (let i = 0; i < 8; i++) { // Show more skeletons for all items
        grid.appendChild(createCardFromTemplate(null, true)); // Use new function for skeletons
    }
    countEl.textContent = '';

    try {
        const allItems = await fetchAllItems();
        const activeItems = allItems.filter(item => item.meta.flags.isActive);

        grid.innerHTML = ''; // Clear skeletons
        if (activeItems.length === 0) {
            grid.innerHTML = `<div class="no-items-placeholder">No products or services found.</div>`;
            countEl.textContent = '0 items';
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const item of activeItems) {
            const card = createCardFromTemplate(item);
            if (card) fragment.appendChild(card);
        }
        grid.appendChild(fragment);
        countEl.textContent = `${activeItems.length} items`;

    } catch (error) {
        console.error('Failed to load all items:', error);
        grid.innerHTML = `<div class="no-items-placeholder">Could not load all products and services.</div>`;
        countEl.textContent = 'Error loading items';
    }
}


/**
 * Main initialization function for the Home Page.
 */
export async function init() {
    const container = document.querySelector('.home-view'); // Correctly target the main view container
    if (!container || container.dataset.initialized === 'true') return;

    console.log('✨ Initializing User Home Page...');

    // Fetch card-grid.html template only once
    try {
        const response = await fetch('./source/components/cards/card-grid.html');
        if (!response.ok) throw new Error(`Failed to fetch card-grid.html: ${response.statusText}`);
        cardGridTemplate = await response.text();
    } catch (error) {
        console.error('Error loading card-grid.html template:', error);
        // Fallback or error display if template fails to load
        container.innerHTML = '<p class="error-message">Failed to load card template. Please refresh.</p>';
        return;
    }


    // Populate the dynamic sections
    populateAllItemsGrid();

    // Add event listeners for navigation using event delegation
    container.addEventListener('click', (e) => {
        const target = e.target.closest('[data-view-target]');
        if (target) {
            const viewId = target.dataset.viewTarget;
            // Dispatch a global event that main.js will catch to change the view.
            window.dispatchEvent(new CustomEvent('requestViewChange', {
                detail: { role: 'user', view: viewId }
            }));
        }
    });

    container.dataset.initialized = 'true';
    console.log('✨ User Home Page Initialized.');
}