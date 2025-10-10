/**
 * @file Manages the advanced filter modal.
 * This module handles the modal's lifecycle, populates it with data, and communicates filter changes.
 */

import { fetchAllCategories, fetchAllBrands } from '../../utils/data-manager.js';
import { showToast } from '../../utils/toast.js';

const MODAL_COMPONENT_PATH = './source/partials/filter/filter-modal.html';

class FilterModalManager {
    constructor(placeholderElement) {
        this.modalContainer = placeholderElement;
        this.isModalLoaded = false;
        this.isAdvancedPanelInitialized = false;
        this.allCategoriesData = [];
        this.eventListeners = [];
        this.currentView = 'home'; // Default view
        this.viewId = placeholderElement?.id || 'unknown-view'; // e.g., 'home-filter-modal'

        if (!this.modalContainer) {
            console.error("FilterModalManager: A valid placeholder element must be provided.");
            return;
        }
        // Listen for the event to show the modal
        this._addManagedListener(window, 'toggleAdvancedFilter', (e) => this._toggleAdvancedPanel(e.detail.show));
        this._addManagedListener(window, 'requestViewChange', (e) => this.currentView = e.detail.view); // Update current view
    }

    _addManagedListener(element, type, listener) {
        element.addEventListener(type, listener);
        this.eventListeners.push({ element, type, listener });
    }

    cleanup() {
        this.eventListeners.forEach(({ element, type, listener }) => {
            element.removeEventListener(type, listener);
        });
        this.eventListeners = [];
        this.isAdvancedPanelInitialized = false;
    }

    async _loadModalHtml() {
        try {
            console.log(`Attempting to fetch modal partial from: ${new URL(MODAL_COMPONENT_PATH, window.location.origin).href}`);
            const res = await fetch(`${MODAL_COMPONENT_PATH}?v=${new Date().getTime()}`); // Cache bust
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            const html = await res.text();

            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = html;

            // Separate scripts from the rest of the content
            const scripts = Array.from(tempContainer.querySelectorAll('script'));
            scripts.forEach(s => s.remove());

            // Inject the HTML content without the scripts
            this.modalContainer.innerHTML = tempContainer.innerHTML;

            // Execute scripts sequentially and wait for them to complete
            for (const script of scripts) {
                await new Promise((resolve, reject) => {
                    const newScript = document.createElement('script');
                    // Copy all attributes (like type="module")
                    script.getAttributeNames().forEach(attr => newScript.setAttribute(attr, script.getAttribute(attr)));
                    newScript.textContent = script.textContent;

                    // For external scripts, we wait for the 'load' event.
                    if (script.src) {
                        newScript.onload = resolve;
                        newScript.onerror = reject;
                    }

                    this.modalContainer.appendChild(newScript);

                    // For inline scripts (both classic and module), they execute immediately upon
                    // being added to the DOM. There is no 'load' event. So, we can resolve right away.
                    if (!script.src) {
                        resolve();
                    }
                });
            }
        } catch (err) {
            console.error(`❌ Failed to load modal component from: ${MODAL_COMPONENT_PATH}`, err);
            this.modalContainer.innerHTML = `<div style="color:red; padding:10px;">Failed to load ${MODAL_COMPONENT_PATH}.</div>`;
            throw err;
        }
    }

