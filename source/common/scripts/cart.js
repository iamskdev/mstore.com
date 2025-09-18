import { createListCard, initCardHelper } from '../../components/cards/card-helper.js';
import { getCartItems as getCartItemsManager, saveCartToLocalStorage } from '../../utils/cart-manager.js';
import { getFilterManager } from '../../utils/filter-helper.js';
import { fetchAllCategories } from '../../utils/data-manager.js';
import { loadComponent } from '../../main.js';

let currentFilter = 'all';
let cart = {};
let allCategoriesMap = {};
let currentAdvancedFilters = {};

function _formatSlugForDisplay(slug = '') {
    if (!slug) return '';
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

async function getCategoryInfoByCategoryId(categoryId) {
    if (!allCategoriesMap[categoryId]) {
        const allCategories = await fetchAllCategories(true);
        allCategories.forEach(cat => { allCategoriesMap[cat.meta.categoryId] = cat; });
    }
    return allCategoriesMap[categoryId] || null;
}

const cartViewConfig = {
    fields: [
        { key: 'info.name', selector: '.card-title', visible: true },
        { key: 'media.thumbnail', selector: '.card-image', type: 'image', default: './localstore/images/default-product.jpg' },
        { key: 'pricing.sellingPrice', selector: '.selling-price', visible: true, formatter: (price, item) => `₹${(price * item.cart.qty).toFixed(2)}` },
        { key: 'pricing.mrp', selector: '.max-price', visible: (item) => item.pricing.mrp > item.pricing.sellingPrice, formatter: (mrp, item) => `₹${(mrp * item.cart.qty).toFixed(2)}` },
        { selector: '.cost-price', visible: false },
        { key: 'analytics.rating', selector: '.stars', visible: true },
        { key: 'stock.status', selector: '.stock-status', visible: true },
        { key: 'info.description', selector: '.card-note', visible: true },
        { key: 'pricing.mrp', selector: '.card-discount', visible: (item) => item.pricing.mrp > item.pricing.sellingPrice, formatter: (mrp, item) => {
            const discount = ((item.pricing.mrp - item.pricing.sellingPrice) / item.pricing.mrp) * 100;
            return `${discount.toFixed(0)}% off`;
        }},
    ],
    buttons: [
        { type: 'quantitySelector', visible: (item) => item.meta.type === 'product', action: 'UPDATE_CART_QUANTITY' },
        { label: 'Select Date', action: 'SELECT_SERVICE_DATE', class: 'btn-secondary', visible: (item) => item.meta.type === 'service' },
        { label: 'Request', action: 'REQUEST_ITEM', class: 'btn-primary', visible: true },
        { label: 'Save for Later', action: 'SAVE_FOR_LATER', class: 'btn-secondary', visible: true },
        { label: 'Remove', action: 'REMOVE_FROM_CART', class: 'btn-danger', visible: true }
    ],
    actionHandlers: {
        'UPDATE_CART_QUANTITY': (item, newQuantity) => window.updateQty(item.meta.itemId, newQuantity),
        'SELECT_SERVICE_DATE': (item, newDate) => { if (newDate) window.updateDate(item.meta.itemId, newDate); },
        'REQUEST_ITEM': (item) => console.log(`Requesting item: ${item.info.name}`),
        'SAVE_FOR_LATER': (item) => console.log(`Saving ${item.info.name} for later.`),
        'REMOVE_FROM_CART': (item) => window.removeItem(item.meta.itemId),
    }
};

function applyFilters(items, filterValue, advancedFilters = {}) {
    let filtered = items;

    if (filterValue === 'product') {
        filtered = filtered.filter(item => item.meta.type === 'product');
    } else if (filterValue === 'service') {
        filtered = filtered.filter(item => item.meta.type === 'service');
    } else if (filterValue !== 'all') {
        const categoryIdToFilter = Object.values(allCategoriesMap).find(cat => cat.meta.slug === filterValue)?.meta.categoryId;
        if (categoryIdToFilter) {
            filtered = filtered.filter(item => item.meta.links.categoryId === categoryIdToFilter);
        }
    }

    if (advancedFilters.sort && advancedFilters.sort !== 'relevance') {
        filtered = [...filtered].sort((a, b) => {
            switch (advancedFilters.sort) {
                case 'price-asc': return a.pricing.sellingPrice - b.pricing.sellingPrice;
                case 'price-desc': return b.pricing.sellingPrice - a.pricing.sellingPrice;
                case 'name-asc': return a.info.name.localeCompare(b.info.name);
                case 'name-desc': return b.info.name.localeCompare(a.info.name);
                default: return 0;
            }
        });
    }

    return filtered;
}

async function rendercard() {
    const cartItemsContainer = document.getElementById("cart-items-container");
    cartItemsContainer.innerHTML = "";

    cart.items = await getCartItemsManager();
    const itemsToRender = applyFilters(cart.items, currentFilter, currentAdvancedFilters);

    for (const item of itemsToRender) {
        let cardElement = createListCard(item, cartViewConfig);
        if (cardElement) {
            cartItemsContainer.appendChild(cardElement);
        }
    }

    updateCartTotalDisplay();
    document.querySelector(".cart-btn").innerText = "Request All";
}

window.updateQty = function(itemId, qty) {
    const item = cart.items.find(i => i.meta.itemId === itemId);
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
    const item = cart.items.find(i => i.meta.itemId === itemId);
    if (item) {
        item.cart.selectedDate = dateValue;
        saveCartToLocalStorage(cart.items);
        rendercard();
    }
};

window.removeItem = function(itemId) {
    cart.items = cart.items.filter(i => i.meta.itemId !== itemId);
    saveCartToLocalStorage(cart.items);
    rendercard();
};

export async function init() {
    const filterManager = getFilterManager();
    filterManager.setLoadComponent(loadComponent);
    filterManager.setActiveView('cart');

    await initCardHelper(null);
    await rendercard();

    const customTabs = [
        { label: 'All', filter: 'all' },
        { label: 'Products', filter: 'product' },
        { label: 'Services', filter: 'service' }
    ];

    const categoryIdsInCart = new Set(cart.items.map(item => item.meta.links.categoryId));
    for (const categoryId of categoryIdsInCart) {
        const category = await getCategoryInfoByCategoryId(categoryId);
        if (category && !customTabs.some(tab => tab.filter === category.meta.slug)) {
            customTabs.push({ label: _formatSlugForDisplay(category.meta.slug), filter: category.meta.slug });
        }
    }

    const filterPlaceholder = document.getElementById('filter-bar-placeholder');
    if (filterPlaceholder) {
        await filterManager.createFilterBar(filterPlaceholder, { tabs: customTabs });
    }

    window.addEventListener('filterChanged', (event) => {
        currentFilter = event.detail.filter;
        rendercard();
    });

    window.addEventListener('advancedFilterApplied', (event) => {
        if (event.detail.view === 'cart') {
            currentAdvancedFilters = event.detail.filters;
            rendercard();
        }
    });

    window.addEventListener('cartItemsChanged', rendercard);
}