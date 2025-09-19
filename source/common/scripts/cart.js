import { createListCard, initCardHelper } from '../../components/cards/card-helper.js';
import { getCartItems as getCartItemsManager, saveCartToLocalStorage } from '../../utils/cart-manager.js';
import { initializeFilterManager } from '../../utils/filter-helper.js';
import { fetchAllCategories } from '../../utils/data-manager.js';

let currentFilter = "all"; // products or services
let cart = {};
let filterManagerInstance;

// Local utility to format slug for display (moved from filter-helper.js for local use)
function _formatSlugForDisplay(slug = '') {
    if (!slug) return '';
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Local utility to get category info by ID (moved from filter-helper.js for local use)
async function getCategoryInfoByCategoryId(categoryId) {
    if (!categoryId) return null;
    const allCategories = await fetchAllCategories(true);
    return allCategories.find(cat => cat.meta.categoryId === categoryId) || null;
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
        { selector: '.cost-price', visible: false }, // As requested: not visible
        { key: 'analytics.rating', selector: '.stars', visible: true }, // Use analytics.rating for consistency with grid cards
        { key: 'stock.status', selector: '.stock-status', visible: true }, // As requested: show stock
        { key: 'info.description', selector: '.card-note', visible: true }, // As requested: show description
        { 
            key: 'pricing.mrp', // Use mrp to calculate discount
            selector: '.card-discount', 
            visible: (item) => item.pricing.mrp > item.pricing.sellingPrice, // Only show if there's a discount
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
    components: [
        // Moved to buttons array as per user request
    ],
    buttons: [
        {
            type: 'quantitySelector', // Moved from components
            visible: (item) => item.meta.type === 'product',
            action: 'UPDATE_CART_QUANTITY'
        },
        {
            label: 'Select Date', // Initial label for date
            action: 'SELECT_SERVICE_DATE',
            class: 'btn-secondary',
            visible: (item) => item.meta.type === 'service'
        },
        { label: 'Request', action: 'REQUEST_ITEM', class: 'btn-primary', visible: true },
        { label: 'Save for Later', action: 'SAVE_FOR_LATER', class: 'btn-secondary', visible: true },
        { label: 'Remove', action: 'REMOVE_FROM_CART', class: 'btn-danger', visible: true }
    ],
    actionHandlers: {
        'UPDATE_CART_QUANTITY': (item, newQuantity) => {
            window.updateQty(item.meta.itemId, newQuantity);
        },
        'SELECT_SERVICE_DATE': (item, newDate) => {
            if (newDate) {
                window.updateDate(item.meta.itemId, newDate);
            }
        },
        'REQUEST_ITEM': (item) => {
            console.log(`Requesting item: ${item.info.name}`);
            // Implement request logic
        },
        'SAVE_FOR_LATER': (item) => {
            console.log(`Saving ${item.info.name} for later.`);
            // Implement save for later logic
        },
        'REMOVE_FROM_CART': (item) => {
            window.removeItem(item.meta.itemId);
        }
    }
};

// Removed CART_STORAGE_KEY as cart-manager handles it

// Removed local getCartItems and saveCartItems as cart-manager provides them

// ⭐ Render Cart (Refactored to use reusable card-list.html and group by main category)
async function rendercard() {
  const cartItemsContainer = document.getElementById("cart-items-container");
  cartItemsContainer.innerHTML = ""; // Clear the container completely before re-rendering

  cart.items = await getCartItemsManager(); // Fetch real data from cart-manager

  // Group items by main category
  const groupedItems = new Map(); // Map<categoryId, Array<item>>

  for (const item of cart.items) {
    const categoryId = item.meta.links.categoryId;
    const category = await getCategoryInfoByCategoryId(categoryId); // Only get main category info

    const categoryKey = category ? category.meta.slug : 'uncategorized'; // Use slug as key
    const categoryDisplayName = category ? _formatSlugForDisplay(category.meta.slug) : 'Uncategorized';

    if (!groupedItems.has(categoryKey)) {
      groupedItems.set(categoryKey, {
        displayName: categoryDisplayName,
        items: []
      });
    }
    groupedItems.get(categoryKey).items.push(item);
  }

  // Render grouped items
  for (const [categoryKey, data] of groupedItems.entries()) {
    // Only render if there are items in this category and it's not the 'uncategorized' fallback
    if (data.items.length > 0 && categoryKey !== 'uncategorized') {
      // Append items for this category
      for (const item of data.items) {
        console.log('Processing item:', item.meta.itemId, 'Type:', item.meta.type);
        let cardElement = createListCard(item, cartViewConfig);
        if (cardElement) {
          console.log('Card created for item:', item.meta.itemId);
          // Set display style based on current filter
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
          cardElement.style.display = shouldDisplay ? '' : 'none';
          cartItemsContainer.appendChild(cardElement);
          console.log('Card appended for item:', item.meta.itemId);
        } else {
          console.warn('rendercard: cardElement was null or undefined for item:', item.meta.itemId);
        }
      }
    }
  }

  updateCartTotalDisplay(); // Update the overall cart total
  document.querySelector(".cart-btn").innerText = "Request All";
}

// ⭐ Update Qty
window.updateQty = function(itemId, qty) {
  const item = cart.items.find(i => i.meta.itemId === itemId && i.meta.type === "product");
  if (item) {
    item.cart.qty = parseInt(qty);
    saveCartToLocalStorage(cart.items); // Save changes to local storage using cart-manager
    rendercard(); // Re-render the entire cart
  }
};

function updateCartTotalDisplay() {
  let total = 0;
  cart.items.forEach(item => {
    total += (item.pricing.sellingPrice * item.cart.qty);
  });
  document.getElementById("cardTotal").innerText = total.toFixed(2);
}

// ⭐ Update Date
window.updateDate = function(itemId, dateValue) {
  const item = cart.items.find(i => i.meta.itemId === itemId && i.meta.type === "service");
  if (item) {
    item.cart.selectedDate = dateValue;
    saveCartToLocalStorage(cart.items); // Save changes to local storage
  }
  rendercard(); // Re-render to show the updated date on the button
};

// ⭐ Remove Item
window.removeItem = function(itemId) {
  cart.items = cart.items.filter(i => i.meta.itemId !== itemId);
  saveCartToLocalStorage(cart.items); // Save changes to local storage using cart-manager
  rendercard();
};

// Init
rendercard();

export async function init() {
  await initCardHelper(null); // Initialize card helper
  await rendercard(); // Ensure cart items are loaded before initializing filter manager

  // Determine categories in cart to create custom tabs
  const customTabs = [
    { label: 'All', filter: 'all' },
    { label: 'Products', filter: 'product' },
    { label: 'Services', filter: 'service' }
  ];

  // Optionally, add dynamic category tabs if needed, but prioritize product/service filters
  const categoryIdsInCart = new Set(cart.items.map(item => item.meta.links.categoryId));
  for (const categoryId of categoryIdsInCart) {
    const category = await getCategoryInfoByCategoryId(categoryId);
    if (category && !customTabs.some(tab => tab.filter === category.meta.slug)) { // Avoid duplicates
      customTabs.push({ label: _formatSlugForDisplay(category.meta.slug), filter: category.meta.slug });
    }
  }

  console.log('Generated customTabs:', customTabs);

  // Initialize FilterManager for the cart view with custom tabs
    filterManagerInstance = initializeFilterManager(async (placeholder, componentPath) => {
    const response = await fetch(componentPath);
    placeholder.innerHTML = await response.text();
  }, customTabs); // Pass customTabs here

  filterManagerInstance.manageVisibility(true); // Show the filter bar

  // Listen for filter changes from the filter bar
  window.addEventListener('filterChanged', (event) => {
    currentFilter = event.detail.filter; // Update the current filter based on the event
    rendercard(); // Re-render the cart with the new filter
  });

  // Listen for cart changes to update UI dynamically
  window.addEventListener('cartItemsChanged', rendercard);
}
