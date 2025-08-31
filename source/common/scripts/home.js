import { fetchAllItems, fetchAllUnits, fetchAllCategories } from '../../utils/data-manager.js';

let cardGridTemplate = ''; // Global variable to store the template
let unitsData = {}; // Global variable to store units data
let allItems = []; // Global variable to store all fetched items
let currentFilter = 'all'; // Global variable to store the current filter
let allCategoriesMap = {}; // New global variable for categories map

const DEFAULT_PRODUCT_IMAGE = './localstore/images/default-product.jpg';
const DEFAULT_SERVICE_IMAGE = './localstore/images/default-service.jpg';

/**
 * A simple template engine to replace placeholders and handle conditionals.
 * @param {string} template - The HTML template string.
 * @param {object} data - The data to populate the template with.
 * @returns {string} The populated HTML string.
 */
function renderTemplate(template, data) {
    let output = template;

    // Handle conditional blocks like {{#if condition}}...{{/if}}
    output = output.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, body) => {
        return data[condition] ? body : '';
    });

    // Replace all other placeholders
    for (const key in data) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        output = output.replace(regex, data[key]);
    }

    return output;
}


/**
 * Creates a card element from the card-grid.html template.
 * @param {object} item - The item data (product or service).
 * @param {boolean} isSkeleton - If true, returns a skeleton card.
 * @returns {HTMLElement} The card element.
 */
function createCardFromTemplate(item, isSkeleton = false) {
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'card-wrapper';

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

    const originalPrice = item.pricing?.mrp;
    const currentPrice = item.pricing?.sellingPrice;

    // Find the unit symbol
    const unitInfo = unitsData[item.meta.unitId];
    let unitSymbol = '';
    if (unitInfo) {
        const attribute = Object.keys(item.info.attributes).find(key => unitInfo.subunits.find(s => s.code === item.info.attributes[key]));
        if (attribute) {
            const subunit = unitInfo.subunits.find(s => s.code === item.info.attributes[attribute]);
            if (subunit) {
                unitSymbol = subunit.symbol;
            }
        } else {
            // Fallback for units like 'pc' which may not have a corresponding attribute
            const defaultSubunit = unitInfo.subunits.find(s => s.isBaseUnit);
            if (defaultSubunit) {
                unitSymbol = defaultSubunit.symbol;
            }
        }
    }

    let stockStatusText, stockStatusClass, stockIconClass, addToCartDisabled, addToCartText, addToCartIconClass;

    if (item.meta.type === 'service') {
        if (item.meta.flags.isActive) {
            stockStatusText = 'Available';
            stockStatusClass = 'in';
            stockIconClass = 'fas fa-check-circle';
            addToCartText = 'Add to Cart';
            addToCartIconClass = 'fas fa-shopping-cart';
            addToCartDisabled = '';
        } else {
            stockStatusText = 'Unavailable';
            stockStatusClass = 'out';
            stockIconClass = 'fas fa-times-circle';
            addToCartText = 'Unavailable';
            addToCartIconClass = 'fas fa-exclamation-circle';
            addToCartDisabled = 'disabled';
        }
    } else {
        if (item.inventory?.stockQty > 0) {
            stockStatusText = 'In Stock';
            stockStatusClass = 'in';
            stockIconClass = 'fas fa-check-circle';
            addToCartText = 'Add to Cart';
            addToCartIconClass = 'fas fa-shopping-cart';
            addToCartDisabled = '';
        } else {
            stockStatusText = 'Out of Stock';
            stockStatusClass = 'out';
            stockIconClass = 'fas fa-times-circle';
            addToCartText = 'Out of Stock';
            addToCartIconClass = 'fas fa-exclamation-circle';
            addToCartDisabled = 'disabled';
        }
    }
    
    const templateData = {
        HREF: `item-details.html?itemId=${item.meta.itemId}`,
        IMAGE_SRC: item.media?.thumbnail || (item.type === 'product' ? DEFAULT_PRODUCT_IMAGE : DEFAULT_SERVICE_IMAGE),
        ITEM_NAME: item.info.name,
        CURRENT_PRICE: currentPrice.toFixed(2),
        ORIGINAL_PRICE: originalPrice && originalPrice > currentPrice ? originalPrice.toFixed(2) : null,
        UNIT: (item.info.attributes?.weight || item.info.attributes?.volume) ? `per ${item.info.attributes.weight || item.info.attributes.volume}` : unitSymbol,
        STOCK_STATUS_CLASS: stockStatusClass,
        STOCK_ICON_CLASS: stockIconClass,
        STOCK_STATUS_TEXT: stockStatusText,
        DESCRIPTION: item.info.description || '',
        ADD_TO_CART_DISABLED: addToCartDisabled,
        ADD_TO_CART_ICON_CLASS: addToCartIconClass,
        ADD_TO_CART_TEXT: addToCartText,
        DEFAULT_IMAGE_SRC: item.type === 'product' ? DEFAULT_PRODUCT_IMAGE : DEFAULT_SERVICE_IMAGE,
        WISHLIST_ACTIVE_CLASS: '',
        WISHLIST_ICON_CLASS: 'far fa-heart',
    };

    cardWrapper.innerHTML = renderTemplate(cardGridTemplate, templateData);

    const cardElement = cardWrapper.querySelector('.card');
    if (cardElement) {
        cardElement.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart') || e.target.closest('.wishlist-btn')) {
                e.preventDefault();
                e.stopPropagation();
                if (e.target.closest('.add-to-cart')) {
                } else if (e.target.closest('.wishlist-btn')) {
                }
            } else {
                sessionStorage.setItem('selectedItem', JSON.stringify(item));
                window.dispatchEvent(new CustomEvent('navigateToItem', { detail: item }));
            }
        });
    }

    return cardWrapper;
}


