import { createCartCardElement, initCardHelper } from '../../components/cards/card-helper.js';
import { getCartItems as getCartItemsManager, saveCartToLocalStorage } from '../../utils/cart-manager.js';

let activeTab = "products"; // products or services
let cart = {};

// Removed CART_STORAGE_KEY as cart-manager handles it

// Removed local getCartItems and saveCartItems as cart-manager provides them

// ⭐ Render Cart (Refactored to use reusable card-list.html)
async function rendercard() {
  const productsPanel = document.getElementById("products-tab-panel");
  const servicesPanel = document.getElementById("services-tab-panel");
  productsPanel.innerHTML = "";
  servicesPanel.innerHTML = "";

  cart.items = await getCartItemsManager(); // Fetch real data from cart-manager

  let total = 0;
  const data = cart.items.filter(item => item.type === activeTab.slice(0, -1));

  console.log('rendercard: Current cart.items:', cart.items);
  data.forEach(item => {
    item.cart.subtotal = item.pricing.price * item.cart.qty;
    total += item.cart.subtotal;

    const cardElement = createCartCardElement(item); // Use the new helper function
    console.log('rendercard: Created cardElement for item:', item.meta.itemId, cardElement);
    const panel = item.type === "product" ? productsPanel : servicesPanel;
    if (cardElement) {
      panel.appendChild(cardElement); // Append the actual element
    } else {
      console.warn('rendercard: cardElement was null or undefined for item:', item.meta.itemId);
    }
  });

  document.getElementById("cardTotal").innerText = total.toFixed(2);
  document.querySelector(".btn-order").innerText = "Place Order";
}


// ⭐ Update Qty
window.updateQty = function(itemId, qty) {
  const item = cart.items.find(i => i.itemId === itemId && i.type === "product");
  if (item) {
    item.cart.qty = parseInt(qty);
    saveCartToLocalStorage(cart.items); // Save changes to local storage using cart-manager
  }
  rendercard();
};

// ⭐ Update Date
window.updateDate = function(itemId, dateValue) {
  const item = cart.items.find(i => i.itemId === itemId && i.type === "service");
  if (item) {
    item.cart.selectedDate = dateValue;
    document.getElementById(`date-text-${itemId}`).textContent = dateValue || "Select Date";
  }
};

// ⭐ Remove Item
window.removeItem = function(itemId) {
  cart.items = cart.items.filter(i => i.itemId !== itemId);
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
