/**
 * Add Item Module
 * Production Integration: Modular add-item functionality
 */

// Module State
let initialized = false;
let cleanupFunctions = [];

// Store element references globally within module
let elements = {};

/**
 * Initialize the Add Item module
 * @param {boolean} force - Force re-initialization
 */
export function init(force = false) {
    if (initialized && !force) {
        console.log('✅ Add Item already initialized');
        return;
    }

    console.log('🚀 Initializing Add Item module...');

    // Cache all DOM elements
    cacheElements();

    // Initialize all components
    initToggleSection();
    initFormToggles();
    initTabs();
    initDynamicAttributes();
    initCodeGeneration();
    initStockTracking();
    initPhotoUpload();
    initComboboxes();
    initModals();
    initDragAndDrop();

    // Load data
    loadUnits();

    initialized = true;
    console.log('✅ Add Item module initialized');
}

/**
 * Cleanup function to remove event listeners
 */
export function cleanup() {
    console.log('🧹 Cleaning up Add Item module...');

    // Execute all cleanup functions
    cleanupFunctions.forEach(fn => {
        try {
            fn();
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    });

    cleanupFunctions = [];
    elements = {};
    initialized = false;

    console.log('✅ Add Item module cleaned up');
}

/**
 * Cache DOM elements for performance
 */
function cacheElements() {
    elements = {
        // Toggle Section
        productToggle: document.getElementById('productToggle'),
        serviceToggle: document.getElementById('serviceToggle'),
        toggleGroup: document.getElementById('toggleGroup'),
        itemStatusToggle: document.getElementById('itemStatusToggle'),
        itemStatusLabel: document.getElementById('itemStatusLabel'),

        // Form Toggles
        secondaryUnitToggle: document.getElementById('secondaryUnitToggle'),
        secondaryUnitSection: document.getElementById('secondaryUnitSection'),
        wholesalePriceToggle: document.getElementById('wholesalePriceToggle'),
        wholesalePriceSection: document.getElementById('wholesalePriceSection'),
        brandToggle: document.getElementById('brandToggle'),
        brandSection: document.getElementById('brandSection'),
        detailedTrackingToggle: document.getElementById('detailedTrackingToggle'),
        detailedTrackingSection: document.getElementById('detailedTrackingSection'),
        privateNoteToggle: document.getElementById('privateNoteToggle'),
        privateNoteSection: document.getElementById('privateNoteSection'),
        mrpToggle: document.getElementById('mrpToggle'),
        mrpSection: document.getElementById('mrpSection'),

        // Tabs
        tabs: document.querySelectorAll('.mstore-tab'),
        pricingContent: document.getElementById('pricingTabContent'),
        stockContent: document.getElementById('stockTabContent'),
        moreContent: document.getElementById('moreTabContent'),

        // Attributes
        attributesContainer: document.getElementById('attributesContainer'),
        addAttributeBtn: document.getElementById('addAttributeBtn'),

        // Code Generation
        assignCodeBtn: document.getElementById('assignCodeBtn'),
        itemCodeInput: document.getElementById('itemCodeInput'),
        scanCodeBtn: document.getElementById('scanCodeBtn'),
        scannerModal: document.getElementById('scannerModal'),
        closeScannerBtn: document.getElementById('closeScannerBtn'),

        // Stock Tracking
        stockTrackingToggle: document.getElementById('stockTrackingToggle'),
        stockDetailsSection: document.getElementById('stockDetailsSection'),
        asOfDateInput: document.getElementById('asOfDateInput'),

        // Units
        primaryUnitInput: document.getElementById('primaryUnit'),
        primaryUnitDisplay: document.getElementById('primaryUnitInputDisplay'),
        primaryUnitIcon: document.getElementById('primaryUnitIcon'),
        primaryUnitDropdown: document.getElementById('primaryUnitDropdown'),
        secondaryUnitInput: document.getElementById('secondaryUnit'),
        secondaryUnitDisplay: document.getElementById('secondaryUnitInputDisplay'),
        secondaryUnitIcon: document.getElementById('secondaryUnitIcon'),
        secondaryUnitDropdown: document.getElementById('secondaryUnitDropdown'),
        conversionInput: document.getElementById('conversionInput'),

        // Categories & Brands
        categoryInput: document.getElementById('itemCategory'),
        categoryDisplay: document.getElementById('categoryInputDisplay'),
        categoryIcon: document.getElementById('categoryIcon'),
        categoryDropdown: document.getElementById('categoryDropdown'),
        brandInput: document.getElementById('itemBrand'),
        brandDisplay: document.getElementById('brandInputDisplay'),
        brandIcon: document.getElementById('brandIcon'),
        brandDropdown: document.getElementById('brandDropdown'),

        // Modals
        selectionModal: document.getElementById('selectionModal'),
        modalSearch: document.getElementById('modalSearch'),
        modalList: document.getElementById('modalList'),
        modalCloseActionBtn: document.getElementById('modalCloseActionBtn'),
        conversionModal: document.getElementById('conversionModal'),
        createItemModal: document.getElementById('createItemModal'),

        // Photo Upload
        photoGrid: document.querySelector('.mstore-photo-grid'),
        mediaUploadModal: document.getElementById('mediaUploadModal'),
    };
}

// Import the rest of the logic from original file
// We'll keep the existing functions and just wrap them in init/cleanup

${ await Deno.readTextFile('h:\\My Projects\\ecommerce\\mStore\\source\\modules\\merchant\\scripts\\add-item.js') }

// Export cleanup helper
function addCleanup(fn) {
    cleanupFunctions.push(fn);
}
