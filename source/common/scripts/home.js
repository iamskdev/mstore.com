import { fetchAllItems, fetchAllUnits, fetchAllCategories, fetchActivePromotion } from '../../utils/data-manager.js';
import { createCardFromTemplate, initCardHelper } from '../../components/cards/card-helper.js';
import { initBannerManager } from '../../utils/banner-mannager.js';
import { isItemSaved } from '../../utils/saved-manager.js';
import { getFilterManager } from '../../utils/filter-helper.js';
import { loadComponent } from '../../main.js';

let allItems = [];
let currentFilter = 'all';
let allCategoriesMap = {};
let currentAdvancedFilters = {};

function _formatSlugForDisplay(slug = '') {
    if (!slug) return '';
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

async function populateAllItemsGrid(itemsToDisplay = allItems) {
    const grid = document.getElementById('all-items-grid');
    if (!grid) return;

    grid.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        grid.appendChild(createCardFromTemplate(null, true));
    }

    try {
        if (allItems.length === 0) {
            const fetchedItems = await fetchAllItems();
            allItems = fetchedItems.filter(item => item.meta.flags.isActive);
            itemsToDisplay = allItems;
        }

        const filteredItems = applyFilters(itemsToDisplay, currentFilter, currentAdvancedFilters);

        grid.innerHTML = '';
        if (filteredItems.length === 0) {
            grid.innerHTML = `<div class="no-items-placeholder">No products or services found.</div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const item of filteredItems) {
            const card = createCardFromTemplate({ ...item, isSaved: isItemSaved(item.meta.itemId) });
            if (card) fragment.appendChild(card);
        }
        grid.appendChild(fragment);
    } catch (error) {
        console.error('Error populating items grid:', error);
        grid.innerHTML = `<div class="no-items-placeholder">Could not load products and services.</div>`;
    }
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
        }
    }

    if (advancedFilters.mainCategory) {
        const mainCategoryId = Object.values(allCategoriesMap).find(cat => cat.meta.slug === advancedFilters.mainCategory)?.meta.categoryId;
        if (mainCategoryId) {
            filtered = filtered.filter(item => item.meta.links.categoryId === mainCategoryId);
        }
    }

    if (advancedFilters.brand) {
        filtered = filtered.filter(item => item.meta.brandId === advancedFilters.brand);
    }
    if (advancedFilters.minPrice) {
        filtered = filtered.filter(item => item.pricing?.sellingPrice >= parseFloat(advancedFilters.minPrice));
    }
    if (advancedFilters.maxPrice) {
        filtered = filtered.filter(item => item.pricing?.sellingPrice <= parseFloat(advancedFilters.maxPrice));
    }

    if (advancedFilters.sort && advancedFilters.sort !== 'relevance') {
        filtered = [...filtered].sort((a, b) => {
            switch (advancedFilters.sort) {
                case 'price-asc': return a.pricing.sellingPrice - b.pricing.sellingPrice;
                case 'price-desc': return b.pricing.sellingPrice - a.pricing.sellingPrice;
                case 'name-asc': return a.info.name.localeCompare(b.info.name);
                case 'name-desc': return b.info.name.localeCompare(a.info.name);
                default: return 0;
            }
        });
    }

    return filtered;
}

export async function init() {
    const container = document.querySelector('.home-view');
    if (!container || container.dataset.initialized === 'true') return;

    const filterManager = getFilterManager();
    filterManager.setLoadComponent(loadComponent);
    filterManager.setActiveView('home');

    try {
        const [unitsResponse, categoriesResponse] = await Promise.all([
            fetchAllUnits(),
            fetchAllCategories(true)
        ]);

        const unitsData = {};
        unitsResponse.forEach(unit => { unitsData[unit.meta.unitId] = unit; });
        categoriesResponse.forEach(cat => { allCategoriesMap[cat.meta.categoryId] = cat; });

        await initCardHelper(unitsData);
        await initBannerManager();

        const filterPlaceholder = document.getElementById('filter-bar-placeholder');
        if (filterPlaceholder) {
            const customTabs = [
                { label: 'All', filter: 'all' },
                { label: 'Products', filter: 'product' },
                { label: 'Services', filter: 'service' }
            ];
            categoriesResponse.forEach(category => {
                if (category.meta.slug && !customTabs.some(tab => tab.filter === category.meta.slug)) {
                    customTabs.push({ label: _formatSlugForDisplay(category.meta.slug), filter: category.meta.slug });
                }
            });
            await filterManager.createFilterBar(filterPlaceholder, { tabs: customTabs });
        }

    } catch (error) {
        console.error('Failed to initialize home page:', error);
        container.innerHTML = '<p class="error-message">Failed to load initial data. Please refresh.</p>';
        return;
    }

    window.addEventListener('filterChanged', (event) => {
        currentFilter = event.detail.filter;
        populateAllItemsGrid();
    });

    window.addEventListener('advancedFilterApplied', (event) => {
        if (event.detail.view === 'home') {
            currentAdvancedFilters = event.detail.filters;
            populateAllItemsGrid();
        }
    });

    populateAllItemsGrid();

    container.addEventListener('click', (e) => {
        const target = e.target.closest('[data-view-target]');
        if (target) {
            const viewId = target.dataset.viewTarget;
            window.dispatchEvent(new CustomEvent('requestViewChange', { detail: { role: 'user', view: viewId } }));
        }
    });

    container.dataset.initialized = 'true';
    console.log('✨ User Home Page Initialized.');
}