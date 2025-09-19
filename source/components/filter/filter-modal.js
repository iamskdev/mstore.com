/**
 * @file Manages the advanced filter modal.
 * This module handles the modal's lifecycle, populates it with data, and communicates filter changes.
 */

import { fetchAllCategories, fetchAllBrands } from '../../utils/data-manager.js';
import { showToast } from '../../utils/toast.js';

const MODAL_COMPONENT_PATH = './source/components/filter/filter-modal.html';

class FilterModalManager {
    constructor(loadComponentFn) {
        this.loadComponent = loadComponentFn;
        this.modalContainer = null;
        this.isModalLoaded = false;
        this.isAdvancedPanelInitialized = false;
        this.allCategoriesData = [];

        // Listen for the event to show the modal
        window.addEventListener('toggleAdvancedFilter', (e) => this._toggleAdvancedPanel(e.detail.show));
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
 
        closeBtn.addEventListener('click', closePanel);
        overlay.addEventListener('click', closePanel);
 
        applyBtn?.addEventListener('click', () => {
            const filterDetails = this._getAdvancedFilterValues();
            
            window.dispatchEvent(new CustomEvent('advancedFilterApplied', { detail: filterDetails }));
            
            const syncSlug = filterDetails.subcategory || filterDetails.mainCategory || 'all';
            window.dispatchEvent(new CustomEvent('syncFilterBar', { detail: { slug: syncSlug } }));

            this._updateFilterIconState();
            showToast('success', 'Filters Applied!');
            closePanel();
        });
 
        resetBtn?.addEventListener('click', () => {
            this._resetAdvancedFilters();
            window.dispatchEvent(new CustomEvent('syncFilterBar', { detail: { slug: 'all' } }));
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
        window.dispatchEvent(new CustomEvent('updateFilterIcon', { detail: { isActive: this._areFiltersActive() } }));
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
        if (show && !this.isModalLoaded) {
            if (!this.modalContainer) {
                this.modalContainer = document.createElement('div');
                document.body.appendChild(this.modalContainer);
            }
            try {
                await this.loadComponent(this.modalContainer, MODAL_COMPONENT_PATH);
                this.isModalLoaded = true;
                this._initializeAdvancedPanelLogic();
            } catch (error) {
                console.error('FilterModalManager: Failed to load filter modal component.', error);
                return;
            }
        }

        const panel = this.modalContainer.querySelector('#advanced-filter-panel');
        const overlay = this.modalContainer.querySelector('#adv-filter-overlay');
        if (!panel || !overlay) {
            console.error("FilterModalManager: Modal elements not found after loading.");
            return;
        }

        if (show) {
            panel.style.display = 'block';
            overlay.style.display = 'block';
            // Use a timeout to allow the display property to apply before adding the class for transition
            setTimeout(() => {
                overlay.classList.add('visible');
                panel.classList.add('visible');
            }, 10);
            document.body.style.overflow = 'hidden';
            this._updateFilterIconState();
        } else {
            overlay.classList.remove('visible');
            panel.classList.remove('visible');
            document.body.style.overflow = '';
            this._updateFilterIconState();
            panel.addEventListener('transitionend', () => {
                panel.style.display = 'none';
                overlay.style.display = 'none';
            }, { once: true });
        }
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

export function initializeFilterModalManager(loadComponentFn) {
    return new FilterModalManager(loadComponentFn);
}
