/**
 * @file Centralized helper for managing the filter bar component.
 * This module encapsulates the logic for loading, displaying, and interacting with the filter bar.
 */

// Removed fetchAllCategories as it's no longer used here

const PLACEHOLDER_ID = 'filter-bar-placeholder';
const COMPONENT_PATH = './source/components/filter/filter-bar.html';

class FilterBarManager {
    constructor(loadComponentFn, customTabs = []) {
        this._placeholder = null;
        this.isLoaded = false;
        this.isInitialized = false;
        this.loadComponent = loadComponentFn;
        this.customTabs = customTabs;

        // Listen for events from the modal to update the UI
        window.addEventListener('syncFilterBar', (e) => this.syncHorizontalBar(e.detail.slug));
        window.addEventListener('updateFilterIcon', (e) => this.updateFilterIconState(e.detail.isActive));
    }

    get placeholder() {
        if (!this._placeholder) {
            this._placeholder = document.getElementById(PLACEHOLDER_ID);
        }
        return this._placeholder;
    }

    async manageVisibility(shouldShow) {
        if (!this.placeholder) return;

        if (shouldShow && !this.isLoaded) {
            try {
                await this.loadComponent(this.placeholder, COMPONENT_PATH);
                this.isLoaded = true;
                this._initializeComponentLogic();
                this.isInitialized = true;
            } catch (error) {
                console.error('FilterBarManager: Failed to load filter bar component.', error);
                this.isLoaded = false;
            }
        }

        if (this.placeholder) {
            this.placeholder.style.display = shouldShow ? 'block' : 'none';
            const pageViewArea = document.querySelector('.page-view-area');
            if (pageViewArea) {
                pageViewArea.classList.toggle('filter-bar-active', shouldShow);
            }
            if (!shouldShow) {
                document.documentElement.style.setProperty('--filter-bar-height', '0px');
            }
        }
    }

    _formatSlugForDisplay(slug = '') {
        if (!slug) return '';
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    async _initializeComponentLogic() {
        const container = this.placeholder.querySelector('#filter-bar');
        if (!container) {
            console.error("FilterBarManager: Could not find #filter-bar inside the loaded component.");
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
                window.dispatchEvent(new CustomEvent('toggleAdvancedFilter', { detail: { show: true } }));
                return;
            }

            if (clickedTab.classList.contains('active')) return;

            container.querySelectorAll('.filter-bar-tab.active').forEach(tab => {
                tab.classList.remove('active');
            });

            clickedTab.classList.add('active');

            const filterValue = clickedTab.dataset.filter;
            window.dispatchEvent(new CustomEvent('filterChanged', { detail: { filter: filterValue } }));
        });

        let lastScrollTop = window.scrollY;
        window.addEventListener('scroll', () => {
            const currentScrollTop = window.scrollY;
            if (!container) return;
            const scrollThreshold = 40;
            if (currentScrollTop > lastScrollTop && currentScrollTop > scrollThreshold) {
                container.classList.add('filter-bar-hidden');
            } else if (currentScrollTop < lastScrollTop) {
                container.classList.remove('filter-bar-hidden');
            }
            lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop;
        });

        try {
            let tabsToRender = this.customTabs || [];
            
            let finalHtml = '';
            tabsToRender.forEach(tab => {
                const isActive = tab.filter === 'all' ? ' active' : '';
                finalHtml += `<button class="filter-bar-tab${isActive}" data-filter="${tab.filter}">${tab.label}</button>`;
            });
 
            if (finalHtml) {
                container.insertAdjacentHTML('beforeend', finalHtml);
            }
        } catch (error) {
            console.error("FilterBarManager: Failed to load dynamic filter categories:", error);
        } finally {
            skeletons.forEach(el => el.remove());
        }
    }

    syncHorizontalBar(categorySlug) {
        if (!this.isLoaded || !this.placeholder) return;
        const container = this.placeholder.querySelector('#filter-bar');
        if (!container) return;

        container.querySelectorAll('.filter-bar-tab.active').forEach(tab => tab.classList.remove('active'));

        const targetFilter = categorySlug || 'all';
        const targetTab = container.querySelector(`.filter-bar-tab[data-filter="${targetFilter}"]`);
        
        const tabToActivate = targetTab || container.querySelector('.filter-bar-tab[data-filter="all"]');
        tabToActivate?.classList.add('active');

        window.dispatchEvent(new CustomEvent('filterChanged', { detail: { filter: targetFilter } }));
    }

    updateFilterIconState(isActive) {
        const filterBarContainer = this.placeholder.querySelector('#filter-bar');
        if (!filterBarContainer) return;

        const iconBtn = filterBarContainer.querySelector('.filter-icon-btn');
        if (!iconBtn) return;

        iconBtn.classList.toggle('has-active-filters', isActive);
    }

    async initializeEmbeddedFilterBar(viewElement) {
        const originalPlaceholder = this._placeholder;
        this._placeholder = viewElement;
        try {
            await this._initializeComponentLogic();
        } catch (error) {
            console.error('FilterBarManager: Failed to initialize embedded filter bar logic.', error);
        } finally {
            this._placeholder = originalPlaceholder;
        }
    }
}

export function initializeFilterBarManager(loadComponentFn, customTabs = []) {
    return new FilterBarManager(loadComponentFn, customTabs);
}

