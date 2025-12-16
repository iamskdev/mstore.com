/**
 * Item Data Manager - Handles all data loading and management for add-item functionality
 */

import { fetchAllCategories, fetchAllUnits } from '../../../../utils/data-manager.js';
import { showToast } from '../../../../utils/toast.js';

export class ItemDataManager {
    constructor() {
        this.allUnitsGlobal = [];
        this.allCategoriesGlobal = [];
        this.allBrandsGlobal = [
            { code: "local", displayName: "Local", type: "Common" },
            { code: "brand1", displayName: "Brand A", type: "Premium" },
            { code: "brand2", displayName: "Brand B", type: "Premium" },
        ];
    }

    /**
     * Load units from Firebase via data manager
     */
    async loadUnits() {
        console.log("Fetching units from Firebase...");
        try {
            const units = await fetchAllUnits();
            console.log("Units fetched from Firebase:", units);

            if (!units || units.length === 0) {
                console.log("No units found in Firebase - using empty array");
                this.allUnitsGlobal = [];
                console.log("Final units loaded: 0 (empty)");
            } else {
                this.populateUnitsGlobal(units);
            }
        } catch (error) {
            console.error("Error loading units:", error);
            console.log("Firebase units failed - using empty array");
            this.allUnitsGlobal = [];
            console.log("Final units loaded: 0 (error)");
        }
    }

    /**
     * Populate global units array
     */
    populateUnitsGlobal(units) {
        console.log("Raw units data:", units);
        this.allUnitsGlobal = [];

        units.forEach((unit) => {
            // Handle nested structure (local JSON) vs flat structure (Firebase)
            if (unit.subunits && Array.isArray(unit.subunits)) {
                // Local JSON structure with groups and subunits
                unit.subunits.forEach((subunit) => {
                    const unitObj = {
                        ...subunit,
                        code: subunit.code || subunit.id || subunit.name || subunit.title,
                        type: unit.meta?.type || 'unknown',
                        displayName: subunit.title || subunit.name || subunit.code,
                    };
                    this.allUnitsGlobal.push(unitObj);
                });
            } else {
                // Firebase flat structure
                const unitObj = {
                    ...unit,
                    code: unit.code || unit.id || unit.name || unit.title,
                    displayName: unit.title || unit.name || unit.code,
                };
                this.allUnitsGlobal.push(unitObj);
            }
        });

        console.log(`Final units loaded: ${this.allUnitsGlobal.length}`, this.allUnitsGlobal);

        // Refresh unit comboboxes with new data
        this.refreshUnitComboboxes();
    }

    /**
     * Refresh unit comboboxes with updated data
     */
    refreshUnitComboboxes() {
        // Setup unit comboboxes after data is loaded
        this.setupUnitComboboxes();
        console.log("Unit comboboxes refreshed with", this.allUnitsGlobal.length, "units");
    }

    /**
     * Load categories from Firebase via data manager
     */
    async loadCategories() {
        console.log("Fetching categories from Firebase...");
        try {
            const categories = await fetchAllCategories();
            console.log("Categories fetched from Firebase:", categories);

            if (!categories || categories.length === 0) {
                console.log("No categories found in Firebase - using empty array");
                this.allCategoriesGlobal = [];
                console.log("Final categories loaded: 0 (empty)");
            } else {
                this.populateCategoriesGlobal(categories);
            }
        } catch (error) {
            console.error("Error loading categories from Firebase:", error);
            console.log("Firebase categories failed - using empty array");
            this.allCategoriesGlobal = [];
            console.log("Final categories loaded: 0 (error)");
        }
    }

