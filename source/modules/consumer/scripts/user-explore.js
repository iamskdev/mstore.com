import { createItemCard } from '../../../components/card/card.js'; // Assuming a shared card creator exists
import { showToast } from '../../../utils/toast.js';

// Helper to create skeleton loaders
function createSkeletonCard() {
    const skeleton = document.createElement('div');
    skeleton.className = 'card-skeleton';
    skeleton.innerHTML = `
        <div class="skeleton-image"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
    `;
    return skeleton;
}

// Main function to populate the explore view
async function populateExploreView(filter = 'all') {
    const grid = document.getElementById('explore-items-grid');
    const titleEl = document.getElementById('explore-title');
    const countEl = document.getElementById('item-count');

    if (!grid || !titleEl || !countEl) {
        console.error('Explore view elements not found.');
        return;
    }

    // 1. Show skeletons while loading
    grid.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        grid.appendChild(createSkeletonCard());
    }
    titleEl.textContent = 'User Panel';
    countEl.textContent = '';

    try {
        // 2. Fetch all items from sessionStorage (populated by main.js)
        const allItems = JSON.parse(sessionStorage.getItem('allItems')) || [];
        if (allItems.length === 0) {
            throw new Error("No item data available. Please refresh the app.");
        }

        // 3. Filter items based on the selected filter
        let filteredItems = [];
        if (filter === 'all') {
            filteredItems = allItems;
        } else if (filter === 'product' || filter === 'service') {
            filteredItems = allItems.filter(item => item.type === filter);
        } else {
            // This handles category/subcategory slugs
            filteredItems = allItems.filter(item => 
                item.category === filter || 
                item.tags?.includes(filter) ||
                item.subCategory === filter
            );
        }

        // 4. Clear skeletons and render items
        grid.innerHTML = '';
        if (filteredItems.length === 0) {
            grid.innerHTML = `<div class="no-items-placeholder">No items found for "${filter}".</div>`;
        } else {
            const fragment = document.createDocumentFragment();
            for (const item of filteredItems) {
                const card = await createItemCard(item, 'explore'); 
                if(card) fragment.appendChild(card);
            }
            grid.appendChild(fragment);
        }

        // 5. Update title and count
        const formattedTitle = filter.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        titleEl.textContent = formattedTitle === 'All' ? 'All Products & Services' : formattedTitle;
        countEl.textContent = `${filteredItems.length} items`;

    } catch (error) {
        console.error('Failed to populate explore view:', error);
        grid.innerHTML = `<div class="no-items-placeholder">${error.message}</div>`;
        showToast('error', 'Could not load items.');
    }
}

// This function will be called when the view is loaded.
function initializeExplorePage() {
    console.log('✨ Initializing Explore Page...');
    
    // Initial population
    populateExploreView('all');

    // Listen for filter changes from the filter bar
    window.addEventListener('filterChanged', (e) => {
        const { filter } = e.detail;
        populateExploreView(filter);
    });
}

initializeExplorePage();