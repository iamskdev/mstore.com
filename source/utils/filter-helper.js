/**
 * @file Centralized helper for managing the filter bar component.
 * This module encapsulates the logic for loading, displaying, and interacting with the filter bar and advanced panel.
 */

import { loadComponent } from '../main.js';
import { fetchAllCategories, fetchAllBrands } from './data-manager.js';
import { showToast } from './toast.js'; // Import the toast utility

const PLACEHOLDER_ID = 'filter-bar-placeholder';
const COMPONENT_PATH = './source/components/filter-bar.html';

class FilterManager {
    constructor() {
        this.placeholder = document.getElementById(PLACEHOLDER_ID);
        this.isLoaded = false;
        this.isInitialized = false; // Track if the logic has been attached
        this.isAdvancedPanelInitialized = false;
        this.allCategoriesData = []; // Cache for category data

        if (!this.placeholder) {
            console.warn(`FilterManager: Placeholder element #${PLACEHOLDER_ID} not found.`);
        }
    }

    /**
     * Controls the visibility and loading of the filter bar.
     * It loads the component once and then toggles its visibility using CSS display property,
     * which is more efficient than re-creating the DOM on every view switch.
     * @param {boolean} shouldShow - True to show the filter bar, false to hide it.
     */
    async manageVisibility(shouldShow) {
        if (!this.placeholder) return;

        // If it should be shown, load it if it hasn't been already.
        if (shouldShow && !this.isLoaded) {
            try {
                await loadComponent(this.placeholder, COMPONENT_PATH);
                this.isLoaded = true;
                // Initialize the component's logic right after it's loaded
                this._initializeComponentLogic();
                this._initializeAdvancedPanelLogic();
                this.isInitialized = true;
            } catch (error) {
                console.error('FilterManager: Failed to load filter bar component.', error);
                this.isLoaded = false; // Allow retry on next attempt
            }
        }

        // Toggle visibility using a class for better CSS control
        if (this.placeholder) {
            this.placeholder.style.display = shouldShow ? '' : 'none';
        }
    }

    /**
     * Formats a slug into a readable title (e.g., 'atta-rice-grains' -> 'Atta Rice Grains').
     * This is a temporary solution until the language manager is fully integrated.
     * @param {string} slug - The slug to format.
     * @returns {string} The formatted, human-readable string.
     * @private
     */
    _formatSlugForDisplay(slug = '') {
        if (!slug) return '';
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    /**
     * Attaches event listeners and populates dynamic content.
     * This logic was moved from filter-bar.html to centralize control.
     * @private
     */
    async _initializeComponentLogic() {
        const container = this.placeholder.querySelector('#filter-bar');
        if (!container) {
            console.error("FilterManager: Could not find #filter-bar inside the loaded component.");
            return;
        }
        const skeletons = container.querySelectorAll('.tab-skeleton');

        // Mouse wheel scroll for desktop
        container.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        });

        // Main click handler for all tabs
        container.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.filter-bar-tab'); // Find the tab that was clicked
            if (!clickedTab) return; // Exit if the click was not on a tab

            // --- NEW: Handle the filter icon click separately ---
            // This ensures it doesn't act like a regular filter tab.
            if (clickedTab.classList.contains('filter-icon-btn')) {
                this._toggleAdvancedPanel(true);
                return;
            }

            // --- Existing logic for other filter tabs ---
            // Do nothing if the clicked tab is already the active one.
            if (clickedTab.classList.contains('active')) return;

            // Remove 'active' class from the currently active tab
            container.querySelectorAll('.filter-bar-tab.active').forEach(tab => {
                tab.classList.remove('active');
            });

            // Add 'active' class to the newly clicked tab
            clickedTab.classList.add('active');

