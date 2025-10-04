/**
 * @file Manages all logic for the Item Details page.
 * It retrieves item data from route parameters, populates the DOM, and handles all user interactions
 * like adding to cart, saving, sharing, and viewing related items.
 */
import { toggleCartItem, isItemInCart } from '../../utils/cart-manager.js';
import { toggleSavedItem } from '../../utils/saved-manager.js';
import { createCardFromTemplate } from '../../templates/cards/card-helper.js';
import { isItemSaved } from '../../utils/saved-manager.js';
import { fetchItemById } from '../../utils/data-manager.js'; // Import the fetcher
import { initializeDesktopHoverZoom } from '../../utils/cursor-zoom.js';
import { initializeSearch } from '../../utils/search-handler.js';
import { showFeedbackModal } from '../../partials/modals/feedback.js';

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
 * Generates HTML for star rating display. Local to this module.
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
export function updateSaveButtonState(isSaved) { // Export this function
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
  const isService = item.meta.type === 'service';
  const mainImageEl = document.getElementById('item-main-image');
  const thumbnailsContainerEl = document.getElementById('item-thumbnails');
  const imageZoomContainer = document.getElementById('image-zoom-container');
  const itemLeftEl = document.getElementById('item-left');

  // --- Image and Thumbnails ---
  // Use gallery if available, otherwise fallback to thumbnail. Ensure it's always an array and filter out empty values.
  const images = (item.media?.gallery?.length > 0 ? item.media.gallery : [item.media?.thumbnail]).filter(Boolean);
  
  // The path from the JSON data is the source of truth. Use it directly.
  const imageErrorPlaceholder = document.querySelector('.image-error-placeholder');
  mainImageEl.classList.remove('hidden');
  imageErrorPlaceholder.classList.remove('visible');

  mainImageEl.src = images[0] || ''; // Set to empty if no image is found in data
  mainImageEl.onerror = () => {
    // On error, hide the broken image and show the placeholder
    mainImageEl.classList.add('hidden');
    imageErrorPlaceholder.classList.add('visible');
  };
  // If there's no image source to begin with, trigger the error handler immediately
  if (!mainImageEl.src) mainImageEl.onerror();

  thumbnailsContainerEl.innerHTML = '';
  // FIX: Always create thumbnails if there are multiple images, for all screen sizes.
  // The CSS is already configured for horizontal scrolling on mobile.
  if (images.length > 1) {
    thumbnailsContainerEl.style.display = 'flex'; // Ensure container is visible
    images.forEach((imgFile, index) => {
      const thumb = document.createElement('img');
      thumb.src = imgFile;
      thumb.alt = `Thumbnail for ${item.info.name}`;
      thumb.className = 'thumbnail-img';
      thumb.onclick = () => {
        mainImageEl.src = imgFile;
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
      mainImageEl.src = images[currentImageIndex];
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
  document.getElementById('item-title').textContent = item.info.name;
  document.getElementById('item-price').textContent = item.pricing?.sellingPrice || 'N/A';
  document.getElementById('item-unit-label').textContent = `/ ${item.meta.unitId || 'item'}`;
  document.getElementById('item-description-text').textContent = item.info.description || '';
  
  // --- Rating Stars ---
  const ratingEl = document.getElementById('item-rating');
  if (ratingEl) {
    const ratingValue = item.analytics?.rating || 0;
    const numReviews = item.analytics?.numReviews || 0;

    // Determine rating class for color-coding
    let ratingClass;
    if (ratingValue < 3) { // 1-2.9 stars -> Red
        ratingClass = 'low-rating';
    } else if (ratingValue < 4) { // 3-3.9 stars -> Green
        ratingClass = 'high-rating';
    } else { // 4-5 stars -> Yellow
        ratingClass = 'medium-rating';
    }

    // Clear old rating classes and add the new one
    ratingEl.classList.remove('low-rating', 'medium-rating', 'high-rating');
    ratingEl.classList.add(ratingClass);

    ratingEl.innerHTML = `
      <div class="stars">${generateStarsHtml(ratingValue)}</div>
      ${ratingValue > 0 ? `<span class="rating-value">(${ratingValue.toFixed(1)})</span>` : ''}
      <span class="review-count">${numReviews} reviews</span>
    `;

  }

  // --- Stock Status with Icon ---
  const stockStatusEl = document.getElementById('item-stock-status');
  let stockStatusText, stockStatusClass, stockIconClass;

  if (isService) {
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
          stockIconClass = 'fas fa-exclamation-circle';
      }
  }

  if (stockStatusEl) {
    stockStatusEl.className = `stock-status ${stockStatusClass}`;
    stockStatusEl.innerHTML = `<i class="${stockIconClass}"></i> <span>${stockStatusText}</span>`;
  }
}

/**
 * Sets up event listeners and initial state for the 'Add to Cart' and 'Save' buttons.
 * It replaces the buttons to clear any old listeners before adding new ones.
 * @param {object} item The item object for which to set up actions.
 */
function setupActionButtons(item) {
  const isService = item.meta.type === 'service';
  const inStock = item.inventory?.stockQty > 0 || (isService && item.meta.flags.isActive);

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

    updateNotifyButtonState(notificationList.some(notifyItem => String(notifyItem.itemId) === String(item.meta.itemId))); // Set initial state

    addToCartBtn.addEventListener('click', () => {
      let notifications = JSON.parse(sessionStorage.getItem('notificationList') || '[]');
      const existingIndex = notifications.findIndex(notifyItem => String(notifyItem.itemId) === String(item.meta.itemId));
      let message = '';
      let nowNotified = false;

      if (existingIndex > -1) {
        notifications.splice(existingIndex, 1);
        message = `Removed from notification list for "${item.info.name}"`;
        nowNotified = false;
        // TODO: Replace with a more sophisticated UI element in the new component
        alert(message);
      } else {
        notifications.push({ itemId: item.meta.itemId, name: item.info.name });
        message = `We'll notify you when "${item.info.name}" is back in stock!`;
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
    const isInCart = isItemInCart(item.meta.itemId);
    addToCartBtn.innerHTML = isInCart ? '<i class="fas fa-check"></i> Added to Cart' : '<i class="fas fa-shopping-cart"></i> Add to Cart';

    addToCartBtn.addEventListener('click', () => {
      // Get the current state *before* toggling
      const wasInCart = isItemInCart(item.meta.itemId);
      
      // Update the UI instantly for immediate feedback
      addToCartBtn.innerHTML = !wasInCart ? '<i class="fas fa-check"></i> Added to Cart' : '<i class="fas fa-shopping-cart"></i> Add to Cart';

      // Call the centralized manager to update the state and notify other parts of the app
      toggleCartItem(item); // Use the centralized cart manager function
    });
  }

  // --- Save/Like Item Button (works regardless of stock) ---
  const saveItemBtn = replaceElement('save-item-btn');
  if (!saveItemBtn) return;

  updateSaveButtonState(isItemSaved(item.meta.itemId));

  saveItemBtn.addEventListener('click', () => {
    // Toggle the state and update UI instantly
    const isNowSaved = !isItemSaved(item.meta.itemId);
    updateSaveButtonState(isNowSaved);
    // Call the centralized manager
    toggleSavedItem(item.meta.itemId); // Use the centralized saved items manager
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
  } catch (e) {
    console.error("Could not parse allItems from sessionStorage", e);
    items = [];
  }

  const isService = currentItem.meta.type === 'service';
  let related = [];

  const currentItemCategory = currentItem.meta.links.categoryId;
  const currentitemId = currentItem.meta.itemId;

  // --- Find related items based on type (product/service) ---
  if (isService) {
    // For a service, first try to find other services in the same category.
    related = items.filter(item =>
      item && // FIX: Robustly compare IDs as strings to avoid type mismatches.
      String(item.meta.itemId) !== String(currentitemId) &&
      item.meta.type === 'service' &&
      item.meta.links.categoryId === currentItemCategory &&
      item.meta.flags.isActive === true
    );

    // Fallback: If no related services in the same category, find ANY other available service.
    if (related.length < 1) {
      related = items.filter(item =>
        item && String(item.meta.itemId) !== String(currentitemId) && item.meta.type === 'service' && item.meta.flags.isActive === true
      );
    }
  } else { // It's a product
    // For a product, first try to find other products in the same category.
    related = items.filter(item =>
      item && // FIX: Robustly compare IDs as strings to avoid type mismatches.
      String(item.meta.itemId) !== String(currentitemId) &&
      item.meta.type === 'product' &&
      item.meta.links.categoryId === currentItemCategory &&
      item.meta.flags.isActive === true
    );

    // Fallback: If no related products in the same category, find ANY other available product.
    if (related.length < 1) {
      related = items.filter(item => 
        item && String(item.meta.itemId) !== String(currentitemId) && item.meta.type === 'product' && item.meta.flags.isActive === true
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
    const card = createCardFromTemplate({
      ...item,
      isSaved: isItemSaved(item.meta.itemId)
    });
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
 * Initializes the Item Details page. This is the main entry point for the view.
 * @param {boolean} force - If true, re-initializes the view even if already initialized.
 */
export async function init(force = false) { // Make the function async
  console.log('🚀 Initializing Item Details View...');
  // Clean up any existing zoom listeners from a previously viewed item on the same page load.
  // This is crucial for when a user clicks a "related item".
  if (cleanupImageZoom) {
    cleanupImageZoom();
  }
  if (cleanupDesktopZoom) {
    cleanupDesktopZoom();
  }

  // Scroll to the top of the page on load. This is crucial for when a user clicks a
  // related item, ensuring they see the main details of the new item.
  const viewContent = document.querySelector('.page-view-area.view-active');
  if (viewContent) viewContent.scrollTop = 0;

  // Initialize search functionality for the header's search bar.
  initializeSearch();
  
  // Shared state for mobile swipe and zoom logic, passed by reference.
  const scaleRef = { scale: 1 };
  
  // --- NEW: Get item ID from route parameters ---
  const routeParams = window.routeManager.routeParams;
  const itemId = routeParams ? routeParams.id : null;
  let item = null;

  if (!itemId) {
    console.error("Item ID not found in route parameters.");
    // Fallback to selectedItem if no ID in URL, though this is less likely
    const itemDataString = sessionStorage.getItem('selectedItem');
    if (itemDataString) item = JSON.parse(itemDataString);
  } else {
    // Priority 1: Check if the item is the 'selectedItem' in sessionStorage
    const selectedItemStr = sessionStorage.getItem('selectedItem');
    if (selectedItemStr) {
        const selectedItem = JSON.parse(selectedItemStr);
        if (String(selectedItem.meta.itemId) === String(itemId)) {
            item = selectedItem;
        }
    }

    // Priority 2: If not, check the 'allItems' cache in sessionStorage
    if (!item) {
    const allItems = JSON.parse(sessionStorage.getItem('allItems') || '[]');
      item = allItems.find(i => String(i.meta.itemId) === String(itemId));
    }

    // Priority 3: If still not found, fetch from the data source (Firebase/local)
    if (!item) {
      console.log(`Item ${itemId} not in sessionStorage, fetching from data source...`);
      item = await fetchItemById(itemId);
    }
  }

  if (!item) {
    console.error("No item data found. User may have landed here directly.");
    const container = document.getElementById('item-details-container');
    container.innerHTML = `
      <div class="placeholder-view" style="text-align: center; padding: 40px;">
        <h2><i class="fas fa-exclamation-triangle"></i> Item Not Found in SPA</h2>
        <p>We couldn't find the item you're looking for.</p>
        <p>Please go back to the <a href="/#home" style="color: var(--primary-color); text-decoration: underline;">Home page</a> to select an item.</p>
      </div>
    `;
    const relatedSection = document.querySelector('.related-section');
    if (relatedSection) relatedSection.style.display = 'none';
    return;
  }

  // Store the current item's ID on the container for easy access by managers
  const container = document.getElementById('item-details-container');
  container.dataset.itemId = item.meta.itemId;

  try {
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

  // 🪵 LOG: Log the item data to confirm it's loaded correctly.
  console.log('[item-details] Item data loaded:', item);

  // Share button
  const shareBtn = document.getElementById('item-share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', shareItem);
  }

  // --- Professional Feedback Modal Implementation ---
  const feedbackBtn = replaceElement('item-feedback-btn');

  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', async () => {
      // Pass context to the feedback modal
      const context = {
        itemId: item.meta.itemId,
        itemName: item.info.name
      };
      // The showFeedbackModal function now handles loading, initialization, and display.
      showFeedbackModal(context);
    });
  }
}

export function cleanup() {
    console.log('🧹 Cleaning up Item Details View...');
    // Clean up any existing zoom listeners.
    if (cleanupImageZoom) cleanupImageZoom();
    if (cleanupDesktopZoom) cleanupDesktopZoom();
    // भविष्य में यदि आवश्यक हो तो यहां और इवेंट लिसनर्स हटा दें
}