async function populateAllItemsGrid(itemsToDisplay = allItems) {
    const grid = document.getElementById('all-products-grid');
    if (!grid) return; // Modified check

    grid.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        grid.appendChild(createCardFromTemplate(null, true));
    }
    // Removed countEl.textContent = '';

    try {
        // If allItems is empty, fetch them. This ensures data is fetched only once.
        if (allItems.length === 0) {
            const fetchedItems = await fetchAllItems();
            allItems = fetchedItems.filter(item => item.meta.flags.isActive);
            itemsToDisplay = allItems; // If fetching for the first time, display all active items
        }

        const filteredItems = applyFilters(itemsToDisplay, currentFilter, currentAdvancedFilters); // Apply current filter

        grid.innerHTML = '';
        if (filteredItems.length === 0) {
            grid.innerHTML = `<div class="no-items-placeholder">No products or services found.</div>`;
            // Removed countEl.textContent = '0 items';
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const item of filteredItems) { // Use filteredItems here
            const card = createCardFromTemplate(item);
            if (card) fragment.appendChild(card);
        }
        grid.appendChild(fragment);
        // Removed countEl.textContent = `${filteredItems.length} items`;

    } catch (error) {
        grid.innerHTML = `<div class="no-items-placeholder">Could not load all products and services.</div>`;
        // Removed countEl.textContent = 'Error loading items';
    }
}

let currentAdvancedFilters = {}; // New global variable for advanced filters

/**
 * Applies filters to the given array of items.
 * @param {Array} items - The array of items to filter.
 * @param {string} filterValue - The filter value (e.g., category slug, 'all', 'product', 'service').
 * @param {object} advancedFilters - Optional: Object containing advanced filter criteria.
 * @returns {Array} The filtered array of items.
 */
