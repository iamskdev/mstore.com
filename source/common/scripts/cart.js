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
  console.log('rendercard: cartItemsContainer:', cartItemsContainer);
  console.log('rendercard: Before clearing, children count:', cartItemsContainer.children.length);

  // Clear existing cards explicitly
  while (cartItemsContainer.firstChild) {
    cartItemsContainer.removeChild(cartItemsContainer.firstChild);
  }
  console.log('rendercard: After clearing, children count:', cartItemsContainer.children.length);

  cart.items = await getCartItemsManager();
  console.log('rendercard: Fetched cart.items for rendering:', cart.items.map(i => i.meta.itemId));

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
        console.log('rendercard: Appending card for itemId:', item.meta.itemId, 'cardElement ID:', cardElement.id);
        cartItemsContainer.appendChild(cardElement);
        console.log('rendercard: After appending, children count:', cartItemsContainer.children.length);
      }
    }
  }

  updateCartTotalDisplay();
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
    }
}

window.updateQty = function(itemId, qty) {
  console.log(`Updating quantity for itemId: ${itemId} to ${qty}`);
  const item = cart.items.find(i => i.meta.itemId === itemId && i.meta.type === "product");
  if (item) {
    item.cart.qty = parseInt(qty);
    saveCartToLocalStorage(cart.items, false); // Pass false to prevent dispatching cartItemsChanged event
    updateCardDisplay(item); // Update the specific card's display
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

window.updateDate = function(itemId, dateValue) {
  const item = cart.items.find(i => i.meta.itemId === itemId && i.meta.type === "service");
  if (item) {
    item.cart.selectedDate = dateValue;
    saveCartToLocalStorage(cart.items, false); // Pass false to prevent dispatching cartItemsChanged event
  }
  // rendercard(); // Removed direct call
};

window.removeItem = function(itemId) {
  const initialLength = cart.items.length;
  cart.items = cart.items.filter(i => i.meta.itemId !== itemId);
  if (cart.items.length < initialLength) { // Only update if an item was actually removed
    saveCartToLocalStorage(cart.items, false); // Prevent full refresh
    const cardElement = document.getElementById(`card-${itemId}`);
    if (cardElement) {
      cardElement.remove(); // Remove the card from the DOM
    }
    updateCartTotalDisplay(); // Update the overall cart total
  }
  // rendercard(); // Removed direct call
};


export async function init() {
  await initCardHelper(null);

  // Add event listeners only if they haven't been added yet
  if (!window._cartEventListenersAdded) {
    window.addEventListener('filterChanged', (event) => {
      currentFilter = event.detail.filter;
      rendercard();
    });

    window.addEventListener('advancedFilterApplied', (event) => {
      const { sort } = event.detail;
      currentSort = sort;
      rendercard();
    });

    window.addEventListener('cartItemsChanged', rendercard);

    window._cartEventListenersAdded = true;
  }

  // Always trigger initial render when init is called
  rendercard();
}