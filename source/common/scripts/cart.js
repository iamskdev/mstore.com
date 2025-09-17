import { createListCard, initCardHelper } from '../../components/cards/card-helper.js';
import { getCartItems as getCartItemsManager, saveCartToLocalStorage } from '../../utils/cart-manager.js';

let activeTab = "products"; // products or services
let cart = {};

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

// ⭐ Render Cart (Refactored to use reusable card-list.html)
async function rendercard() {
  const productsPanel = document.getElementById("products-tab-panel");
  const servicesPanel = document.getElementById("services-tab-panel");

  cart.items = await getCartItemsManager(); // Fetch real data from cart-manager

  const currentPanel = activeTab === "products" ? productsPanel : servicesPanel;
  const otherPanel = activeTab === "products" ? servicesPanel : productsPanel;

  // Clear the other panel completely
  otherPanel.innerHTML = "";

  // Get current item IDs in the cart for the active tab
  const activeTabItems = cart.items.filter(item => item.meta.type === activeTab.slice(0, -1));
  const activeTabItemIds = new Set(activeTabItems.map(item => item.meta.itemId));

  // Remove cards that are no longer in the cart or switched tabs
  Array.from(currentPanel.children).forEach(cardElement => {
    const itemId = cardElement.dataset.itemId;
    if (!activeTabItemIds.has(itemId)) {
      cardElement.remove();
    }
  });

  // Add or update cards for items in the cart
  activeTabItems.forEach(item => {
    let cardElement = document.getElementById(`card-${item.meta.itemId}`);
    if (!cardElement) {
      // Card does not exist, create and append it
      cardElement = createListCard(item, cartViewConfig);
      if (cardElement) {
        currentPanel.appendChild(cardElement);
      } else {
        console.warn('rendercard: cardElement was null or undefined for item:', item.meta.itemId);
      }
    } else {
      // Card exists, update its content if necessary (e.g., if item details changed)
      // Re-render the card and replace the old one to ensure all fields are updated
      const updatedCardElement = createListCard(item, cartViewConfig);
      if (updatedCardElement) {
        cardElement.replaceWith(updatedCardElement);
      } else {
        console.warn('rendercard: updatedCardElement was null or undefined for item:', item.meta.itemId);
      }
    }
  });

  updateCartTotalDisplay(); // Update the overall cart total
  document.querySelector(".cart-btn").innerText = "Request All";
}


// ⭐ Update Qty
window.updateQty = function(itemId, qty) {
  const item = cart.items.find(i => i.meta.itemId === itemId && i.meta.type === "product");
  if (item) {
    item.cart.qty = parseInt(qty);
    saveCartToLocalStorage(cart.items); // Save changes to local storage using cart-manager

    // Update the quantity display on the existing card
    const cardElement = document.getElementById(`card-${itemId}`);
    if (cardElement) {
      const quantitySelect = cardElement.querySelector('.quantity-select'); // Select the dropdown
      if (quantitySelect) {
        quantitySelect.value = item.cart.qty; // Update the dropdown's selected value
      }
      // Also update the total price for the item on the card
      const sellingPriceElement = cardElement.querySelector('.selling-price');
      const maxPriceElement = cardElement.querySelector('.max-price');
      if (sellingPriceElement) {
        sellingPriceElement.textContent = `₹${(item.pricing.sellingPrice * item.cart.qty).toFixed(2)}`;
      }
      if (maxPriceElement && item.pricing.mrp > item.pricing.sellingPrice) {
        maxPriceElement.textContent = `₹${(item.pricing.mrp * item.cart.qty).toFixed(2)}`;
      }
    }
    updateCartTotalDisplay(); // Update the overall cart total
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

// ⭐ Switch Tab
window.switchTab = function(tab) {
  activeTab = tab;
  document.getElementById("tabProducts").classList.remove("active");
  document.getElementById("tabServices").classList.remove("active");
  document.getElementById("products-tab-panel").classList.remove("active");
  document.getElementById("services-tab-panel").classList.remove("active");

  if (tab === "products") {
    document.getElementById("tabProducts").classList.add("active");
    document.getElementById("products-tab-panel").classList.add("active");
  } else {
    document.getElementById("tabServices").classList.add("active");
    document.getElementById("services-tab-panel").classList.add("active");
  }
  rendercard();
};

// ⭐ Swipe Tabs
const tabPanels = document.querySelector(".cart-container");
let touchstartX = 0, touchstartY = 0;
let touchendX = 0, touchendY = 0;

const swipeThreshold = 30; // Minimum pixels for a swipe
const verticalThreshold = 30; // Maximum vertical deviation for a horizontal swipe

function handleGesture() {
  const diffX = touchendX - touchstartX;
  const diffY = touchendY - touchstartY;

  // Check if it's primarily a horizontal swipe and exceeds threshold
  if (Math.abs(diffX) > swipeThreshold && Math.abs(diffY) < verticalThreshold) {
    if (diffX < 0 && activeTab === "products") {
      switchTab("services");
    } else if (diffX > 0 && activeTab === "services") {
      switchTab("products");
    }
  }
}

tabPanels.addEventListener("touchstart", e => {
  touchstartX = e.changedTouches[0].screenX;
  touchstartY = e.changedTouches[0].screenY;
}, { passive: true });

tabPanels.addEventListener("touchmove", e => {
  touchendX = e.changedTouches[0].screenX;
  touchendY = e.changedTouches[0].screenY;
});

tabPanels.addEventListener("touchend", handleGesture);

// Init
rendercard();

export async function init() {
  await initCardHelper(null); // Initialize card helper
  rendercard();

  // Add event listeners for tab switching
  const tabProducts = document.getElementById("tabProducts");
  const tabServices = document.getElementById("tabServices");

  if (tabProducts) {
    tabProducts.addEventListener("click", () => switchTab("products"));
  }
  if (tabServices) {
    tabServices.addEventListener("click", () => switchTab("services"));
  }

  // Listen for cart changes to update UI dynamically
  window.addEventListener('cartItemsChanged', rendercard);
}
