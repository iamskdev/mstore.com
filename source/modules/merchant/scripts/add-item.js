/**
 * Add Item Module - Production Version
 * Manages item creation form with full functionality
 */

import { fetchItemById, fetchUserById, fetchAllCategories, fetchAllUnits } from '../../../utils/data-manager.js';
import { showToast } from '../../../utils/toast.js';
import { firestore } from '../../../firebase/firebase-config.js';
import { generateId } from '../../../utils/idGenerator.js';
import { AuthService } from '../../../firebase/auth/auth.js';
import { localCache } from '../../../utils/data-manager.js';

// Module state
let initialized = false;
const cleanupFunctions = [];
let allUnitsGlobal = [];
let allCategoriesGlobal = [];
const allBrandsGlobal = [
    { code: "local", displayName: "Local", type: "Common" },
    { code: "brand1", displayName: "Brand A", type: "Premium" },
    { code: "brand2", displayName: "Brand B", type: "Premium" },
];

let currentItemId = null; // Store the ID of the item being edited
let currentEditItem = null; // Store the full item object if editing

/**
 * Initialize the module
 */
/**
 * Load units from Firebase via data manager
 */
async function loadUnits() {
    console.log("Fetching units from Firebase...");
    try {
        const units = await fetchAllUnits();
        console.log("Units fetched from Firebase:", units);

        if (!units || units.length === 0) {
            console.log("No units found in Firebase - using empty array");
            allUnitsGlobal = [];
            console.log("Final units loaded: 0 (empty)");
        } else {
            populateUnitsGlobal(units);
        }
    } catch (error) {
        console.error("Error loading units:", error);
        console.log("Firebase units failed - using empty array");
        allUnitsGlobal = [];
        console.log("Final units loaded: 0 (error)");
    }
}

/**
 * Populate global units array
 */
function populateUnitsGlobal(units) {
    console.log("Raw units data:", units);
    allUnitsGlobal = [];

    units.forEach((unit) => {
        // Handle nested structure (local JSON) vs flat structure (Firebase)
        if (unit.subunits && Array.isArray(unit.subunits)) {
            // Local JSON structure with groups and subunits
            unit.subunits.forEach((subunit) => {
                const unitObj = {
                    ...subunit,
                    type: unit.meta?.type || 'unknown',
                    displayName: subunit.title || subunit.name || subunit.code,
                };
                allUnitsGlobal.push(unitObj);
            });
        } else {
            // Firebase flat structure
            const unitObj = {
                ...unit,
                displayName: unit.title || unit.name || unit.code,
            };
            allUnitsGlobal.push(unitObj);
        }
    });

    console.log(`Final units loaded: ${allUnitsGlobal.length}`, allUnitsGlobal);

    // Units combobox is already set up during initialization and will use the updated allUnitsGlobal
}

/**
 * Load categories from Firebase via data manager
 */
async function loadCategories() {
    console.log("Fetching categories from Firebase...");
    try {
        const categories = await fetchAllCategories();
        console.log("Categories fetched from Firebase:", categories);

        if (!categories || categories.length === 0) {
            console.log("No categories found in Firebase - using empty array");
            allCategoriesGlobal = [];
            console.log("Final categories loaded: 0 (empty)");
        } else {
            populateCategoriesGlobal(categories);
        }
    } catch (error) {
        console.error("Error loading categories from Firebase:", error);
        console.log("Firebase categories failed - using empty array");
        allCategoriesGlobal = [];
        console.log("Final categories loaded: 0 (error)");
    }
}

/**
 * Setup category combobox after categories are loaded
 */
function setupCategoryCombobox() {
    const categoryInput = document.getElementById("itemCategory");
    const categoryDisplay = document.getElementById("categoryInputDisplay");
    const categoryIcon = document.getElementById("categoryIcon");
    const categoryDropdown = document.getElementById("categoryDropdown");

    if (categoryInput && categoryDisplay && categoryIcon && categoryDropdown) {
        setupCombobox(
            categoryDisplay,
            categoryIcon,
            categoryDropdown,
            categoryInput,
            () => {
                // Callback after category selection
                console.log("Category selected:", categoryInput.value);
            },
            {
                title: "Select Category",
                data: allCategoriesGlobal,
                enableCreate: true,
                multiSelect: true,
            }
        );
        console.log("Category combobox setup completed with", allCategoriesGlobal.length, "categories");
    } else {
        console.warn("Category combobox elements not found, skipping setup");
    }
}

/**
 * Populate global categories array
 */
function populateCategoriesGlobal(categories) {
    console.log("Raw categories data:", categories);
    allCategoriesGlobal = [];

    categories.forEach((category, index) => {
        // Handle both Firebase structure and local JSON structure
        const meta = category.meta || category;
        const flags = meta.flags || {};

        // Only include active, non-deleted categories
        if (flags.isActive !== false && flags.isDeleted !== true) {
            const categoryObj = {
                code: meta.categoryId || category.categoryId,
                displayName: category.seo?.title || meta.slug || meta.name || meta.categoryId || category.name,
                type: flags.isCustom ? "Custom" : "Standard",
                icon: meta.icon || category.icon,
                isPopular: flags.isPopular || false,
                displayOrder: meta.displayOrder || category.displayOrder || 999
            };

            allCategoriesGlobal.push(categoryObj);
        }
    });

    // Sort by displayOrder, then by isPopular, then by displayName
    allCategoriesGlobal.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
            return a.displayOrder - b.displayOrder;
        }
        if (a.isPopular !== b.isPopular) {
            return b.isPopular - a.isPopular; // Popular first
        }
        return a.displayName.localeCompare(b.displayName);
    });

    console.log(`Final categories loaded: ${allCategoriesGlobal.length}`, allCategoriesGlobal);

    // Setup category combobox now that categories are loaded
    setupCategoryCombobox();
}

export async function init(force = false, params = {}) {
    if (initialized && !force) {
        console.log('✅ Add Item already initialized');
        return;
    }

    console.log('🚀 Initializing Add Item module...');

    // Check for itemId in parameters for edit mode
    currentItemId = params.itemId || null;
    const formTitle = document.getElementById('addItemFormTitle');
    const submitButton = document.getElementById('submitItemBtn'); // Assuming an ID for your submit button

    if (currentItemId) {
        console.log(`💡 Edit mode: Fetching item with ID: ${currentItemId}`);
        try {
            currentEditItem = await fetchItemById(currentItemId);
            if (currentEditItem) {
                console.log('Fetched item for editing:', currentEditItem);
                if (formTitle) formTitle.textContent = 'Update Item';
                if (submitButton) submitButton.textContent = 'Update Item';
                populateForm(currentEditItem);
            } else {
                console.warn(`Item with ID ${currentItemId} not found.`);
                // Maybe redirect or show error? For now, proceed as add new.
                currentItemId = null;
                currentEditItem = null;
                if (formTitle) formTitle.textContent = 'Add Item';
                if (submitButton) submitButton.textContent = 'Save Item';
                clearForm();
            }
        } catch (error) {
            console.error('Error fetching item for editing:', error);
            currentItemId = null;
            currentEditItem = null;
            if (formTitle) formTitle.textContent = 'Add Item';
            if (submitButton) submitButton.textContent = 'Save Item';
            clearForm();
        }
    } else {
        // Clear form for new item
        clearForm();
        if (formTitle) formTitle.textContent = 'Add Item';
        if (submitButton) submitButton.textContent = 'Save Item';
    }

    initializeAllComponents();
    await loadUnits();
    await loadCategories();

    initialized = true;
    console.log('✅ Add Item module initialized');
}

/**
 * Cleanup function
 */
export function cleanup() {
    console.log('🧹 Cleaning up Add Item module...');
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions.length = 0;
    initialized = false;
    currentItemId = null;
    currentEditItem = null;
    console.log('✅ Add Item cleaned up');
}

/**
 * Populates the form fields with existing item data for editing.
 * @param {object} item - The item object to populate the form with.
 */
