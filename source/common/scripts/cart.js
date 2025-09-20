import { createListCard, initCardHelper } from '../../components/cards/card-helper.js';
import { getCartItems as getCartItemsManager, saveCartToLocalStorage } from '../../utils/cart-manager.js';
import { fetchAllCategories } from '../../utils/data-manager.js';

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
export async function getCartCustomTabs() {
    const cartItems = await getCartItemsManager();
    if (cartItems.length === 0) {
        return []; // Return empty array if cart is empty, so no tabs are shown
    }

    const customTabs = [{ label: 'All', filter: 'all' }];

    const hasProductsInCart = cartItems.some(item => item.meta.type === 'product');
    if (hasProductsInCart) {
        customTabs.push({ label: 'Products', filter: 'product' });
    }

    const hasServicesInCart = cartItems.some(item => item.meta.type === 'service');
    if (hasServicesInCart) {
        customTabs.push({ label: 'Services', filter: 'service' });
    }

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
        { key: 'info.description', selector: '.card-note', visible: true },
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
            class: 'btn-secondary',
            visible: (item) => item.meta.type === 'service'
        },
        { label: 'Request', action: 'REQUEST_ITEM', class: 'btn-primary', visible: true },
        { label: 'Save for Later', action: 'SAVE_FOR_LATER', class: 'btn-secondary', visible: true },
        { label: 'Remove', action: 'REMOVE_FROM_CART', class: 'btn-danger', visible: true }
    ],
    actionHandlers: {
        'UPDATE_CART_QUANTITY': (item, newQuantity) => window.updateQty(item.meta.itemId, newQuantity),
        'SELECT_SERVICE_DATE': (item, newDate) => {
            if (newDate) {
                window.updateDate(item.meta.itemId, newDate);
            }
        },
        'REQUEST_ITEM': (item) => console.log(`Requesting item: ${item.info.name}`),
        'SAVE_FOR_LATER': (item) => console.log(`Saving ${item.info.name} for later.`),
        'REMOVE_FROM_CART': (item) => window.removeItem(item.meta.itemId),
    }
};

async function rendercard() {
  const cartItemsContainer = document.getElementById("cart-items-container");
  cartItemsContainer.innerHTML = "";

  cart.items = await getCartItemsManager();

  cart.items.sort((a, b) => {
    const priceA = a.pricing.sellingPrice * a.cart.qty;
    const priceB = b.pricing.sellingPrice * b.cart.qty;
    switch (currentSort) {
      case 'price-asc': return priceA - priceB;
      case 'price-desc': return priceB - priceA;
      case 'newest': return (b.meta.timestamp || 0) - (a.meta.timestamp || 0);
      case 'rating-desc': return (b.analytics.rating || 0) - (a.analytics.rating || 0);
      default: return 0;
    }
  });

  const groupedItems = new Map();

  for (const item of cart.items) {
    const categoryId = item.meta.links.categoryId;
    const category = await getCategoryInfoByCategoryId(categoryId);
    const categoryKey = category ? category.meta.slug : 'uncategorized';
    const categoryDisplayName = category ? _formatSlugForDisplay(category.meta.slug) : 'Uncategorized';

    if (!groupedItems.has(categoryKey)) {
      groupedItems.set(categoryKey, { displayName: categoryDisplayName, items: [] });
    }
    groupedItems.get(categoryKey).items.push(item);
  }

  for (const [categoryKey, data] of groupedItems.entries()) {
    if (data.items.length > 0 && categoryKey !== 'uncategorized') {
      for (const item of data.items) {
        let cardElement = createListCard(item, cartViewConfig);
        if (cardElement) {
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
        }
      }
    }
  }

  updateCartTotalDisplay();
  document.querySelector(".cart-btn").innerText = "Request All";
}

window.updateQty = function(itemId, qty) {
  const item = cart.items.find(i => i.meta.itemId === itemId && i.meta.type === "product");
  if (item) {
    item.cart.qty = parseInt(qty);
    saveCartToLocalStorage(cart.items);
    rendercard();
  }
};

function updateCartTotalDisplay() {
  let total = 0;
  cart.items.forEach(item => {
    total += (item.pricing.sellingPrice * item.cart.qty);
  });
  document.getElementById("cardTotal").innerText = total.toFixed(2);
}

window.updateDate = function(itemId, dateValue) {
  const item = cart.items.find(i => i.meta.itemId === itemId && i.meta.type === "service");
  if (item) {
    item.cart.selectedDate = dateValue;
    saveCartToLocalStorage(cart.items);
  }
  rendercard();
};

window.removeItem = function(itemId) {
  cart.items = cart.items.filter(i => i.meta.itemId !== itemId);
  saveCartToLocalStorage(cart.items);
  rendercard();
};

rendercard();

export async function init() {
  await initCardHelper(null);
  await rendercard();

  

  // Listen for filter changes from the filter bar
  window.addEventListener('filterChanged', (event) => {
    currentFilter = event.detail.filter;
    rendercard();
  });

  // Listen for advanced filter changes from the filter modal
  window.addEventListener('advancedFilterApplied', (event) => {
    const { sort } = event.detail;
    currentSort = sort;
    rendercard();
  });

  // Listen for cart changes to update UI dynamically
  window.addEventListener('cartItemsChanged', rendercard);
}
