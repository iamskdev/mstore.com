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

// Helper: format date
function formatDate(value) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
}

/**
 * Creates a list card element based on item data and a view configuration.
 * @param {object} item - The item data (product or service).
 * @param {object} viewConfig - Configuration object defining how the card should be rendered.
 * @returns {HTMLElement} The card element.
 */
export function createListCard(item, viewConfig) {
    console.log('createListCard called for item:', item?.meta?.itemId);

    const template = document.getElementById('list-card-template');
    if (!template) {
        console.error('createListCard: Could not find template element with id "list-card-template".');
        return null;
    }

    const cardElement = template.content.cloneNode(true).querySelector('.card-body');
    if (!cardElement) {
        console.error('createListCard: Could not find .card-body in the cloned template.');
        return null;
    }

    // Set unique ID for the card element
    cardElement.id = `card-${item.meta.itemId}`;
    cardElement.dataset.itemId = item.meta.itemId; // Also keep data-itemId for convenience

    // --- Process Fields ---
    if (viewConfig.fields) {
        viewConfig.fields.forEach(field => {
            const targetElement = cardElement.querySelector(field.selector);
            if (targetElement) {
                const isVisible = typeof field.visible === 'function' ? field.visible(item) : (field.visible !== false);
                
                if (!isVisible) {
                    targetElement.style.display = 'none';
                    return;
                }
                targetElement.style.display = ''; // Ensure it's visible if config says so

                let value = item;
                if (field.key) {
                    // Safely get nested property value
                    value = field.key.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, item);
                }

                let formattedValue = value;
                if (field.formatter && value !== undefined) {
                    formattedValue = field.formatter(value, item);
                } else if (value === undefined || value === null) {
                    formattedValue = ''; // Default to empty string if value is undefined/null
                }

                if (field.type === 'image') {
                    targetElement.src = formattedValue || field.default || '';
                    targetElement.alt = item.info.name || '';
                    if (!targetElement.src) {
                        targetElement.parentElement.classList.add('broken');
                    }
                } else if (field.selector === '.stars') {
                    // Handle stars specifically
                    const ratingValue = value || 0;
                    targetElement.innerHTML = `
                        <div class="star-rating-container">
                            ${generateStarsHtml(ratingValue)}
                            ${ratingValue > 0 ? `<span class="rating-number">(${ratingValue.toFixed(1)})</span>` : ''}
                        </div>
                    `;
                } else if (field.selector === '.stock-status') {
                    // Handle stock status specifically, replicating logic from createCardFromTemplate
                    let stockStatusText, stockStatusClass, stockIconClass;

                    if (item.meta.type === 'service') {
                        if (item.meta.flags.isActive) {
                            stockStatusText = 'Available';
                            stockStatusClass = 'in';
                            stockIconClass = 'fas fa-check-circle';
                        } else {
                            stockStatusText = 'Unavailable';
                            stockStatusClass = 'out';
                            stockIconClass = 'fas fa-times-circle';
                        }
                    } else { // product
                        if (item.inventory?.stockQty > 0) {
                            stockStatusText = 'In Stock';
                            stockStatusClass = 'in';
                            stockIconClass = 'fas fa-check-circle';
                        } else {
                            stockStatusText = 'Out of Stock';
                            stockStatusClass = 'out';
                            stockIconClass = 'fas fa-exclamation-circle'; // Changed to exclamation for out of stock
                        }
                    }
                    targetElement.className = `stock-status ${stockStatusClass}`;
                    targetElement.innerHTML = `<i class="${stockIconClass}"></i> <span>${stockStatusText}</span>`;
                }
                else {
                    targetElement.innerHTML = (field.label || '') + formattedValue;
                }
            }
        });
    }

    // --- Process Interactive Components ---
    const interactiveArea = cardElement.querySelector('.interactive-area');
    if (interactiveArea && viewConfig.components) {
        viewConfig.components.forEach(component => {
            const isVisible = typeof component.visible === 'function' ? component.visible(item) : (component.visible !== false);
            if (!isVisible) return;

            let componentHtml = '';
            switch (component.type) {
                case 'quantitySelector':
                    // Example: Simple quantity selector
                    componentHtml = `
                        <div class="quantity-selector" data-action="${component.action}">
                            <button class="quantity-minus" data-item-id="${item.meta.itemId}">-</button>
                            <span class="quantity-display">${item.cart?.qty || 1}</span>
                            <button class="quantity-plus" data-item-id="${item.meta.itemId}">+</button>
                        </div>
                    `;
                    break;
                case 'staticText':
                    componentHtml = `<p>${component.options?.text || ''}</p>`;
                    break;
                
                case 'staticText':
                    componentHtml = `<p>${component.options?.text || ''}</p>`;
                    break;
                    break;
                // Add more component types as needed
            }
            if (componentHtml) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = componentHtml;
                interactiveArea.appendChild(tempDiv.firstElementChild);
            }
        });
    }

    // --- Process Buttons ---
    const cardActions = cardElement.querySelector('.card-actions');
    if (cardActions && viewConfig.buttons) {
        viewConfig.buttons.forEach(buttonConfig => {
            const isVisible = typeof buttonConfig.visible === 'function' ? buttonConfig.visible(item) : (buttonConfig.visible !== false);
            if (!isVisible) return;

            if (buttonConfig.type === 'quantitySelector') {
                const currentQty = item.cart?.qty || 1;
                let optionsHtml = '';
                for (let i = 1; i <= 10; i++) { // Assuming max quantity of 10 for now
                    optionsHtml += `<option value="${i}" ${i === currentQty ? 'selected' : ''}>${i}</option>`;
                }
                const quantitySelectorHtml = `
                    <div class="quantity-selector" data-action="${buttonConfig.action}">
                        <label for="qty-select-${item.meta.itemId}">Qty:</label>
                        <select id="qty-select-${item.meta.itemId}" class="quantity-select" data-item-id="${item.meta.itemId}">
                            ${optionsHtml}
                        </select>
                    </div>
                `;
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = quantitySelectorHtml;
                cardActions.appendChild(tempDiv.firstElementChild);

                // Add event listener for the new select element
                const selectElement = cardActions.querySelector(`#qty-select-${item.meta.itemId}`);
                if (selectElement) {
                    selectElement.addEventListener('change', (e) => {
                        const newQuantity = parseInt(e.target.value);
                        viewConfig.actionHandlers[buttonConfig.action](item, newQuantity);
                    });
                }
            } else if (buttonConfig.action === 'SELECT_SERVICE_DATE') {
                const dateButton = document.createElement("button"); // Changed to button
                dateButton.className = buttonConfig.class || '';
                dateButton.textContent = item.cart.selectedDate
                    ? formatDate(item.cart.selectedDate)
                    : (typeof buttonConfig.label === 'function' ? buttonConfig.label(item) : buttonConfig.label || 'Select Date');
                dateButton.dataset.action = buttonConfig.action;
                dateButton.dataset.itemId = item.meta.itemId;

                const hiddenDate = document.createElement("input");
                hiddenDate.type = "date";
                hiddenDate.hidden = true;
                hiddenDate.value = item.cart.selectedDate || '';
                hiddenDate.dataset.itemId = item.meta.itemId;

                cardActions.appendChild(dateButton); // Append button
                cardActions.appendChild(hiddenDate);

                // Event listeners
                hiddenDate.addEventListener("change", () => {
                    const newDate = hiddenDate.value;
                    dateButton.textContent = newDate ? formatDate(newDate) : 'Select Date'; // Update button text
                    // Call the action handler in cart.js
                    if (viewConfig.actionHandlers && viewConfig.actionHandlers[buttonConfig.action]) {
                        viewConfig.actionHandlers[buttonConfig.action](item, newDate); // Pass item and newDate
                    }
                });

                dateButton.addEventListener("click", () => { // Listener on the button
                    if (typeof hiddenDate.showPicker === "function") {
                        hiddenDate.showPicker();
                    } else {
                        hiddenDate.click();
                    }
                });
            } else { // General button handling
                const button = document.createElement('button');
                button.className = buttonConfig.class || '';
                button.textContent = typeof buttonConfig.label === 'function' ? buttonConfig.label(item) : buttonConfig.label || '';
                button.dataset.action = buttonConfig.action;
                button.dataset.itemId = item.meta.itemId; // Attach item ID to button

                if (buttonConfig.icon) {
                    const icon = document.createElement('i');
                    icon.className = buttonConfig.icon;
                    button.prepend(icon);
                    if (buttonConfig.label) {
                        button.innerHTML = `<i class="${buttonConfig.icon}"></i> <span>${buttonConfig.label}</span>`;
                    }
                }
                
                const isDisabled = typeof buttonConfig.disabled === 'function' ? buttonConfig.disabled(item) : (buttonConfig.disabled === true);
                if (isDisabled) {
                    button.disabled = true;
                }

                cardActions.appendChild(button);
            }
        });
    }

    // --- Attach Event Listener for Actions (Event Delegation) ---
    cardElement.addEventListener('click', (e) => {
        // Check if the clicked element is part of the quantity selector
        const quantitySelectorClicked = e.target.closest('.quantity-selector');
        if (quantitySelectorClicked) {
            e.stopPropagation(); // Prevent the card's click listener from firing
            return; // Do nothing else for quantity selector clicks
        }

        const targetButton = e.target.closest('[data-action]');
        if (targetButton) {
            e.preventDefault();
            e.stopPropagation(); // Prevent default card click if button is clicked

            const action = targetButton.dataset.action;
            const clickedItemId = targetButton.dataset.itemId; // Get item ID from button

            if (viewConfig.actionHandlers && viewConfig.actionHandlers[action]) {
                if (action === 'SELECT_SERVICE_DATE') {
                    viewConfig.actionHandlers[action](item, targetButton); // Pass item and targetButton
                } else {
                    viewConfig.actionHandlers[action](item); // Pass the full item object
                }
            }
        } else {
            // Default card click behavior (e.g., navigate to item details)
            // Only if not clicking an interactive element
            if (!e.target.closest('.interactive-area')) {
                sessionStorage.setItem('selectedItem', JSON.stringify(item));
                window.dispatchEvent(new CustomEvent('navigateToItem', { detail: item }));
            }
        }
    });

    return cardElement;
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

        // Create a temporary div to parse the fetched HTML string
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardListTemplate;

        // Find and append the <style> element to the document head
        const styleElement = tempDiv.querySelector('style');
        if (styleElement && !document.getElementById('card-list-component-styles')) {
            styleElement.id = 'card-list-component-styles'; // Assign an ID to prevent re-appending
            document.head.appendChild(styleElement);
        }

        // Find and append the <template> element to the document body
        const templateElement = tempDiv.querySelector('template#list-card-template');
        if (templateElement) {
            document.body.appendChild(templateElement);
        } else {
            console.error('initCardHelper: Could not find template#list-card-template in fetched HTML.');
        }

        unitsData = unitsDataParam; // Set the units data
    } catch (error) {
        console.error('Error initializing CardHelper:', error);
        // Optionally, handle error more gracefully, e.g., display a message
    }
}