function populateForm(item) {
    console.log("Populating form with item data:", item);

    // --- Basic Text Inputs ---
    const itemNameInput = document.getElementById('itemNameInput');
    if (itemNameInput && item.info?.name) itemNameInput.value = item.info.name;

    const itemSkuInput = document.getElementById('itemSkuInput');
    if (itemSkuInput && item.info?.sku) itemSkuInput.value = item.info.sku;

    const publicDescription = document.getElementById('publicDescription');
    if (publicDescription && item.info?.description) publicDescription.value = item.info.description;

    const privateNote = document.getElementById('privateNote');
    if (privateNote && item.info?.note) privateNote.value = item.info.note;

    const itemCodeInput = document.getElementById('itemCodeInput');
    if (itemCodeInput && (item.info?.itemCode || item.info?.barcode)) { // Use barcode if itemCode is not present
        itemCodeInput.value = item.info.itemCode || item.info.barcode;
    }
    
    const itemTags = document.getElementById('item-tags');
    if (itemTags && item.seo?.keywords && item.seo.keywords.length > 0) {
        itemTags.value = item.seo.keywords.join(', ');
    }

    const hsnCodeInput = document.getElementById('hsnCodeInput');
    if (hsnCodeInput && item.info?.hsnCode) hsnCodeInput.value = item.info.hsnCode;

    const gstRateSelect = document.getElementById('gstRateSelect');
    if (gstRateSelect && item.pricing?.gstRate !== undefined) {
        gstRateSelect.value = item.pricing.gstRate.toString();
    }

    // --- Toggles ---
    // Product/Service Toggle
    const productToggle = document.getElementById("productToggle");
    const serviceToggle = document.getElementById("serviceToggle");
    if (item.meta?.type === 'product') {
        productToggle.classList.add("active");
        serviceToggle.classList.remove("active");
    } else if (item.meta?.type === 'service') {
        serviceToggle.classList.add("active");
        productToggle.classList.remove("active");
    }

    // Item Status Toggle
    const itemStatusToggle = document.getElementById("itemStatusToggle");
    if (itemStatusToggle && item.inventory?.isAvailable !== undefined) {
        itemStatusToggle.checked = item.inventory.isAvailable;
        // Trigger change event to update UI label
        itemStatusToggle.dispatchEvent(new Event('change'));
    }

    // Visibility Toggle - Check visibility field
    const visibilityToggle = document.getElementById("visibilityToggle");
    if (visibilityToggle) {
        visibilityToggle.checked = item.meta?.visibility === 'public';
    }


    // Secondary Unit Toggle
    const secondaryUnitToggle = document.getElementById("secondaryUnitToggle");
    if (secondaryUnitToggle && item.links?.secondaryUnitId) {
        secondaryUnitToggle.checked = true;
        secondaryUnitToggle.dispatchEvent(new Event('change')); // Trigger event to show section
    } else if (secondaryUnitToggle) {
        secondaryUnitToggle.checked = false;
        secondaryUnitToggle.dispatchEvent(new Event('change'));
    }

    // Wholesale Price Toggle
    const wholesalePriceToggle = document.getElementById("wholesalePriceToggle");
    if (wholesalePriceToggle && item.pricing?.wholesalePrice) {
        wholesalePriceToggle.checked = true;
        wholesalePriceToggle.dispatchEvent(new Event('change')); // Trigger event to show section
    } else if (wholesalePriceToggle) {
        wholesalePriceToggle.checked = false;
        wholesalePriceToggle.dispatchEvent(new Event('change'));
    }
    
    // Brand Toggle
    const brandToggle = document.getElementById("brandToggle");
    if (brandToggle && item.links?.brandId) {
        brandToggle.checked = true;
        brandToggle.dispatchEvent(new Event('change')); // Trigger event to show section
    } else if (brandToggle) {
        brandToggle.checked = false;
        brandToggle.dispatchEvent(new Event('change'));
    }

    // Detailed Tracking Toggle
    const detailedTrackingToggle = document.getElementById("detailedTrackingToggle");
    if (detailedTrackingToggle && (item.inventory?.reorderQuantity !== undefined || item.inventory?.maxStockLevel !== undefined || item.inventory?.stockLocation)) {
        detailedTrackingToggle.checked = true;
        detailedTrackingToggle.dispatchEvent(new Event('change')); // Trigger event to show section
    } else if (detailedTrackingToggle) {
        detailedTrackingToggle.checked = false;
        detailedTrackingToggle.dispatchEvent(new Event('change'));
    }

    // Private Note Toggle
    const privateNoteToggle = document.getElementById("privateNoteToggle");
    if (privateNoteToggle && item.info?.note) { // Assuming 'note' being present implies private note is used
        privateNoteToggle.checked = true;
        privateNoteToggle.dispatchEvent(new Event('change')); // Trigger event to show section
    } else if (privateNoteToggle) {
        privateNoteToggle.checked = false;
        privateNoteToggle.dispatchEvent(new Event('change'));
    }

    // MRP Toggle
    const mrpToggle = document.getElementById("mrpToggle");
    if (mrpToggle && item.pricing?.mrp !== undefined) {
        mrpToggle.checked = true;
        mrpToggle.dispatchEvent(new Event('change')); // Trigger event to show section
    } else if (mrpToggle) {
        mrpToggle.checked = false;
        mrpToggle.dispatchEvent(new Event('change'));
    }

    // Stock Tracking Toggle - Enable if editing existing item or has inventory data
    const stockTrackingToggle = document.getElementById("stockTrackingToggle");
    if (stockTrackingToggle) {
        // Enable stock tracking if editing existing item or if there are existing inventory values
        const isEditingExisting = currentItemId !== null;
        const hasInventoryData = item.inventory?.stockQty !== undefined ||
                                item.inventory?.lowStockThreshold !== undefined ||
                                item.inventory?.reorderQuantity !== undefined ||
                                item.inventory?.maxStockLevel !== undefined ||
                                item.inventory?.stockLocation ||
                                item.inventory?.batchId ||
                                item.inventory?.expiryDate;

        stockTrackingToggle.checked = isEditingExisting || hasInventoryData;
        stockTrackingToggle.dispatchEvent(new Event('change')); // Trigger event to show section
    }


    // --- Pricing Inputs ---
    const purchasePriceInput = document.getElementById('purchasePriceInput');
    if (purchasePriceInput && item.pricing?.costPrice !== undefined) purchasePriceInput.value = item.pricing.costPrice;

    const sellingPriceInput = document.getElementById('sellingPriceInput');
    if (sellingPriceInput && item.pricing?.sellingPrice !== undefined) sellingPriceInput.value = item.pricing.sellingPrice;

    const mrpInput = document.getElementById('mrpInput');
    if (mrpInput && item.pricing?.mrp !== undefined) mrpInput.value = item.pricing.mrp;

    const wholesalePriceInput = document.getElementById('wholesalePriceInput');
    if (wholesalePriceInput && item.pricing?.wholesalePrice !== undefined) wholesalePriceInput.value = item.pricing.wholesalePrice;
    
    // --- Inventory Inputs ---
    const openingStockInput = document.getElementById('openingStockInput');
    if (openingStockInput && item.inventory?.stockQty !== undefined) openingStockInput.value = item.inventory.stockQty;

    const lowStockThresholdInput = document.getElementById('lowStockThresholdInput');
    if (lowStockThresholdInput && item.inventory?.lowStockThreshold !== undefined) lowStockThresholdInput.value = item.inventory.lowStockThreshold;

    const asOfDateInput = document.getElementById('asOfDateInput');
    // For date inputs, ensure the format is 'YYYY-MM-DD'
    if (asOfDateInput && item.audit?.updatedAt) {
        const date = new Date(item.audit.updatedAt);
        asOfDateInput.value = date.toISOString().split('T')[0];
    }

    const reorderQuantityInput = document.getElementById('reorderQuantityInput');
    if (reorderQuantityInput && item.inventory?.reorderQuantity !== undefined) reorderQuantityInput.value = item.inventory.reorderQuantity;

    const maxStockLevelInput = document.getElementById('maxStockLevelInput');
    if (maxStockLevelInput && item.inventory?.maxStockLevel !== undefined) maxStockLevelInput.value = item.inventory.maxStockLevel;

    const stockLocationInput = document.getElementById('stockLocationInput');
    if (stockLocationInput && item.inventory?.stockLocation) stockLocationInput.value = item.inventory.stockLocation;

    const batchNumberInput = document.getElementById('batchNumberInput');
    if (batchNumberInput && item.inventory?.batchId) batchNumberInput.value = item.inventory.batchId;

    const expiryDateInput = document.getElementById('expiryDateInput');
    if (expiryDateInput && item.inventory?.expiryDate) {
        // Assuming item.inventory.expiryDate is already in 'YYYY-MM-DD' or compatible format
        expiryDateInput.value = item.inventory.expiryDate;
    }

    // --- Comboboxes (Categories, Brands, Units) ---
    // These require more complex logic due to the custom combobox implementation.
    // We need to set both the hidden input's value (code) and the display input's text (displayName).
    // The `setupCombobox` function expects a callback, but for populating, we directly manipulate.

    const categoryInput = document.getElementById('itemCategory');
    const categoryInputDisplay = document.getElementById('categoryInputDisplay');
    if (categoryInput && categoryInputDisplay && item.links?.categoryId) {
        // Assuming allCategoriesGlobal is populated and contains full objects
        const category = allCategoriesGlobal.find(cat => cat.code === item.links.categoryId);
        if (category) {
            categoryInput.value = category.code;
            categoryInputDisplay.value = category.displayName;
        }
    }

    const brandInput = document.getElementById('itemBrand');
    const brandInputDisplay = document.getElementById('brandInputDisplay');
    if (brandInput && brandInputDisplay && item.links?.brandId) {
        // Assuming allBrandsGlobal is populated
        const brand = allBrandsGlobal.find(b => b.code === item.links.brandId);
        if (brand) {
            brandInput.value = brand.code;
            brandInputDisplay.value = brand.displayName;
        }
    }

    const primaryUnitInput = document.getElementById('primaryUnit');
    const primaryUnitInputDisplay = document.getElementById('primaryUnitInputDisplay');
    if (primaryUnitInput && primaryUnitInputDisplay && item.links?.unitId) {
        // Assuming allUnitsGlobal is populated
        const unit = allUnitsGlobal.find(u => u.code === item.links.unitId);
        if (unit) {
            primaryUnitInput.value = unit.code;
            primaryUnitInputDisplay.value = `${unit.displayName} (${unit.symbol})`;
        }
    }

    const secondaryUnitInput = document.getElementById('secondaryUnit');
    const secondaryUnitInputDisplay = document.getElementById('secondaryUnitInputDisplay');
    if (secondaryUnitInput && secondaryUnitInputDisplay && item.links?.secondaryUnitId) {
        // Assuming allUnitsGlobal is populated
        const unit = allUnitsGlobal.find(u => u.code === item.links.secondaryUnitId);
        if (unit) {
            secondaryUnitInput.value = unit.code;
            secondaryUnitInputDisplay.value = `${unit.displayName} (${unit.symbol})`;
        }
        // Also populate conversion input
        const conversionInput = document.getElementById('conversionInput');
        if (conversionInput && item.inventory?.conversionFactor) {
            conversionInput.value = item.inventory.conversionFactor;
            // Trigger update of the badge
            updateConversionDisplay();
        }
    }

    // --- Dynamic Attributes ---
    const attributesContainer = document.getElementById('attributesContainer');
    // Clear existing placeholder attributes if any
    attributesContainer.innerHTML = ''; 

    if (item.info?.attributes) {
        for (const key in item.info.attributes) {
            const value = item.info.attributes[key];
            const newRow = document.createElement("div");
            newRow.className = "mstore-row attribute-row";
            newRow.style.marginBottom = "10px";
            newRow.style.alignItems = "center";
            newRow.style.gap = "8px";
            newRow.style.gridTemplateColumns = "1fr 1fr auto";

            newRow.innerHTML = `
                <div class="mstore-input-wrapper" style="margin-top: 0;">
                    <input type="text" class="mstore-input" placeholder="Name" value="${key}">
                </div>
                <div class="mstore-input-wrapper" style="margin-top: 0;">
                    <input type="text" class="mstore-input" placeholder="Value" value="${value}">
                </div>
                <button type="button" class="delete-attr-btn" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px;">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            attributesContainer.appendChild(newRow);
        }
    }

    // --- Media (Images) ---
    // This part requires interaction with the photoGrid and potentially the `applyPhoto` function.
    // This is more complex and might need separate handling or ensuring `applyPhoto` can be called.
    const photoGrid = document.querySelector(".mstore-photo-grid");
    if (photoGrid && item.media) {
        // Clear existing photo items except the first 'primary' placeholder
        const existingPhotos = photoGrid.querySelectorAll(".mstore-photo-item:not(.primary)");
        existingPhotos.forEach(photo => photo.remove());

        // Fill thumbnail
        const primaryPhotoItem = photoGrid.querySelector(".mstore-photo-item.primary");
        if (primaryPhotoItem && item.media.thumbnail) {
            // Assuming applyPhoto can be called from here, or recreate its logic
            // For now, let's just set the image directly (simple version)
            primaryPhotoItem.innerHTML = `<img src="${item.media.thumbnail}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`;
            primaryPhotoItem.style.border = "2px solid #3b82f6";
        }

        // Fill gallery images
        if (item.media.gallery && item.media.gallery.length > 0) {
            item.media.gallery.forEach(imgSrc => {
                if (imgSrc) {
                    const newPhotoItem = document.createElement("div");
                    newPhotoItem.className = "mstore-photo-item";
                    newPhotoItem.setAttribute("draggable", "true");
                    newPhotoItem.innerHTML = `<img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`;
                    photoGrid.appendChild(newPhotoItem);
                }
            });
        }

        // Ensure we always have 4 empty gallery boxes
        const totalGalleryBoxes = photoGrid.querySelectorAll(".mstore-photo-item:not(.primary)").length;
        const neededBoxes = 4 - totalGalleryBoxes;
        for (let i = 0; i < neededBoxes; i++) {
            const emptyPhotoItem = document.createElement("div");
            emptyPhotoItem.className = "mstore-photo-item";
            emptyPhotoItem.setAttribute("draggable", "true");
            emptyPhotoItem.innerHTML = `
                <div class="mstore-photo-icon"><i class="fas fa-plus"></i></div>
                <div class="mstore-photo-label">Add Photo</div>
            `;
            photoGrid.appendChild(emptyPhotoItem);
        }
    }
}