            const filterValue = clickedTab.dataset.filter;
            window.dispatchEvent(new CustomEvent('filterChanged', { detail: { filter: filterValue } }));
        });

        // Fetch and populate dynamic category tabs
        try {
            const allCategories = await fetchAllCategories(true);
            const activeCategories = allCategories.filter(cat => cat.meta?.flags?.isActive);

            const addedSlugs = new Set(['all', 'product', 'service']);
            let finalHtml = '';

            // Add Main Categories as tabs
            activeCategories.forEach(cat => {
                if (cat.meta?.slug && !addedSlugs.has(cat.meta.slug)) {
                    const displayName = this._formatSlugForDisplay(cat.meta.slug);
                    finalHtml += `<button class="filter-bar-tab" data-filter="${cat.meta.slug}">${displayName}</button>`;
                    addedSlugs.add(cat.meta.slug);
                }
            });

            // Add Sub-Categories as tabs
            const allSubcategories = activeCategories.flatMap(cat => cat.subcategories || []);
            const uniqueSubcats = Array.from(new Map(allSubcategories.map(item => [item.slug, item])).values());
            uniqueSubcats.forEach(subcat => {
                if (subcat.slug && !addedSlugs.has(subcat.slug)) {
                    const displayName = this._formatSlugForDisplay(subcat.slug);
                    finalHtml += `<button class="filter-bar-tab" data-filter="${subcat.slug}">${displayName}</button>`;
                    addedSlugs.add(subcat.slug);
                }
            });
 
            if (finalHtml) {
                container.insertAdjacentHTML('beforeend', finalHtml);
            }
        } catch (error) {
            console.error("FilterManager: Failed to load dynamic filter categories:", error);
        } finally {
            skeletons.forEach(el => el.remove());
        }
    }

    /**
     * Initializes the logic for the advanced filter panel.
     * @private
     */
    _initializeAdvancedPanelLogic() {
        if (this.isAdvancedPanelInitialized) return;

        const panel = this.placeholder.querySelector('#advanced-filter-panel');
        const overlay = this.placeholder.querySelector('#adv-filter-overlay');
        const closeBtn = this.placeholder.querySelector('.adv-filter-close-btn');
        const applyBtn = this.placeholder.querySelector('#adv-filter-apply-btn');
        const resetBtn = this.placeholder.querySelector('#adv-filter-reset-btn');
 
        if (!panel || !overlay || !closeBtn) {
            console.error("FilterManager: Advanced panel elements not found.");
            return;
        }
 
        const closePanel = () => this._toggleAdvancedPanel(false);
 
        closeBtn.addEventListener('click', closePanel);
        overlay.addEventListener('click', closePanel);
 
        applyBtn?.addEventListener('click', () => {
            const filterDetails = this._getAdvancedFilterValues();
            
            // Dispatch an event for other parts of the app (like product list) to use
            window.dispatchEvent(new CustomEvent('advancedFilterApplied', { detail: filterDetails }));
            
            // Determine which filter to sync with the bar. Subcategory takes precedence.
            const syncSlug = filterDetails.subcategory || filterDetails.mainCategory || 'all';
            this._syncHorizontalBar(syncSlug);

            this._updateFilterIconState(); // Update icon state
            showToast('success', 'Filters Applied!');
            closePanel();
        });
 
        resetBtn?.addEventListener('click', () => {
            this._resetAdvancedFilters();
            this._syncHorizontalBar('all'); // Also reset the horizontal bar to "All" and dispatch event
            this._updateFilterIconState(); // Update icon state
            showToast('info', 'Filters have been reset.');
        });
 
        this._initializePriceSlider();
        this._populateAdvancedFilters(); // Populate dropdowns
        this.isAdvancedPanelInitialized = true;
    }

    /**
     * Checks if any advanced filters are active (i.e., not set to their default values).
     * @returns {boolean} True if at least one filter is active, false otherwise.
     * @private
     */
    _areFiltersActive() {
        const values = this._getAdvancedFilterValues();
        const minSlider = this.placeholder.querySelector('#adv-min-price-slider');
        const maxSlider = this.placeholder.querySelector('#adv-max-price-slider');

        // Check if any value is different from its default
        if (values.sort !== 'relevance') return true;
        if (values.mainCategory !== '') return true;
        if (values.subcategory !== '') return true;
        if (values.brand !== '') return true;
        if (minSlider && parseInt(values.minPrice, 10) > parseInt(minSlider.min, 10)) return true;
        if (maxSlider && parseInt(values.maxPrice, 10) < parseInt(maxSlider.max, 10)) return true;

        return false;
    }

    /**
     * Updates the filter icon's visual state to indicate if filters are applied.
     * @private
     */
    _updateFilterIconState() {
        const iconBtn = this.placeholder.querySelector('.filter-icon-btn');
        if (!iconBtn) return;

        // The toggle method with the second argument is perfect for this.
        iconBtn.classList.toggle('has-active-filters', this._areFiltersActive());
    }

    /**
     * Gathers all current values from the advanced filter panel inputs.
     * @returns {object} An object containing all selected filter values.
     * @private
     */
    _getAdvancedFilterValues() {
        const get = (selector) => this.placeholder.querySelector(selector)?.value;
        return {
            sort: get('#adv-filter-sort'),
            minPrice: get('#adv-min-price-slider'),
            maxPrice: get('#adv-max-price-slider'),
            mainCategory: get('#adv-filter-main-category'),
            subcategory: get('#adv-filter-subcategory'),
            brand: get('#adv-filter-brand'),
        };
    }

    /**
     * Resets all inputs in the advanced filter panel to their default state.
     * @private
     */
    _resetAdvancedFilters() {
        const panel = this.placeholder.querySelector('#advanced-filter-panel');
        if (!panel) return;

        panel.querySelectorAll('select').forEach(select => select.selectedIndex = 0);
        
        // Also disable and reset the subcategory dropdown on reset
        const subCategorySelect = panel.querySelector('#adv-filter-subcategory');
        if (subCategorySelect) {
            // Clear out any previously populated options and disable it
            subCategorySelect.innerHTML = '<option value="">All</option>';
            subCategorySelect.disabled = true;
        }
        
        const minSlider = panel.querySelector('#adv-min-price-slider');
        const maxSlider = panel.querySelector('#adv-max-price-slider');
        if (minSlider) minSlider.value = minSlider.min;
        if (maxSlider) maxSlider.value = maxSlider.max;

        this._updatePriceSlider(); // Update labels and track after resetting sliders
    }

    /**
     * Synchronizes the active state of the horizontal filter bar with the selected category.
     * @param {string} categorySlug - The slug of the category selected in the advanced panel.
     * @private
     */
    _syncHorizontalBar(categorySlug) {
        const container = this.placeholder.querySelector('#filter-bar');
        if (!container) return;

        container.querySelectorAll('.filter-bar-tab.active').forEach(tab => tab.classList.remove('active'));

        const targetFilter = categorySlug || 'all'; // Default to 'all' if no category is selected
        const targetTab = container.querySelector(`.filter-bar-tab[data-filter="${targetFilter}"]`);
        
        const tabToActivate = targetTab || container.querySelector('.filter-bar-tab[data-filter="all"]');
        tabToActivate?.classList.add('active');

        // Also dispatch the simple filter event to update content
        window.dispatchEvent(new CustomEvent('filterChanged', { detail: { filter: targetFilter } }));
    }

    /**
     * Fetches categories and brands to populate the filter panel's select dropdowns.
     * @private
     */
    async _populateAdvancedFilters() {
        try {
            // Store categories data for reuse in the event listener
            this.allCategoriesData = await fetchAllCategories(true);

            // Populate Main Categories
            const mainCategorySelect = this.placeholder.querySelector('#adv-filter-main-category');
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

            // Add event listener to main category dropdown to populate sub-categories
            mainCategorySelect?.addEventListener('change', (e) => this._onMainCategoryChange(e.target.value));

            // Populate Brands
            const brandSelect = this.placeholder.querySelector('#adv-filter-brand');
            if (brandSelect) {
                const brands = await fetchAllBrands(true);
                let brandOptions = '';
                brands.forEach(brand => {
                    // Assuming brand name is in info.name.en, fallback to ID
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

    /**
     * Handles changes in the main category dropdown to update the sub-category dropdown.
     * @param {string} mainCategorySlug - The slug of the selected main category.
     * @private
     */
    _onMainCategoryChange(mainCategorySlug) {
        const subCategorySelect = this.placeholder.querySelector('#adv-filter-subcategory');
        if (!subCategorySelect) return;

        // Always reset the sub-category dropdown first
        subCategorySelect.innerHTML = '<option value="">All</option>';
        subCategorySelect.selectedIndex = 0; // Select "All"

        // If no main category is selected (i.e., "All"), disable the sub-category dropdown
        if (!mainCategorySlug) {
            subCategorySelect.disabled = true;
            return;
        }

        // Find the selected main category from our cached data
        const selectedCategory = this.allCategoriesData.find(
            cat => cat.meta.slug === mainCategorySlug
        );

        const subcategories = selectedCategory?.subcategories || [];

        if (subcategories.length > 0) {
            subCategorySelect.disabled = false; // Enable the dropdown
            const subCatOptions = subcategories.map(subcat => `<option value="${subcat.slug}">${this._formatSlugForDisplay(subcat.slug)}</option>`).join('');
            subCategorySelect.insertAdjacentHTML('beforeend', subCatOptions);
        } else {
            subCategorySelect.disabled = true; // Disable if no subcategories exist
        }
    }

    /**
     * Toggles the visibility of the advanced filter panel.
     * @param {boolean} show - True to show, false to hide.
     * @private
     */
    _toggleAdvancedPanel(show) {
        const panel = this.placeholder.querySelector('#advanced-filter-panel');
        const overlay = this.placeholder.querySelector('#adv-filter-overlay');
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
    }

    /** @private Attaches event listeners for the dual-range price slider. */
    _initializePriceSlider() {
        const minSlider = this.placeholder.querySelector('#adv-min-price-slider');
        const maxSlider = this.placeholder.querySelector('#adv-max-price-slider');
        minSlider?.addEventListener('input', () => this._updatePriceSlider());
        maxSlider?.addEventListener('input', () => this._updatePriceSlider());
        this._updatePriceSlider(); // Initial call
    }

    /** @private Updates the visual state of the price slider (labels and track). */
    _updatePriceSlider() {
        const minSlider = this.placeholder.querySelector('#adv-min-price-slider');
        const maxSlider = this.placeholder.querySelector('#adv-max-price-slider');
        const minLabel = this.placeholder.querySelector('#adv-min-price-label');
        const maxLabel = this.placeholder.querySelector('#adv-max-price-label');
        const track = this.placeholder.querySelector('.price-slider-track');
        if (!minSlider || !maxSlider || !minLabel || !maxLabel || !track) return;

        let minVal = parseInt(minSlider.value);
        let maxVal = parseInt(maxSlider.value);
        if (minVal > maxVal) [minVal, maxVal] = [maxVal, minVal]; // Ensure min is always less than max
        minLabel.textContent = minVal;
        maxLabel.textContent = maxVal;
        track.style.left = `${(minVal / minSlider.max) * 100}%`;
        track.style.right = `${100 - (maxVal / maxSlider.max) * 100}%`;
    }
}

// Export a single instance to act as a singleton, maintaining state across the app.
export const filterManager = new FilterManager();