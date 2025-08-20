/**
 * @file language-manager.js
 * Manages loading language files and providing translations for dynamic content like categories.
 * This service initializes itself on import.
 */

const LanguageService = (() => {
    let translations = {};
    let currentLang = 'en'; // Default language

    /**
     * Loads a language file from the server.
     * @param {string} langCode - The language code (e.g., 'en', 'hi').
     * @returns {Promise<object>} A promise that resolves to the translation object.
     */
    async function _loadLanguageFile(langCode) {
        try {
            const response = await fetch(`../assets/lang/${langCode}.json`);
            if (!response.ok) {
                console.error(`Language file not found: ${langCode}.json. Falling back to 'en'.`);
                // If the requested language fails, try falling back to English.
                if (langCode !== 'en') {
                    return await _loadLanguageFile('en');
                }
                return {}; // Return empty if English also fails to prevent errors.
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to load language file ${langCode}.json:`, error);
            return {}; // Return empty on network or other errors.
        }
    }

    /**
     * Initializes the language service by loading the preferred language.
     */
    async function init() {
        // For now, we default to 'en'. Later, you can get this from localStorage.
        const preferredLang = localStorage.getItem('app-language') || 'en';
        currentLang = preferredLang;
        translations = await _loadLanguageFile(currentLang);
        console.log(`✅ Language Manager initialized with '${currentLang}'.`);
    }

    /**
     * Formats a slug into a readable title (e.g., 'home-services' -> 'Home Services').
     * @param {string} slug - The slug to format.
     * @returns {string} The formatted, human-readable string.
     */
    function _formatSlug(slug = '') {
        if (!slug) return '';
        return slug.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    }

    /**
     * Gets the translated name for a category or subcategory object.
     * Falls back to a formatted slug if the translation key is not found.
     * @param {object} category - The category or subcategory object.
     * @returns {string} The translated name or a formatted slug.
     */
    function getCategoryName(category) {
        const id = category?.meta?.categoryId || category?.subCatId;
        const fallback = _formatSlug(category?.meta?.slug || category?.slug);
        return translations[id] || fallback;
    }

    return { init, getCategoryName };
})();

// Initialize the service immediately upon import.
await LanguageService.init();

export const languageManager = LanguageService;