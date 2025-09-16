import { showToast } from './toast.js'; // Assuming a toast utility exists

/**
 * @file Cart Manager
 * Manages adding, removing, and retrieving items from the shopping cart in local storage.
 * Designed to be easily adaptable for Firebase integration later.
 */

const LOCAL_STORAGE_KEY = 'cartItems';

/**
 * Retrieves cart items from local storage.
 * @returns {Array<Object>} An array of cart items, each with an itemId and quantity.
 */
export function getCartItems() {
  try {
    const cartItems = localStorage.getItem(LOCAL_STORAGE_KEY);
    console.log('getCartItems: Retrieved cart items:', cartItems ? JSON.parse(cartItems) : []);
    return cartItems ? JSON.parse(cartItems) : [];
  } catch (error) {
    console.error('Error reading cart items from local storage:', error);
    return [];
  }
}

/**
 * Saves the list of cart items to local storage.
 * @param {Array<Object>} cartItems - An array of cart items to save.
 */
export function saveCartToLocalStorage(cartItems) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cartItems));
    console.log('saveCartToLocalStorage: Saved cart items:', cartItems);
    // Dispatch a custom event to notify other parts of the application
    const event = new Event('cartItemsChanged');
    window.dispatchEvent(event);
    console.log('saveCartToLocalStorage: Dispatched cartItemsChanged event.');
  } catch (error) {
    console.error('Error saving cart items to local storage:', error);
  }
}

/**
 * Checks if an item is currently in the cart.
 * @param {string} itemId - The ID of the item to check.
 * @returns {boolean} True if the item is in the cart, false otherwise.
 */
export function isItemInCart(itemId) {
  console.log('isItemInCart: Checking for itemId:', itemId);
  const cartItems = getCartItems();
  const inCart = cartItems.some(item => item.meta.itemId === itemId);
  console.log('isItemInCart: Item', itemId, 'in cart:', inCart);
  return inCart;
}

/**
 * Adds an item to the cart or increments its quantity if already present.
 * @param {string} itemId - The ID of the item to add.
 * @param {number} [quantity=1] - The quantity to add. Defaults to 1.
 */
export function addItemToCart(item, quantity = 1) {
  console.log('addItemToCart: Adding item:', item, 'with quantity:', quantity);
  if (!item || !item.meta || !item.meta.itemId) {
    console.error('addItemToCart: Invalid item object provided. Cannot add to cart.', item);
    showToast('error', 'Failed to add item to cart: Invalid item data.');
    return;
  }

  let cartItems = getCartItems();
  const existingItemIndex = cartItems.findIndex(cartItem => cartItem.meta.itemId === item.meta.itemId);

  if (existingItemIndex > -1) {
    // Item already in cart, update quantity
    cartItems[existingItemIndex].cart.qty += quantity;
    showToast('success', 'Item quantity updated in cart!');
  } else {
    // Item not in cart, add new item
    const newItem = { ...item, cart: { qty: quantity } };
    cartItems.push(newItem);
    showToast('success', 'Item added to cart!');
  }
  saveCartToLocalStorage(cartItems);
  console.log('addItemToCart: Item added/updated, cart saved.');
}

/**
 * Removes an item completely from the cart.
 * @param {string} itemId - The ID of the item to remove.
 */
export function removeItemFromCart(itemId) {
  console.log('removeItemFromCart: Removing item with itemId:', itemId);
  let cartItems = getCartItems();
  const initialLength = cartItems.length;
  cartItems = cartItems.filter(item => item.meta.itemId !== itemId);

  if (cartItems.length < initialLength) {
    saveCartToLocalStorage(cartItems);
    showToast('info', 'Item removed from cart!');
    console.log('removeItemFromCart: Item removed, cart saved.');
  } else {
    console.log('removeItemFromCart: Item not found in cart, no change.');
  }
}

/**
 * Updates the quantity of a specific item in the cart.
 * If quantity is 0 or less, the item is removed.
 * @param {string} itemId - The ID of the item to update.
 * @param {number} newQuantity - The new quantity for the item.
 */
export function updateItemQuantity(itemId, newQuantity) {
  console.log('updateItemQuantity: Updating itemId:', itemId, 'to quantity:', newQuantity);
  let cartItems = getCartItems();
  const existingItemIndex = cartItems.findIndex(item => item.meta.itemId === itemId);

  if (existingItemIndex > -1) {
    if (newQuantity > 0) {
      cartItems[existingItemIndex].cart.qty = newQuantity;
      showToast('success', 'Cart item quantity updated!');
    } else {
      // If newQuantity is 0 or less, remove the item
      cartItems.splice(existingItemIndex, 1);
      showToast('info', 'Item removed from cart!');
    }
    saveCartToLocalStorage(cartItems);
    console.log('updateItemQuantity: Cart saved after quantity update.');
  } else {
    console.warn(`Item with ID ${itemId} not found in cart.`);
  }
}

