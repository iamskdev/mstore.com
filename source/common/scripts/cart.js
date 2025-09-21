import { createListCard, initCardHelper } from '../../components/cards/card-helper.js';
import { getCartItems as getCartItemsManager, saveCartToLocalStorage, updateCartItemNote } from '../../utils/cart-manager.js';
import { fetchAllCategories } from '../../utils/data-manager.js';
import { initializeFilterModalManager } from '../../components/filter/filter-modal.js'; // Import initializeFilterModalManager
import { initializeFilterBarManager, } from '../../components/filter/filter-bar.js'; // Import the global FilterBarManager
import { toggleSavedItem, isItemSaved } from '../../utils/saved-manager.js'; // New import for saved items
import { showToast } from '../../utils/toast.js'; // New import for toast messages

// Import DOMParser for parsing HTML strings
const parser = new DOMParser();

let cartFilterBarManager; // Declare a variable to hold the instance of the global FilterBarManager


let currentFilter = "all"; // products or services
let currentSort = "relevance"; // Default sort order
let cart = {};
// Local utility to format slug for display
function _formatSlugForDisplay(slug = '') {
    if (!slug) return '';
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Local utility to get category info by ID
async function getCategoryInfoByCategoryId(categoryId) {
    if (!categoryId) return null;
    const allCategories = await fetchAllCategories(true);
    return allCategories.find(cat => cat.meta.categoryId === categoryId) || null;
}

// This function is exported to be used by the filter-helper
export async function getGlobalFilterTabs() {
    const cartItems = await getCartItemsManager();

    if (cartItems.length === 0) {
        return []; // Return no tabs if cart is empty
    }
    
    const customTabs = [{ label: 'All', filter: 'all' }];

    const hasProducts = cartItems.some(item => item.meta.type === 'product');
    const hasServices = cartItems.some(item => item.meta.type === 'service');

    if (hasProducts) {
        customTabs.push({ label: 'Products', filter: 'product' });
    }

    if (hasServices) {
        customTabs.push({ label: 'Services', filter: 'service' });
    }

    // Only add category-specific tabs if there are items in the cart
    if (cartItems.length > 0) {
        const categoryIdsInCart = new Set(cartItems.map(item => item.meta.links.categoryId));
        for (const categoryId of categoryIdsInCart) {
            const category = await getCategoryInfoByCategoryId(categoryId);
            if (category && !customTabs.some(tab => tab.filter === category.meta.slug)) {
                const hasItemsInThisCategory = cartItems.some(item => item.meta.links.categoryId === categoryId);
                if (hasItemsInThisCategory) {
                    customTabs.push({ label: _formatSlugForDisplay(category.meta.slug), filter: category.meta.slug });
                }
            }
        }
    }
    
    return customTabs;
}

// Configuration for cart list cards
const cartViewConfig = {
    fields: [
        { key: 'info.name', selector: '.card-title', visible: true },
        { 
            key: 'media.thumbnail', 
            selector: '.card-image', 
            type: 'image',
            default: './localstore/images/default-product.jpg' 
        },
        { 
            key: 'pricing.sellingPrice', 
            selector: '.selling-price', 
            visible: true,
            formatter: (price, item) => `₹${(price * item.cart.qty).toFixed(2)}` 
        },
        { 
            key: 'pricing.mrp', 
            selector: '.max-price', 
            visible: (item) => item.pricing.mrp > item.pricing.sellingPrice,
            formatter: (mrp, item) => `₹${(mrp * item.cart.qty).toFixed(2)}`
        },
        { selector: '.cost-price', visible: false },
        { key: 'analytics.rating', selector: '.stars', visible: true },
        { key: 'stock.status', selector: '.stock-status', visible: true },
        {
            key: 'cart.note',
            selector: '.card-note',
            visible: true,
            formatter: (note) => {
                const displayText = note || 'Click to add a note';
                return `<span class="note-label clickable">Note:</span> <span class="note-content">${displayText}</span>`;
            }
        },
        { 
            key: 'pricing.mrp',
            selector: '.card-discount', 
            visible: (item) => item.pricing.mrp > item.pricing.sellingPrice,
            formatter: (mrp, item) => {
                const sellingPrice = item.pricing.sellingPrice;
                if (mrp > sellingPrice) {
                    const discount = ((mrp - sellingPrice) / mrp) * 100;
                    return `${discount.toFixed(0)}% off`;
                }
                return '';
            }
        },
    ],
    buttons: [
        {
            type: 'quantitySelector',
            visible: (item) => item.meta.type === 'product',
            action: 'UPDATE_CART_QUANTITY'
        },
        {
            label: 'Select Date',
            action: 'SELECT_SERVICE_DATE',
            class: 'btn-secondary select-date-btn',
            visible: (item) => item.meta.type === 'service'
        },
        { label: 'Request', action: 'REQUEST_ITEM', class: 'btn-primary', visible: true },
        { label: 'Save for Later', action: 'SAVE_FOR_LATER', class: 'btn-secondary', visible: true },
        { label: 'Remove', action: 'REMOVE_FROM_CART', class: 'btn-danger', visible: true }
    ],
    actionHandlers: {
        'UPDATE_CART_QUANTITY': (item, newQuantity) => window.updateQty(item.meta.itemId, newQuantity),
        'SELECT_SERVICE_DATE': (item, targetButton) => {
            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.style.position = 'absolute';
            dateInput.style.left = '-9999px'; // Hide it off-screen
            dateInput.style.top = '-9999px';
            dateInput.value = item.cart.selectedDate || ''; // Set initial value if exists

            document.body.appendChild(dateInput);

            dateInput.onchange = (event) => {
                const selectedDate = event.target.value;
                if (selectedDate) {
                    window.updateDate(item.meta.itemId, selectedDate);
                    requestRender(); // Re-render to update the button label and total
                }
                document.body.removeChild(dateInput); // Clean up the hidden input
            };

            dateInput.click(); // Programmatically click to open date picker
        },
        'REQUEST_ITEM': (item) => console.log(`Requesting item: ${item.info.name}`),
        'SAVE_FOR_LATER': (item) => {
            // Remove from cart
            window.removeItem(item.meta.itemId);
            console.log(`SAVE_FOR_LATER: Item ${item.info.name} (ID: ${item.meta.itemId}) removed from cart.`);

            // Check if the item is already saved
            const itemAlreadySaved = isItemSaved(item.meta.itemId);
            console.log(`SAVE_FOR_LATER: Is item ${item.info.name} already saved? ${itemAlreadySaved}`);

            if (itemAlreadySaved) {
                showToast('info', `${item.info.name} is already in your saved list.`);
                console.log(`SAVE_FOR_LATER: Toast shown: Item already saved.`);
            } else {
                // Add to saved items, preserving the note
                toggleSavedItem(item.meta.itemId, item.cart.note);
                showToast('info', `${item.info.name} saved for later!`);
                console.log(`SAVE_FOR_LATER: Toast shown: Item saved for later.`);
            }
        },
        'REMOVE_FROM_CART': (item) => window.removeItem(item.meta.itemId),
    }
};

let renderTimeout;
/**
 * Debounces the rendercard function to prevent multiple rapid re-renders.
 * This avoids race conditions and duplicate card rendering when multiple events
 * fire in quick succession (e.g., filter change and cart update).
 */
function requestRender() {
    // Clear any pending render request.
    if (renderTimeout) {
        clearTimeout(renderTimeout);
    }
    // Set a new render request to run after a short delay.
    renderTimeout = setTimeout(() => {
        rendercard();
    }, 10); // A small 10ms delay is enough to batch rapid calls.
}

async function rendercard() {
  const cartItemsContainer = document.getElementById("cart-items-container");
  const emptyCartView = document.getElementById("empty-cart-view");
  const cartFooter = document.querySelector('.cart-footer-area');

  cart.items = await getCartItemsManager();
  const displayedItems = [];

  if (cart.items.length === 0) {
    cartFilterBarManager.manageVisibility(false); // Hide filter bar
    if (cartFooter) cartFooter.style.display = 'none';
    cartItemsContainer.classList.add('hidden');
    emptyCartView.classList.remove('hidden');
    updateCartTotalDisplay([]); // Ensure total is updated to 0
    return;
  }

  cartFilterBarManager.manageVisibility(true); // Show filter bar
  if (cartFooter) cartFooter.style.display = 'flex';
  cartItemsContainer.classList.remove('hidden');
  emptyCartView.classList.add('hidden');

  // Clear existing cards explicitly
  while (cartItemsContainer.firstChild) {
    cartItemsContainer.removeChild(cartItemsContainer.firstChild);
  }

  // Default sort: most recently added items first.
  cart.items.sort((a, b) => new Date(b.cart.addedAt || 0) - new Date(a.cart.addedAt || 0));

  // Apply user-selected sort from the filter modal if it's not the default 'relevance'.
  if (currentSort && currentSort !== 'relevance') {
      cart.items.sort((a, b) => {
          const priceA = a.pricing.sellingPrice * a.cart.qty;
          const priceB = b.pricing.sellingPrice * b.cart.qty;
          switch (currentSort) {
              case 'price-asc': return priceA - priceB;
              case 'price-desc': return priceB - priceA;
              case 'rating-desc': return (b.analytics?.rating || 0) - (a.analytics?.rating || 0);
              default: return 0; // 'newest' is already handled by the default sort.
          }
      });
  }

  for (const item of cart.items) {
    const itemCategoryId = item.meta.links.categoryId;
    const itemCategory = await getCategoryInfoByCategoryId(itemCategoryId);
    const itemCategorySlug = itemCategory ? itemCategory.meta.slug : 'uncategorized';

    let shouldDisplay = false;
    if (currentFilter === 'all') {
      shouldDisplay = true;
    } else if (currentFilter === 'product') {
      shouldDisplay = item.meta.type === 'product';
    } else if (currentFilter === 'service') {
      shouldDisplay = item.meta.type === 'service';
    } else {
      shouldDisplay = itemCategorySlug === currentFilter;
    }

    if (shouldDisplay) {
      let cardElement = createListCard(item, cartViewConfig);
      if (cardElement) {
        cartItemsContainer.appendChild(cardElement);
        displayedItems.push(item);

        const noteElement = cardElement.querySelector('.note-label');
        if (noteElement) {
            noteElement.addEventListener('click', () => {
                const newNote = prompt('Edit your note for this item:', item.cart.note || '');
                if (newNote !== null) {
                    window.updateCartItemNote(item.meta.itemId, newNote);
                    // The 'cartItemsChanged' event will trigger a re-render to show the updated note
                }
            });
        }
      }
    }
  }

  updateCartTotalDisplay(displayedItems);
  document.querySelector(".cart-btn").innerText = "Request All";
}

// New function to update a single card's display without full re-render
function updateCardDisplay(item) {
    const cardElement = document.getElementById(`card-${item.meta.itemId}`);
    if (cardElement) {
        // Update quantity selector value
        const qtySelect = cardElement.querySelector(`#qty-select-${item.meta.itemId}`);
        if (qtySelect) {
            qtySelect.value = item.cart.qty;
        }

        // Update selling price
        const sellingPriceElement = cardElement.querySelector('.selling-price');
        if (sellingPriceElement) {
            const sellingPriceField = cartViewConfig.fields.find(f => f.key === 'pricing.sellingPrice');
            if (sellingPriceField && sellingPriceField.formatter) {
                sellingPriceElement.innerText = sellingPriceField.formatter(item.pricing.sellingPrice, item);
            }
        }

        // Update MRP (max price)
        const maxPriceElement = cardElement.querySelector('.max-price');
        const mrpField = cartViewConfig.fields.find(f => f.key === 'pricing.mrp' && f.selector === '.max-price');
        if (maxPriceElement) {
            if (mrpField && mrpField.visible(item)) {
                maxPriceElement.innerText = mrpField.formatter(item.pricing.mrp, item);
                maxPriceElement.style.display = ''; // Ensure it's visible
            } else {
                maxPriceElement.style.display = 'none'; // Hide if not visible
            }
        }

        // Update discount
        const discountElement = cardElement.querySelector('.card-discount');
        const discountField = cartViewConfig.fields.find(f => f.key === 'pricing.mrp' && f.selector === '.card-discount');
        if (discountElement) {
            if (discountField && discountField.visible(item)) {
                discountElement.innerText = discountField.formatter(item.pricing.mrp, item);
                discountElement.style.display = ''; // Ensure it's visible
            } else {
                discountElement.style.display = 'none'; // Hide if not visible
            }
        }

        // Update note
        const noteContentElement = cardElement.querySelector('.card-note .note-content');
        if (noteContentElement) {
            const noteField = cartViewConfig.fields.find(f => f.key === 'cart.note');
            if (noteField && noteField.formatter) {
                // Extract the display text from the formatter's output
                const formattedHtml = noteField.formatter(item.cart.note);
                const doc = parser.parseFromString(formattedHtml, 'text/html');
                const extractedText = doc.querySelector('.note-content').textContent;
                noteContentElement.textContent = extractedText;
            } else {
                noteContentElement.textContent = item.cart.note || 'Click to add a note';
            }
        }
    }
}

/**
 * Filters the cart items based on the current active filter tab.
 * @returns {Promise<Array>} A promise that resolves to an array of filtered items.
 */
async function getFilteredCartItems() {
    const allCartItems = await getCartItemsManager();
    if (currentFilter === 'all') {
        return allCartItems;
    }
    if (currentFilter === 'product' || currentFilter === 'service') {
        return allCartItems.filter(item => item.meta.type === currentFilter);
    }
    // Handle category slugs
    const allCategories = await fetchAllCategories(true);
    const categoryIdToFilter = allCategories.find(cat => cat.meta.slug === currentFilter)?.meta.categoryId;
    if (categoryIdToFilter) {
        return allCartItems.filter(item => item.meta.links.categoryId === categoryIdToFilter);
    }
    return allCartItems; // Fallback to all items if filter is unknown
}

window.updateQty = function(itemId, qty) {
  console.log(`Updating quantity for itemId: ${itemId} to ${qty}`);
  const item = cart.items.find(i => i.meta.itemId === itemId && i.meta.type === "product");
  if (item) {
    item.cart.qty = parseInt(qty);
    saveCartToLocalStorage(cart.items, { type: 'update', item });
  }
};
function updateCartTotalDisplay(itemsToTotal) {
  let total = 0;
  itemsToTotal.forEach(item => {
    total += (item.pricing.sellingPrice * item.cart.qty);
  });
  document.getElementById("cardTotal").innerText = total.toFixed(2);
}

window.updateDate = function(itemId, dateValue) {
  const item = cart.items.find(i => i.meta.itemId === itemId && i.meta.type === "service");
  if (item) {
    item.cart.selectedDate = dateValue;
    saveCartToLocalStorage(cart.items, { type: 'update', item });
  }
  }

window.removeItem = function(itemId) {
  const initialLength = cart.items.length;
  cart.items = cart.items.filter(i => i.meta.itemId !== itemId);
  if (cart.items.length < initialLength) {
    saveCartToLocalStorage(cart.items, { type: 'remove', itemId });
  }
};

window.updateCartItemNote = updateCartItemNote;

let isCartInitialized = false; // Flag to prevent multiple initializations
let isInitializing = false; // Flag to prevent race conditions during init

export async function init() {
  // If initialization is already in progress, or has completed,
  // a simple re-render is enough. Don't re-setup everything.
  if (isInitializing || isCartInitialized) {
    requestRender(); // If already init or in progress, just request a re-render.
    return;
  }

  isInitializing = true;

  await initCardHelper(null);

  const startShoppingBtn = document.getElementById('start-shopping-btn');
  if(startShoppingBtn) {
    startShoppingBtn.addEventListener('click', () => {
        window.viewManager.switchView('guest', 'home');
    });
  }

  // Initialize the global FilterBarManager for the cart view
  const cartFilterBarPlaceholder = document.getElementById('cart-filter-bar');
  cartFilterBarManager = initializeFilterBarManager(cartFilterBarPlaceholder, await getGlobalFilterTabs(), 'cart');
  cartFilterBarManager.manageVisibility(false); // Initially hide the filter bar

  // Initialize the filter modal manager for the cart view
  const cartFilterModalPlaceholder = document.getElementById('cart-filter-modal');
  const initModalManager = initializeFilterModalManager();
  const filterModalManager = initModalManager(cartFilterModalPlaceholder);

  isCartInitialized = true; // Mark setup as complete before adding listeners

  // Add event listeners only if they haven't been added yet
  if (!window._cartEventListenersAdded) {
    window.addEventListener('filterChanged', (event) => {
      if (event.detail.viewId !== 'cart') return; // Ignore events from other views
      currentFilter = event.detail.filter;
      requestRender();
    });

    window.addEventListener('advancedFilterApplied', (event) => {
      if (event.detail.viewId !== 'cart') return; // Ignore events from other views
      const { sort } = event.detail;
      currentSort = sort;
      requestRender();
    });

    window.addEventListener('cartItemsChanged', async (event) => {
      // If initialization is in progress, skip this event handler.
      // The init() function will handle the final render.
      if (isInitializing) {
        return;
      }

      // If initialization is in progress, skip this event handler.
      // The init() function will handle the final render.
      if (isInitializing) {
        return;
      }

      const detail = event.detail || { type: 'full_refresh' };
      cart.items = await getCartItemsManager(); // Refresh local cart state

      // If cart is not empty, re-initialize the filter bar to get correct tabs.
      // If it IS empty, just ensure it's hidden.
      if (cart.items.length > 0) {
        cartFilterBarManager = initializeFilterBarManager(cartFilterBarPlaceholder, await getGlobalFilterTabs(), 'cart');
      }
      cartFilterBarManager.manageVisibility(cart.items.length > 0);

      switch (detail.type) {
        // --- FIX: Force a full refresh on 'add' to prevent race conditions ---
        case 'add':
          // Re-initialize filter bar with updated tabs
          cartFilterBarManager = initializeFilterBarManager(cartFilterBarPlaceholder, await getGlobalFilterTabs(), 'cart');
          cartFilterBarManager.manageVisibility(cart.items.length > 0);
          requestRender(); // Perform a full re-render
          break;
        case 'update':
          // Fetch the updated item from the cart.items array
          const updatedItem = cart.items.find(item => item.meta.itemId === detail.itemId);
          if (updatedItem) {
            updateCardDisplay(updatedItem);
            const filteredItems = await getFilteredCartItems();
            updateCartTotalDisplay(filteredItems);
          }
          break;
     
        case 'remove':
          // The cart.items array is already updated. Check if it's now empty.
          if (cart.items.length === 0) {
            // If the cart is now empty, a full re-render is needed to show the empty cart view.
            // The `manageVisibility` call at the top of the listener has already correctly hidden the filter bar.
            requestRender();
          }
          else if (detail.itemId) {
            // If not empty, just remove the specific card for better performance.
            const cardToRemove = document.getElementById(`card-${detail.itemId}`);
            if (cardToRemove) {
              cardToRemove.remove();
            }
            const filteredItemsAfterRemove = await getFilteredCartItems();
            updateCartTotalDisplay(filteredItemsAfterRemove);
          }
          break;
        default: // 'add', 'clear', 'full_refresh' or any other case
          // Re-initialize filter bar with updated tabs
          cartFilterBarManager = initializeFilterBarManager(cartFilterBarPlaceholder, await getGlobalFilterTabs(), 'cart');
          // Ensure the filter bar's visibility is managed
          cartFilterBarManager.manageVisibility(cart.items.length > 0);
          // Perform a full re-render
          requestRender();
          break;
      }
    });

    window._cartEventListenersAdded = true;
  }

  // Always trigger initial render when init is called
  requestRender();
  isInitializing = false; // Mark initialization as complete
}