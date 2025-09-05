let bannerTemplate = ''; // Global variable to store the template

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
export function createBannerFromTemplate(bannerData) {
    const bannerWrapper = document.createElement('div');
    bannerWrapper.className = 'banner-wrapper'; // Optional: Add a wrapper class

    const populatedHtml = renderTemplate(bannerTemplate, bannerData);
    bannerWrapper.innerHTML = populatedHtml;

    return bannerWrapper;
}

/**
 * Initializes the BannerManager by fetching the banner.html template.
 */
export async function initBannerManager() {
    try {
        const templateResponse = await fetch('./source/components/cards/banner.html');
        if (!templateResponse.ok) throw new Error(`Failed to fetch banner.html: ${templateResponse.statusText}`);
        bannerTemplate = await templateResponse.text();
    } catch (error) {
        console.error('Error initializing BannerManager:', error);
        // Optionally, handle error more gracefully
    }
}