/**
 * Add event listener with cleanup tracking
 */
function addTrackedListener(element, event, handler, options) {
    if (!element) return;
    element.addEventListener(event, handler, options);
    cleanupFunctions.push(() => element.removeEventListener(event, handler, options));
}

/**
 * Initialize all components
 */
/**
 * Clear form fields
 */
function clearForm() {
    // Clear all input fields
    const inputs = document.querySelectorAll('#merchant-add-item-view input[type="text"], #merchant-add-item-view input[type="number"], #merchant-add-item-view textarea');
    inputs.forEach(input => {
        if (input.id !== 'asOfDateInput') { // Keep as of date as today
            input.value = '';
        }
    });

    // Reset toggles
    const visibilityToggle = document.getElementById("visibilityToggle");
    if (visibilityToggle) visibilityToggle.checked = false;
    
    const itemStatusToggle = document.getElementById("itemStatusToggle");
    if (itemStatusToggle) itemStatusToggle.checked = true;
    
    const stockTrackingToggle = document.getElementById("stockTrackingToggle");
    if (stockTrackingToggle) stockTrackingToggle.checked = true;

    // Reset product/service toggle
    const productToggle = document.getElementById("productToggle");
    const serviceToggle = document.getElementById("serviceToggle");
    if (productToggle && serviceToggle) {
        productToggle.classList.add("active");
        serviceToggle.classList.remove("active");
    }

    // Clear photo grid
    const photoGrid = document.querySelector(".mstore-photo-grid");
    if (photoGrid) {
        const photos = photoGrid.querySelectorAll(".mstore-photo-item:not(.primary)");
        photos.forEach(photo => photo.remove());
        
        const primaryPhoto = photoGrid.querySelector(".mstore-photo-item.primary");
        if (primaryPhoto) {
            primaryPhoto.innerHTML = `
                <div class="mstore-photo-icon"><i class="fas fa-camera"></i></div>
                <div class="mstore-photo-label">Thumbnail</div>
            `;
            primaryPhoto.style.border = "none";
        }
    }

    // Clear hidden inputs
    const hiddenInputs = document.querySelectorAll('#merchant-add-item-view input[type="hidden"]');
    hiddenInputs.forEach(input => {
        if (input.id !== 'conversionInput') { // Keep conversion input
            input.value = '';
        }
    });

    // Reset dropdowns
    const dropdowns = document.querySelectorAll('#merchant-add-item-view .mstore-combobox-input');
    dropdowns.forEach(dropdown => {
        dropdown.value = '';
    });
}