/**
 * Clears all items from the cart.
 */
export function clearCart() {
  console.log('clearCart: Clearing all items from cart.');
  saveCartToLocalStorage([]);
  showToast('info', 'Cart cleared!');
}

/**
 * Toggles an item's presence in the cart.
 * If the item is in the cart, it will be removed. If not, it will be added.
 * @param {object} item - The item object to toggle.
 */
export function toggleCartItem(item) {
  console.log('toggleCartItem: Toggling item:', item.meta.itemId);
  if (isItemInCart(item.meta.itemId)) {
    removeItemFromCart(item.meta.itemId);
  } else {
    addItemToCart(item);
  }
  console.log('toggleCartItem: Toggle complete.');
}

/**
 * Updates the UI of an "Add to Cart" button based on whether the item is in the cart.
 * @param {HTMLElement} button - The "Add to Cart" button element.
 * @param {string} itemId - The ID of the item associated with the button.
 */
function updateAddToCartButtonUI(button, itemId) {
  console.log('updateAddToCartButtonUI: Updating UI for itemId:', itemId);
  const inCart = isItemInCart(itemId);
  console.log('updateAddToCartButtonUI: Item', itemId, 'is in cart:', inCart);
  // Ensure the icon element exists or create a placeholder
  let icon = button.querySelector('i');
  if (!icon) {
    icon = document.createElement('i');
    button.prepend(icon); // Add icon before text
    console.log('updateAddToCartButtonUI: Created new icon element.');
  }

  if (inCart) {
    button.classList.add('added');
    icon.className = 'fas fa-check'; // Check icon
    button.innerHTML = `<i class="${icon.className}"></i> Added to Cart`;
    console.log('updateAddToCartButtonUI: Button set to "Added to Cart".');
  } else {
    button.classList.remove('added');
    icon.className = 'fas fa-shopping-cart'; // Cart icon
    button.innerHTML = `<i class="${icon.className}"></i> Add to Cart`;
    console.log('updateAddToCartButtonUI: Button set to "Add to Cart".');
  }
}

/**
 * Initializes a global event listener for "Add to Cart" buttons.
 * Assumes buttons have a class 'add-to-cart' and are within an element with data-item-id.
 */
export function initAddToCartHandler() {
  console.log('initAddToCartHandler: Initializing Add to Cart handler.');
  // Initial UI update for all existing buttons on page load
  document.querySelectorAll('.add-to-cart').forEach(button => {
    const card = button.closest('.card');
    const itemId = card?.dataset.itemId;
    console.log('initAddToCartHandler: Initial UI update for button, itemId:', itemId);
    if (itemId) {
      updateAddToCartButtonUI(button, itemId);
    }
  });

  // Listen for clicks on "Add to Cart" buttons
  document.body.addEventListener('click', async (event) => {
    const addToCartBtn = event.target.closest('.add-to-cart');
    if (addToCartBtn) {
      event.preventDefault();
      event.stopPropagation();
      console.log('initAddToCartHandler: Add to Cart button clicked.');

      const card = addToCartBtn.closest('.card');
      const itemId = card?.dataset.itemId;
      console.log('initAddToCartHandler: Clicked button itemId:', itemId);

      if (itemId) {
        const allItems = JSON.parse(sessionStorage.getItem('allItems') || '[]');
        const itemToAdd = allItems.find(item => item.meta.itemId === itemId);

        if (itemToAdd) {
          toggleCartItem(itemToAdd); // Pass the full item object
          updateAddToCartButtonUI(addToCartBtn, itemId);
          console.log('initAddToCartHandler: Item toggled and UI updated for clicked button.');
        } else {
          console.warn(`Global Add to Cart Handler: Item with ID ${itemId} not found in allItems.`);
        }
      } else {
        console.warn('Global Add to Cart Handler: Item ID not found for add to cart button.');
      }
    }
  });

  // Listen for cart changes to update UI dynamically
  window.addEventListener('cartItemsChanged', () => {
    console.log('initAddToCartHandler: cartItemsChanged event received. Updating all buttons.');
    document.querySelectorAll('.add-to-cart').forEach(button => {
      const card = button.closest('.card');
      const itemId = card?.dataset.itemId;
      if (itemId) {
        updateAddToCartButtonUI(button, itemId);
      }
    });
  });
}
