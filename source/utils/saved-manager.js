import { showToast } from './toast.js';

const LOCAL_STORAGE_KEY = 'savedItems';

/**
 * Retrieves saved items from local storage.
 * @returns {Array<Object>} An array of objects, each with itemId and an optional note.
 */
export function getSavedItems() {
  try {
    const savedItems = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = savedItems ? JSON.parse(savedItems) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading saved items:', error);
    return [];
  }
}

/**
 * Saves the list of items to local storage.
 * @param {Array<Object>} items - An array of item objects to save.
 */
function saveItemsToLocalStorage(items, changeDetail = { type: 'full_refresh' }) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    
    if (changeDetail) {
      const event = new CustomEvent('savedItemsChanged', { detail: changeDetail });
      window.dispatchEvent(event);
    } else {
      // Fallback for old calls that just passed `true` or nothing
      const event = new Event('savedItemsChanged');
      window.dispatchEvent(event);
    }
  } catch (error) {
    console.error('Error saving items:', error);
  }
}

/**
 * Checks if an item is currently saved.
 * @param {string} itemId - The ID of the item to check.
 * @returns {boolean} True if the item is saved, false otherwise.
 */
export function isItemSaved(itemId) {
  const savedItems = getSavedItems();
  return savedItems.some(item => item.itemId === itemId);
}

/**
 * Removes an item from the saved list.
 * @param {string} itemId - The ID of the item to unsave.
 */
export function unsaveItem(itemId) {
  let savedItems = getSavedItems();
  const initialLength = savedItems.length;
  savedItems = savedItems.filter(item => item.itemId !== itemId);

  if (savedItems.length < initialLength) {
    saveItemsToLocalStorage(savedItems, { type: 'remove', itemId });
  }
}

/**
 * Toggles the saved status of an item.
 * @param {string} itemId - The ID of the item to toggle.
 */
export function toggleSavedItem(itemId) {
  let savedItems = getSavedItems();
  if (isItemSaved(itemId)) {
    unsaveItem(itemId);
  } else {
    savedItems.push({ itemId: itemId, note: '' });
    saveItemsToLocalStorage(savedItems, { type: 'add', itemId });
  }
}

/**
 * Updates the note for a specific saved item.
 * @param {string} itemId - The ID of the item to update.
 * @param {string} note - The new note text.
 */
export function updateSavedItemNote(itemId, note) {
    let savedItems = getSavedItems();
    const itemIndex = savedItems.findIndex(item => item.itemId === itemId);

    if (itemIndex > -1) {
        savedItems[itemIndex].note = note;
        saveItemsToLocalStorage(savedItems);
        showToast('success', 'Note updated!');
    } else {
        console.warn(`Item with ID ${itemId} not found in saved items.`);
    }
}

/**
 * Updates the selected date for a specific saved item.
 * @param {string} itemId - The ID of the item to update.
 * @param {string} date - The new selected date (e.g., 'YYYY-MM-DD').
 */
export function updateSavedItemDate(itemId, date) {
    let savedItems = getSavedItems();
    const itemIndex = savedItems.findIndex(item => item.itemId === itemId);

    if (itemIndex > -1) {
        savedItems[itemIndex].selectedDate = date;
        saveItemsToLocalStorage(savedItems);
        showToast('success', 'Date updated!');
    } else {
        console.warn(`Item with ID ${itemId} not found in saved items.`);
    }
}


export function initWishlistHandler() {
  document.body.addEventListener('click', async (event) => {
    const wishlistBtn = event.target.closest('.wishlist-btn');
    if (wishlistBtn) {
      event.preventDefault();
      event.stopPropagation();

      const card = wishlistBtn.closest('.card');
      const itemId = card?.dataset.itemId;

      if (itemId) {
        const wasSaved = isItemSaved(itemId);
        toggleSavedItem(itemId);

        const icon = wishlistBtn.querySelector('i');
        if (icon) {
            if (!wasSaved) {
                wishlistBtn.classList.add('active');
                icon.className = 'fa-solid fa-heart';
                showToast('success', 'Item saved to wishlist!');
            } else {
                wishlistBtn.classList.remove('active');
                icon.className = 'far fa-heart';
                showToast('info', 'Item removed from wishlist!');
            }
        }
      } else {
        console.warn('Global Wishlist Handler: Item ID not found.');
      }
    }
  });
}
