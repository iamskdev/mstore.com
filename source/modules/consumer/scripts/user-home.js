import { fetchAllItems, fetchUserById } from '../../../utils/data-manager.js';

/**
 * Creates a product card element based on the design in user-home.css.
 * @param {object} item - The product item from Firestore.
 * @returns {HTMLElement} The product card element.
 */
function createProductCard(item) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const originalPrice = item.pricing?.mrp || item.pricing?.sellingPrice;
    const sellingPrice = item.pricing?.sellingPrice;
    const discount = originalPrice && sellingPrice && originalPrice > sellingPrice
        ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
        : 0;

    const imagePath = Array.isArray(item.media?.images) && item.media.images.length > 0
        ? item.media.images[0]
        : './localstore/images/default-product.jpg';
    const DEFAULT_PRODUCT_IMAGE = './localstore/images/default-product.jpg';

    card.innerHTML = `
        ${discount > 0 ? `<div class="product-badge">${discount}% OFF</div>` : ''}
        <img src="${imagePath}" alt="${item.name}" class="product-image" onerror="this.src='${defaultImagePath}'">
        <div class="product-details">
            <h3>${item.name}</h3>
            <p class="product-price">
                ${discount > 0 ? `<span class="original-price" style="text-decoration: line-through;">₹${originalPrice}</span>` : ''}
                <span class="discounted-price">₹${sellingPrice}</span>
                <span class="quantity">${item.inventory?.unit || 'item'}</span>
            </p>
            <button class="add-to-cart">Add to Cart</button>
        </div>
    `;

    // Navigate to item details, but not when "Add to Cart" is clicked.
    card.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart')) {
            e.stopPropagation();
            console.log(`Added ${item.name} to cart.`);
            // Future: Add to cart logic here
        } else {
            sessionStorage.setItem('selectedItem', JSON.stringify(item));
            window.dispatchEvent(new CustomEvent('navigateToItem', { detail: item }));
        }
    });
    return card;
}

/**
 * Creates a service card element based on the design in user-home.css.
 * @param {object} item - The service item from Firestore.
 * @returns {HTMLElement} The service card element.
 */
function createServiceCard(item) {
    const card = document.createElement('div');
    card.className = 'service-card';

    const iconMap = {
        'xerox': 'fa-copy', 'print': 'fa-print', 'photo': 'fa-camera',
        'aadhaar': 'fa-id-card', 'lamination': 'fa-layer-group', 'default': 'fa-concierge-bell'
    };
    const categoryKey = item.category?.toLowerCase() || '';
    const iconClass = iconMap[categoryKey] || iconMap['default'];

    card.innerHTML = `
        <div class="service-icon"><i class="fas ${iconClass}"></i></div>
        <div class="service-details">
            <h3>${item.name}</h3>
            <p>From ₹${item.pricing?.sellingPrice}</p>
        </div>
    `;
    card.addEventListener('click', () => {
        sessionStorage.setItem('selectedItem', JSON.stringify(item));
        window.dispatchEvent(new CustomEvent('navigateToItem', { detail: item }));
    });
    return card;
}

/**
 * Creates a skeleton loader card to show while data is being fetched.
 * @returns {HTMLElement} The skeleton card element.
 */
function createSkeletonCard() {
    const skeleton = document.createElement('div');
    skeleton.className = 'card-skeleton';
    skeleton.innerHTML = `
        <div class="skeleton-image"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
    `;
    return skeleton;
}

/**
 * Populates a grid with data, showing skeletons while loading.
 * @param {string} gridId - The ID of the grid element to populate.
 * @param {string} itemType - 'product' or 'service'.
 * @param {function} cardCreator - The function to create a card (e.g., createProductCard).
 * @param {number} limit - The maximum number of items to display.
 */
async function populateGrid(gridId, itemType, cardCreator, limit = 4) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    // 1. Show skeletons
    grid.innerHTML = '';
    for (let i = 0; i < limit; i++) {
        grid.appendChild(createSkeletonCard());
    }

    try {
        // 2. Fetch data
        const { allItems } = await fetchAllItems();
        const items = allItems.filter(item => item.type === itemType).slice(0, limit);

        // 3. Clear skeletons and populate real data
        grid.innerHTML = '';
        if (items.length === 0) {
            grid.innerHTML = `<p class="placeholder-text">No ${itemType}s found.</p>`;
            return;
        }
        for (const item of items) {
            grid.appendChild(cardCreator(item));
        }
    } catch (error) {
        console.error(`Failed to load ${itemType}s:`, error);
        grid.innerHTML = `<p class="error-message">Could not load ${itemType}s.</p>`;
    }
}

/**
 * Updates the greeting message and user avatar in the hero section.
 * @param {object|null} user - The user object from Firestore, or null for guests.
 */
function updateHeroSection(user) {
    const hour = new Date().getHours();
    let timeGreeting = 'Good Evening';
    if (hour < 12) timeGreeting = 'Good Morning';
    else if (hour < 18) timeGreeting = 'Good Afternoon';

    const greetingEl = document.getElementById('greetingText');
    const avatarImg = document.getElementById('user-avatar-img');

    if (greetingEl) {
        // Use user's first name if available, otherwise a generic greeting.
        const userName = user?.info?.fullName?.split(' ')[0] || 'Guest';
        greetingEl.textContent = `${timeGreeting}, ${userName}!`; // Use first name for a personal touch
    }

    if (avatarImg) {
        // Use user's avatar if available, otherwise a default.
        const avatarPath = user?.info?.avatar || './localstore/images/users/vivek.jpg';
        avatarImg.src = avatarPath;
        avatarImg.onerror = () => { avatarImg.src = './localstore/images/users/vivek.jpg'; };
    }
}

/**
 * Main initialization function for the User Home Page.
 */
async function initializeUserHomePage() {
    const container = document.getElementById('user-home-view'); // Correctly target the main view container
    if (!container || container.dataset.initialized === 'true') return;

    console.log('✨ Initializing User Home Page...');

    // Fetch user data and update hero section
    const userId = localStorage.getItem('currentUserId'); // Correct key for user ID
    if (userId) {
        const user = await fetchUserById(userId);
        updateHeroSection(user);
    } else {
        updateHeroSection(null); // Handle guest state
    }

    // Populate the dynamic sections
    populateGrid('recommended-products-grid', 'product', createProductCard, 4);
    populateGrid('popular-services-grid', 'service', createServiceCard, 3);

    // Add event listeners for navigation using event delegation
    container.addEventListener('click', (e) => {
        const target = e.target.closest('[data-view-target]');
        if (target) {
            const viewId = target.dataset.viewTarget;
            // Dispatch a global event that main.js will catch to change the view.
            window.dispatchEvent(new CustomEvent('requestViewChange', {
                detail: { role: 'user', view: viewId }
            }));
        }
    });

    container.dataset.initialized = 'true';
    console.log('✨ User Home Page Initialized.');
}

initializeUserHomePage();