    _formatSlugForDisplay(slug = '') {
        if (!slug) return '';
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    async _initializeAdvancedPanelLogic() {
        if (this.isAdvancedPanelInitialized) return;
        if (!this.modalContainer) {
            console.error("FilterModalManager: Modal container not found for advanced panel initialization.");
            return;
        }

        const panel = this.modalContainer.querySelector('#advanced-filter-panel');
        const overlay = this.modalContainer.querySelector('#adv-filter-overlay');
        const closeBtn = this.modalContainer.querySelector('.adv-filter-close-btn');
        const applyBtn = this.modalContainer.querySelector('#adv-filter-apply-btn');
        const resetBtn = this.modalContainer.querySelector('#adv-filter-reset-btn');
 
        if (!panel || !overlay || !closeBtn) {
            console.error("FilterModalManager: Advanced panel elements not found within modalContainer.");
            return;
        }
 
        const closePanel = () => this._toggleAdvancedPanel(false);
 
        this._addManagedListener(closeBtn, 'click', closePanel);
        this._addManagedListener(overlay, 'click', closePanel);
 
        if (applyBtn) this._addManagedListener(applyBtn, 'click', () => {
            const filterDetails = this._getAdvancedFilterValues();
            const viewName = this.viewId.replace('-filter-modal', '');
            const detailWithView = { ...filterDetails, viewId: viewName };
            
            window.dispatchEvent(new CustomEvent('advancedFilterApplied', { detail: detailWithView, bubbles: true, composed: true }));
            
            const syncSlug = filterDetails.subcategory || filterDetails.mainCategory || 'all';
            window.dispatchEvent(new CustomEvent('syncFilterBar', { detail: { slug: syncSlug, viewId: viewName } }));

            this._updateFilterIconState();
            showToast('success', 'Filters Applied!');
            closePanel();
        });

        if (resetBtn) this._addManagedListener(resetBtn, 'click', () => {
            this._resetAdvancedFilters();
            const viewName = this.viewId.replace('-filter-modal', '');
            window.dispatchEvent(new CustomEvent('syncFilterBar', { detail: { slug: 'all', viewId: viewName } }));
            this._updateFilterIconState();
            showToast('info', 'Filters have been reset.');
        });
 
        this._initializePriceSlider();
        this._populateAdvancedFilters();
        this.isAdvancedPanelInitialized = true;
    }

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
        const detail = {
            isActive: this._areFiltersActive(),
            // Extract the view name (e.g., 'home') from the placeholder ID (e.g., 'home-filter-modal')
            viewId: this.viewId.replace('-filter-modal', '')
        };
        window.dispatchEvent(new CustomEvent('updateFilterIcon', { detail }));
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

            if (mainCategorySelect) this._addManagedListener(mainCategorySelect, 'change', (e) => this._onMainCategoryChange(e.target.value));

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
            console.error("FilterModalManager: Failed to populate advanced filters.", error);
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

        const selectedCategory = this.allCategoriesData.find(
            cat => cat.meta.slug === mainCategorySlug
        );

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
        // Step 1: Load HTML if it's needed and not already loaded.
        if (show && !this.isModalLoaded) {
            try {
                await this._loadModalHtml();
                this.isModalLoaded = true;
            } catch (error) {
                console.error('FilterModalManager: Failed to load filter modal component.', error);
                return; // Can't proceed if HTML fails to load.
            }
        }

        // Step 2: Find the core elements.
        const panel = this.modalContainer.querySelector('#advanced-filter-panel');
        const overlay = this.modalContainer.querySelector('#adv-filter-overlay');

        // Step 3: Handle cases where elements are not found.
        if (!panel || !overlay) {
            // If we are trying to HIDE the modal, and the elements are already gone,
            // this is not an error. The view was likely cleaned up. Just exit.
            if (!show) {
                return;
            }
            // If we are trying to SHOW the modal, but the elements aren't in the loaded HTML,
            // that's a critical error.
            console.error("FilterModalManager: Modal elements not found even after attempting to load HTML.");
            return;
        }

        // Step 4: Initialize logic if showing for the first time.
        if (show && !this.isAdvancedPanelInitialized) {
            this._initializeAdvancedPanelLogic();
        }

        // Step 5: Execute the show/hide logic.
        if (show) {
            panel.style.display = 'block';
            overlay.style.display = 'block';
            setTimeout(() => {
                overlay.classList.add('visible');
                panel.classList.add('visible');
            }, 10);
            document.body.style.overflow = 'hidden';
        } else {
            overlay.classList.remove('visible');
            panel.classList.remove('visible');
            document.body.style.overflow = '';
            // Use a transitionend listener for a clean hide after animation.
            panel.addEventListener('transitionend', () => {
                if (!panel.classList.contains('visible')) {
                    panel.style.display = 'none';
                    overlay.style.display = 'none';
                }
            }, { once: true });
        }

        // Step 6: Update the filter icon state.
        this._updateFilterIconState();
    }

    _initializePriceSlider() {
        const minSlider = this.modalContainer.querySelector('#adv-min-price-slider');
        const maxSlider = this.modalContainer.querySelector('#adv-max-price-slider');
        if (minSlider) this._addManagedListener(minSlider, 'input', () => this._updatePriceSlider());
        if (maxSlider) this._addManagedListener(maxSlider, 'input', () => this._updatePriceSlider());
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
        if (minVal > maxVal) { // Swap if min is greater than max
            [minSlider.value, maxSlider.value] = [maxSlider.value, minSlider.value];
            [minVal, maxVal] = [maxVal, minVal];
        }
        minLabel.textContent = minVal;
        maxLabel.textContent = maxVal;
        const minPercent = (minVal / minSlider.max) * 100;
        const maxPercent = (maxVal / maxSlider.max) * 100;
        track.style.left = `${minPercent}%`;
        track.style.right = `${100 - maxPercent}%`;
    }
}

export function initializeFilterModalManager() {
    // This function is now a factory that returns a new instance of the manager.
    // The placeholder element is now passed during initialization in the view's script (e.g., home.js, cart.js).
    return function(placeholderElement) {
        return new FilterModalManager(placeholderElement);
    };
}
