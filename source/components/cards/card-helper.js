let cardGridTemplate = ''; // Global variable to store the template for grid view
let cardListTemplate = ''; // Global variable to store the template for list view (cart)
let unitsData = {}; // Global variable to store units data

const DEFAULT_PRODUCT_IMAGE = './localstore/images/default-product.jpg';
const DEFAULT_SERVICE_IMAGE = './localstore/images/default-service.jpg';

/**
 * A simple template engine to replace placeholders and handle conditionals.
 * @param {string} template - The HTML template string.
 * @param {object} data - The data to populate the template with.
 * @returns {string} The populated HTML string.
 */
function renderTemplate(template, data) {
    let output = template;

    // Handle conditional blocks like {{#if condition}}...{{/if}}
    output = output.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, body) => {
        return data[condition] ? body : '';
    });

    // Replace all other placeholders
    for (const key in data) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        output = output.replace(regex, data[key]);
    }

    return output;
}

/**
 * Generates HTML for star rating display.
 * @param {number} rating - The rating value (e.g., 3.5).
 * @returns {string} HTML string for star display.
 */
function generateStarsHtml(rating) {
    let starsHtml = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<span class="filled">★</span>';
    }
    if (hasHalfStar) {
        starsHtml += '<span class="half">★</span>';
    }
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<span>★</span>';
    }
    return starsHtml;
}

/**
 * Creates a card element from the card-grid.html template.
 * @param {object} item - The item data (product or service).
 * @param {boolean} isSkeleton - If true, returns a skeleton card.
 * @returns {HTMLElement} The card element.
 */
export function createCardFromTemplate(item, isSkeleton = false) {
    console.log('createCardFromTemplate called for item:', item?.meta?.itemId);
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'card-wrapper';

    if (isSkeleton) {
        cardWrapper.innerHTML = `
            <a class="card skeleton-card">
                <div class="card-image-wrapper skeleton-image"></div>
                <div class="card-info">
                    <div class="name skeleton-text"></div>
                    <div class="price-container skeleton-text short"></div>
                    <div class="stock-status skeleton-text micro"></div>
                    <button class="add-to-cart skeleton-button"></button>
                </div>
            </a>
        `;
        return cardWrapper;
    }

    const originalPrice = item.pricing?.mrp;
    const currentPrice = item.pricing?.sellingPrice;

    // Find the unit symbol
    const unitInfo = unitsData[item.meta.unitId];
    let unitSymbol = '';
    if (unitInfo) {
        const attribute = Object.keys(item.info.attributes).find(key => unitInfo.subunits.find(s => s.code === item.info.attributes[key]));
        if (attribute) {
            const subunit = unitInfo.subunits.find(s => s.code === item.info.attributes[attribute]);
            if (subunit) {
                unitSymbol = subunit.symbol;
            }
        } else {
            // Fallback for units like 'pc' which may not have a corresponding attribute
            const defaultSubunit = unitInfo.subunits.find(s => s.isBaseUnit);
            if (defaultSubunit) {
                unitSymbol = defaultSubunit.symbol;
            }
        }
    }

    let stockStatusText, stockStatusClass, stockIconClass, addToCartDisabled, addToCartText, addToCartIconClass;

    if (item.meta.type === 'service') {
        if (item.meta.flags.isActive) {
            stockStatusText = 'Available';
            stockStatusClass = 'in';
            stockIconClass = 'fas fa-check-circle';
            addToCartText = 'Add to Cart';
            addToCartIconClass = 'fas fa-shopping-cart';
            addToCartDisabled = '';
        } else {
            stockStatusText = 'Unavailable';
            stockStatusClass = 'out';
            stockIconClass = 'fas fa-times-circle';
            addToCartText = 'Unavailable';
            addToCartIconClass = 'fas fa-exclamation-circle';
            addToCartDisabled = 'disabled';
        }
    }
    else {
        if (item.inventory?.stockQty > 0) {
            stockStatusText = 'In Stock';
            stockStatusClass = 'in';
            stockIconClass = 'fas fa-check-circle';
            addToCartText = 'Add to Cart';
            addToCartIconClass = 'fas fa-shopping-cart';
            addToCartDisabled = '';
        } else {
            stockStatusText = 'Out of Stock';
            stockStatusClass = 'out';
            stockIconClass = 'fas fa-times-circle';
            addToCartText = 'Out of Stock';
            addToCartIconClass = 'fas fa-exclamation-circle';
            addToCartDisabled = 'disabled';
        }
    }
    
    const templateData = {
        HREF: 'javascript:void(0);', // Disabled navigation to item-details
        ITEM_ID: item.meta.itemId,
        IMAGE_SRC: item.media?.thumbnail || (item.type === 'product' ? DEFAULT_PRODUCT_IMAGE : DEFAULT_SERVICE_IMAGE),
        ITEM_NAME: item.info.name,
        CURRENT_PRICE: currentPrice.toFixed(2),
        ORIGINAL_PRICE: originalPrice && originalPrice > currentPrice ? originalPrice.toFixed(2) : null,
        UNIT: (item.info.attributes?.weight || item.info.attributes?.volume) ? `/ ${item.info.attributes.weight || item.info.attributes.volume}` : (unitSymbol ? `/${unitSymbol}` : ''),
        STOCK_STATUS_CLASS: stockStatusClass,
        STOCK_ICON_CLASS: stockIconClass,
        STOCK_STATUS_TEXT: stockStatusText,
        STARS_HTML: generateStarsHtml(item.analytics?.rating || 0),
        NUM_REVIEWS: item.analytics?.numReviews || 0,
        RATING_VALUE: item.analytics?.rating || 0,
        
        ADD_TO_CART_DISABLED: addToCartDisabled,
        ADD_TO_CART_ICON_CLASS: addToCartIconClass,
        ADD_TO_CART_TEXT: addToCartText,
        DEFAULT_IMAGE_SRC: item.type === 'product' ? DEFAULT_PRODUCT_IMAGE : DEFAULT_SERVICE_IMAGE,
        IS_SAVED: item.isSaved || false,
        HEART_ICON_CLASS: item.isSaved ? 'fa-solid fa-heart' : 'far fa-heart',
    };

    cardWrapper.innerHTML = renderTemplate(cardGridTemplate, templateData);

    const cardElement = cardWrapper.querySelector('.card');
    if (cardElement) {
        cardElement.addEventListener('click', (e) => {
            // Only navigate if the click is not on the add-to-cart button
            if (!e.target.closest('.add-to-cart')) {
                sessionStorage.setItem('selectedItem', JSON.stringify(item));
                window.dispatchEvent(new CustomEvent('navigateToItem', { detail: item }));
            }
        });
    }

    return cardWrapper;
}