    /**
     * Populate global categories array
     */
    populateCategoriesGlobal(categories) {
        console.log("Raw categories data:", categories);
        this.allCategoriesGlobal = [];

        // Create the same category tabs as the filter bar (excluding 'all', 'product', 'service')
        const activeCategories = categories.filter(cat => {
            const meta = cat.meta || cat;
            const flags = meta.flags || {};
            return flags.isActive !== false && flags.isDeleted !== true;
        });

        // Add main category tabs (same as filter bar)
        activeCategories.forEach(cat => {
            const meta = cat.meta || cat;
            if (meta.slug) {
                // Determine if this is a standard (system) or custom category
                // Standard categories typically have predefined slugs or flags
                const isStandard = meta.flags?.isSystem || meta.flags?.isStandard ||
                                 ['electronics', 'clothing', 'food', 'books', 'home', 'sports', 'beauty', 'automotive', 'health', 'toys'].includes(meta.slug);

                const categoryObj = {
                    code: meta.categoryId || cat.categoryId,
                    displayName: this.formatSlugForDisplay(meta.slug),
                    type: isStandard ? "Standard" : "Custom",
                    icon: meta.icon || cat.icon,
                    isPopular: meta.flags?.isPopular || false,
                    displayOrder: meta.displayOrder || cat.displayOrder || 999,
                    slug: meta.slug,
                    group: isStandard ? "Standard" : "Custom"
                };
                this.allCategoriesGlobal.push(categoryObj);
            }
        });

        // Sort by displayOrder, then by isPopular, then by displayName
        this.allCategoriesGlobal.sort((a, b) => {
            if (a.displayOrder !== b.displayOrder) {
                return a.displayOrder - b.displayOrder;
            }
            if (a.isPopular !== b.isPopular) {
                return b.isPopular - a.isPopular; // Popular first
            }
            return a.displayName.localeCompare(b.displayName);
        });

        console.log(`Final categories loaded: ${this.allCategoriesGlobal.length}`, this.allCategoriesGlobal);

        // Setup category combobox now that categories are loaded
        this.setupCategoryCombobox();
    }

