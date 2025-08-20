/**
 * @file Manages all logic for the Item Details page.
 * It retrieves item data, populates the DOM, and handles all user interactions
 * like adding to cart, saving, sharing, and viewing related items.
 */

import { createItemCard } from '../../components/card/card.js';
import { initializeDesktopHoverZoom } from '../../utils/cursor-zoom.js';
import { initializeSearch } from '../../utils/search-handler.js';

// Module-level variable to hold the zoom cleanup function, preventing duplicate listeners.
let cleanupImageZoom = () => {};
let cleanupDesktopZoom = () => {};

/**
 * A helper function to safely replace a DOM element with its clone.
 * This is a standard technique to remove all previously attached event listeners,
 * preventing duplicate events when details are re-rendered (e.g., clicking a related item).
 * @param {string} elementId The ID of the element to replace.
 * @returns {HTMLElement|null} The new, clean element or null if not found.
 */
function replaceElement(elementId) {
  const oldElement = document.getElementById(elementId);
  if (!oldElement) return null;
  const newElement = oldElement.cloneNode(true);
  oldElement.parentNode.replaceChild(newElement, oldElement);
  return newElement;
}

/**
 * Handles navigation to the item details page.
 * It stores the selected item in sessionStorage and then redirects.
 * This function is exported to be used by main.js.
 * @param {CustomEvent} event - The event containing the item data in `event.detail`.
 */
export function handleNavigateToItem(event) {
  const item = event.detail;
  if (item && item.meta && item.meta.itemId) {
    sessionStorage.setItem('selectedItem', JSON.stringify(item));
    // Navigate to the item details page. The page will then read from sessionStorage.
    window.location.href = `/public/pages/item-details.html?id=${item.meta.itemId}`;
  } else {
    console.error("handleNavigateToItem: Invalid item data received.", event.detail);
  }
}

/**
 * Updates the highlight on the active thumbnail image.
 * @param {number} activeIndex The index of the thumbnail to highlight.
 */
function updateThumbnailHighlight(activeIndex) {
  const thumbnails = document.querySelectorAll('#item-thumbnails .thumbnail-img');
  thumbnails.forEach((thumb, index) => {
    thumb.classList.toggle('active', index === activeIndex);
  });
}

/**
 * Updates the visual state of the "Save" button.
 * @param {boolean} isSaved - Whether the item is currently in the saved list.
 */
function updateSaveButtonState(isSaved) {
  const saveItemBtn = document.getElementById('save-item-btn');
  if (saveItemBtn) {
    const textEl = saveItemBtn.querySelector('.save-btn-text');
    const icon = saveItemBtn.querySelector('i');
    if (textEl) textEl.textContent = isSaved ? "Saved" : "Save";
    saveItemBtn.classList.toggle('saved', isSaved);
    if (icon) icon.className = isSaved ? 'fas fa-heart' : 'far fa-heart';
  }
}

/**
 * Populates the DOM with item data.
 * @param {object} item The item data object.
 */