export async function initCardHelper(unitsDataParam) {
    try {
        const gridTemplateResponse = await fetch('./source/components/cards/card-grid.html');
        if (!gridTemplateResponse.ok) throw new Error(`Failed to fetch card-grid.html: ${gridTemplateResponse.statusText}`);
        cardGridTemplate = await gridTemplateResponse.text();

        const listTemplateResponse = await fetch('./source/components/cards/card-list.html');
        if (!listTemplateResponse.ok) throw new Error(`Failed to fetch card-list.html: ${listTemplateResponse.statusText}`);
        cardListTemplate = await listTemplateResponse.text();

        if (!document.getElementById('card-list-component-styles') && cardListTemplate.includes('<style>')) {
            const styleContent = cardListTemplate.substring(
                cardListTemplate.indexOf('<style>') + 7,
                cardListTemplate.lastIndexOf('</style>')
            );
            const styleElement = document.createElement('style');
            styleElement.id = 'card-list-component-styles';
            styleElement.textContent = styleContent;
            document.head.appendChild(styleElement);
        }

        unitsData = unitsDataParam; // Set the units data
    } catch (error) {
        console.error('Error initializing CardHelper:', error);
        // Optionally, handle error more gracefully, e.g., display a message
    }
}

/**
 * Creates a card element specifically for the cart view from the card-list.html template.
 * @param {object} item - The item data (product or service).
 * @returns {HTMLElement} The card element.
 */
export function createCartCardElement(item) {
    console.log('createCartCardElement called for item:', item?.meta?.itemId);
    
    const originalPrice = item.pricing?.mrp;
    const currentPrice = item.pricing?.sellingPrice;
    const discountPercentage = originalPrice && originalPrice > currentPrice ? ((originalPrice - currentPrice) / originalPrice * 100).toFixed(0) : '';

    // Cart specific data mapping
    const templateData = {
        CARD_NAME: item.info.name,
        SELLING_PRICE: (item.cart.subtotal || currentPrice).toFixed(2),
        MAX_PRICE: (item.pricing.mrp * item.cart.qty).toFixed(2),
        PRICE_DISCOUNT: discountPercentage ? `${discountPercentage}% off` : null,
        CARD_IMG: item.media?.thumbnail || (item.meta.type === 'product' ? DEFAULT_PRODUCT_IMAGE : DEFAULT_SERVICE_IMAGE),
        CARD_NOTE: `Quantity: ${item.cart.qty}`,
        LEFT_BTN: 'Save',
        RIGHT_BTN: 'Remove',
        FIRST_BTN: null,
        SECOND_BTN: null,
        STOCK_STATUS_CLASS: item.inventory?.stockQty > 0 ? 'in' : 'out',
        STATUS_ICON: item.inventory?.stockQty > 0 ? 'fas fa-check-circle' : 'fas fa-times-circle',
        CARD_STATUS: item.inventory?.stockQty > 0 ? 'In Stock' : 'Out of Stock',
        COST_PRICE: null,
        RATING_STARS: null,
        RATING_VALUE: null,
    };

    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = renderTemplate(cardListTemplate, templateData);

    const template = tempContainer.querySelector('template');
    if (!template) {
        console.error('createCartCardElement: Could not find template element in cardListTemplate.');
        return null;
    }

    const cardElement = template.content.cloneNode(true).querySelector('.card-body');

    if (cardElement) {
        // Conditional removal of elements not needed in cart view is now handled by the template

        // Add event listeners for the buttons (Save/Remove)
        const leftBtn = cardElement.querySelector('.left-btn');
        if (leftBtn) {
            leftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Cart Save button clicked for item:', item.meta.itemId);
                // Implement cart specific save logic here
            });
        }

        const rightBtn = cardElement.querySelector('.right-btn');
        if (rightBtn) {
            rightBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Cart Remove button clicked for item:', item.meta.itemId);
                window.removeItem(item.meta.itemId); // Call the global removeItem from cart.js
            });
        }
    }

    return cardElement;
}