function applyFilters(items, filterValue, advancedFilters = {}) {
    let filtered = items;

    // Apply basic filter (from horizontal bar)
    if (filterValue === 'product') {
        filtered = filtered.filter(item => item.meta.type === 'product');
    } else if (filterValue === 'service') {
        filtered = filtered.filter(item => item.meta.type === 'service');
    } else if (filterValue !== 'all') {
        // Get the category ID from the slug
        const categoryIdToFilter = Object.values(allCategoriesMap).find(cat => cat.meta.slug === filterValue)?.meta.categoryId;
        if (categoryIdToFilter) {
            filtered = filtered.filter(item => item.meta.links.categoryId === categoryIdToFilter);
        } else {
            // If filterValue is a subcategory slug, find its parent category ID
            const subcategoryParentId = Object.values(allCategoriesMap).find(cat =>
                cat.subcategories?.some(subcat => subcat.slug === filterValue)
            )?.meta.categoryId;
            if (subcategoryParentId) {
                filtered = filtered.filter(item => item.meta.links.categoryId === subcategoryParentId);
            }
        }
    }

    // Apply advanced filters
    if (advancedFilters.mainCategory) {
        const mainCategoryId = Object.values(allCategoriesMap).find(cat => cat.meta.slug === advancedFilters.mainCategory)?.meta.categoryId;
        if (mainCategoryId) {
            filtered = filtered.filter(item => item.meta.links.categoryId === mainCategoryId);
        }
    }
    if (advancedFilters.subcategory) {
        const subcategorySlug = advancedFilters.subcategory;
        // Find the parent category ID for the selected subcategory
        const parentCategoryId = Object.values(allCategoriesMap).find(cat =>
            cat.subcategories?.some(subcat => subcat.slug === subcategorySlug)
        )?.meta.categoryId;

        if (parentCategoryId) {
            filtered = filtered.filter(item => item.meta.links.categoryId === parentCategoryId);
        }
        // Note: Filtering by subcategory slug directly on item.subcategories is not possible
        // because items only have categoryId, not subcategory slugs.
        // The current approach filters by the parent category of the subcategory.
        // If more granular subcategory filtering is needed, items.json would need to store subcategory IDs.
    }
    if (advancedFilters.brand) {
        filtered = filtered.filter(item =>
            item.meta.brandId === advancedFilters.brand
        );
    }
    if (advancedFilters.minPrice) {
        const minPrice = parseFloat(advancedFilters.minPrice);
        filtered = filtered.filter(item =>
            item.pricing?.sellingPrice >= minPrice
        );
    }
    if (advancedFilters.maxPrice) {
        const maxPrice = parseFloat(advancedFilters.maxPrice);
        filtered = filtered.filter(item =>
            item.pricing?.sellingPrice <= maxPrice
        );
    }

    // Apply sorting (if 'sort' is present and not 'relevance')
    if (advancedFilters.sort && advancedFilters.sort !== 'relevance') {
        // Create a shallow copy before sorting to ensure re-render if needed
        filtered = [...filtered].sort((a, b) => {
            if (advancedFilters.sort === 'price-asc') {
                return a.pricing.sellingPrice - b.pricing.sellingPrice;
            } else if (advancedFilters.sort === 'price-desc') {
                return b.pricing.sellingPrice - a.pricing.sellingPrice;
            } else if (advancedFilters.sort === 'name-asc') {
                return a.info.name.localeCompare(b.info.name);
            } else if (advancedFilters.sort === 'name-desc') {
                return b.info.name.localeCompare(a.info.name);
            }
            return 0;
        });
    }

    return filtered;
}

export async function init() {
    const container = document.querySelector('.home-view');
    if (!container || container.dataset.initialized === 'true') return;


    try {
        const [templateResponse, unitsResponse, categoriesResponse] = await Promise.all([
            fetch('./source/components/cards/card-grid.html'),
            fetchAllUnits(),
            fetchAllCategories(true) // Fetch all categories
        ]);

        if (!templateResponse.ok) throw new Error(`Failed to fetch card-grid.html: ${templateResponse.statusText}`);
        cardGridTemplate = await templateResponse.text();

        unitsResponse.forEach(unit => {
            unitsData[unit.meta.unitId] = unit;
        });

        // Populate allCategoriesMap
        categoriesResponse.forEach(cat => {
            allCategoriesMap[cat.meta.categoryId] = cat;
        });

    } catch (error) {
        container.innerHTML = '<p class="error-message">Failed to load initial data. Please refresh.</p>';
        return;
    }

    // Listen for filter changes from the filter bar
    window.addEventListener('filterChanged', (event) => {
        currentFilter = event.detail.filter;
        
        populateAllItemsGrid(); // Re-populate grid with new filter
    });

    // Listen for advanced filter changes
    window.addEventListener('advancedFilterApplied', (event) => {
        currentAdvancedFilters = event.detail; // Store the advanced filters
        populateAllItemsGrid(); // Re-populate grid with new advanced filters
    });

    populateAllItemsGrid();

    container.addEventListener('click', (e) => {
        const target = e.target.closest('[data-view-target]');
        if (target) {
            const viewId = target.dataset.viewTarget;
            window.dispatchEvent(new CustomEvent('requestViewChange', {
                detail: { role: 'user', view: viewId }
            }));
        }
    });

    container.dataset.initialized = 'true';
    console.log('✨ User Home Page Initialized.');
}
