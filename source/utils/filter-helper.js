/**
 * @file Centralized helper for managing the filter bar component.
 * This module encapsulates the logic for loading, displaying, and interacting with the filter bar and advanced panel.
 * It uses a singleton pattern to ensure a single state for the active view and filter settings.
 */

import { fetchAllCategories, fetchAllBrands } from './data-manager.js';
import { showToast } from './toast.js';

const PLACEHOLDER_ID = 'filter-bar-placeholder';
const COMPONENT_PATH = './source/components/filter-bar.html';

class FilterManager {
    constructor() {
        this._placeholder = null;
        this.isLoaded = false;
        this.isInitialized = false;
        this.modalContainer = null;
        this.isModalLoaded = false;
        this.isAdvancedPanelInitialized = false;
        this.allCategoriesData = [];
        this.loadComponent = null; // Will be set by the initializer
        this.tabConfig = null;
        this.activeView = null; // To track the current view ('home', 'cart', etc.)
    }

    // Public getter for the placeholder element
    get placeholder() {
        if (!this._placeholder) {
            this._placeholder = document.getElementById(PLACEHOLDER_ID);
        }
        return this._placeholder;
    }

    /**
     * Sets the function used to load components.
     * @param {function} loadComponentFn - The function to load HTML components.
     */
    setLoadComponent(loadComponentFn) {
        if (!this.loadComponent) {
            this.loadComponent = loadComponentFn;
        }
    }

    /**
     * Sets the currently active view.
     * @param {string} viewName - The name of the active view (e.g., 'home', 'cart').
     */
    setActiveView(viewName) {
        this.activeView = viewName;
        console.log(`FilterManager: Active view set to -> ${viewName}`);
    }

    /**
     * Creates and initializes a filter bar in a given placeholder.
     * @param {HTMLElement} placeholder - The DOM element where the filter bar will be rendered.
     * @param {object} viewConfig - Configuration for the filter bar.
     * @param {Array<object>} [viewConfig.tabs] - Optional. The configuration for the filter tabs.
     */
    async createFilterBar(placeholder, viewConfig = {}) {
        if (!placeholder || !this.loadComponent) {
            console.error('createFilterBar: Placeholder and loadComponent function are required.');
            return;
        }

        this.tabConfig = viewConfig.tabs || null;

        // Load the filter bar component's HTML
        await this.loadComponent(placeholder, COMPONENT_PATH);
        
        // Initialize the logic for the now-embedded filter bar
        await this.initializeEmbeddedFilterBar(placeholder);
    }

    _formatSlugForDisplay(slug = '') {
        if (!slug) return '';
        return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    async _initializeComponentLogic() {
        const container = this.placeholder.querySelector('#filter-bar');
        if (!container) {
            console.error("FilterManager: Could not find #filter-bar inside the loaded component.");
            return;
        }
        const skeletons = container.querySelectorAll('.tab-skeleton');

        container.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        });

        container.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.filter-bar-tab');
            if (!clickedTab) return;

            if (clickedTab.classList.contains('filter-icon-btn')) {
                this._toggleAdvancedPanel(true);
                return;
            }

            if (clickedTab.classList.contains('active')) return;

            container.querySelectorAll('.filter-bar-tab.active').forEach(tab => tab.classList.remove('active'));
            clickedTab.classList.add('active');