    /**
     * Format slug for display (same as filter bar)
     */
    formatSlugForDisplay(slug = '') {
        if (!slug) return '';
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Setup category combobox after categories are loaded
     */
    setupCategoryCombobox() {
        const categoryInput = document.getElementById("itemCategory");
        const categoryDisplay = document.getElementById("categoryInputDisplay");
        const categoryIcon = document.getElementById("categoryIcon");
        const categoryDropdown = document.getElementById("categoryDropdown");

        if (categoryInput && categoryDisplay && categoryIcon && categoryDropdown) {
            // Import dropdownModal dynamically to avoid circular dependencies
            import('../../../../modals/dropdown/dropdown-list.js').then(({ dropdownModal }) => {
                this.setupCombobox(
                    categoryDisplay,
                    categoryIcon,
                    categoryDropdown,
                    categoryInput,
                    (selectedCategories) => {
                        // Callback after category selection - selectUnit already handled UI updates
                        console.log("Categories selected:", selectedCategories);
                    },
                    {
                        title: "Select Category",
                        data: this.allCategoriesGlobal,
                        enableCreate: true,
                        multiSelect: true,
                        enableGrouping: true,
                        onAddNew: async (params) => {
                            // Handle opening custom modal for category creation
                            const searchText = typeof params === 'string' ? params : (params?.searchText || '');
                            const modalInstance = typeof params === 'object' ? params?.dropdownModal : null;

                            // Open the custom createItemModal
                            this.openCreateItemModal(searchText, modalInstance);
                        }
                    },
                    dropdownModal
                );
                console.log("Category combobox setup completed with", this.allCategoriesGlobal.length, "categories");
            });
        } else {
            console.warn("Category combobox elements not found, skipping setup");
        }
    }


    /**
     * Ensure createItemModal exists in DOM, create if it doesn't
     */
    _ensureCreateItemModalExists() {
        let createItemModal = document.getElementById('createItemModal');
        
        if (!createItemModal) {
            // Create modal dynamically
            createItemModal = document.createElement('div');
            createItemModal.id = 'createItemModal';
            createItemModal.className = 'mstore-create-item-modal';
            createItemModal.innerHTML = `
                <div class="mstore-create-item-container">
                    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">Create New Category</h3>
                    <div class="mstore-input-wrapper" style="margin-bottom: 20px;">
                        <input type="text" id="newItemInput" class="mstore-input" style="border: none; padding: 12px 10px; color: var(--text-primary);" placeholder="Enter category name" autofocus>
                    </div>
                    <div class="mstore-modal-actions-compact">
                        <button class="mstore-action-btn secondary mstore-modal-btn-create-compact" id="closeCreateItemModal">Cancel</button>
                        <button class="mstore-action-btn primary mstore-modal-btn-create-compact" id="saveCreateItemModal">Save</button>
                    </div>
                </div>
            `;
            document.body.appendChild(createItemModal);
            console.log('✅ Created createItemModal dynamically');
        }
        
        return createItemModal;
    }

    /**
     * Open createItemModal for category creation
     */
    openCreateItemModal(prefillText = '', dropdownModalInstance = null) {
        // Ensure modal exists in DOM
        const createItemModal = this._ensureCreateItemModalExists();
        
        // Get elements (they should exist now)
        const newItemInput = document.getElementById('newItemInput');
        const closeCreateItemBtn = document.getElementById('closeCreateItemModal');
        const saveCreateItemBtn = document.getElementById('saveCreateItemModal');

        if (!newItemInput || !saveCreateItemBtn) {
            console.error('CreateItemModal input elements not found even after creating modal');
            // Fallback to native prompt
            const categoryName = prompt('Enter category name:', prefillText || '');
            if (categoryName && categoryName.trim()) {
                this.createCategoryFromName(categoryName.trim(), dropdownModalInstance);
            }
            return;
        }

        // Proceed with opening modal
        this._openModalWithElements(createItemModal, newItemInput, closeCreateItemBtn, saveCreateItemBtn, prefillText, dropdownModalInstance);
    }

    /**
     * Internal method to open modal with elements (after they're confirmed to exist)
     */
    _openModalWithElements(createItemModal, newItemInput, closeCreateItemBtn, saveCreateItemBtn, prefillText, dropdownModalInstance) {

        // Store reference to dropdown modal instance
        this.currentDropdownModal = dropdownModalInstance;

        // Pre-fill input with search text if any
        newItemInput.value = prefillText;

        // Show the modal (ensure it's above dropdown modal)
        createItemModal.style.zIndex = '4000'; // Higher than dropdown modal (3000)
        createItemModal.style.visibility = 'visible';
        createItemModal.style.opacity = '1';
        createItemModal.style.display = 'flex';

        // Focus input after a short delay
        setTimeout(() => {
            newItemInput.focus();
            if (prefillText) {
                newItemInput.select();
            }
        }, 100);

        // Close modal function
        const closeCreateItemModal = () => {
            createItemModal.style.opacity = '0';
            setTimeout(() => {
                createItemModal.style.visibility = 'hidden';
                createItemModal.style.display = 'none';
            }, 300);
        };

        // Remove existing event listeners by cloning buttons
        const newSaveBtn = saveCreateItemBtn.cloneNode(true);
        saveCreateItemBtn.parentNode.replaceChild(newSaveBtn, saveCreateItemBtn);

        const newCloseBtn = closeCreateItemBtn ? closeCreateItemBtn.cloneNode(true) : null;
        if (closeCreateItemBtn && newCloseBtn) {
            closeCreateItemBtn.parentNode.replaceChild(newCloseBtn, closeCreateItemBtn);
        }

        // Close button handler
        if (newCloseBtn) {
            newCloseBtn.addEventListener('click', closeCreateItemModal);
        }

        // Save button handler
        newSaveBtn.addEventListener('click', async () => {
            const categoryName = newItemInput.value.trim();
            if (!categoryName) {
                return; // Don't proceed if empty
            }

            // Close the create modal
            closeCreateItemModal();

            // Create category
            this.createCategoryFromName(categoryName, dropdownModalInstance);
        });

        // Close modal on backdrop click
        const handleBackdropClick = (e) => {
            if (e.target === createItemModal) {
                closeCreateItemModal();
                createItemModal.removeEventListener('click', handleBackdropClick);
            }
        };
        createItemModal.addEventListener('click', handleBackdropClick);

        // Close modal on Enter key
        const handleEnterKey = (e) => {
            if (e.key === 'Enter' && document.activeElement === newItemInput) {
                e.preventDefault();
                newSaveBtn.click();
            }
        };
        newItemInput.addEventListener('keydown', handleEnterKey);
    }

    /**
     * Create category from name and update dropdown
     */
    createCategoryFromName(categoryName, dropdownModalInstance) {
        try {
            // Generate new category ID
            const newCategoryId = `CAT-${Date.now()}`;

            // Create new category object
            const newCategory = {
                code: newCategoryId,
                displayName: categoryName,
                isPopular: false,
                displayOrder: 999, // Put at end
                type: 'category',
                createdAt: new Date(),
                createdBy: localStorage.getItem('currentUserId')
            };

            // Add to global array immediately for UI
            this.allCategoriesGlobal.push(newCategory);

            // Save to Firebase (you might need to implement this)
            // For now, just log it
            console.log("New category created:", newCategory);

            // Show success message
            showToast('success', '✅ Category created successfully!', 3000);

            // Update dropdown modal if it's open
            if (dropdownModalInstance) {
                // Refresh options with updated category list
                const updatedOptions = this.allCategoriesGlobal.map(cat => ({
                    value: cat.code,
                    label: cat.displayName,
                    code: cat.code,
                    displayName: cat.displayName,
                    type: cat.type || 'category'
                }));
                dropdownModalInstance.refreshOptions(updatedOptions);
                
                // Normalized item for selection
                const normalizedItem = {
                    value: newCategory.code,
                    label: newCategory.displayName,
                    code: newCategory.code,
                    displayName: newCategory.displayName,
                    type: newCategory.type
                };
                
                // Auto-select the new category
                if (dropdownModalInstance.multiSelect) {
                    dropdownModalInstance.selectedValues.add(normalizedItem.value);
                    dropdownModalInstance.selectedValues.add(normalizedItem.code);
                    // Re-render to show the checkbox as checked
                    dropdownModalInstance.renderOptions();
                    // Don't call callback yet - wait for Apply button
                } else {
                    dropdownModalInstance.selectedValues.clear();
                    dropdownModalInstance.selectedValues.add(normalizedItem.value);
                    dropdownModalInstance.selectedValues.add(normalizedItem.code);
                    
                    // For single-select, call callback and close immediately
                    if (dropdownModalInstance.onSelectCallback) {
                        dropdownModalInstance.onSelectCallback(normalizedItem);
                    }
                    dropdownModalInstance.hide();
                }
            }

        } catch (error) {
            console.error("Error creating new category:", error);
            showToast('error', '❌ Please try again.', 4000);
        }
    }

    /**
     * Generic combobox setup function
     */
    setupCombobox(inputEl, iconEl, dropdownEl, hiddenInputEl, onSelectCallback, config = {}, dropdownModal) {
        const title = config.title || "Select Option";
        const enableCreate = config.enableCreate || false;
        const multiSelect = config.multiSelect || false;

        // 1. Icon Click -> Open Full Modal
        iconEl.addEventListener("click", async (e) => {
            e.stopPropagation();
            // Determine options source based on Config or default to Units
            const sourceData = config.data || this.allUnitsGlobal;

            // Get currently selected codes from hidden input
            const currentVal = hiddenInputEl.value || "";
            const initialSelection = currentVal ? currentVal.split(",") : [];

            // Convert data format to dropdownModal format
            const options = sourceData.map(opt => ({
                value: opt.code || opt.value || '',
                label: opt.displayName || opt.label || opt.value || '',
                code: opt.code || opt.value || '',
                displayName: opt.displayName || opt.label || opt.value || '',
                symbol: opt.symbol || '',
                type: opt.type || 'Others'
            }));

            await dropdownModal.show(
                options,
                title,
                (selected) => {
                    // Handle both single object (single-select) and array (multi-select)
                    const selectedArray = Array.isArray(selected) ? selected : [selected];

                    // Map selected options back to original sourceData format
                    const selectedOriginal = selectedArray.map(sel =>
                        sourceData.find(orig => (orig.code || orig.value) === (sel.code || sel.value))
                    ).filter(Boolean);

                    // Handle both single and multi-select
                    const selectedData = multiSelect ? selectedOriginal : selectedOriginal[0];
                    this.selectUnit(selectedData, inputEl, hiddenInputEl, onSelectCallback);
                },
                {
                    multiSelect: multiSelect,
                    enableCreate: enableCreate,
                    enableGrouping: true,
                    selectedValues: initialSelection,
                    onAddNew: enableCreate ? async (searchText) => {
                        // Handle create new callback if needed
                        if (config.onAddNew) {
                            return await config.onAddNew(searchText);
                        }
                    } : null
                }
            );
        });

        // Make Input Click also open the modal
        inputEl.addEventListener("click", async (e) => {
            e.preventDefault();
            inputEl.blur();
            const sourceData = config.data || this.allUnitsGlobal;

            const currentVal = hiddenInputEl.value || "";
            const initialSelection = currentVal ? currentVal.split(",") : [];

            // Convert data format to dropdownModal format
            const options = sourceData.map(opt => ({
                value: opt.code || opt.value || '',
                label: opt.displayName || opt.label || opt.value || '',
                code: opt.code || opt.value || '',
                displayName: opt.displayName || opt.label || opt.value || '',
                symbol: opt.symbol || '',
                type: opt.type || 'Others'
            }));

            await dropdownModal.show(
                options,
                title,
                (selected) => {
                    // Handle both single object (single-select) and array (multi-select)
                    const selectedArray = Array.isArray(selected) ? selected : [selected];

                    // Map selected options back to original sourceData format
                    const selectedOriginal = selectedArray.map(sel =>
                        sourceData.find(orig => (orig.code || orig.value) === (sel.code || sel.value))
                    ).filter(Boolean);

                    // Handle both single and multi-select
                    const selectedData = multiSelect ? selectedOriginal : selectedOriginal[0];
                    this.selectUnit(selectedData, inputEl, hiddenInputEl, onSelectCallback);
                },
                {
                    multiSelect: multiSelect,
                    enableCreate: enableCreate,
                    enableGrouping: true,
                    selectedValues: initialSelection,
                    onAddNew: enableCreate ? async (searchText) => {
                        // Handle create new callback if needed
                        if (config.onAddNew) {
                            return await config.onAddNew(searchText);
                        }
                    } : null
                }
            );
        });

        // 2. Input Typing -> Filter Mini Dropdown
        inputEl.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase();
            const sourceData = config.data || this.allUnitsGlobal;

            const filtered = sourceData.filter(opt =>
                (opt.displayName || '').toLowerCase().includes(term) ||
                (opt.code || '').toLowerCase().includes(term)
            );

            this.renderMiniDropdown(filtered, dropdownEl, (selected) => {
                this.selectUnit(selected, inputEl, hiddenInputEl, onSelectCallback);
                dropdownEl.classList.remove("active");
            });

            if (filtered.length > 0) {
                dropdownEl.classList.add("active");
            }
        });

