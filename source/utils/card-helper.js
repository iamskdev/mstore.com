let cardGridTemplate = ''; // Global variable to store the template
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
 * Creates a card element from the card-grid.html template.
 * @param {object} item - The item data (product or service).
 * @param {boolean} isSkeleton - If true, returns a skeleton card.
 * @returns {HTMLElement} The card element.
 */
export function createCardFromTemplate(item, isSkeleton = false) {
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
    } else {
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
        HREF: `item-details.html?itemId=${item.meta.itemId}`,
        IMAGE_SRC: item.media?.thumbnail || (item.type === 'product' ? DEFAULT_PRODUCT_IMAGE : DEFAULT_SERVICE_IMAGE),
        ITEM_NAME: item.info.name,
        CURRENT_PRICE: currentPrice.toFixed(2),
        ORIGINAL_PRICE: originalPrice && originalPrice > currentPrice ? originalPrice.toFixed(2) : null,
        UNIT: (item.info.attributes?.weight || item.info.attributes?.volume) ? `per ${item.info.attributes.weight || item.info.attributes.volume}` : unitSymbol,
        STOCK_STATUS_CLASS: stockStatusClass,
        STOCK_ICON_CLASS: stockIconClass,
        STOCK_STATUS_TEXT: stockStatusText,
        DESCRIPTION: item.info.description || '',
        ADD_TO_CART_DISABLED: addToCartDisabled,
        ADD_TO_CART_ICON_CLASS: addToCartIconClass,
        ADD_TO_CART_TEXT: addToCartText,
        DEFAULT_IMAGE_SRC: item.type === 'product' ? DEFAULT_PRODUCT_IMAGE : DEFAULT_SERVICE_IMAGE,
        WISHLIST_ACTIVE_CLASS: '',
        WISHLIST_ICON_CLASS: 'far fa-heart',
    };

    cardWrapper.innerHTML = renderTemplate(cardGridTemplate, templateData);

    const cardElement = cardWrapper.querySelector('.card');
    if (cardElement) {
        cardElement.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart') || e.target.closest('.wishlist-btn')) {
                e.preventDefault();
                e.stopPropagation();
                if (e.target.closest('.add-to-cart')) {
                    // Handle add to cart
                } else if (e.target.closest('.wishlist-btn')) {
                    // Handle wishlist
                }
            } else {
                sessionStorage.setItem('selectedItem', JSON.stringify(item));
                window.dispatchEvent(new CustomEvent('navigateToItem', { detail: item }));
            }
        });
    }

    return cardWrapper;
}

export async function initCardHelper(unitsDataParam) {
    try {
        const templateResponse = await fetch('./source/components/cards/card-grid.html');
        if (!templateResponse.ok) throw new Error(`Failed to fetch card-grid.html: ${templateResponse.statusText}`);
        cardGridTemplate = await templateResponse.text();
        unitsData = unitsDataParam; // Set the units data
    } catch (error) {
        console.error('Error initializing CardHelper:', error);
        // Optionally, handle error more gracefully, e.g., display a message
    }
}