function displayItemDetails(item, scaleRef) {
  const isService = item.type === 'service';
  const basePath = "./localstore/images/";
  const defaultImage = isService ? 'default-service.jpg' : 'default-product.jpg';
  const mainImageEl = document.getElementById('item-main-image');
  const thumbnailsContainerEl = document.getElementById('item-thumbnails');
  const imageZoomContainer = document.getElementById('image-zoom-container');
  const itemLeftEl = document.getElementById('item-left');

  // --- Image and Thumbnails ---
  const images = Array.isArray(item.media?.images) && item.media.images.length > 0 ? item.media.images : [item.media?.thumbnail || defaultImage];
  
  const getFullImagePath = (imgFile) => {
    // If it's an external URL or an absolute path from the root, use it directly.
    if (imgFile.startsWith('http') || imgFile.startsWith('/')) return imgFile;
    // Otherwise, construct the path from the base mock images path.
    return basePath + imgFile;
  };

  mainImageEl.src = getFullImagePath(images[0]);
  mainImageEl.onerror = () => { mainImageEl.src = getFullImagePath(defaultImage); };

  thumbnailsContainerEl.innerHTML = '';
  // FIX: Always create thumbnails if there are multiple images, for all screen sizes.
  // The CSS is already configured for horizontal scrolling on mobile.
  if (images.length > 1) {
    thumbnailsContainerEl.style.display = 'flex'; // Ensure container is visible
    images.forEach((imgFile, index) => {
      const thumb = document.createElement('img');
      thumb.src = getFullImagePath(imgFile);
      thumb.alt = `Thumbnail for ${item.name}`;
      thumb.className = 'thumbnail-img';
      thumb.onclick = () => {
        mainImageEl.src = getFullImagePath(imgFile);
        updateThumbnailHighlight(index);
      };
      thumbnailsContainerEl.appendChild(thumb);
    });
  } else {
    thumbnailsContainerEl.style.display = 'none'; // Hide container if only one image
  }

  // --- Mobile-only: Add swipe feature and dot indicators ---
  // This logic runs only on screen widths less than 720px.
  if (images.length > 1 && window.matchMedia('(max-width: 719px)').matches) {
    let touchStartX = 0;
    let currentImageIndex = 0;

    // Create dot indicators dynamically
    const dotContainer = document.createElement('div');
    dotContainer.classList.add('image-dots');
    images.forEach((_, index) => {
      const dot = document.createElement('span');
      dot.classList.add('dot');
      if (index === 0) dot.classList.add('active');
      dotContainer.appendChild(dot);
      dot.addEventListener('click', () => updateImageAndDots(index)); // Add click listener
    });
    // Append dots after the image container so they appear below it.
    // The parentNode is .main-image-with-btns
    imageZoomContainer.parentNode.appendChild(dotContainer);

    // --- Create and insert the divider ---
    // Check if a divider already exists to prevent duplicates on actions like related-item clicks
    if (itemLeftEl && !itemLeftEl.nextElementSibling?.classList.contains('mobile-item-divider')) {
      const divider = document.createElement('div');
      divider.className = 'mobile-item-divider';
      itemLeftEl.insertAdjacentElement('afterend', divider);
    }

    const updateImageAndDots = (newIndex) => {
      currentImageIndex = (newIndex + images.length) % images.length;
      mainImageEl.src = getFullImagePath(images[currentImageIndex]);
      // Update active dot
      document.querySelectorAll('.dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === currentImageIndex);
      });
      // Also update thumbnail highlight to match the swiped image
      updateThumbnailHighlight(currentImageIndex);
    };

    imageZoomContainer.addEventListener('touchstart', (e) => {
            // Do not start a swipe if the image is zoomed or if it's a multi-touch gesture.
      if (scaleRef.scale > 1 || e.touches.length > 1) {
        touchStartX = 0; // Prevent swipe from starting
        return;
      }
      touchStartX = e.touches[0].clientX;
    });

    imageZoomContainer.addEventListener('touchmove', (e) => {
      if (!touchStartX || scaleRef.scale > 1) return; // Do not swipe if not started or if zoomed

      const touchEndX = e.touches[0].clientX;
      const deltaX = touchEndX - touchStartX;
      // You can adjust sensitivity by changing the threshold value (e.g., 50)
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          updateImageAndDots(currentImageIndex - 1); // Swipe right, show previous image
        } else {
          updateImageAndDots(currentImageIndex + 1); // Swipe left, show next image
        }
        touchStartX = 0; // Reset touch start
      }
    });

    imageZoomContainer.addEventListener('touchend', () => {
      touchStartX = 0; // Also reset on touch end
    });
  }

  // --- Basic Info ---
  document.getElementById('item-title').textContent = item.name;
  document.getElementById('item-price').textContent = item.pricing?.sellingPrice || 'N/A';
  document.getElementById('item-unit-label').textContent = `/ ${item.inventory?.unit || 'item'}`;
  document.getElementById('item-description-text').textContent = item.descriptions?.description || '';

  // --- Stock Status ---
  const stockStatusEl = document.getElementById('item-stock-status');
  // Correctly evaluate the stock status string to a boolean
  // FIX: Use 'available' boolean for both products and services
  const inStock = item.status?.isAvailable === true;
  stockStatusEl.textContent = isService
    ? (inStock ? "Available" : "Unavailable")
    : (inStock ? "In Stock" : "Out of Stock");
  stockStatusEl.classList.add(inStock ? 'in' : 'out');
}

/**
 * Sets up event listeners and initial state for the 'Add to Cart' and 'Save' buttons.
 * It replaces the buttons to clear any old listeners before adding new ones.
 * @param {object} item The item object for which to set up actions.
 */