function initializeAllComponents() {
    // Back button handler
    const headerBack = document.querySelector(".mstore-header-back");
    if (headerBack) {
        headerBack.addEventListener("click", () => {
            if (window.routeManager) {
                window.routeManager.switchView('merchant', 'add');
            } else {
                window.history.back();
            }
        });
    }

    // Product/Service Toggle
    const productToggle = document.getElementById("productToggle");
    const serviceToggle = document.getElementById("serviceToggle");
    const toggleGroup = document.getElementById("toggleGroup");

    productToggle.addEventListener("click", () => {
        productToggle.classList.add("active");
        serviceToggle.classList.remove("active");
        toggleGroup.classList.remove("service-mode");
        updateItemStatusUI();
    });

    serviceToggle.addEventListener("click", () => {
        serviceToggle.classList.add("active");
        productToggle.classList.remove("active");
        toggleGroup.classList.add("service-mode");
        updateItemStatusUI();
    });

    // Item Status Toggle Logic
    const itemStatusToggle = document.getElementById("itemStatusToggle");
    const itemStatusLabel = document.getElementById("itemStatusLabel");

    function updateItemStatusUI() {
        const isService = serviceToggle.classList.contains("active");
        const isChecked = itemStatusToggle.checked;

        if (isService) {
            itemStatusLabel.textContent = isChecked ? "Available" : "Unavailable";
            itemStatusLabel.style.color = isChecked ? "#10b981" : "#ef4444"; // Green / Red
        } else {
            itemStatusLabel.textContent = isChecked ? "In Stock" : "Out of Stock";
            itemStatusLabel.style.color = isChecked ? "#10b981" : "#ef4444"; // Green / Red
        }
    }

    itemStatusToggle.addEventListener("change", updateItemStatusUI);

    // Initialize Status UI
    updateItemStatusUI();

    // Secondary Unit Toggle
    const secondaryUnitToggle = document.getElementById("secondaryUnitToggle");
    const secondaryUnitSection = document.getElementById("secondaryUnitSection");

    secondaryUnitToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            secondaryUnitSection.classList.add("active");
        } else {
            secondaryUnitSection.classList.remove("active");
        }
    });

    // Wholesale Price Toggle
    const wholesalePriceToggle = document.getElementById("wholesalePriceToggle");
    const wholesalePriceSection = document.getElementById("wholesalePriceSection");

    wholesalePriceToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            wholesalePriceSection.classList.add("active");
        } else {
            wholesalePriceSection.classList.remove("active");
        }
    });

    // Tab Switching for Pricing, Stock, and More Details
    const tabs = document.querySelectorAll(".mstore-tab");
    const pricingContent = document.getElementById("pricingTabContent");
    const stockContent = document.getElementById("stockTabContent");
    const moreContent = document.getElementById("moreTabContent");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            // Remove active class from all tabs
            tabs.forEach((t) => t.classList.remove("active"));
            // Add active class to clicked tab
            tab.classList.add("active");

            // Hide all tab contents
            pricingContent.classList.remove("active");
            stockContent.classList.remove("active");
            moreContent.classList.remove("active");

            // Show target content
            const tabName = tab.getAttribute("data-tab");
            if (tabName === "pricing") {
                pricingContent.classList.add("active");
            } else if (tabName === "stock") {
                stockContent.classList.add("active");
            } else if (tabName === "more") {
                moreContent.classList.add("active");
            }
        });
    });

    // Brand Toggle Logic
    const brandToggle = document.getElementById("brandToggle");
    const brandSection = document.getElementById("brandSection");

    brandToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            brandSection.classList.add("active");
        } else {
            brandSection.classList.remove("active");
        }
    });

    // Detailed Tracking Toggle
    const detailedTrackingToggle = document.getElementById(
        "detailedTrackingToggle"
    );
    const detailedTrackingSection = document.getElementById(
        "detailedTrackingSection"
    );

    detailedTrackingToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            detailedTrackingSection.classList.add("active");
        } else {
            detailedTrackingSection.classList.remove("active");
        }
    });

    // Initialize As of Date with today's date
    const asOfDateInput = document.getElementById("asOfDateInput");
    const today = new Date().toISOString().split("T")[0];
    asOfDateInput.value = today;

    // Dynamic Attributes Logic
    const attributesContainer = document.getElementById("attributesContainer");
    const addAttributeBtn = document.getElementById("addAttributeBtn");

    addAttributeBtn.addEventListener("click", () => {
        const lastAttributeRow = attributesContainer.querySelector(
            ".attribute-row:last-child"
        );
        if (lastAttributeRow) {
            const inputs = lastAttributeRow.querySelectorAll("input");
            const nameInput = inputs[0];
            const valueInput = inputs[1];

            if (nameInput.value.trim() === "" || valueInput.value.trim() === "") {
                // Optional: Shake animation or border color to indicate fields are required
                lastAttributeRow.style.animation = "shake 0.5s";
                setTimeout(() => (lastAttributeRow.style.animation = ""), 500);
                return; // Don't add a new row if the last one is empty
            }
        }

        const newRow = document.createElement("div");
        newRow.className = "mstore-row attribute-row";
        newRow.style.marginBottom = "10px";
        newRow.style.alignItems = "center";
        newRow.style.gap = "8px";
        newRow.style.gridTemplateColumns = "1fr 1fr auto";

        newRow.innerHTML = `
                <div class="mstore-input-wrapper" style="margin-top: 0;">
                    <input type="text" class="mstore-input" placeholder="Name">
                </div>
                <div class="mstore-input-wrapper" style="margin-top: 0;">
                    <input type="text" class="mstore-input" placeholder="Value">
                </div>
                <button type="button" class="delete-attr-btn" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px;">
                    <i class="fas fa-trash"></i>
                </button>
            `;

        attributesContainer.appendChild(newRow);
    });

    attributesContainer.addEventListener("click", (e) => {
        if (e.target.closest(".delete-attr-btn")) {
            e.target.closest(".attribute-row").remove();
        }
    });

    // Assign Code Functionality
    const assignCodeBtn = document.getElementById("assignCodeBtn");
    const itemCodeInput = document.getElementById("itemCodeInput");

    assignCodeBtn.addEventListener("click", () => {
        // Generate unique code: PREFIX + TIMESTAMP + RANDOM
        const prefix = "ITM";
        const timestamp = Date.now().toString().slice(-6); // Last 6 digits
        const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random chars
        const generatedCode = `${prefix}-${timestamp}-${random}`;

        // Set the generated code to input
        itemCodeInput.value = generatedCode;

        // Optional: Add a brief highlight effect using theme variable
        const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-tertiary').trim() || '#f0f2f5';
        itemCodeInput.style.background = highlightColor;
        setTimeout(() => {
            itemCodeInput.style.background = "";
        }, 500);
    });

    // Private Note Toggle
    const privateNoteToggle = document.getElementById("privateNoteToggle");
    const privateNoteSection = document.getElementById("privateNoteSection");

    privateNoteToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            privateNoteSection.classList.add("active");
        } else {
            privateNoteSection.classList.remove("active");
        }
    });

    // MRP Toggle Logic
    const mrpToggle = document.getElementById("mrpToggle");
    const mrpSection = document.getElementById("mrpSection");

    mrpToggle.addEventListener("change", (e) => {
        if (e.target.checked) {
            mrpSection.classList.add("active");
        } else {
            mrpSection.classList.remove("active");
        }
    });

    // --- Barcode Scanner Logic ---
    const scanCodeBtn = document.getElementById("scanCodeBtn");
    const scannerModal = document.getElementById("scannerModal");
    const closeScannerBtn = document.getElementById("closeScannerBtn");
    let html5QrCode;

    scanCodeBtn.addEventListener("click", () => {
        // Show Modal
        scannerModal.style.display = "flex";

        // Initialize Scanner
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("reader");
        }

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        // Start Camera
        html5QrCode
            .start(
                { facingMode: "environment" },
                config,
                (decodedText, decodedResult) => {
                    // Success
                    itemCodeInput.value = decodedText;

                    // Feedback
                    itemCodeInput.style.background = "#d1fae5"; // Light green
                    setTimeout(() => (itemCodeInput.style.background = ""), 500);

                    // Stop and Close
                    stopScanner();
                },
                (errorMessage) => {
                    // Parse error, ignore common read errors
                }
            )
            .catch((err) => {
                console.error("Error starting scanner", err);
                alert(
                    "Could not start camera. Please ensure camera permissions are allowed."
                );
                scannerModal.style.display = "none";
            });
    });

    closeScannerBtn.addEventListener("click", () => {
        stopScanner();
    });

    function stopScanner() {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode
                .stop()
                .then(() => {
                    scannerModal.style.display = "none";
                })
                .catch((err) => {
                    console.error("Failed to stop scanner", err);
                    scannerModal.style.display = "none";
                });
        } else {
            scannerModal.style.display = "none";
        }
    }

    // --- Stock Logic Integration ---
    const stockTrackingToggle = document.getElementById("stockTrackingToggle");
    const stockDetailsSection = document.getElementById("stockDetailsSection");
    const openingStockInput = document.querySelector(
        '#stockDetailsSection input[placeholder="Enter count"]'
    );
    let openingStockEl = openingStockInput; // Use the more specific selector

    function handleStockTrackingToggle() {
        if (stockTrackingToggle.checked) {
            stockDetailsSection.classList.add("active");
        } else {
            stockDetailsSection.classList.remove("active");
        }
    }

    function syncStockStatus() {
        // Only sync if Stock Tracking is ON and NOT in Service mode
        if (
            stockTrackingToggle.checked &&
            !serviceToggle.classList.contains("active") &&
            openingStockEl
        ) {
            const qty = parseInt(openingStockEl.value) || 0;
            if (qty > 0) {
                itemStatusToggle.checked = true;
            } else {
                itemStatusToggle.checked = false;
            }
            updateItemStatusUI();
        }
    }

    // Listen for Tracking Toggle Change
    stockTrackingToggle.addEventListener("change", () => {
        handleStockTrackingToggle();
        syncStockStatus();
    });

    // Initialize on page load
    handleStockTrackingToggle();

    // Listen for Quantity Change
    if (openingStockEl) {
        openingStockEl.addEventListener("input", syncStockStatus);
    }

    // Hook into Service/Product toggle to reset/re-evaluate
    // (Existing listener at line 1172/1179 handles UI text, but we might want to re-trigger sync)

    // Add ID to Opening Stock Input for future safety in the DOM
    if (openingStockEl) openingStockEl.id = "openingStockInput";

    // Elements
    const primaryUnitInput = document.getElementById("primaryUnit");
    const primaryUnitDisplay = document.getElementById("primaryUnitInputDisplay");
    const primaryUnitIcon = document.getElementById("primaryUnitIcon");
    const primaryUnitDropdown = document.getElementById("primaryUnitDropdown");

    const secondaryUnitInput = document.getElementById("secondaryUnit");
    const secondaryUnitDisplay = document.getElementById(
        "secondaryUnitInputDisplay"
    );
    const secondaryUnitIcon = document.getElementById("secondaryUnitIcon");
    const secondaryUnitDropdown = document.getElementById("secondaryUnitDropdown");

    const conversionInput = document.getElementById("conversionInput");

    // Modal Elements
    const selectionModal = document.getElementById("selectionModal");
    const modalSearch = document.getElementById("modalSearch");
    const modalList = document.getElementById("modalList");
    const modalClose = document.getElementById("modalClose");

    // Modal State
    let currentCallback = null;
    let currentOptions = [];

    // --- Hybrid Combobox Logic ---

    function setupCombobox(
        inputEl,
        iconEl,
        dropdownEl,
        hiddenInputEl,
        onSelectCallback,
        config = {}
    ) {
        const title = config.title || "Select Option";
        const enableCreate = config.enableCreate || false;
        const multiSelect = config.multiSelect || false;

        // 1. Icon Click -> Open Full Modal

        iconEl.addEventListener("click", (e) => {
            e.stopPropagation();
            // Determine options source based on Config or default to Units
            const sourceData = config.data || allUnitsGlobal;

            // Get currently selected codes from hidden input
            const currentVal = hiddenInputEl.value || "";
            const initialSelection = currentVal ? currentVal.split(",") : [];

            openSelectionModal(
                sourceData,
                (selected) => {
                    selectUnit(selected, inputEl, hiddenInputEl, onSelectCallback);
                },
                title,
                enableCreate,
                multiSelect,
                initialSelection
            );
        });

        // Make Input Click also open the modal
        inputEl.addEventListener("click", (e) => {
            e.preventDefault();
            inputEl.blur();
            const sourceData = config.data || allUnitsGlobal;

            const currentVal = hiddenInputEl.value || "";
            const initialSelection = currentVal ? currentVal.split(",") : [];

            openSelectionModal(
                sourceData,
                (selected) => {
                    selectUnit(selected, inputEl, hiddenInputEl, onSelectCallback);
                },
                title,
                enableCreate,
                multiSelect,
                initialSelection
            );
        });

        // 2. Input Typing -> Filter Mini Dropdown
        inputEl.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase();
            const sourceData = config.data || allUnitsGlobal;

            if (!term) {
                dropdownEl.classList.remove("active");
                return;
            }

            const filtered = sourceData.filter((opt) => {
                const label = (opt.displayName || opt.label || opt.value).toLowerCase();
                const code = (opt.code || "").toLowerCase();
                return label.includes(term) || code.includes(term);
            });

            renderMiniDropdown(filtered, dropdownEl, (selected) => {
                selectUnit(selected, inputEl, hiddenInputEl, onSelectCallback);
                dropdownEl.classList.remove("active");
            });

            if (filtered.length > 0) {
                dropdownEl.classList.add("active");
            } else {
                dropdownEl.classList.remove("active");
            }
        });

        // 3. Blur -> Hide Mini Dropdown (Delayed to allow click)
        inputEl.addEventListener("blur", () => {
            setTimeout(() => {
                dropdownEl.classList.remove("active");
            }, 200);
        });
    }

    // --- Photo Upload Logic (Moved from inside setupCombobox) ---
    (function initPhotoUpload() {
        const photoGrid = document.querySelector(".mstore-photo-grid");
        const mediaUploadModal = document.getElementById("mediaUploadModal");
        const closeMediaUploadModal = document.getElementById(
            "closeMediaUploadModal"
        );

        const openCameraBtn = document.getElementById("openCameraBtn");
        const openGalleryBtn = document.getElementById("openGalleryBtn");
        const mediaInput = document.getElementById("mediaInput");
        const cameraInput = document.getElementById("cameraInput");

        // Custom Camera Elements
        const customCameraModal = document.getElementById("customCameraModal");
        const cameraFeed = document.getElementById("cameraFeed");
        const capturePhotoBtn = document.getElementById("capturePhotoBtn");
        const closeCameraModalBtn = document.getElementById("closeCameraModalBtn");
        const cameraCanvas = document.getElementById("cameraCanvas");

        let activePhotoSlot = null;
        let currentStream = null;

        function showMediaModal(slot) {
            activePhotoSlot = slot;
            if (!mediaUploadModal) return;

            mediaUploadModal.classList.add("active"); // Vital for desktop CSS visibility
            mediaUploadModal.style.display = "flex";
            requestAnimationFrame(() => {
                mediaUploadModal.style.opacity = "1";
                mediaUploadModal.style.visibility = "visible";
                const container = mediaUploadModal.querySelector(
                    ".mstore-selection-container"
                );
                if (container) {
                    container.style.transform = "scale(1)";
                    container.style.opacity = "1"; // Ensure opacity is 1
                }
            });
        }

        function hideMediaModal() {
            if (!mediaUploadModal) return;

            mediaUploadModal.classList.remove("active");
            mediaUploadModal.style.opacity = "0";
            const container = mediaUploadModal.querySelector(
                ".mstore-selection-container"
            );
            if (container) container.style.transform = "scale(0.95)";
            setTimeout(() => {
                mediaUploadModal.style.visibility = "hidden";
                mediaUploadModal.style.display = "none";
            }, 300);
        }

        // --- Custom Camera Functions ---
        function openCameraStream() {
            console.log("DEBUG: openCameraStream called");
            if (!customCameraModal) {
                console.error("DEBUG: customCameraModal not found");
                return;
            }

            // Hide Selection Modal first
            mediaUploadModal.classList.remove("active"); // CSS class toggle
            mediaUploadModal.style.visibility = "hidden";
            mediaUploadModal.style.opacity = "0";
            mediaUploadModal.style.display = "none"; // Force hide

            // Show Camera Modal
            customCameraModal.classList.add("active"); // Add active class if any CSS depends on it
            customCameraModal.style.display = "block"; // Force block first
            customCameraModal.style.visibility = "visible";
            customCameraModal.style.opacity = "1";

            // Ensure it's fixed and covers screen (inline styles usually handle this, but re-enforcing)
            customCameraModal.style.position = "fixed";
            customCameraModal.style.top = "0";
            customCameraModal.style.left = "0";
            customCameraModal.style.zIndex = "20000";

            // Constraints
            const constraints = {
                video: {
                    facingMode: { ideal: "environment" }, // Use ideal so it works on Laptop (Webcam) too
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            };

            console.log("DEBUG: Calling getUserMedia with constraints", constraints);
            navigator.mediaDevices
                .getUserMedia(constraints)
                .then((stream) => {
                    console.log("DEBUG: getUserMedia success, stream obtained");
                    currentStream = stream;
                    cameraFeed.srcObject = stream;

                    // Play video explicitly
                    cameraFeed.onloadedmetadata = () => {
                        cameraFeed
                            .play()
                            .catch((e) => console.error("DEBUG: Play failed", e));
                    };
                })
                .catch((err) => {
                    console.error("DEBUG: Camera access failed:", err);

                    // User Feedback
                    if (
                        err.name === "NotAllowedError" ||
                        err.name === "PermissionDeniedError"
                    ) {
                        alert(
                            "Camera permission was denied. Please allow camera access in your browser settings to use the in-app camera.\n\nOpening system file picker instead."
                        );
                    } else if (err.name === "NotFoundError") {
                        alert("No camera device found. Opening system file picker instead.");
                    } else {
                        alert(
                            "Camera error: " +
                            err.message +
                            "\nOpening system file picker instead."
                        );
                    }

                    // Fallback to native input if permission denied or error
                    stopCameraStream();
                    if (cameraInput) {
                        // Restore selection modal slightly so fallback doesn't feel jarring?
                        // Actually just Trigger Input.
                        cameraInput.click();
                    } else {
                        alert("Camera not accessible.");
                    }
                });
        }

        function stopCameraStream() {
            if (currentStream) {
                currentStream.getTracks().forEach((track) => track.stop());
                currentStream = null;
            }
            if (cameraFeed) cameraFeed.srcObject = null;
            if (customCameraModal) customCameraModal.style.display = "none";

            // If we didn't capture, we should probably respawn the selection modal?
            // But for "Close" button, yes.
        }

        function capturePhoto() {
            console.log("DEBUG: capturePhoto called");
            if (!currentStream || !cameraFeed || !activePhotoSlot) {
                console.warn("DEBUG: capturePhoto failed preconditions", {
                    stream: !!currentStream,
                    feed: !!cameraFeed,
                    slot: !!activePhotoSlot,
                });
                return;
            }

            // Set canvas dimensions to match video
            // VideoWidth might be 0 if not ready, check readyState
            if (cameraFeed.readyState === cameraFeed.HAVE_ENOUGH_DATA) {
                cameraCanvas.width = cameraFeed.videoWidth;
                cameraCanvas.height = cameraFeed.videoHeight;

                const ctx = cameraCanvas.getContext("2d");
                ctx.drawImage(cameraFeed, 0, 0, cameraCanvas.width, cameraCanvas.height);

                // Convert to data URL
                const dataUrl = cameraCanvas.toDataURL("image/jpeg", 0.85);

                // Stop camera and open media editor
                stopCameraStream();
                openMediaEditor(dataUrl);
            } else {
                console.log("DEBUG: Camera feed not ready");
            }
        }

        function applyPhoto(src) {
            if (!activePhotoSlot) return;
            activePhotoSlot.innerHTML = "";

            const img = document.createElement("img");
            img.src = src;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";
            img.style.borderRadius = "6px";
            activePhotoSlot.appendChild(img);
            activePhotoSlot.setAttribute("draggable", "true");
            activePhotoSlot.style.borderStyle = "solid";
            activePhotoSlot.style.border = "none";

            if (activePhotoSlot.classList.contains("primary")) {
                activePhotoSlot.style.border = "2px solid #3b82f6";
            }
        }

        // Listeners
        if (photoGrid) {
            photoGrid.addEventListener("click", (e) => {
                const photoItem = e.target.closest(".mstore-photo-item");
                if (photoItem) {
                    showMediaModal(photoItem);
                }
            });
        }

        if (closeMediaUploadModal)
            closeMediaUploadModal.addEventListener("click", hideMediaModal);

        if (mediaUploadModal) {
            mediaUploadModal.addEventListener("click", (e) => {
                if (e.target.id === "mediaUploadModal") hideMediaModal();
            });
        }

        if (openGalleryBtn && mediaInput) {
            openGalleryBtn.addEventListener("click", () => {
                mediaInput.click();
            });
        }

        if (openCameraBtn) {
            openCameraBtn.addEventListener("click", () => {
                console.log("DEBUG: Camera button clicked");
                // Start Camera Flow
                // Check if Secure Context or Localhost
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    console.log("DEBUG: Calling openCameraStream");
                    openCameraStream();
                } else {
                    console.warn(
                        "DEBUG: navigator.mediaDevices not supported, fallback to input"
                    );
                    // Fallback
                    if (cameraInput) cameraInput.click();
                }
            });
        }

        // Custom Camera Controls
        if (closeCameraModalBtn) {
            closeCameraModalBtn.addEventListener("click", () => {
                stopCameraStream();
                // Re-show selection modal? Or just close?
                // User probably wants to go back to selection if they cancelled camera
                // But for simplicity, let's just close camera.
                // If we want to reshow:
                // mediaUploadModal.style.opacity = '1';
            });
        }

        if (capturePhotoBtn) {
            capturePhotoBtn.addEventListener("click", capturePhoto);
        }

        function handleFileSelect(e) {
            console.log("DEBUG: handleFileSelect", e.target.id);
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                console.log("DEBUG: File selected", file.name);
                if (file && activePhotoSlot) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        // Open media editor instead of directly applying
                        openMediaEditor(event.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            }
            e.target.value = "";
        }

        // Open media editor with product-specific configuration
        function openMediaEditor(imageSrc) {
            if (!window.openPhotoEditor) {
                console.error("Media editor not loaded yet");
                // Fallback: apply directly without editing
                applyPhoto(imageSrc);
                hideMediaModal();
                return;
            }

            // Hide the camera/gallery selection modal
            hideMediaModal();

            window.openPhotoEditor(imageSrc, {
                title: "Edit Product Photo",
                subtitle: "Crop and adjust your image",
                aspectRatios: [
                    { label: "1:1", value: 1 },
                    { label: "4:3", value: 4 / 3 },
                    { label: "16:9", value: 16 / 9 },
                    { label: "Free", value: null },
                ],
                initialAspectRatio: 1,
                controls: [
                    { ratios: true },
                    { zoom: true, rotate: true, flip: true },
                    { fit: true, reset: true, final: true },
                ],
                compression: {
                    targetSizeKB: 150,
                    minQuality: 0.7,
                    format: "image/jpeg",
                },
                onSave: (blob) => {
                    // Convert blob to data URL and apply to photo slot
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        applyPhoto(e.target.result);
                    };
                    reader.readAsDataURL(blob);
                },
            });
        }

        function handleMultipleFileSelect(e) {
            console.log("DEBUG: handleMultipleFileSelect", e.target.id);
            if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                const photoGrid = document.querySelector(".mstore-photo-grid");
                if (!photoGrid) return;

                let slotIndex = 0;
                const photoSlots = Array.from(photoGrid.querySelectorAll(".mstore-photo-item"));
                
                files.forEach((file, index) => {
                    if (slotIndex >= photoSlots.length) {
                        console.warn("Maximum 5 images allowed");
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const slot = photoSlots[slotIndex];
                        if (slot) {
                            activePhotoSlot = slot;
                            openMediaEditor(event.target.result);
                            slotIndex++;
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
            e.target.value = "";
        }

        if (mediaInput) mediaInput.addEventListener("change", handleFileSelect);
        if (cameraInput) cameraInput.addEventListener("change", handleFileSelect);
    })();

    // Category & Brand data already defined at module top

    // --- Init Elements for Category & Brand ---

    // --- Init Elements for Category & Brand ---
    const categoryInput = document.getElementById("itemCategory");
    const categoryDisplay = document.getElementById("categoryInputDisplay");
    const categoryIcon = document.getElementById("categoryIcon");
    const categoryDropdown = document.getElementById("categoryDropdown");

    const brandInput = document.getElementById("itemBrand");
    const brandDisplay = document.getElementById("brandInputDisplay");
    const brandIcon = document.getElementById("brandIcon");
    const brandDropdown = document.getElementById("brandDropdown");

    // Category combobox will be set up after categories are loaded
    // setupCategoryCombobox();

    setupCombobox(brandDisplay, brandIcon, brandDropdown, brandInput, null, {
        title: "Select Brand",
        data: allBrandsGlobal,
        enableCreate: false,
        multiSelect: false,
    });

    function renderMiniDropdown(options, container, onSelect) {
        container.innerHTML = "";
        // Limit to 5 results for mini dropdown
        const limit = options.slice(0, 5);

        limit.forEach((opt) => {
            const div = document.createElement("div");
            div.className = "mstore-combobox-option";
            div.textContent = `${opt.displayName} (${opt.symbol})`;
            div.addEventListener("click", () => onSelect(opt));
            container.appendChild(div);
        });
    }

    function selectUnit(unit, inputEl, hiddenInputEl, callback) {
        // Handle Multi-Select Array
        if (Array.isArray(unit)) {
            // Multi-select
            const displays = unit
                .map((u) => {
                    let d = u.displayName || u.label || u.value;
                    if (u.symbol) d += ` (${u.symbol})`;
                    return d;
                })
                .join(", ");

            const codes = unit.map((u) => u.code).join(",");

            inputEl.value = displays;
            hiddenInputEl.value = codes;
        } else {
            // Single select
            let display = unit.displayName || unit.label || unit.value;
            if (unit.symbol) display += ` (${unit.symbol})`;

            inputEl.value = display;
            hiddenInputEl.value = unit.code;
        }
        if (callback) callback();
    }

    // Initialize Comboboxes
    // Wait for units to load? Logic handles empty list gracefully.

    setupCombobox(
        primaryUnitDisplay,
        primaryUnitIcon,
        primaryUnitDropdown,
        primaryUnitInput,
        handlePrimaryUnitChange
    );
    setupCombobox(
        secondaryUnitDisplay,
        secondaryUnitIcon,
        secondaryUnitDropdown,
        secondaryUnitInput,
        handleSecondaryUnitChange
    );

    // --- Modal Logic (Updated) ---
    const modalTitle = document.getElementById("modalTitle");

    let currentCreateCallback = null;
    let currentSelectedCodes = new Set();
    let currentMultiSelectMode = false;

    // --- Create New Item Modal Logic (Moved before renderModalOptions) ---
    function getCreateItemModalElements() {
        const modal = document.getElementById("createItemModal");
        const input = document.getElementById("newItemInput");
        const closeBtn = document.getElementById("closeCreateItemModal");
        const saveBtn = document.getElementById("saveCreateItemModal");

        // Debug logging
        console.log("Checking modal elements:");
        console.log("- Modal found:", !!modal);
        console.log("- Input found:", !!input);
        console.log("- Close button found:", !!closeBtn);
        console.log("- Save button found:", !!saveBtn);

        if (!modal) console.warn("createItemModal not found in DOM");
        if (!input) console.warn("newItemInput not found in DOM");

        return {
            modal: modal,
            input: input,
            closeBtn: closeBtn,
            saveBtn: saveBtn,
        };
    }

    function openCreateItemModal() {
        console.log("openCreateItemModal called");

        // First, check if modal exists immediately
        const elements = getCreateItemModalElements();
        if (elements.modal && elements.input) {
            console.log("Modal elements found immediately");
            showCreateItemModal(elements);
            return;
        }

        // If not found, try multiple times with increasing delays
        let attempts = 0;
        const maxAttempts = 5;

        function tryOpen() {
            console.log(`Attempt ${attempts + 1} to find modal elements`);
            const elements = getCreateItemModalElements();
            if (elements.modal && elements.input) {
                console.log("Modal elements found after retries");
                showCreateItemModal(elements);
                return;
            }

            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(tryOpen, 200 * attempts); // Increasing delay: 200ms, 400ms, 600ms, etc.
            } else {
                console.error("Create item modal elements not found after", maxAttempts, "attempts");
                // Fallback: try to create modal dynamically if it doesn't exist
                if (!document.getElementById("createItemModal")) {
                    console.warn("Modal not in DOM, attempting to create dynamically");
                    createModalDynamically();
                }
            }
        }

        setTimeout(tryOpen, 100); // Start trying after 100ms
    }

    function createModalDynamically() {
        // Create modal if it doesn't exist in DOM
        const modal = document.createElement("div");
        modal.id = "createItemModal";
        modal.className = "mstore-selection-modal";
        modal.style.cssText = "z-index: 2200; background: var(--bg-overlay-dark); display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: opacity 0.3s; position: fixed; top: 0; left: 0; width: 100%; height: 100%;";
        
        modal.innerHTML = `
            <div class="mstore-selection-container" style="width: 90%; max-width: 300px; height: auto; max-height: none; transform: scale(0.95); transition: transform 0.2s; border-radius: 12px; margin: auto; padding: 16px; position: relative; background: var(--bg-secondary); box-shadow: var(--shadow-elevation-large);">
                <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">Create New Category</h3>
                <div class="mstore-input-wrapper" style="margin-bottom: 20px;">
                    <input type="text" id="newItemInput" class="mstore-input" style="border: none; padding: 12px 10px; color: var(--text-primary);" placeholder="Enter category name" autofocus>
                </div>
                <div style="display: flex; gap: 10px; width: 100%;">
                    <button class="mstore-action-btn secondary" id="closeCreateItemModal" style="flex: 1; justify-content: center; padding: 8px; font-size: 13px;">Cancel</button>
                    <button class="mstore-action-btn primary" id="saveCreateItemModal" style="flex: 1; justify-content: center; padding: 8px; font-size: 13px;">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Now try to open it
        setTimeout(() => {
            const elements = getCreateItemModalElements();
            if (elements.modal && elements.input) {
                showCreateItemModal(elements);
            }
        }, 50);
    }

    function showCreateItemModal(elements) {
        if (!elements.modal || !elements.input) {
            console.error("Cannot show modal: elements missing", elements);
            return;
        }
        
        const container = elements.modal.querySelector(".mstore-selection-container");
        
        // Add active class and set visibility
        elements.modal.classList.add("active");
        elements.modal.style.visibility = "visible";
        elements.modal.style.opacity = "1";
        elements.modal.style.display = "flex";
        
        // Lock body scroll
        document.body.style.overflow = "hidden";
        
        if (container) {
            container.style.transform = "scale(1)";
        }
        
        elements.input.value = "";
        setTimeout(() => {
            if (elements.input) {
                elements.input.focus();
            }
        }, 100);
    }

    function closeCreateItemUI() {
        const elements = getCreateItemModalElements();
        if (!elements.modal) return;
        
        const container = elements.modal.querySelector(".mstore-selection-container");
        elements.modal.classList.remove("active");
        elements.modal.style.opacity = "0";
        
        // Restore body scroll
        document.body.style.overflow = "";
        
        if (container) {
            container.style.transform = "scale(0.95)";
        }
        
        setTimeout(() => {
            elements.modal.style.visibility = "hidden";
            elements.modal.style.display = "none";
        }, 300);
    }

    // Setup event listeners for create item modal using event delegation
    // This works even if elements are loaded dynamically
    document.addEventListener("click", (e) => {
        // Handle close button
        if (e.target && (e.target.id === "closeCreateItemModal" || e.target.closest("#closeCreateItemModal"))) {
            e.preventDefault();
            e.stopPropagation();
            closeCreateItemUI();
            return;
        }

        // Handle save button
        if (e.target && (e.target.id === "saveCreateItemModal" || e.target.closest("#saveCreateItemModal"))) {
            e.preventDefault();
            e.stopPropagation();
            
            const elements = getCreateItemModalElements();
            if (!elements.input) {
                console.error("Create item input not found");
                return;
            }
            
            const newName = elements.input.value.trim();
            if (!newName) return; // Simple validation

            const newCode = newName.toLowerCase().replace(/\s+/g, "_");

            const newObj = { displayName: newName, code: newCode, type: "Custom" };

            // Add to Global List
            allCategoriesGlobal.push(newObj);

            // Add to Current Options context
            if (!currentOptions.find((o) => o.code === newCode)) {
                currentOptions.push(newObj);
            }

            if (currentMultiSelectMode) {
                // Auto-select
                currentSelectedCodes.add(newCode);

                // Re-calculate selected objects
                const selectedObjects = currentOptions.filter((o) =>
                    currentSelectedCodes.has(o.code)
                );

                // Call selectUnit directly to update the UI and hidden input
                selectUnit(selectedObjects, categoryDisplay, categoryInput, null);

                // Refresh the modal list options
                renderModalOptions(currentOptions, true);
            } else {
                // Single select
                if (currentCallback) currentCallback(newObj);
                closeSelectionModal();
            }

            closeCreateItemUI();
        }
        
        // Handle clicking outside modal to close it
        const modal = document.getElementById("createItemModal");
        if (modal && modal.classList.contains("active") && e.target === modal) {
            closeCreateItemUI();
        }
    });

    function openSelectionModal(
        options,
        onSelect,
        titleText = "Select Option",
        enableCreate = false,
        multiSelect = false,
        initialSelection = []
    ) {
        currentOptions = options;
        currentCallback = onSelect;
        currentMultiSelectMode = multiSelect;

        // Initialize selection state
        currentSelectedCodes = new Set(initialSelection);

        modalTitle.textContent = titleText;
        renderModalOptions(options, enableCreate);

        selectionModal.classList.add("active");
        document.body.style.overflow = "hidden"; // Lock background scroll

        // Push history state to handle back button
        history.pushState({ mstoreModalOpen: true }, "");

        modalSearch.value = "";
    }

    function closeSelectionModal() {
        // Close modal directly without using history.back() to prevent page refresh
        hideModalUI();
        // Remove the history state we added if it exists
        if (history.state && history.state.mstoreModalOpen) {
            // Replace current state instead of going back
            history.replaceState(null, "");
        }
    }

    function hideModalUI() {
        if (selectionModal) {
            selectionModal.classList.remove("active");
        }
        document.body.style.overflow = ""; // Restore background scroll
        currentCallback = null;
    }

    // Handle Browser Back Button
    function handlePopState(event) {
        // If we are navigating back, and modal is active, close it
        if (selectionModal && selectionModal.classList.contains("active")) {
            hideModalUI();
        }
    }
    
    window.addEventListener("popstate", handlePopState);
    cleanupFunctions.push(() => {
        window.removeEventListener("popstate", handlePopState);
    });

    function renderModalOptions(options, enableCreate = false) {
        modalList.innerHTML = "";

        // Optional: Add "Create New" Button at the top
        if (enableCreate) {
            const createBtn = document.createElement("div");
            createBtn.className = "mstore-selection-option";
            createBtn.style.color = "#3b82f6";
            createBtn.style.fontWeight = "500";
            // Updated Alignment: Text Left, Icon Right (fa-plus-circle)
            createBtn.innerHTML = `<span>Create New Category</span> <i class="fas fa-plus-circle"></i>`;
            createBtn.addEventListener("click", (e) => {
                e.stopPropagation(); // Prevent bubbling selection logic
                openCreateItemModal();
            });
            modalList.appendChild(createBtn);
        }

        // Group by type if available
        const grouped = options.reduce((acc, opt) => {
            const type = opt.type
                ? opt.type.charAt(0).toUpperCase() + opt.type.slice(1).replace(/_/g, " ")
                : "Others";
            if (!acc[type]) acc[type] = [];
            acc[type].push(opt);
            return acc;
        }, {});

        for (const type in grouped) {
            // Only show group title if there are actually groups (don't show "Others" if it's the only one)
            if (Object.keys(grouped).length > 1 || type !== "Others") {
                const title = document.createElement("div");
                title.className = "mstore-selection-group-title";
                title.setAttribute("data-group-type", type);
                
                // Create title content with expand/collapse button
                const titleContent = document.createElement("div");
                titleContent.style.display = "flex";
                titleContent.style.justifyContent = "space-between";
                titleContent.style.alignItems = "center";
                titleContent.style.width = "100%";
                
                const titleText = document.createElement("span");
                titleText.textContent = type;
                
                const expandBtn = document.createElement("button");
                expandBtn.className = "mstore-group-expand-btn";
                expandBtn.style.background = "none";
                expandBtn.style.border = "none";
                expandBtn.style.color = "var(--text-secondary)";
                expandBtn.style.cursor = "pointer";
                expandBtn.style.padding = "4px 8px";
                expandBtn.style.display = "flex";
                expandBtn.style.alignItems = "center";
                expandBtn.style.gap = "4px";
                expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                
                // Determine initial state: Standard is collapsed, others are expanded
                const isCollapsed = type === "Standard";
                const groupOptions = grouped[type];
                const optionsContainer = document.createElement("div");
                optionsContainer.className = "mstore-group-options";
                optionsContainer.style.display = isCollapsed ? "none" : "block";
                
                if (isCollapsed) {
                    expandBtn.querySelector("i").classList.remove("fa-chevron-down");
                    expandBtn.querySelector("i").classList.add("fa-chevron-right");
                }
                
                expandBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const isCurrentlyCollapsed = optionsContainer.style.display === "none";
                    optionsContainer.style.display = isCurrentlyCollapsed ? "block" : "none";
                    const icon = expandBtn.querySelector("i");
                    if (isCurrentlyCollapsed) {
                        icon.classList.remove("fa-chevron-right");
                        icon.classList.add("fa-chevron-down");
                    } else {
                        icon.classList.remove("fa-chevron-down");
                        icon.classList.add("fa-chevron-right");
                    }
                });
                
                titleContent.appendChild(titleText);
                titleContent.appendChild(expandBtn);
                title.appendChild(titleContent);
                modalList.appendChild(title);
                modalList.appendChild(optionsContainer);
                
                // Move options rendering inside the container
                grouped[type].forEach((opt) => {
                    const row = document.createElement("div");
                    row.className = "mstore-selection-option";

                    // Label logic
                    let label = opt.displayName || opt.label || opt.value;
                    if (opt.symbol) label += ` (${opt.symbol})`;

                    const isChecked = currentSelectedCodes.has(opt.code);

                    // Render Layout: Label Left, Checkbox/Icon Right
                    // If MultiSelect -> Show Checkbox
                    // If Single -> Maybe show Check if selected? Or nothing.

                    const iconHtml = currentMultiSelectMode
                        ? `<i class="fas ${isChecked ? "fa-check-square" : "fa-square"
                        } mstore-checkbox-icon ${isChecked ? "checked" : ""}"></i>`
                        : isChecked
                            ? `<i class="fas fa-check" style="color: var(--accent-primary);"></i>`
                            : "";

                    row.innerHTML = `<span>${label}</span> ${iconHtml}`;

                    row.addEventListener("click", () => {
                        if (currentMultiSelectMode) {
                            // Toggle Logic
                            if (currentSelectedCodes.has(opt.code)) {
                                currentSelectedCodes.delete(opt.code);
                            } else {
                                currentSelectedCodes.add(opt.code);
                            }

                            // Trigger Callback with full array
                            const selectedObjects = currentOptions.filter((o) =>
                                currentSelectedCodes.has(o.code)
                            );
                            if (currentCallback) currentCallback(selectedObjects);

                            // Re-render this row or whole list? Re-rendering whole list is safer/easier
                            renderModalOptions(currentOptions, enableCreate);
                        } else {
                            // Single Select
                            if (currentCallback) currentCallback(opt);
                            closeSelectionModal();
                        }
                    });
                    optionsContainer.appendChild(row);
                });
            } else {
                // If no group title, render options directly
                grouped[type].forEach((opt) => {
                    const row = document.createElement("div");
                    row.className = "mstore-selection-option";

                    // Label logic
                    let label = opt.displayName || opt.label || opt.value;
                    if (opt.symbol) label += ` (${opt.symbol})`;

                    const isChecked = currentSelectedCodes.has(opt.code);

                    const iconHtml = currentMultiSelectMode
                        ? `<i class="fas ${isChecked ? "fa-check-square" : "fa-square"
                        } mstore-checkbox-icon ${isChecked ? "checked" : ""}"></i>`
                        : isChecked
                            ? `<i class="fas fa-check" style="color: var(--accent-primary);"></i>`
                            : "";

                    row.innerHTML = `<span>${label}</span> ${iconHtml}`;

                    row.addEventListener("click", () => {
                        if (currentMultiSelectMode) {
                            // Toggle Logic
                            if (currentSelectedCodes.has(opt.code)) {
                                currentSelectedCodes.delete(opt.code);
                            } else {
                                currentSelectedCodes.add(opt.code);
                            }

                            // Trigger Callback with full array
                            const selectedObjects = currentOptions.filter((o) =>
                                currentSelectedCodes.has(o.code)
                            );
                            if (currentCallback) currentCallback(selectedObjects);

                            // Re-render this row or whole list? Re-rendering whole list is safer/easier
                            renderModalOptions(currentOptions, enableCreate);
                        } else {
                            // Single Select
                            if (currentCallback) currentCallback(opt);
                            closeSelectionModal();
                        }
                    });
                    modalList.appendChild(row);
                });
            }
        }
    }

    // Search Filter (Modal)
    modalSearch.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = currentOptions.filter((opt) => {
            const label = (opt.displayName || opt.label || opt.value).toLowerCase();
            const code = (opt.code || "").toLowerCase();
            return label.includes(term) || code.includes(term);
        });
        renderModalOptions(filtered);
    });

    // Back button closes modal
    const modalCloseActionBtn = document.getElementById("modalCloseActionBtn");
    if (modalCloseActionBtn) {
        modalCloseActionBtn.addEventListener("click", closeSelectionModal);
    }

    // Also allow clicking outside to close (Optional, but good UX)
    selectionModal.addEventListener("click", (e) => {
        if (e.target === selectionModal) {
            closeSelectionModal();
        }
    });

    // --- Unit Selection Logic ---

    // Update calls to openSelectionModal with Titles
    function handlePrimaryUnitChange() {
        const primaryCode = primaryUnitInput.value;
        if (!primaryCode) return;

        // Smart Default Logic for Secondary
        const primaryUnitObj = allUnitsGlobal.find((u) => u.code === primaryCode);
        if (primaryUnitObj) {
            // Try to find a default secondary
            let defaultSecondary = null;

            // 1. Piece if container
            if (
                ["wholesale_packaging", "lot_bundle", "item_count"].includes(
                    primaryUnitObj.type
                )
            ) {
                defaultSecondary = allUnitsGlobal.find(
                    (u) => u.code === "pc" || u.code === "pcs"
                );
            }

            // 2. Different unit of same type
            if (!defaultSecondary) {
                defaultSecondary = allUnitsGlobal.find(
                    (u) => u.type === primaryUnitObj.type && u.code !== primaryCode
                );
            }

            if (defaultSecondary) {
                // Auto set Custom Trigger (Hybrid Input)
                secondaryUnitInput.value = defaultSecondary.code;
                secondaryUnitDisplay.value = `${defaultSecondary.displayName} (${defaultSecondary.symbol})`;
            }
        }

        calculateConversionFactor();
        updateConversionDisplay();
    }

    function handleSecondaryUnitChange() {
        calculateConversionFactor();
        updateConversionDisplay();
    }

    function calculateConversionFactor() {
        const pCode = primaryUnitInput.value;
        const sCode = secondaryUnitInput.value;

        if (!pCode || !sCode) return;

        const pUnit = allUnitsGlobal.find((u) => u.code === pCode);
        const sUnit = allUnitsGlobal.find((u) => u.code === sCode);

        if (pUnit && sUnit && pUnit.type === sUnit.type) {
            const factor = pUnit.toBase / sUnit.toBase;
            const cleanFactor = parseFloat(factor.toPrecision(10));
            conversionInput.value = cleanFactor;
        }
    }

    function updateConversionDisplay() {
        const pCode = primaryUnitInput.value;
        const sCode = secondaryUnitInput.value;
        const factor = conversionInput.value;

        const pUnit = allUnitsGlobal.find((u) => u.code === pCode);
        const sUnit = allUnitsGlobal.find((u) => u.code === sCode);

        const pSym = pUnit ? pUnit.symbol : pCode;
        const sSym = sUnit ? sUnit.symbol : sCode;

        const badgeBtn = document.getElementById("conversionBadgeBtn");
        const badgeText = document.getElementById("conversionBadgeText");

        if (badgeBtn && badgeText) {
            if (factor && pCode && sCode) {
                badgeText.textContent = `1 ${pSym} = ${factor} ${sSym}`;
                badgeBtn.style.display = "inline-flex";
                badgeBtn.style.alignItems = "center";
            } else {
                badgeBtn.style.display = "none";
            }
        }
    }

    // --- Conversion Modal Logic ---
    const conversionBadgeBtn = document.getElementById("conversionBadgeBtn");
    const conversionModal = document.getElementById("conversionModal");
    const closeConversionModal = document.getElementById("closeConversionModal");
    const saveConversionModal = document.getElementById("saveConversionModal");
    const modalConversionInput = document.getElementById("modalConversionInput");
    const modalPrimaryUnitLabel = document.getElementById("modalPrimaryUnitLabel");
    const modalSecondaryUnitLabel = document.getElementById(
        "modalSecondaryUnitLabel"
    );

    if (conversionBadgeBtn) {
        conversionBadgeBtn.addEventListener("click", () => {
            const pCode = primaryUnitInput.value;
            const sCode = secondaryUnitInput.value;
            const pUnit = allUnitsGlobal.find((u) => u.code === pCode);
            const sUnit = allUnitsGlobal.find((u) => u.code === sCode);

            // Use Full Display Names for the modal logic as requested
            const pName = pUnit ? pUnit.displayName : pCode || "Unit";
            const sName = sUnit ? sUnit.displayName : sCode || "Unit";

            // Update Labels
            if (modalPrimaryUnitLabel) modalPrimaryUnitLabel.textContent = pName;
            if (modalSecondaryUnitLabel) modalSecondaryUnitLabel.textContent = sName;

            modalConversionInput.value = conversionInput.value;

            // Show modal
            conversionModal.classList.add("active");
            conversionModal.style.visibility = "visible";
            conversionModal.style.opacity = "1";

            // Focus input after a small delay
            setTimeout(() => modalConversionInput.focus(), 100);
        });
    }

    if (closeConversionModal) {
        closeConversionModal.addEventListener("click", () => {
            conversionModal.classList.remove("active");
            conversionModal.style.visibility = "hidden";
            conversionModal.style.opacity = "0";
        });
    }

    if (saveConversionModal) {
        saveConversionModal.addEventListener("click", () => {
            const newVal = modalConversionInput.value;
            if (newVal && newVal > 0) {
                conversionInput.value = newVal;
                updateConversionDisplay();
            }
            conversionModal.classList.remove("active");
            conversionModal.style.visibility = "hidden";
            conversionModal.style.opacity = "0";
        });
    }

    if (conversionInput) {
        conversionInput.addEventListener("input", updateConversionDisplay);
    }

    // --- Drag and Drop Photo Reordering ---
    document.addEventListener("DOMContentLoaded", () => {
        const photoGrid = document.querySelector(".mstore-photo-grid");
        if (!photoGrid) return;

        photoGrid.addEventListener("dragstart", (e) => {
            if (
                e.target.classList.contains("mstore-photo-item") &&
                !e.target.classList.contains("primary")
            ) {
                setTimeout(() => e.target.classList.add("dragging"), 0);
            }
        });

        photoGrid.addEventListener("dragend", (e) => {
            if (e.target.classList.contains("dragging")) {
                e.target.classList.remove("dragging");
            }
        });

        photoGrid.addEventListener("dragover", (e) => {
            e.preventDefault();
            const draggingItem = photoGrid.querySelector(".dragging");
            if (!draggingItem) return;

            const afterElement = getDragAfterElement(photoGrid, e.clientX);

            if (afterElement == null) {
                photoGrid.appendChild(draggingItem);
            } else {
                photoGrid.insertBefore(draggingItem, afterElement);
            }
        });

        function getDragAfterElement(container, x) {
            const draggableElements = [
                ...container.querySelectorAll(
                    ".mstore-photo-item:not(.primary):not(.dragging)"
                ),
            ];

            return draggableElements.reduce(
                (closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = x - box.left - box.width / 2;
                    if (offset < 0 && offset > closest.offset) {
                        return { offset: offset, element: child };
                    } else {
                        return closest;
                    }
                },
                { offset: Number.NEGATIVE_INFINITY }
            ).element;
        }
    });

    // Verify modal elements exist after initialization
    const modalCheck = getCreateItemModalElements();
    if (modalCheck.modal && modalCheck.input) {
        console.log('✅ Create item modal elements found');
    } else {
        console.warn('⚠️ Create item modal elements not found during initialization');
    }

    // --- Submit Button Handler ---
    const submitItemBtn = document.getElementById('submitItemBtn');
    if (submitItemBtn) {
        addTrackedListener(submitItemBtn, 'click', async () => {
            console.log('Submit button clicked');
            const isEditMode = currentItemId !== null;
            
            // Collect form data
            const formData = collectFormData();
            
            if (!formData) {
                console.error('Form validation failed');
                return;
            }

            try {
                // Show loading state
                submitItemBtn.disabled = true;
                submitItemBtn.textContent = isEditMode ? 'Updating...' : 'Saving...';

                // Check if Firebase is available
                if (!firestore) {
                    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
                }

                // Get current user info for audit trail (must be declared before use)
                const isLoggedIn = AuthService.isLoggedIn();
                const currentUserType = localCache.get('currentUserType');
                const currentUserId = localCache.get('currentUserId');
                const now = new Date().toISOString();

                // Check if user is logged in and is either admin or merchant
                if (!isLoggedIn) {
                    throw new Error('You must be logged in to save items.');
                }
                if (currentUserType !== 'admin' && currentUserType !== 'merchant') {
                    throw new Error('Only admin and merchant users can save items.');
                }

                // Generate itemId if it's a new item
                const itemId = isEditMode ? currentItemId : generateId('ITM');
                
                // Get merchantId from current user (required for merchants)
                let merchantId = localCache.get('currentMerchantId');
                
                // If merchantId is not in cache, fetch it from user data
                if (currentUserType === 'merchant' && !merchantId && currentUserId) {
                    try {
                        const userData = await fetchUserById(currentUserId);
                        // Try both merchantId (singular) and merchantIds (array) for compatibility
                        merchantId = userData?.meta?.links?.merchantId || userData?.meta?.links?.merchantIds?.[0] || null;
                        
                        // Save to cache for future use
                        if (merchantId) {
                            localCache.set('currentMerchantId', merchantId);
                            console.log(`✅ Retrieved merchantId from user data: ${merchantId}`);
                        }
                    } catch (error) {
                        console.error('Error fetching user data for merchantId:', error);
                    }
                }
                
                if (currentUserType === 'merchant' && !merchantId) {
                    throw new Error('Merchant ID not found. Please ensure you are properly logged in as a merchant and have a merchant profile.');
                }

                // Build complete item object
                const itemData = {
                    meta: {
                        itemId: itemId,
                        type: formData.meta.type,
                        version: isEditMode ? (currentEditItem?.meta?.version || 1) + 1 : 1,
                        priority: 'normal',
                        flags: {
                            isActive: formData.meta.flags.isActive,
                            isDeleted: false,
                            isArchived: false,
                            isPopular: false,
                            isTrending: false,
                            isFeatured: false,
                            isOnsite: false,
                            isPremium: false,
                            isVerified: false,
                            isPublic: formData.meta.flags.isPublic
                        },
                        links: {
                            merchantId: merchantId || formData.links.merchantId || null,
                            brandId: formData.links.brandId || null,
                            unitId: formData.links.unitId || null,
                            categoryId: formData.links.categoryId || null,
                            secondaryUnitId: formData.links.secondaryUnitId || null
                        },
                        visibility: formData.meta.visibility
                    },
                    info: {
                        name: formData.info.name,
                        sku: formData.info.sku || null,
                        hsnCode: formData.info.hsnCode || null,
                        barcode: formData.info.itemCode || null,
                        itemCode: formData.info.itemCode || null,
                        note: formData.info.note || null,
                        description: formData.info.description || null,
                        attributes: formData.info.attributes || {}
                    },
                    pricing: {
                        mrp: formData.pricing.mrp || null,
                        costPrice: formData.pricing.costPrice || 0,
                        sellingPrice: formData.pricing.sellingPrice || 0,
                        currency: 'INR',
                        discounts: [],
                        wholesalePrice: formData.pricing.wholesalePrice || null,
                        gstRate: formData.pricing.gstRate || 0
                    },
                    inventory: {
                        stockQty: formData.inventory.stockQty || null,
                        batchId: formData.inventory.batchId || null,
                        expiryDate: formData.inventory.expiryDate || null,
                        lowStockThreshold: formData.inventory.lowStockThreshold || null,
                        reorderQuantity: formData.inventory.reorderQuantity || null,
                        maxStockLevel: formData.inventory.maxStockLevel || null,
                        stockLocation: formData.inventory.stockLocation || null,
                        conversionFactor: formData.inventory.conversionFactor || null,
                        isLowStock: formData.inventory.stockQty !== null && formData.inventory.lowStockThreshold !== null 
                            ? formData.inventory.stockQty <= formData.inventory.lowStockThreshold 
                            : false,
                        isAvailable: formData.inventory.stockQty !== null ? formData.inventory.stockQty > 0 : true
                    },
                    media: formData.media || {
                        thumbnail: null,
                        gallery: [],
                        video: null
                    },
                    analytics: isEditMode ? (currentEditItem?.analytics || {
                        rating: 0,
                        numReviews: 0,
                        views: 0,
                        saved: 0,
                        carted: 0,
                        totalSales: 0
                    }) : {
                        rating: 0,
                        numReviews: 0,
                        views: 0,
                        saved: 0,
                        carted: 0,
                        totalSales: 0
                    },
                    seo: {
                        title: formData.info.name,
                        keywords: formData.seo.keywords || [],
                        description: formData.info.description || null
                    },
                    audit: {
                        createdAt: isEditMode ? (currentEditItem?.audit?.createdAt || now) : now,
                        createdBy: isEditMode ? (currentEditItem?.audit?.createdBy || {
                            userId: currentUserId || 'unknown',
                            role: currentUserType || 'unknown',
                            name: 'Unknown User'
                        }) : {
                            userId: currentUserId || 'unknown',
                            role: currentUserType || 'unknown',
                            name: 'Unknown User'
                        },
                        updatedAt: now,
                        updatedBy: {
                            userId: currentUserId || 'unknown',
                            role: currentUserType || 'unknown',
                            name: 'Unknown User'
                        }
                    }
                };

                // Remove all undefined values from the object (Firebase doesn't accept undefined)
                const cleanItemData = removeUndefinedValues(itemData);

                // Save to Firestore
                const itemRef = firestore.collection('items').doc(itemId);
                await itemRef.set(cleanItemData);

                console.log(`✅ Item ${isEditMode ? 'updated' : 'saved'} successfully with ID: ${itemId}`);

                // Update local cache
                const allItems = localCache.get('allItems') || [];
                if (isEditMode) {
                    const itemIndex = allItems.findIndex(item => item.meta.itemId === itemId);
                    if (itemIndex > -1) {
                        allItems[itemIndex] = cleanItemData;
                    } else {
                        allItems.push(cleanItemData);
                    }
                } else {
                    allItems.push(cleanItemData);
                }
                localCache.set('allItems', allItems);

                // Show success message
                showToast('success', isEditMode ? 'Item updated successfully!' : 'Item added successfully!', 3000);
                
                // Navigate back to add view
                if (window.routeManager) {
                    window.routeManager.switchView('merchant', 'add');
                }
            } catch (error) {
                console.error('Error saving item:', error);
                showToast('error', error.message || 'Failed to save item. Please try again.', 3000);
            } finally {
                submitItemBtn.disabled = false;
                submitItemBtn.textContent = isEditMode ? 'Update Item' : 'Save Item';
            }
        });
    }

    // End of initialization
}

