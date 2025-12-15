/**
 * Item Form Manager - Handles form population, data collection, and form operations
 */

import { ItemMediaHandler } from './item-media-handler.js';
import { buildCloudinaryUrl } from '../../../../api/cloudinary.js';

export class ItemFormManager {
    /**
     * Populates the form fields with existing item data for editing.
     * @param {object} item - The item object to populate the form with.
     */
    static populateForm(item, dataManager) {
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
            // Enable stock tracking if item has inventory data
            const hasExistingInventory = item.inventory?.stockQty !== undefined ||
                                        item.inventory?.lowStockThreshold !== undefined ||
                                        item.inventory?.reorderQuantity !== undefined ||
                                        item.inventory?.maxStockLevel !== undefined ||
                                        item.inventory?.stockLocation ||
                                        item.inventory?.batchId ||
                                        item.inventory?.expiryDate;

            stockTrackingToggle.checked = hasExistingInventory;
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
        const categoryInput = document.getElementById('itemCategory');
        const categoryInputDisplay = document.getElementById('categoryInputDisplay');
        if (categoryInput && categoryInputDisplay && item.links?.categoryId) {
            // Assuming categories are populated and contains full objects
            const category = dataManager.getCategories().find(cat => cat.code === item.links.categoryId);
            if (category) {
                categoryInput.value = category.code;
                categoryInputDisplay.value = category.displayName;
            }
        }

        const brandInput = document.getElementById('itemBrand');
        const brandInputDisplay = document.getElementById('brandInputDisplay');
        if (brandInput && brandInputDisplay && item.links?.brandId) {
            // Assuming brands are populated
            const brand = dataManager.getBrands().find(b => b.code === item.links.brandId);
            if (brand) {
                brandInput.value = brand.code;
                brandInputDisplay.value = brand.displayName;
            }
        }

        const primaryUnitInput = document.getElementById('primaryUnit');
        const primaryUnitInputDisplay = document.getElementById('primaryUnitInputDisplay');
        if (primaryUnitInput && primaryUnitInputDisplay && item.links?.unitId) {
            // Assuming units are populated
            const unit = dataManager.getUnits().find(u => u.code === item.links.unitId);
            if (unit) {
                primaryUnitInput.value = unit.code;
                primaryUnitInputDisplay.value = `${unit.displayName} (${unit.symbol})`;
            }
        }

        const secondaryUnitInput = document.getElementById('secondaryUnit');
        const secondaryUnitInputDisplay = document.getElementById('secondaryUnitInputDisplay');
        if (secondaryUnitInput && secondaryUnitInputDisplay && item.links?.secondaryUnitId) {
            // Assuming units are populated
            const unit = dataManager.getUnits().find(u => u.code === item.links.secondaryUnitId);
            if (unit) {
                secondaryUnitInput.value = unit.code;
                secondaryUnitInputDisplay.value = `${unit.displayName} (${unit.symbol})`;
            }
            // Also populate conversion input
            const conversionInput = document.getElementById('conversionInput');
            if (conversionInput && item.inventory?.conversionFactor) {
                conversionInput.value = item.inventory.conversionFactor;
                // Trigger update of the badge
                this.updateConversionDisplay();
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
        this.initializePhotoGrid(item.media);
    }

    /**
     * Clear form fields
     */
    static clearForm() {
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

        // Clear and initialize photo grid with 4 empty boxes using common function
        this.initializePhotoGrid();

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

    /**
     * Collects and validates form data
     * @returns {object|null} Form data object or null if validation fails
     */
    static collectFormData() {
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
                attributes: this.collectAttributes()
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
            media: this.collectMediaData()
        };
    }

    /**
     * Collects attributes from the attributes container
     */
    static collectAttributes() {
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
    static collectMediaData() {
        // Get uploaded images data from ItemMediaHandler
        const uploadedImages = ItemMediaHandler.getUploadedImages();

        return {
            thumbnail: uploadedImages.thumbnail?.publicId || null,
            gallery: uploadedImages.gallery.map(img => img.publicId).filter(id => id) || []
        };
    }

    /**
     * Common function to initialize photo grid for both add and edit modes
     * @param {Object} media - Media object with thumbnail and gallery
     */
    static initializePhotoGrid(media = null) {
        const photoGrid = document.querySelector(".mstore-photo-grid");
        if (!photoGrid) return;

        // Clear existing photo items except the first 'primary' placeholder
        const existingPhotos = photoGrid.querySelectorAll(".mstore-photo-item:not(.primary)");
        existingPhotos.forEach(photo => photo.remove());

        // Reset primary photo
        const primaryPhotoItem = photoGrid.querySelector(".mstore-photo-item.primary");
        if (primaryPhotoItem) {
            if (media?.thumbnail) {
                // Convert public_id to URL using Cloudinary
                const thumbnailUrl = buildCloudinaryUrl(media.thumbnail);
                primaryPhotoItem.innerHTML = `<img src="${thumbnailUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`;
                primaryPhotoItem.style.border = "2px solid #3b82f6";
            } else {
                primaryPhotoItem.innerHTML = `
                    <div class="mstore-photo-icon"><i class="fas fa-camera"></i></div>
                    <div class="mstore-photo-label">Thumbnail</div>
                `;
                primaryPhotoItem.style.border = "none";
            }
        }

        // Initialize gallery photos (up to 4 additional photos)
        if (media?.gallery && Array.isArray(media.gallery)) {
            media.gallery.slice(0, 4).forEach((photoPublicId, index) => {
                const photoItem = document.createElement("div");
                photoItem.className = "mstore-photo-item";
                // Convert public_id to URL using Cloudinary
                const photoUrl = buildCloudinaryUrl(photoPublicId);
                photoItem.innerHTML = `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`;
                photoGrid.appendChild(photoItem);
            });
        }

        // Fill remaining slots with empty placeholders (up to 4 total gallery photos)
        const totalPhotos = media?.gallery?.length || 0;
        const remainingSlots = Math.max(0, 4 - totalPhotos);
        for (let i = 0; i < remainingSlots; i++) {
            const photoItem = document.createElement("div");
            photoItem.className = "mstore-photo-item";
            photoItem.innerHTML = `
                <div class="mstore-photo-icon"><i class="fas fa-plus"></i></div>
                <div class="mstore-photo-label">Add Photo</div>
            `;
            photoGrid.appendChild(photoItem);
        }
    }

    /**
     * Updates the conversion display badge
     */
    static updateConversionDisplay() {
        const primaryUnitInput = document.getElementById('primaryUnit');
        const secondaryUnitInput = document.getElementById('secondaryUnit');
        const conversionInput = document.getElementById('conversionInput');

        if (!primaryUnitInput || !secondaryUnitInput || !conversionInput) return;

        const pCode = primaryUnitInput.value;
        const sCode = secondaryUnitInput.value;
        const factor = conversionInput.value;

        // Import dataManager dynamically to avoid circular dependencies
        import('./item-data-manager.js').then(({ ItemDataManager }) => {
            const dataManager = new ItemDataManager();
            const pUnit = dataManager.getUnits().find((u) => u.code === pCode);
            const sUnit = dataManager.getUnits().find((u) => u.code === sCode);

            const pSym = pUnit ? pUnit.symbol : pCode;
            const sSym = sUnit ? sUnit.symbol : sCode;

            const badgeBtn = document.getElementById("conversionBadgeBtn");
            const badgeText = document.getElementById("conversionBadgeText");

            if (badgeBtn && badgeText) {
                if (factor && pCode && sCode) {
                    badgeText.textContent = `1 ${pSym} = ${factor} ${sSym}`;
                } else {
                    badgeText.textContent = "Set Conversion";
                }
                // Badge visibility is controlled by secondary unit toggle
                // Don't hide it here, let the toggle control it
            }
        });
    }
}