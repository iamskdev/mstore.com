import { fetchAllPromotions } from '../utils/data-manager.js';

let bannerTemplate = '';
let allActiveBanners = [];
let currentBannerIndex = 0;
let autoSwipeIntervalId = null;
const AUTO_SWIPE_INTERVAL = 5000; // 5 seconds
let isInitialized = false;
let eventListeners = [];

let startX = 0;
let endX = 0;
const SWIPE_THRESHOLD = 50; // Minimum pixels to consider a swipe

/**
 * Maps a promotion object from the JSON to a flat bannerData object for the template.
 * @param {object} promotion - The promotion object.
 * @returns {object} A flat object with keys matching the banner template.
 */
function mapPromotionToBannerData(promotion) {
    const display = promotion.display || {};
    const banner = display.banner || {};
    const brand = display.brand || {};
    const action = display.action || {};

    return {
        bannerType: banner.type || 'AD',
        brandLogo: brand.logoUrl || '',
        brandName: brand.name || '',
        itemBrand: brand.itemBrandText || '',
        contentTitle: banner.title || '',
        contentSubtitle: banner.subtitle || '',
        itemImage: banner.imageUrl || '',
        priceText: banner.priceText || '',
        ctaLink: action.value || '#',
        ctaText: action.ctaText || 'Explore'
    };
}

/**
 * A simple template engine to replace placeholders.
 * @param {string} template - The HTML template string.
 * @param {object} data - The data to populate the template with.
 * @returns {string} The populated HTML string.
 */
function renderTemplate(template, data) {
    let output = template;
    for (const key in data) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        output = output.replace(regex, data[key]);
    }
    return output;
}

/**
 * Creates a banner element from the banner.html template.
 * @param {object} bannerData - The data to populate the banner with.
 * @returns {HTMLElement} The banner element.
 */
function createBannerFromTemplate(bannerData) {
    const bannerWrapper = document.createElement('div');
    bannerWrapper.className = 'banner-wrapper';

    const populatedHtml = renderTemplate(bannerTemplate, bannerData);
    bannerWrapper.innerHTML = populatedHtml;

    return bannerWrapper;
}

/**
 * Updates the active state of pagination dots.
 */
function updateActiveDot() {
    const dotsContainer = document.getElementById('banner-pagination-dots');
    if (!dotsContainer) return;

    const dots = dotsContainer.children;
    for (let i = 0; i < dots.length; i++) {
        if (i === currentBannerIndex) {
            dots[i].classList.add('active');
        } else {
            dots[i].classList.remove('active');
        }
    }
}

/**
 * Renders a banner into the container using the provided promotion data.
 * @param {object} promotionData - The promotion data object from the event detail.
 */
function renderBanner(promotionData) {
    const containerId = 'banner-container';
    const bannerContainer = document.getElementById(containerId);
    if (!bannerContainer) return;

    // If there's no valid promotion data, hide the container and exit.
    if (!promotionData || !promotionData.display) {
        bannerContainer.style.display = 'none'; // Ensure hidden if no data
        return;
    }

    // If we have valid data, ensure the container is visible and render the banner.
    bannerContainer.style.display = 'block'; // Override default display: none; from CSS
    const bannerData = mapPromotionToBannerData(promotionData);
    const bannerElement = createBannerFromTemplate(bannerData);

    bannerContainer.innerHTML = ''; // Clear previous content
    bannerContainer.appendChild(bannerElement);
    updateActiveDot(); // Update active dot after rendering
}

/**
 * Navigates to a specific banner by index.
 * @param {number} index - The index of the banner to show.
 */
function goToBanner(index) {
    if (index < 0) {
        currentBannerIndex = allActiveBanners.length - 1;
    } else if (index >= allActiveBanners.length) {
        currentBannerIndex = 0;
    } else {
        currentBannerIndex = index;
    }
    renderBanner(allActiveBanners[currentBannerIndex]);
    startAutoSwipe(); // Restart auto-swipe after manual navigation
}

/**
 * Creates pagination dots for each banner.
 */