/**
 * Recursively removes all undefined values from an object
 * Firebase doesn't accept undefined values, so we need to clean them
 * @param {any} obj - The object to clean
 * @returns {any} The cleaned object
 */
function removeUndefinedValues(obj) {
    if (obj === null || obj === undefined) {
        return null;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefinedValues(item));
    }
    
    if (typeof obj === 'object') {
        const cleaned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (value !== undefined) {
                    cleaned[key] = removeUndefinedValues(value);
                }
            }
        }
        return cleaned;
    }
    
    return obj;
}

/**
 * Collects and validates form data
 * @returns {object|null} Form data object or null if validation fails
 */
function collectFormData() {
    const itemName = document.getElementById('itemNameInput')?.value.trim();
    if (!itemName) {
        alert('Item name is required');
        return null;
    }

    return {
        info: {
            name: itemName,
            sku: document.getElementById('itemSkuInput')?.value.trim() || '',
            description: document.getElementById('publicDescription')?.value.trim() || '',
            note: document.getElementById('privateNote')?.value.trim() || '',
            itemCode: document.getElementById('itemCodeInput')?.value.trim() || '',
            hsnCode: document.getElementById('hsnCodeInput')?.value.trim() || '',
            attributes: collectAttributes()
        },
        pricing: {
            costPrice: parseFloat(document.getElementById('purchasePriceInput')?.value) || 0,
            sellingPrice: parseFloat(document.getElementById('sellingPriceInput')?.value) || 0,
            mrp: document.getElementById('mrpInput')?.value ? parseFloat(document.getElementById('mrpInput').value) : undefined,
            wholesalePrice: document.getElementById('wholesalePriceInput')?.value ? parseFloat(document.getElementById('wholesalePriceInput').value) : undefined,
            gstRate: parseInt(document.getElementById('gstRateSelect')?.value) || 0
        },
        inventory: {
            stockQty: document.getElementById('openingStockInput')?.value ? parseInt(document.getElementById('openingStockInput').value) : undefined,
            lowStockThreshold: document.getElementById('lowStockThresholdInput')?.value ? parseInt(document.getElementById('lowStockThresholdInput').value) : undefined,
            reorderQuantity: document.getElementById('reorderQuantityInput')?.value ? parseInt(document.getElementById('reorderQuantityInput').value) : undefined,
            maxStockLevel: document.getElementById('maxStockLevelInput')?.value ? parseInt(document.getElementById('maxStockLevelInput').value) : undefined,
            stockLocation: document.getElementById('stockLocationInput')?.value.trim() || undefined,
            batchId: document.getElementById('batchNumberInput')?.value.trim() || undefined,
            expiryDate: document.getElementById('expiryDateInput')?.value || undefined,
            conversionFactor: document.getElementById('conversionInput')?.value ? parseFloat(document.getElementById('conversionInput').value) : undefined,
            isAvailable: document.getElementById('itemStatusToggle')?.checked || false
        },
        links: {
            categoryId: document.getElementById('itemCategory')?.value || undefined,
            brandId: document.getElementById('itemBrand')?.value || undefined,
            unitId: document.getElementById('primaryUnit')?.value || undefined,
            secondaryUnitId: document.getElementById('secondaryUnit')?.value || undefined
        },
        meta: {
            type: document.getElementById('productToggle')?.classList.contains('active') ? 'product' : 'service',
            flags: {
            },
            visibility: document.getElementById('visibilityToggle')?.checked === true ? 'public' : 'private' // Explicitly check for true
        },
        seo: {
            keywords: document.getElementById('item-tags')?.value.split(',').map(tag => tag.trim()).filter(tag => tag) || []
        },
        media: collectMediaData()
    };
}

/**
 * Collects attributes from the attributes container
 */
function collectAttributes() {
    const attributes = {};
    const attributeRows = document.querySelectorAll('#attributesContainer .attribute-row');
    attributeRows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 2) {
            const name = inputs[0].value.trim();
            const value = inputs[1].value.trim();
            if (name && value) {
                attributes[name] = value;
            }
        }
    });
    return attributes;
}

/**
 * Collects media data (thumbnail and gallery)
 */
function collectMediaData() {
    const photoGrid = document.querySelector('.mstore-photo-grid');
    if (!photoGrid) return {};

    const primaryPhoto = photoGrid.querySelector('.mstore-photo-item.primary img');
    const galleryPhotos = Array.from(photoGrid.querySelectorAll('.mstore-photo-item:not(.primary) img'));

    return {
        thumbnail: primaryPhoto?.src || undefined,
        gallery: galleryPhotos.map(img => img.src).filter(src => src)
    };
}

// Module exports already at top
