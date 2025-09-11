import { showToast } from './toast.js'; // Assuming a toast utility exists

/**
 * @file Saved Items Manager
 * Manages saving and retrieving item IDs from local storage.
 * Designed to be easily adaptable for Firebase integration later.
 */

const LOCAL_STORAGE_KEY = 'savedItems';

/**
 * Retrieves saved item IDs from local storage.
 * @returns {string[]} An array of saved item IDs.
 */
export function getSavedItems() {
  try {
    const savedItems = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedItems ? JSON.parse(savedItems) : [];
  } catch (error) {
    console.error('Error reading saved items from local storage:', error);
    return [];
  }
}

/**
 * Saves the list of item IDs to local storage.
 * @param {string[]} itemIds - An array of item IDs to save.
 */
function saveItemsToLocalStorage(itemIds) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(itemIds));
    // Dispatch a custom event to notify other parts of the application
    const event = new Event('savedItemsChanged');
    window.dispatchEvent(event);
  } catch (error) {
    console.error('Error saving items to local storage:', error);
  }
}

/**
 * Checks if an item is currently saved.
 * @param {string} itemId - The ID of the item to check.
 * @returns {boolean} True if the item is saved, false otherwise.
 */
export function isItemSaved(itemId) {
  const savedItems = getSavedItems();
  return savedItems.includes(itemId);
}

/**
 * Adds an item to the saved list.
 * @param {string} itemId - The ID of the item to save.
 */
export function saveItem(itemId) {
  let savedItems = getSavedItems();
  if (!savedItems.includes(itemId)) {
    savedItems.push(itemId);
    saveItemsToLocalStorage(savedItems);
    
  }
}

/**
 * Removes an item from the saved list.
 * @param {string} itemId - The ID of the item to unsave.
 */
export function unsaveItem(itemId) {
  let savedItems = getSavedItems();
  const index = savedItems.indexOf(itemId);
  if (index > -1) {
    savedItems.splice(index, 1);
    saveItemsToLocalStorage(savedItems);
    
  }
}

/**
 * Toggles the saved status of an item.
 * If the item is saved, it will be unsaved. If not, it will be saved.
 * @param {string} itemId - The ID of the item to toggle.
 */
export function toggleSavedItem(itemId) {
  if (isItemSaved(itemId)) {
    unsaveItem(itemId);
  } else {
    saveItem(itemId);
  }
}

export function initWishlistHandler() {
  document.body.addEventListener('click', async (event) => {
    const wishlistBtn = event.target.closest('.wishlist-btn');
    if (wishlistBtn) {
      event.preventDefault(); // Prevent navigation if the card is a link
      event.stopPropagation(); // Stop propagation to prevent other listeners from interfering

      const card = wishlistBtn.closest('.card');
      const itemId = card?.dataset.itemId; // Use optional chaining for safety

      if (itemId) {
        
        toggleSavedItem(itemId);

        // Update the heart icon visually
        const isSaved = wishlistBtn.classList.toggle('active'); // Toggle 'active' class
        const icon = wishlistBtn.querySelector('i');
        if (icon) {
          if (isSaved) {
            icon.classList.remove('far', 'fa-heart');
            icon.classList.add('fa-solid', 'fa-heart');
            showToast('success', 'Item saved to wishlist!');
          } else {
            icon.classList.remove('fa-solid', 'fa-heart');
            icon.classList.add('far', 'fa-heart');
            showToast('info', 'Item removed from wishlist!');
          }
        }
      } else {
        console.warn('Global Wishlist Handler: Item ID not found for wishlist button.');
      }
    }
  });
  
}