function createPaginationDots() {
    const dotsContainer = document.getElementById('banner-pagination-dots');
    if (!dotsContainer) return;

    dotsContainer.innerHTML = ''; // Clear existing dots
    if (allActiveBanners.length <= 1) {
        dotsContainer.style.display = 'none'; // Hide dots if 0 or 1 banner
        return;
    } else {
        dotsContainer.style.display = 'flex'; // Show dots if multiple banners
    }

    for (let i = 0; i < allActiveBanners.length; i++) {
        const dot = document.createElement('span');
        dot.classList.add('banner-dot');
        dot.dataset.index = i.toString();

        const handler = () => {
            goToBanner(i);
        };
        dot.addEventListener('click', handler);
        eventListeners.push({ element: dot, type: 'click', handler });
        dotsContainer.appendChild(dot);
    }
}

function showNextBanner() {
    if (allActiveBanners.length === 0) {
        renderBanner(null); // Hide banner if no active banners
        return;
    }

    currentBannerIndex = (currentBannerIndex + 1) % allActiveBanners.length;
    renderBanner(allActiveBanners[currentBannerIndex]);
}

function startAutoSwipe(interval = AUTO_SWIPE_INTERVAL) {
    if (autoSwipeIntervalId) {
        clearInterval(autoSwipeIntervalId);
    }
    if (allActiveBanners.length > 1) {
        autoSwipeIntervalId = setInterval(showNextBanner, interval);
    }
}

// Touch event handlers for swipe
function handleTouchStart(event) {
    startX = event.touches[0].clientX;
    clearInterval(autoSwipeIntervalId); // Stop auto-swipe on touch
}

function handleTouchMove(event) {
    endX = event.touches[0].clientX;
}

function handleTouchEnd() {
    const diffX = endX - startX;
    if (Math.abs(diffX) > SWIPE_THRESHOLD) {
        if (diffX > 0) {
            // Swiped right (show previous banner) - Decrement index
            goToBanner(currentBannerIndex - 1);
        } else {
            // Swiped left (show next banner) - Increment index
            goToBanner(currentBannerIndex + 1);
        }
    }
    startX = 0;
    endX = 0;
    startAutoSwipe(); // Restart auto-swipe after swipe
}

function cleanupEventListeners() {
    eventListeners.forEach(({ element, type, handler }) => {
        element.removeEventListener(type, handler);
    });
    eventListeners = [];
    if (autoSwipeIntervalId) {
        clearInterval(autoSwipeIntervalId);
    }
}

/**
 * Initializes the BannerManager by fetching the template and setting up auto-swiping.
 */
export async function initBannerManager() {
    try {
        const templateResponse = await fetch('./source/templates/banner.html');
        if (!templateResponse.ok) throw new Error(`Failed to fetch banner.html: ${templateResponse.statusText}`);
        bannerTemplate = await templateResponse.text();

        // Fetch all promotions and filter active ones
        const allPromotions = await fetchAllPromotions();
        const now = new Date();
        allActiveBanners = allPromotions.filter(p => {
            const status = p.meta?.status;
            const schedule = p.meta?.schedule;

            if (!status || status.isActive !== true) {
                return false; // Must be active
            }

            if (schedule && schedule.start && schedule.end) {
                const startDate = new Date(schedule.start);
                const endDate = new Date(schedule.end);
                return now >= startDate && now <= endDate;
            }

            return true; // If active and no schedule, it's always valid
        });

        if (allActiveBanners.length > 0) {
            createPaginationDots(); // Create dots after banners are loaded
            renderBanner(allActiveBanners[currentBannerIndex]); // Render initial banner
            startAutoSwipe(); // Start auto-swiping

            // Add touch event listeners for swipe
            const bannerContainer = document.getElementById('banner-container');
            if (bannerContainer) {
                cleanupEventListeners(); // Clear old listeners before adding new ones
                bannerContainer.addEventListener('touchstart', handleTouchStart);
                bannerContainer.addEventListener('touchmove', handleTouchMove);
                bannerContainer.addEventListener('touchend', handleTouchEnd);
                eventListeners.push({ element: bannerContainer, type: 'touchstart', handler: handleTouchStart });
                eventListeners.push({ element: bannerContainer, type: 'touchmove', handler: handleTouchMove });
                eventListeners.push({ element: bannerContainer, type: 'touchend', handler: handleTouchEnd });
            }

        } else {
            renderBanner(null); // Hide banner if no active banners
        }

    } catch (error) {
        console.error('Error initializing BannerManager:', error);
        // If the banner manager fails to init, render a fallback banner.
        // renderFallbackBanner(); // Removed fallback banner call
    }
}