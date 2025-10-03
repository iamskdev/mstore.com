import { fetchAllItems, fetchAllUnits, fetchAllCategories, fetchActivePromotion } from '../../utils/data-manager.js';
import { createCardFromTemplate, initCardHelper } from '../../templates/cards/card-helper.js';
import { initBannerManager } from '../../templates/banner.js';
import { isItemSaved} from '../../utils/saved-manager.js';
import { initAddToCartHandler } from '../../utils/cart-manager.js';
import { initializeFilterBarManager } from '../../partials/filter/filter-bar.js'; // Import the global FilterBarManager
import { initializeFilterModalManager } from '../../partials/filter/filter-modal.js'; // Import initializeFilterModalManager

let allItems = [];
let currentFilter = 'all';
let allCategoriesMap = {};

let homeFilterBarManager; // Declare a variable to hold the instance of the global FilterBarManager

async function populateAllItemsGrid(itemsToDisplay = allItems) {
    const grid = document.getElementById('all-items-grid');
    if (!grid) return;

    grid.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        grid.appendChild(createCardFromTemplate(null, true));
    }

    try {
        const fetchedItems = await fetchAllItems();
        console.log('Fetched items:', fetchedItems); // Add this line to debug
        allItems = fetchedItems.filter(item => item.meta.flags.isActive);
        itemsToDisplay = allItems;

        const filteredItems = applyFilters(itemsToDisplay, currentFilter, currentAdvancedFilters);

        grid.innerHTML = '';
        if (filteredItems.length === 0) {
            grid.innerHTML = `<div class="no-items-placeholder">No products or services found.</div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const item of filteredItems) {
            const card = createCardFromTemplate({
                ...item,
                isSaved: isItemSaved(item.meta.itemId)
            });
            if (card) fragment.appendChild(card);
        }
        grid.appendChild(fragment);
        // Force a reflow to ensure the browser renders the newly added elements
        

    } catch (error) {
        grid.innerHTML = `<div class="no-items-placeholder">Could not load all products and services.</div>`;
    }
}

let currentAdvancedFilters = {};

function formatSlugForDisplay(slug = '') {
    if (!slug) return '';
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function applyFilters(items, filterValue, advancedFilters = {}) {
    let filtered = items;

    if (filterValue === 'product') {
        filtered = filtered.filter(item => item.meta.type === 'product');
    } else if (filterValue === 'service') {
        filtered = filtered.filter(item => item.meta.type === 'service');
    } else if (filterValue !== 'all') {
        const categoryIdToFilter = Object.values(allCategoriesMap).find(cat => cat.meta.slug === filterValue)?.meta.categoryId;
        if (categoryIdToFilter) {
            filtered = filtered.filter(item => item.meta.links.categoryId === categoryIdToFilter);
        } else {
            const subcategoryParentId = Object.values(allCategoriesMap).find(cat =>
                cat.subcategories?.some(subcat => subcat.slug === filterValue)
            )?.meta.categoryId;
            if (subcategoryParentId) {
                filtered = filtered.filter(item => item.meta.links.categoryId === subcategoryParentId);
            }
        }
    }

    if (advancedFilters.mainCategory) {
        const mainCategoryId = Object.values(allCategoriesMap).find(cat => cat.meta.slug === advancedFilters.mainCategory)?.meta.categoryId;
        if (mainCategoryId) {
            filtered = filtered.filter(item => item.meta.links.categoryId === mainCategoryId);
        }
    }
    if (advancedFilters.subcategory) {
        const subcategorySlug = advancedFilters.subcategory;
        const parentCategoryId = Object.values(allCategoriesMap).find(cat =>
            cat.subcategories?.some(subcat => subcat.slug === subcategorySlug)
        )?.meta.categoryId;

        if (parentCategoryId) {
            filtered = filtered.filter(item => item.meta.links.categoryId === parentCategoryId);
        }
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

    if (advancedFilters.sort && advancedFilters.sort !== 'relevance') {
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

export async function getGlobalFilterTabs() {
    try {
        if (Object.keys(allCategoriesMap).length === 0) {
            const categoriesResponse = await fetchAllCategories(true);
            categoriesResponse.forEach(cat => {
                allCategoriesMap[cat.meta.categoryId] = cat;
            });
        }

        const allCategories = Object.values(allCategoriesMap);
        const activeCategories = allCategories.filter(cat => cat.meta?.flags?.isActive);
        const addedSlugs = new Set(['all', 'product', 'service']);
        const tabsToRender = [
            { label: 'All', filter: 'all' },
            { label: 'Products', filter: 'product' },
            { label: 'Services', filter: 'service' }
        ];

        activeCategories.forEach(cat => {
            if (cat.meta?.slug && !addedSlugs.has(cat.meta.slug)) {
                tabsToRender.push({ label: formatSlugForDisplay(cat.meta.slug), filter: cat.meta.slug });
                addedSlugs.add(cat.meta.slug);
            }
        });

        const allSubcategories = activeCategories.flatMap(cat => cat.subcategories || []);
        const uniqueSubcats = Array.from(new Map(allSubcategories.map(item => [item.slug, item])).values());
        uniqueSubcats.forEach(subcat => {
            if (subcat.slug && !addedSlugs.has(subcat.slug)) {
                tabsToRender.push({ label: formatSlugForDisplay(subcat.slug), filter: subcat.slug });
                addedSlugs.add(subcat.slug);
            }
        });

        return tabsToRender;
    } catch (error) {
        console.error('Error fetching global filter tabs:', error);
        // Return a default set of tabs to prevent the filter bar from breaking
        return [
            { label: 'All', filter: 'all' },
            { label: 'Products', filter: 'product' },
            { label: 'Services', filter: 'service' }
        ];
    }
}

export async function init() {
    const container = document.querySelector('.home-view');
    if (!container) return;


    // If already initialized, skip the expensive setup steps
    if (container.dataset.initialized === 'true') {
        return;
    }

    try {
        const [unitsResponse, categoriesResponse] = await Promise.all([
            fetchAllUnits(),
            fetchAllCategories(true)
        ]);

        const unitsData = {};
        unitsResponse.forEach(unit => {
            unitsData[unit.meta.unitId] = unit;
        });

        await initCardHelper(unitsData); // <--- Moved this line up
        await populateAllItemsGrid();
        await initBannerManager();

        if (Object.keys(allCategoriesMap).length === 0) {
            categoriesResponse.forEach(cat => {
                allCategoriesMap[cat.meta.categoryId] = cat;
            });
        }

    } catch (error) {
        container.innerHTML = '<p class="error-message">Failed to load initial data. Please refresh.</p>';
        return;
    }

    // Initialize the global FilterBarManager for the home view
    const homeFilterBarPlaceholder = document.getElementById('home-filter-bar');
    if (homeFilterBarPlaceholder) {
        try {
            homeFilterBarManager = initializeFilterBarManager(homeFilterBarPlaceholder, await getGlobalFilterTabs(), 'home');
            homeFilterBarManager.manageVisibility(true); // Make the filter bar visible
        } catch (error) {
            console.error('Error initializing home filter bar:', error);
            // Fallback: Initialize with default tabs if there's an error
            homeFilterBarManager = initializeFilterBarManager(homeFilterBarPlaceholder, [
                { label: 'All', filter: 'all' },,
                { label: 'Products', filter: 'product' },
                { label: 'Services', filter: 'service' }
            ]);
            homeFilterBarManager.manageVisibility(true); // Make the fallback filter bar visible
        }
    }

    // Initialize the filter modal manager
    const homeFilterModalPlaceholder = document.getElementById('home-filter-modal');
    const initModalManager = initializeFilterModalManager();
    const filterModalManager = initModalManager(homeFilterModalPlaceholder);

    window.addEventListener('filterChanged', (event) => {
        if (event.detail.viewId !== 'home') return; // Ignore events from other views
        currentFilter = event.detail.filter;
        populateAllItemsGrid();
    });

    window.addEventListener('advancedFilterApplied', (event) => {
        if (event.detail.viewId !== 'home') return; // Ignore events from other views
        currentAdvancedFilters = event.detail;
        populateAllItemsGrid();
    });

    initAddToCartHandler(allItems); // Pass allItems to the handler
    

    container.addEventListener('click', (e) => {
        const target = e.target.closest('[data-view-target]');
        if (target) {
            const viewId = target.dataset.viewTarget;
            window.dispatchEvent(new CustomEvent('requestViewChange', {
                detail: { role: 'consumer', view: viewId }
            }));
        }
    });

    container.dataset.initialized = 'true';
    console.log('✨ User Home Page Initialized.');
}