            const filterValue = clickedTab.dataset.filter;
            window.dispatchEvent(new CustomEvent('filterChanged', { detail: { filter: filterValue } }));
        });

        try {
            let finalHtml = '';
            if (this.tabConfig && this.tabConfig.length > 0) {
                this.tabConfig.forEach(tab => {
                    finalHtml += `<button class="filter-bar-tab" data-filter="${tab.filter}">${tab.label}</button>`;
                });
            } else {
                const allCategories = await fetchAllCategories(true);
                const activeCategories = allCategories.filter(cat => cat.meta?.flags?.isActive);
                const addedSlugs = new Set();
                activeCategories.forEach(cat => {
                    if (cat.meta?.slug && !addedSlugs.has(cat.meta.slug)) {
                        const displayName = this._formatSlugForDisplay(cat.meta.slug);
                        finalHtml += `<button class="filter-bar-tab" data-filter="${cat.meta.slug}">${displayName}</button>`;
                        addedSlugs.add(cat.meta.slug);
                    }
                });
            }
            if (finalHtml) {
                container.insertAdjacentHTML('beforeend', finalHtml);
            }
        } catch (error) {
            console.error("FilterManager: Failed to load dynamic filter categories:", error);
        } finally {
            skeletons.forEach(el => el.remove());
        }
    }

    async _initializeAdvancedPanelLogic() {
        if (this.isAdvancedPanelInitialized) return;
        if (!this.modalContainer) {
            console.error("FilterManager: Modal container not found.");
            return;
        }

        const panel = this.modalContainer.querySelector('#advanced-filter-panel');
        const overlay = this.modalContainer.querySelector('#adv-filter-overlay');
        const closeBtn = this.modalContainer.querySelector('.adv-filter-close-btn');
        const applyBtn = this.modalContainer.querySelector('#adv-filter-apply-btn');
        const resetBtn = this.modalContainer.querySelector('#adv-filter-reset-btn');

        if (!panel || !overlay || !closeBtn) {
            console.error("FilterManager: Advanced panel elements not found.");
            return;
        }

        const closePanel = () => this._toggleAdvancedPanel(false);
        closeBtn.addEventListener('click', closePanel);
        overlay.addEventListener('click', closePanel);

        applyBtn?.addEventListener('click', () => {
            const filterDetails = this._getAdvancedFilterValues();
            
            // Dispatch an event with the active view and filter details
            window.dispatchEvent(new CustomEvent('advancedFilterApplied', { 
                detail: { 
                    view: this.activeView, 
                    filters: filterDetails 
                }
            }));
            
            const syncSlug = filterDetails.subcategory || filterDetails.mainCategory || 'all';
            this._syncHorizontalBar(syncSlug);
            this._updateFilterIconState();
            showToast('success', 'Filters Applied!');
            closePanel();
        });

        resetBtn?.addEventListener('click', () => {
            this._resetAdvancedFilters();
            this._syncHorizontalBar('all');
            this._updateFilterIconState();
            showToast('info', 'Filters have been reset.');
        });

        this._initializePriceSlider();
        await this._populateAdvancedFilters();
        this.isAdvancedPanelInitialized = true;
    }

    _getAdvancedFilterValues() {
        const get = (selector) => this.modalContainer.querySelector(selector)?.value;
        return {
            sort: get('#adv-filter-sort'),
            minPrice: get('#adv-min-price-slider'),
            maxPrice: get('#adv-max-price-slider'),
            mainCategory: get('#adv-filter-main-category'),
            subcategory: get('#adv-filter-subcategory'),
            brand: get('#adv-filter-brand'),
        };
    }

    async initializeEmbeddedFilterBar(viewElement) {
        const originalPlaceholder = this._placeholder;
        this._placeholder = viewElement;
        try {
            await this._initializeComponentLogic();
        } catch (error) {
            console.error('FilterManager: Failed to initialize embedded filter bar logic.', error);
        } finally {
            this._placeholder = originalPlaceholder;
        }
    }
    
    // ... (rest of the methods like _areFiltersActive, _updateFilterIconState, etc. remain the same) ...

    _areFiltersActive() {
        const values = this._getAdvancedFilterValues();
        const minSlider = this.modalContainer.querySelector('#adv-min-price-slider');
        const maxSlider = this.modalContainer.querySelector('#adv-max-price-slider');

        if (values.sort !== 'relevance') return true;
        if (values.mainCategory !== '') return true;
        if (values.subcategory !== '') return true;
        if (values.brand !== '') return true;
        if (minSlider && parseInt(values.minPrice, 10) > parseInt(minSlider.min, 10)) return true;
        if (maxSlider && parseInt(values.maxPrice, 10) < parseInt(maxSlider.max, 10)) return true;

        return false;
    }

    _updateFilterIconState() {
        const filterBarContainer = document.getElementById('filter-bar');
        if (!filterBarContainer) return;
        const iconBtn = filterBarContainer.querySelector('.filter-icon-btn');
        if (!iconBtn) return;
        iconBtn.classList.toggle('has-active-filters', this._areFiltersActive());
    }

    _resetAdvancedFilters() {
        const panel = this.modalContainer.querySelector('#advanced-filter-panel');
        if (!panel) return;
        panel.querySelectorAll('select').forEach(select => select.selectedIndex = 0);
        const subCategorySelect = panel.querySelector('#adv-filter-subcategory');
        if (subCategorySelect) {
            subCategorySelect.innerHTML = '<option value="">All</option>';
            subCategorySelect.disabled = true;
        }
        const minSlider = panel.querySelector('#adv-min-price-slider');
        const maxSlider = panel.querySelector('#adv-max-price-slider');
        if (minSlider) minSlider.value = minSlider.min;
        if (maxSlider) maxSlider.value = maxSlider.max;
        this._updatePriceSlider();
    }

    _syncHorizontalBar(categorySlug) {
        if (!this.placeholder) return;
        const container = this.placeholder.querySelector('#filter-bar');
        if (!container) return;
        container.querySelectorAll('.filter-bar-tab.active').forEach(tab => tab.classList.remove('active'));
        const targetFilter = categorySlug || 'all';
        const targetTab = container.querySelector(`.filter-bar-tab[data-filter="${targetFilter}"]`);
        const tabToActivate = targetTab || container.querySelector('.filter-bar-tab[data-filter="all"]');
        tabToActivate?.classList.add('active');
        window.dispatchEvent(new CustomEvent('filterChanged', { detail: { filter: targetFilter } }));
    }

    async _populateAdvancedFilters() {
        try {
            this.allCategoriesData = await fetchAllCategories(true);
            const mainCategorySelect = this.modalContainer.querySelector('#adv-filter-main-category');
            if (mainCategorySelect) {
                let mainCatOptions = '';
                this.allCategoriesData.forEach(cat => {
                    if (cat.meta?.flags?.isActive && cat.meta?.slug) {
                        const displayName = this._formatSlugForDisplay(cat.meta.slug);
                        mainCatOptions += `<option value="${cat.meta.slug}">${displayName}</option>`;
                    }
                });
                mainCategorySelect.insertAdjacentHTML('beforeend', mainCatOptions);
            }
            mainCategorySelect?.addEventListener('change', (e) => this._onMainCategoryChange(e.target.value));
            const brandSelect = this.modalContainer.querySelector('#adv-filter-brand');
            if (brandSelect) {
                const brands = await fetchAllBrands(true);
                let brandOptions = '';
                brands.forEach(brand => {
                    const brandName = brand.info?.name?.en || brand.meta.brandId;
                    const brandId = brand.meta.brandId;
                    brandOptions += `<option value="${brandId}">${brandName}</option>`;
                });
                brandSelect.insertAdjacentHTML('beforeend', brandOptions);
            }
        } catch (error) {
            console.error("FilterManager: Failed to populate advanced filters.", error);
        }
    }

    _onMainCategoryChange(mainCategorySlug) {
        const subCategorySelect = this.modalContainer.querySelector('#adv-filter-subcategory');
        if (!subCategorySelect) return;
        subCategorySelect.innerHTML = '<option value="">All</option>';
        subCategorySelect.selectedIndex = 0;
        if (!mainCategorySlug) {
            subCategorySelect.disabled = true;
            return;
        }
        const selectedCategory = this.allCategoriesData.find(cat => cat.meta.slug === mainCategorySlug);
        const subcategories = selectedCategory?.subcategories || [];
        if (subcategories.length > 0) {
            subCategorySelect.disabled = false;
            const subCatOptions = subcategories.map(subcat => `<option value="${subcat.slug}">${this._formatSlugForDisplay(subcat.slug)}</option>`).join('');
            subCategorySelect.insertAdjacentHTML('beforeend', subCatOptions);
        } else {
            subCategorySelect.disabled = true;
        }
    }

    async _toggleAdvancedPanel(show) {
        if (show && !this.isModalLoaded) {
            if (!this.modalContainer) {
                this.modalContainer = document.createElement('div');
                document.body.appendChild(this.modalContainer);
            }
            try {
                await this.loadComponent(this.modalContainer, './source/components/filter-modal.html');
                this.isModalLoaded = true;
                await this._initializeAdvancedPanelLogic();
            } catch (error) {
                console.error('FilterManager: Failed to load filter modal component.', error);
                return;
            }
        }
        const panel = this.modalContainer.querySelector('#advanced-filter-panel');
        const overlay = this.modalContainer.querySelector('#adv-filter-overlay');
        if (!panel || !overlay) return;

        if (show) {
            overlay.classList.add('visible');
            panel.classList.add('visible');
            document.body.style.overflow = 'hidden';
        } else {
            overlay.classList.remove('visible');
            panel.classList.remove('visible');
            document.body.style.overflow = '';
        }
        this._updateFilterIconState();
    }

    _initializePriceSlider() {
        const minSlider = this.modalContainer.querySelector('#adv-min-price-slider');
        const maxSlider = this.modalContainer.querySelector('#adv-max-price-slider');
        minSlider?.addEventListener('input', () => this._updatePriceSlider());
        maxSlider?.addEventListener('input', () => this._updatePriceSlider());
        this._updatePriceSlider();
    }

    _updatePriceSlider() {
        const minSlider = this.modalContainer.querySelector('#adv-min-price-slider');
        const maxSlider = this.modalContainer.querySelector('#adv-max-price-slider');
        const minLabel = this.modalContainer.querySelector('#adv-min-price-label');
        const maxLabel = this.modalContainer.querySelector('#adv-max-price-label');
        const track = this.modalContainer.querySelector('.price-slider-track');
        if (!minSlider || !maxSlider || !minLabel || !maxLabel || !track) return;
        let minVal = parseInt(minSlider.value);
        let maxVal = parseInt(maxSlider.value);
        if (minVal > maxVal) [minVal, maxVal] = [maxVal, minVal];
        minLabel.textContent = minVal;
        maxLabel.textContent = maxVal;
        track.style.left = `${(minVal / minSlider.max) * 100}%`;
        track.style.right = `${100 - (maxVal / maxSlider.max) * 100}%`;
    }
}

let filterManagerInstance = null;

/**
 * Gets the singleton instance of the FilterManager.
 * @returns {FilterManager} The singleton FilterManager instance.
 */
export function getFilterManager() {
    if (!filterManagerInstance) {
        filterManagerInstance = new FilterManager();
    }
    return filterManagerInstance;
}
