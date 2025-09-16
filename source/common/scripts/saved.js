import { createCardFromTemplate } from '../../components/cards/card-helper.js';
import { getSavedItems, isItemSaved, toggleSavedItem } from '../../utils/saved-manager.js';
import { fetchItemById } from '../../utils/data-manager.js'; // Assuming data-manager exists



/**
 * @file Saved Page Script
 * This script manages the display and interaction of saved items.
 */

export async function init() {
  

  const savedItemsGrid = document.querySelector('.saved-items-grid');
  
  const emptyState = document.querySelector('.empty-state');

  /**
   * Renders the saved items on the page.
   */
  async function renderSavedItems() {
    const savedItemIds = getSavedItems();
    
    savedItemsGrid.innerHTML = ''; // Clear existing items

    if (savedItemIds.length === 0) {
      emptyState.classList.remove('hidden');
      
      return;
    }
    emptyState.classList.add('hidden');

    const itemsToRender = [];
    for (const itemId of savedItemIds) {
      
      const item = await fetchItemById(itemId);
      if (item) {
        
        itemsToRender.push({
          ...item,
          isSaved: isItemSaved(item.meta.itemId) // Mark as saved for card rendering
        });
      } else {
        console.warn(`[saved.js] Failed to fetch item with ID: ${itemId}. Item is null or undefined.`); // Log failed fetch
      }
    }

    

    // Render each card individually
    itemsToRender.forEach(item => {
      const cardElement = createCardFromTemplate(item);
      if (cardElement) {
        savedItemsGrid.appendChild(cardElement);
        
      } else {
        console.error(`[saved.js] Failed to create card element for item: ${item.meta.itemId}. cardElement is null.`);
      }
    });
  }

  // Initial render when the page loads
  document.addEventListener('DOMContentLoaded', renderSavedItems);
  // Re-render if the view is switched to 'saved'
  window.addEventListener('viewChanged', (event) => {
    if (event.detail.view === 'saved') {
      renderSavedItems();
    }
  });

  // Listen for changes in saved items from saved-manager.js
  window.addEventListener('savedItemsChanged', renderSavedItems);

  // Expose render function for external calls if needed
  window.renderSavedItems = renderSavedItems;

  // Initial render when init is called
  renderSavedItems();
}