function setupActionButtons(item) {
  const isService = item.type === 'service';
  const inStock = item.status?.isAvailable === true;

  // --- Add to Cart Button ---
  const addToCartBtn = replaceElement('add-to-cart-btn');
  if (!addToCartBtn) return;

  if (!inStock) {
    // --- "Notify Me" logic for out-of-stock items ---
    addToCartBtn.disabled = false; // Ensure button is clickable

    const notificationList = JSON.parse(sessionStorage.getItem('notificationList') || '[]');

    const updateNotifyButtonState = (isRequested) => {
      if (isRequested) {
        addToCartBtn.innerHTML = '<i class="fas fa-bell"></i> Notifying';
        addToCartBtn.classList.add('notifying');
      } else {
        addToCartBtn.innerHTML = '<i class="far fa-bell"></i> Notify Me';
        addToCartBtn.classList.remove('notifying');
      }
    };

    updateNotifyButtonState(isNotified); // Set initial state

    addToCartBtn.addEventListener('click', () => {
      let notifications = JSON.parse(sessionStorage.getItem('notificationList') || '[]');
      const existingIndex = notifications.findIndex(notifyItem => String(notifyItem.itemId) === String(item.itemId));
      let message = '';
      let nowNotified = false;

      if (existingIndex > -1) {
        notifications.splice(existingIndex, 1);
        message = `Removed from notification list for "${item.name}"`;
        nowNotified = false;
        // TODO: Replace with a more sophisticated UI element in the new component
        alert(message);
      } else {
        notifications.push({ itemId: item.itemId, name: item.name });
        message = `We'll notify you when "${item.name}" is back in stock!`;
        nowNotified = true;
        // TODO: Replace with a more sophisticated UI element in the new component
        alert(message);
      }
      
      sessionStorage.setItem('notificationList', JSON.stringify(notifications));
      updateNotifyButtonState(nowNotified);
    });
  } else {
    // --- "Add to Cart" logic for in-stock items (existing logic) ---
    addToCartBtn.disabled = false;
    const initialCart = JSON.parse(sessionStorage.getItem('cart') || '[]');
    const isInCart = initialCart.some(cartItem => String(cartItem.itemId) === String(item.itemId));
    addToCartBtn.innerHTML = isInCart ? '<i class="fas fa-check"></i> Added to Cart' : '<i class="fas fa-shopping-cart"></i> Add to Cart';

    addToCartBtn.addEventListener('click', () => {
      let cart = JSON.parse(sessionStorage.getItem('cart') || '[]');
      const existingItemIndex = cart.findIndex(cartItem => String(cartItem.itemId) === String(item.itemId));
      if (existingItemIndex > -1) {
        cart.splice(existingItemIndex, 1);
        addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
      } else {
        cart.push({ ...item, quantity: 1 });
        addToCartBtn.innerHTML = '<i class="fas fa-check"></i> Added to Cart';
      }
      sessionStorage.setItem('cart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    });
  }

  // --- Save/Like Item Button (works regardless of stock) ---
  const saveItemBtn = replaceElement('save-item-btn');
  if (!saveItemBtn) return;

  const initialSaved = JSON.parse(sessionStorage.getItem('savedItems') || '[]');
  const isItemSaved = initialSaved.some(savedItem => String(savedItem.itemId) === String(item.itemId));
  updateSaveButtonState(isItemSaved);

  saveItemBtn.addEventListener('click', () => {
    let savedItems = JSON.parse(sessionStorage.getItem('savedItems') || '[]');
    const existingItemIndex = savedItems.findIndex(savedItem => String(savedItem.itemId) === String(item.itemId));
    let isNowSaved;
    if (existingItemIndex > -1) {
      savedItems.splice(existingItemIndex, 1);
      isNowSaved = false;
    } else {
      savedItems.push(item);
      isNowSaved = true;
    }
    sessionStorage.setItem('savedItems', JSON.stringify(savedItems));
    updateSaveButtonState(isNowSaved);
    window.dispatchEvent(new CustomEvent('savedItemsUpdated'));
  });
}

/**
 * Finds and displays related items based on the current item's category.
 * @param {object} currentItem The main item being displayed on the page.
 */
export async function displayRelatedItems(currentItem) {
  let items = [];
  try {
    items = JSON.parse(sessionStorage.getItem('allItems') || '[]');
    if (!items.length) {
      const res = await fetch('../../../localstore/jsons/items.json');
      items = await res.json();
    }
  } catch {
    const res = await fetch('../../../localstore/jsons/items.json');
    items = await res.json();
  }

  const isService = currentItem.type === 'service';
  let related = [];

  // Helper to get category, handling both 'categoryId' or 'category' keys
  // and also converting '"null"' string to null value
  const fixNullCategory = (cat) => cat === "null" ? null : cat;

  const getItemCategory = (it) => it.categoryId || it.category;
  const currentItemCategory = getItemCategory(currentItem);
  const currentitemId = currentItem.itemId;

  // --- Find related items based on type (product/service) ---
  if (isService) {
    // For a service, first try to find other services in the same category.
    related = items.filter(item =>
      item && // FIX: Robustly compare IDs as strings to avoid type mismatches.
      String(item.itemId) !== String(currentitemId) &&
      item.type === 'service' &&
      fixNullCategory(getItemCategory(item)) === fixNullCategory(currentItemCategory) &&
      item.status?.isAvailable === true &&
      item.status?.isActive !== false
    );

    // Fallback: If no related services in the same category, find ANY other available service.
    if (related.length < 1) {
      // FIX: The previous fallback was too restrictive. This now finds ANY other available service, regardless of category.
      related = items.filter(item =>
        item && item.itemId !== currentitemId && item.type === 'service' && item.status?.isAvailable === true && item.status?.isActive !== false
      );
    }
  } else { // It's a product
    // For a product, first try to find other products in the same category.
    related = items.filter(item =>
      item && // FIX: Robustly compare IDs as strings to avoid type mismatches.
      String(item.itemId) !== String(currentitemId) &&
      item.type === 'product' &&
      fixNullCategory(getItemCategory(item)) === fixNullCategory(currentItemCategory) &&
      item.status?.isAvailable === true &&
      item.status?.isActive !== false
    );

    // Fallback: If no related products in the same category, find ANY other available product.
    if (related.length < 1) {
      related = items.filter(item => 
        item && item.itemId !== currentitemId && item.type === 'product' && item.status?.isAvailable === true && item.status?.isActive !== false
      );
    }
  }

  // DOM selection
  const relatedSection = document.querySelector('.related-section');
  const relatedList = document.getElementById('related-items-list');
  if (!relatedSection || !relatedList) return;

  relatedList.innerHTML = '';

  // Hide the whole section (including heading) if no related items
  if (!related || related.length === 0) {
    relatedSection.style.display = 'none';
    return;
  } else {
    relatedSection.style.display = '';
  }

  for (const item of related.slice(0, 8)) {
    const card = await createItemCard(item);
    relatedList.appendChild(card);
  }
}

/**
 * Shares the item. (Currently placeholder)
 */
function shareItem() {
  const itemTitle = document.getElementById('item-title')?.textContent || 'Item';
  const itemDesc = document.getElementById('item-description-text')?.textContent || '';
  const shareUrl = window.location.href;
  if (navigator.share) {
    navigator.share({
      title: itemTitle,
      text: itemDesc,
      url: shareUrl
    }).catch(() => {});
  } else {
    // Fallback: copy link to clipboard
    navigator.clipboard?.writeText(shareUrl);
    alert('Share feature is not supported on this device. Link copied to clipboard!');
  }
}

/**
 * Initializes the Item Details page. It should be called after the DOM is ready.
 */
export function initializeItemDetailsPage() {
  // Clean up any existing zoom listeners from a previously viewed item on the same page load.
  // This is crucial for when a user clicks a "related item".
  if (cleanupImageZoom) {
    cleanupImageZoom();
  }
  if (cleanupDesktopZoom) {
    cleanupDesktopZoom();
  }

  // Scroll to the top of the page on load. This is crucial for when a user clicks a
  // related item, ensuring they see the main details of the new item, not the bottom of the page.
  window.scrollTo(0, 0);

  // Initialize search functionality for the header's search bar.
  initializeSearch();
  
  // Shared state for mobile swipe and zoom logic, passed by reference.
  const scaleRef = { scale: 1 };


  // --- Fix: Always load correct item from URL if present ---
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');
  let itemDataString = sessionStorage.getItem('selectedItem');

  if (itemId) {
    // Try to find the item from allItems (unified)
    const allItems = JSON.parse(sessionStorage.getItem('allItems') || '[]');
    const foundItem = allItems.find(i => String(i.itemId) === String(itemId));
    if (foundItem) {
      itemDataString = JSON.stringify(foundItem);
      sessionStorage.setItem('selectedItem', itemDataString);
    }
  }

  if (!itemDataString) {
    console.error("No item data found. User may have landed here directly.");
    const container = document.getElementById('item-details-container');
    container.innerHTML = `
      <div class="placeholder-view" style="text-align: center; padding: 40px;">
        <h2><i class="fas fa-exclamation-triangle"></i> Item Not Found</h2>
        <p>We couldn't find the item you're looking for.</p>
        <p>Please go back to the <a href="/#explore" style="color: var(--primary-color); text-decoration: underline;">Explore page</a> to select an item.</p>
      </div>
    `;
    const relatedSection = document.querySelector('.related-section');
    if (relatedSection) relatedSection.style.display = 'none';
    return;
  }

  try {
    const item = JSON.parse(itemDataString);
    displayItemDetails(item, scaleRef);
    setupActionButtons(item);
    // Set initial highlight on the first thumbnail after everything is rendered.
    // A small timeout ensures the DOM has been fully updated.
    setTimeout(() => updateThumbnailHighlight(0), 0);
    displayRelatedItems(item);

    // --- Initialize Image Zoom ---
    // We do this after displaying details to ensure the elements exist.
    const mainImageEl = document.getElementById('item-main-image');
    const imageZoomContainer = document.getElementById('image-zoom-container');

    const initZoom = async () => {
      const { initializeImageZoom } = await import('../../utils/image-zoom.js');
      const lens = document.getElementById('image-zoom-lens');
      const resultBox = document.getElementById('zoom-result-box');
      const infoBox = document.getElementById('item-info');

      if (imageZoomContainer && mainImageEl) {
        // Mobile pinch-to-zoom
        cleanupImageZoom = initializeImageZoom({
          container: imageZoomContainer,
          image: mainImageEl,
          onZoomChange: (newScale) => { scaleRef.scale = newScale; },
        });

        // Desktop hover-to-zoom
        if (window.matchMedia('(min-width: 1024px)').matches) {
          cleanupDesktopZoom = initializeDesktopHoverZoom({
            container: imageZoomContainer,
            image: mainImageEl,
            lens,
            resultBox,
            infoBox // Pass the info box to size the result box
          });
        }
      }
    };

    // Wait for the image to be fully loaded to get correct dimensions.
    if (mainImageEl.complete) initZoom();
    else mainImageEl.onload = initZoom;
  } catch (error) {
    console.error("Failed to parse item data from sessionStorage:", error);
  }

  // Share button
  const shareBtn = document.getElementById('item-share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', shareItem);
  }

  // --- Professional Feedback Modal Implementation ---
  const feedbackBtn = document.getElementById('item-feedback-btn');
  const modalContainer = document.getElementById('feedback-modal-container');

  if (feedbackBtn && modalContainer) {
    let isModalInitialized = false;

    feedbackBtn.addEventListener('click', async () => {
      // Lazy load and initialize the modal only on the first click
      if (!isModalInitialized) {
        try {
          // 1. Fetch and inject the modal's HTML
          const response = await fetch('./source/components/feedback-modal/feedback-modal.html');
          if (!response.ok) throw new Error(`Failed to load modal HTML: ${response.status}`);
          modalContainer.innerHTML = await response.text();

          // 2. Import the modal's JavaScript module
          const modalModule = await import('../../components/feedback-modal/feedback-modal.js');
          
          // 3. Initialize the modal's internal logic after DOM update
          setTimeout(() => {
            modalModule.initFeedbackModal();
            isModalInitialized = true;
            
            // 4. Show the modal
            const modalElement = document.getElementById('feedback-modal');
            if (modalElement) modalElement.style.display = 'flex';
          }, 0);

        } catch (error) {
          console.error("❌ Failed to initialize feedback modal:", error);
          // TODO: Replace with a more sophisticated UI element in the new component
          alert("Could not open feedback form.");
          modalContainer.innerHTML = ''; // Clean up on failure
        }
      } else {
        // If already initialized, just show it
        const modalElement = document.getElementById('feedback-modal');
        if (modalElement) modalElement.style.display = 'flex';
      }
    });
  }
}

// --- Migration Note ---
// Data is now loaded from firebase/data/items.json (not from Mock/mock-products.json or mock-services.json) from firebase/data/items.json (not from Mock/mock-products.json or mock-services.json)
// Make sure to update all data loading logic in the app to use the unified items.json.

// --- Migration Note ---
// Data is now loaded from firebase/data/items.json (not from Mock/mock-products.json or mock-services.json) from firebase/data/items.json (not from Mock/mock-products.json or mock-services.json)
// Make sure to update all data loading logic in the app to use the unified items.json.