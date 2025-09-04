import { fetchAllItems, fetchAllUnits, fetchAllCategories } from '../../utils/data-manager.js';
import { createCardFromTemplate, initCardHelper } from '../../utils/card-helper.js';

let allItems = []; // Global variable to store all fetched items
let currentFilter = 'all'; // Global variable to store the current filter
let allCategoriesMap = {}; // New global variable for categories map


async function populateAllItemsGrid(itemsToDisplay = allItems) {
    const grid = document.getElementById('all-items-grid');
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
        const [unitsResponse, categoriesResponse] = await Promise.all([
            fetchAllUnits(),
            fetchAllCategories(true) // Fetch all categories
        ]);

        const unitsData = {};
        unitsResponse.forEach(unit => {
            unitsData[unit.meta.unitId] = unit;
        });

        await initCardHelper(unitsData); // Initialize card helper with units data

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
