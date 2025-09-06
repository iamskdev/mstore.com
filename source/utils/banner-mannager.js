let bannerTemplate = '';

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
 * Renders a banner into the container using the provided promotion data.
 * @param {object} promotionData - The promotion data object from the event detail.
 */
function renderBanner(promotionData) {
    const containerId = 'banner-container'; // Standard container ID for the main banner
    const bannerContainer = document.getElementById(containerId);
    if (!bannerContainer) return;

    const fallbackBannerData = {
        bannerType: "INFO",
        brandLogo: "source/assets/logos/app-logo.png",
        brandName: "mStore",
        itemBrand: "Welcome",
        contentTitle: "Your One-Stop Shop",
        contentSubtitle: "Explore products, services, and more.",
        itemImage: "localstore/images/default-product.jpg",
        priceText: "Shop Now",
        ctaText: "Explore",
        ctaLink: "#"
    };

    let bannerData;
    if (promotionData && promotionData.display) {
        bannerData = mapPromotionToBannerData(promotionData);
    } else {
        bannerData = fallbackBannerData;
    }

    const bannerElement = createBannerFromTemplate(bannerData);
    bannerContainer.innerHTML = '';
    bannerContainer.appendChild(bannerElement);
}

/**
 * Initializes the BannerManager by fetching the template and listening for promotion events.
 */
export async function initBannerManager() {
    try {
        const templateResponse = await fetch('./source/components/cards/banner.html');
        if (!templateResponse.ok) throw new Error(`Failed to fetch banner.html: ${templateResponse.statusText}`);
        bannerTemplate = await templateResponse.text();

        // Listen for the global promotion event dispatched by main.js
        window.addEventListener('promotionActivated', (event) => {
            console.log("BannerManager: Caught promotionActivated event.", event.detail);
            renderBanner(event.detail);
        });

    } catch (error) {
        console.error('Error initializing BannerManager:', error);
        // If the banner manager fails to init, we can render a fallback banner
        renderBanner(null); 
    }
}