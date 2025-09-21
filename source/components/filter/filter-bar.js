/**
 * @file Centralized helper for managing the filter bar component.
 * This module encapsulates the logic for loading, displaying, and interacting with the filter bar.
 */

// Removed fetchAllCategories as it's no longer used here

const COMPONENT_PATH = './source/components/filter/filter-bar.html';

class FilterBarManager {
    constructor(placeholderElement, customTabs = [], viewId) {
        this._placeholder = placeholderElement;
        this.isLoaded = false;
        this.isInitialized = false;
        this.customTabs = customTabs;
        this.viewId = viewId; // e.g., 'home' or 'cart'

        // Listen for events from the modal to update the UI
        window.addEventListener('syncFilterBar', (e) => {
            if (e.detail.viewId === this.viewId) {
                this.syncHorizontalBar(e.detail.slug);
            }
        });
        window.addEventListener('updateFilterIcon', (e) => this.handleFilterIconUpdate(e.detail)); // This one is already view-specific
    }

    async _loadBarHtml() {
        try {
            console.log(`Attempting to fetch bar partial from: ${new URL(COMPONENT_PATH, window.location.origin).href}`);
            const res = await fetch(`${COMPONENT_PATH}?v=${new Date().getTime()}`); // Cache bust
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            const html = await res.text();

            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = html;

            // Separate scripts from the rest of the content
            const scripts = Array.from(tempContainer.querySelectorAll('script'));
            scripts.forEach(s => s.remove());

            // Inject the HTML content without the scripts
            this._placeholder.innerHTML = tempContainer.innerHTML;

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

                    this._placeholder.appendChild(newScript);

                    // For inline scripts (both classic and module), they execute immediately upon
                    // being added to the DOM. There is no 'load' event. So, we can resolve right away.
                    if (!script.src) {
                        resolve();
                    }
                });
            }
        } catch (err) {
            console.error(`❌ Failed to load bar component from: ${COMPONENT_PATH}`, err);
            this._placeholder.innerHTML = `<div style="color:red; padding:10px;">Failed to load ${COMPONENT_PATH}.</div>`;
            throw err;
        }
    }

    get placeholder() {
        return this._placeholder;
    }

    async manageVisibility(shouldShow) {
        if (!this.placeholder) return;

        if (shouldShow && !this.isLoaded) {
            try {
                await this._loadBarHtml();
                this.isLoaded = true;
                this._initializeComponentLogic();
                this.isInitialized = true;
            } catch (error) {
                console.error('FilterBarManager: Failed to load filter bar component.', error);
                this.isLoaded = false;
            }
        }

        if (this.placeholder) {
            const pageViewArea = document.querySelector('.page-view-area');
            if (pageViewArea) {
                pageViewArea.classList.toggle('filter-bar-active', shouldShow);
            }

            // NEW: Explicitly manage filter-bar-hidden class on the actual filter bar element
            const filterBarElement = this.placeholder.querySelector('#filter-bar');
            if (filterBarElement) {
                if (shouldShow) {
                    filterBarElement.classList.remove('filter-bar-hidden');
                } else {
                    filterBarElement.classList.add('filter-bar-hidden');
                }
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
            window.dispatchEvent(new CustomEvent('filterChanged', { detail: { filter: filterValue, viewId: this.viewId } }));
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
        }
        finally {
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

        window.dispatchEvent(new CustomEvent('filterChanged', { detail: { filter: targetFilter, viewId: this.viewId } }));
    }

    handleFilterIconUpdate(detail) {
        // Only update the icon if the event is for this specific view's filter bar.
        if (detail.viewId !== this.viewId) {
            return;
        }

        const isActive = detail.isActive;
        const filterBarContainer = this.placeholder.querySelector('#filter-bar');
        if (!filterBarContainer) return;

        const iconBtn = filterBarContainer.querySelector('.filter-icon-btn');
        if (!iconBtn) return;

        iconBtn.classList.toggle('has-active-filters', isActive);
    }

    async initializeEmbeddedFilterBar(viewElement, initialVisibility = true) {
        const originalPlaceholder = this._placeholder;
        this._placeholder = viewElement;
        try {
            // Set initial visibility based on the view config
            this.manageVisibility(initialVisibility);
            await this._initializeComponentLogic();
        } catch (error) {
            console.error('FilterBarManager: Failed to initialize embedded filter bar logic.', error);
        } finally {
            this._placeholder = originalPlaceholder;
        }
    }
}

export function initializeFilterBarManager(placeholderElement, customTabs = [], viewId) {
    return new FilterBarManager(placeholderElement, customTabs, viewId);
}