        // 3. Hide dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (!inputEl.contains(e.target) && !iconEl.contains(e.target) && !dropdownEl.contains(e.target)) {
                dropdownEl.classList.remove("active");
            }
        });
    }

    /**
     * Handle unit/item selection and update input fields
     */
    selectUnit(unit, inputEl, hiddenInputEl, callback) {
        if (!unit) return;

        // Handle Multi-Select Array (like categories)
        if (Array.isArray(unit)) {
            // Multi-select - join all selected items
            const displays = unit.map(u => {
                let d = u.displayName || u.label || u.value || u.code || '';
                if (u.symbol) d += ` (${u.symbol})`;
                return d;
            }).filter(Boolean).join(', ');

            const codes = unit.map(u => u.code || u.value).filter(Boolean).join(',');

            inputEl.value = displays;
            hiddenInputEl.value = codes;
        } else {
            // Single select (like units)
            let display = unit.displayName || unit.label || unit.value || unit.code || '';
            if (unit.symbol) display += ` (${unit.symbol})`;

            inputEl.value = display;
            hiddenInputEl.value = unit.code || unit.value;
        }
        if (callback) callback();
    }

    /**
     * Render mini dropdown options
     */
    renderMiniDropdown(options, container, onSelect) {
        container.innerHTML = '';
        // Limit to 5 results for mini dropdown
        const limit = options.slice(0, 5);

        limit.forEach(option => {
            const item = document.createElement('div');
            item.className = 'mini-dropdown-item';
            item.textContent = option.displayName || option.label || option.code;
            item.addEventListener('click', () => onSelect(option));
            container.appendChild(item);
        });

        if (options.length > 5) {
            const moreItem = document.createElement('div');
            moreItem.className = 'mini-dropdown-item more-results';
            moreItem.textContent = `+ ${options.length - 5} more results...`;
            moreItem.addEventListener('click', () => {
                // Click on icon to open full modal
                const iconEl = container.previousElementSibling?.querySelector('.combobox-icon') ||
                              document.querySelector('.combobox-icon');
                if (iconEl) iconEl.click();
            });
            container.appendChild(moreItem);
        }
    }

    /**
     * Get all data needed for item form
     */
    async loadAllData() {
        await Promise.all([
            this.loadUnits(),
            this.loadCategories()
        ]);

        return {
            units: this.allUnitsGlobal,
            categories: this.allCategoriesGlobal,
            brands: this.allBrandsGlobal
        };
    }

    /**
     * Get units data
     */
    getUnits() {
        return this.allUnitsGlobal;
    }

    /**
     * Get categories data
     */
    getCategories() {
        return this.allCategoriesGlobal;
    }

    /**
     * Get brands data
     */
    getBrands() {
        return this.allBrandsGlobal;
    }

    /**
     * Get unit data by code
     */
    getUnitByCode(unitCode) {
        if (!this.allUnitsGlobal || !Array.isArray(this.allUnitsGlobal)) return null;

        // Find unit in the flattened array
        const unit = this.allUnitsGlobal.find(unit => unit.code === unitCode);
        if (unit) {
            return {
                ...unit,
                category: unit.type,
                categoryName: unit.type
            };
        }
        return null;
    }

    /**
     * Auto-fill conversion for common unit pairs using existing unit data
     */
    autoFillConversion(primaryUnitCode, secondaryUnitCode) {
        if (!primaryUnitCode || !secondaryUnitCode || primaryUnitCode === secondaryUnitCode) return;

        // Check if units data is loaded
        if (!this.allUnitsGlobal || !Array.isArray(this.allUnitsGlobal)) {
            console.warn('Units data not loaded yet, skipping auto-fill conversion');
            return;
        }

        const conversionInput = document.getElementById('conversionInput');
        if (!conversionInput || conversionInput.value) return; // Don't overwrite existing values

        // Find both units in the flattened array
        const primaryUnit = this.allUnitsGlobal.find(unit => unit.code === primaryUnitCode);
        const secondaryUnit = this.allUnitsGlobal.find(unit => unit.code === secondaryUnitCode);

        if (primaryUnit && secondaryUnit && primaryUnit.type === secondaryUnit.type) {
            // Both units are of the same type, calculate conversion
            if (primaryUnit.toBase > 0 && secondaryUnit.toBase > 0) {
                // Calculate conversion: how many secondary units = 1 primary unit
                const conversionRate = primaryUnit.toBase / secondaryUnit.toBase;

                if (conversionRate > 0) {
                    // Round to reasonable precision (2-4 decimal places)
                    const roundedRate = Math.round(conversionRate * 10000) / 10000;
                    conversionInput.value = roundedRate;
                    console.log(`Auto-filled conversion: 1 ${primaryUnitCode} = ${roundedRate} ${secondaryUnitCode} (using unit data)`);
                }
            }
        } else {
            // Fallback for common retail units (box/pack/carton etc.)
            this.fallbackConversions(primaryUnitCode, secondaryUnitCode);
        }
    }

    /**
     * Auto-suggest secondary unit when primary unit is selected
     */
    autoSuggestSecondaryUnit(primaryUnitCode) {
        if (!primaryUnitCode) return null;

        // Check if units data is loaded
        if (!this.allUnitsGlobal || !Array.isArray(this.allUnitsGlobal)) {
            console.warn('Units data not loaded yet, skipping auto-suggest');
            return null;
        }

        // Find the primary unit in the flattened array
        const primaryUnit = this.allUnitsGlobal.find(unit => unit.code === primaryUnitCode);
        if (!primaryUnit) return null;

        console.log('Primary unit found:', primaryUnit);

        // Find all units of the same type (category)
        const sameTypeUnits = this.allUnitsGlobal.filter(unit => unit.type === primaryUnit.type);
        console.log('Same type units:', sameTypeUnits);

        // Find the base unit of this category (toBase = 1)
        // Use loose equality to handle string "1" or number 1
        const baseUnits = sameTypeUnits.filter(unit => unit.toBase == 1 && unit.toBase > 0);

        // Prefer base units that are not the primary unit
        let suggestedUnit = baseUnits.find(unit => unit.code !== primaryUnitCode);

        // If no other base unit, use any base unit (even if it's the primary - though this shouldn't happen)
        if (!suggestedUnit && baseUnits.length > 0) {
            suggestedUnit = baseUnits[0];
        }

        if (suggestedUnit) {
            console.log('Suggesting base unit:', suggestedUnit.code);
            return suggestedUnit.code;
        }

        // If no base units defined, look for units with the smallest toBase value (most base-like)
        if (sameTypeUnits.length > 1) {
            const sortedByToBase = sameTypeUnits
                .filter(unit => unit.toBase > 0)
                .sort((a, b) => a.toBase - b.toBase);

            if (sortedByToBase.length > 0) {
                suggestedUnit = sortedByToBase.find(unit => unit.code !== primaryUnitCode) || sortedByToBase[0];
                if (suggestedUnit) {
                    console.log('Suggesting smallest toBase unit:', suggestedUnit.code, 'toBase:', suggestedUnit.toBase);
                    return suggestedUnit.code;
                }
            }
        }

        // Otherwise, suggest the first popular unit that's not the primary unit
        const popularUnit = sameTypeUnits.find(unit => unit.isPopular && unit.code !== primaryUnitCode);
        if (popularUnit) {
            console.log('Suggesting popular unit:', popularUnit.code);
            return popularUnit.code;
        }

        // As last resort, suggest the first unit that's not the primary unit
        const otherUnit = sameTypeUnits.find(unit => unit.code !== primaryUnitCode);
        if (otherUnit) {
            console.log('Suggesting other unit:', otherUnit.code);
            return otherUnit.code;
        }

        return null;
    }

    /**
     * Fallback conversions for retail units not in standard categories
     */
    fallbackConversions(primaryUnitCode, secondaryUnitCode) {
        const conversionInput = document.getElementById('conversionInput');
        if (!conversionInput) return;

        // Common retail conversions
        const retailConversions = {
            'box-pc': 12,      // 1 box = 12 pieces (common assumption)
            'pc-box': 1/12,    // 1 piece = 1/12 box

            'dozen-pc': 12,    // 1 dozen = 12 pieces
            'pc-dozen': 1/12,  // 1 piece = 1/12 dozen

            'pack-pc': 10,     // 1 pack = 10 pieces (common assumption)
            'pc-pack': 0.1,    // 1 piece = 0.1 pack

            'carton-pc': 24,   // 1 carton = 24 pieces (common assumption)
            'pc-carton': 1/24, // 1 piece = 1/24 carton

            'bundle-pc': 20,   // 1 bundle = 20 pieces (common assumption)
            'pc-bundle': 1/20, // 1 piece = 1/20 bundle
        };

        const conversionKey = `${primaryUnitCode}-${secondaryUnitCode}`;
        const conversionRate = retailConversions[conversionKey];

        if (conversionRate) {
            conversionInput.value = conversionRate;
            console.log(`Auto-filled conversion (fallback): 1 ${primaryUnitCode} = ${conversionRate} ${secondaryUnitCode}`);
        }
    }

    /**
     * Setup unit comboboxes after data is loaded
     */
    setupUnitComboboxes() {
        // Ensure units data is loaded
        if (!this.allUnitsGlobal || !Array.isArray(this.allUnitsGlobal) || this.allUnitsGlobal.length === 0) {
            console.warn('Units data not loaded yet, cannot setup comboboxes');
            return;
        }
        // Get unit combobox elements
        const primaryUnitInput = document.getElementById('primaryUnit');
        const primaryUnitDisplay = document.getElementById('primaryUnitInputDisplay');
        const primaryUnitIcon = document.getElementById('primaryUnitIcon');
        const primaryUnitDropdown = document.getElementById('primaryUnitDropdown');

        const secondaryUnitInput = document.getElementById('secondaryUnit');
        const secondaryUnitDisplay = document.getElementById('secondaryUnitInputDisplay');
        const secondaryUnitIcon = document.getElementById('secondaryUnitIcon');
        const secondaryUnitDropdown = document.getElementById('secondaryUnitDropdown');

        // Import dropdownModal dynamically to avoid circular dependencies
        import('../../../../modals/dropdown/dropdown-list.js').then(({ dropdownModal }) => {
            // Setup primary unit combobox
            console.log("🔧 Checking primary unit elements...");
            console.log("Primary unit input:", document.getElementById('primaryUnit'));
            console.log("Primary unit display:", document.getElementById('primaryUnitInputDisplay'));
            console.log("Primary unit icon:", document.getElementById('primaryUnitIcon'));
            console.log("Primary unit dropdown:", document.getElementById('primaryUnitDropdown'));

            if (primaryUnitInput && primaryUnitDisplay && primaryUnitIcon && primaryUnitDropdown) {
                console.log("✅ Setting up primary unit combobox");
                console.log("Primary unit display element:", primaryUnitDisplay);
                const dataManager = this; // Store reference to dataManager
                this.setupCombobox(
                    primaryUnitDisplay,
                    primaryUnitIcon,
                    primaryUnitDropdown,
                    primaryUnitInput,
                    () => {
                        console.log("Primary unit selected:", primaryUnitInput.value);
                        console.log("Primary unit display:", primaryUnitDisplay.value);
                        console.log("Units data available:", !!dataManager.allUnitsGlobal, "Length:", dataManager.allUnitsGlobal?.length);

                        // Auto-suggest secondary unit if none is selected
                        if (secondaryUnitInput && !secondaryUnitInput.value) {
                            const suggestedSecondaryUnit = dataManager.autoSuggestSecondaryUnit(primaryUnitInput.value);
                            console.log("Auto-suggest result for", primaryUnitInput.value, ":", suggestedSecondaryUnit);
                            if (suggestedSecondaryUnit) {
                                console.log("Auto-suggesting secondary unit:", suggestedSecondaryUnit);
                                secondaryUnitInput.value = suggestedSecondaryUnit;

                                // Update the display input and dropdown
                                const secondaryDisplay = document.getElementById('secondaryUnitInputDisplay');
                                const secondaryDropdown = document.getElementById('secondaryUnitDropdown');
                                const secondaryIcon = document.getElementById('secondaryUnitIcon');

                                if (secondaryDisplay && secondaryDropdown && secondaryIcon) {
                                    const suggestedUnitData = dataManager.getUnitByCode(suggestedSecondaryUnit);
                                    console.log("Suggested unit data for", suggestedSecondaryUnit, ":", suggestedUnitData);
                                    if (suggestedUnitData) {
                                        const displayValue = `${suggestedUnitData.title} (${suggestedUnitData.symbol})`;
                                        secondaryDisplay.value = displayValue;
                                        console.log("Updated secondary display to:", displayValue, "Element:", secondaryDisplay);
                                    } else {
                                        console.log("No unit data found for", suggestedSecondaryUnit);
                                    }

                                    // Trigger change event to show secondary unit section
                                    const secondaryToggle = document.getElementById('secondaryUnitToggle');
                                    if (secondaryToggle && !secondaryToggle.checked) {
                                        console.log("Triggering secondary toggle change");
                                        secondaryToggle.checked = true;
                                        secondaryToggle.dispatchEvent(new Event('change'));
                                    }

                                    // Auto-fill conversion
                                    setTimeout(() => {
                                        dataManager.autoFillConversion(primaryUnitInput.value, suggestedSecondaryUnit);
                                        // Update conversion display
                                        import('./item-form-manager.js').then(({ ItemFormManager }) => {
                                            ItemFormManager.updateConversionDisplay();
                                        });
                                    }, 100);
                                }
                            }
                        } else if (secondaryUnitInput && secondaryUnitInput.value) {
                            // If secondary unit is already selected, just update conversion
                            dataManager.autoFillConversion(primaryUnitInput.value, secondaryUnitInput.value);
                            // Update conversion display
                            import('./item-form-manager.js').then(({ ItemFormManager }) => {
                                ItemFormManager.updateConversionDisplay();
                            });
                        }
                    },
                    {
                        title: "Select Primary Unit",
                        data: this.allUnitsGlobal,
                        enableCreate: false,
                        multiSelect: false,
                    },
                    dropdownModal
                );
            }

            // Setup secondary unit combobox
            if (secondaryUnitInput && secondaryUnitDisplay && secondaryUnitIcon && secondaryUnitDropdown) {
                const dataManager = this; // Store reference to dataManager
                this.setupCombobox(
                    secondaryUnitDisplay,
                    secondaryUnitIcon,
                    secondaryUnitDropdown,
                    secondaryUnitInput,
                    () => {
                        console.log("Secondary unit selected:", secondaryUnitInput.value, "Primary:", primaryUnitInput.value);
                        console.log("Units data available:", !!dataManager.allUnitsGlobal, "Length:", dataManager.allUnitsGlobal?.length);

                        // Auto-fill conversion for common unit pairs
                        if (primaryUnitInput && primaryUnitInput.value) {
                            dataManager.autoFillConversion(primaryUnitInput.value, secondaryUnitInput.value);
                            // Update conversion display when secondary unit changes
                            import('./item-form-manager.js').then(({ ItemFormManager }) => {
                                ItemFormManager.updateConversionDisplay();
                            });
                        }
                    },
                    {
                        title: "Select Secondary Unit",
                        data: this.allUnitsGlobal,
                        enableCreate: false,
                        multiSelect: false,
                    },
                    dropdownModal
                );
            }

            console.log("Unit comboboxes setup completed with", this.allUnitsGlobal.length, "units");
        });
    }

    /**
     * Setup brand combobox
     */
    setupBrandCombobox() {
        const brandInput = document.getElementById("itemBrand");
        const brandDisplay = document.getElementById("brandInputDisplay");
        const brandIcon = document.getElementById("brandIcon");
        const brandDropdown = document.getElementById("brandDropdown");

        if (brandInput && brandDisplay && brandIcon && brandDropdown) {
            // Import dropdownModal dynamically to avoid circular dependencies
            import('../../../../modals/dropdown/dropdown-list.js').then(({ dropdownModal }) => {
                this.setupCombobox(
                    brandDisplay,
                    brandIcon,
                    brandDropdown,
                    brandInput,
                    () => {
                        console.log("Brand selected:", brandInput.value);
                    },
                    {
                        title: "Select Brand",
                        data: this.allBrandsGlobal,
                        enableCreate: false,
                        multiSelect: false,
                    },
                    dropdownModal
                );
                console.log("Brand combobox setup completed");
            });
        }
    }
}