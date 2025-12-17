// Instant Add Item Modal Manager
class InstantAddItemModal {
    constructor() {
        this.modal = null;
        this.qtyInput = null;
        this.subtotalEl = null;
        this.modalTotalEl = null;
        this.itemInput = null;
        this.autocompleteDropdown = null;
        this.unitSelect = null;
        this.purchasePriceInput = null;
        this.salePriceInput = null;
        this.descInput = null;

        // Global variables for loaded data
        this.inventoryItems = [];
        this.unitOptions = [];

        this.selectedIndex = -1;
        this.currentItem = null;
        this.currentEditIndex = -1;
        this.isInitialized = false;
        this.callbacks = {
            onItemAdded: null,
            onModalClose: null
        };

        // Bind methods
        this.openModal = this.openModal.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.updateSubtotal = this.updateSubtotal.bind(this);
        this.setDefaultsFromItem = this.setDefaultsFromItem.bind(this);
        this.showAutocomplete = this.showAutocomplete.bind(this);
        this.hideAutocomplete = this.hideAutocomplete.bind(this);
        this.addNewItem = this.addNewItem.bind(this);
        this.filterItems = this.filterItems.bind(this);
        this.updateSelection = this.updateSelection.bind(this);
        this.resetModalPosition = this.resetModalPosition.bind(this);
    }

    // Load data from local JSON files
    async loadLocalJson(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to load ' + url);
            return res.json();
        } catch (err) {
            console.error('Error loading', url, err);
            return [];
        }
    }

    async loadInventoryData() {
    try {
        const itemsData = await this.loadLocalJson('../../../../localstore/jsons/items.json');
        const unitsData = await this.loadLocalJson('../../../../localstore/jsons/units.json');

        // Process items data
        this.inventoryItems = Array.isArray(itemsData) ? itemsData.slice(0, 50).map(item => ({
            id: item.meta?.itemId || 'unknown',
            name: item.info?.name || 'Unknown Item',
            mrp: item.pricing?.mrp || 0,
            rate: item.pricing?.sellingPrice || 0,
            unit: this.getUnitCodeFromItem(item),
            description: item.info?.description || '',
            stock: item.inventory?.stock || 0,
            count: item.info?.attributes?.count || null
        })) : [];

        // Process units data
        this.unitOptions = [];
        if (Array.isArray(unitsData)) {
            unitsData.forEach((unitGroup) => {
                if (unitGroup.subunits) {
                    unitGroup.subunits.forEach((sub) => {
                        this.unitOptions.push({
                            code: sub.code,
                            label: sub.title || sub.symbol || sub.code,
                            isPopular: sub.isPopular || false
                        });
                    });
                }
            });
        }

        // Sort units: popular first, then alphabetically
        this.unitOptions.sort((a, b) => {
            if (a.isPopular && !b.isPopular) return -1;
            if (!a.isPopular && b.isPopular) return 1;
            return a.label.localeCompare(b.label);
        });

        // Populate unit dropdown
        this.populateUnitDropdown();

        console.log('Loaded', this.inventoryItems.length, 'items and', this.unitOptions.length, 'units');

    } catch (err) {
        console.error('Error loading data:', err);
        // Fallback data
        this.inventoryItems = [
            { id: 'fallback1', name: 'Sample Item 1', mrp: 10.00, rate: 10.00, unit: 'Pcs', description: 'Fallback item', stock: 10 }
        ];
        this.unitOptions = [
            { code: 'Pcs', label: 'Pieces', isPopular: true },
            { code: 'Kg', label: 'Kilogram', isPopular: true }
        ];
        this.populateUnitDropdown();
    }
}

    getUnitCodeFromItem(item) {
    // Try to find unit from various places in the item data
    if (item.meta?.links?.unitId) {
        // Could map unitId to code, but for now return default
        return 'Pcs';
    }
    if (item.info?.attributes?.unit) {
        return item.info.attributes.unit;
    }
    // Default unit
    return 'Pcs';
}

    populateUnitDropdown() {
        this.unitSelect.innerHTML = '<option value="">Select Primary Unit...</</option>';

        this.unitOptions.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.code;
            option.textContent = unit.label;
            this.unitSelect.appendChild(option);
        });
    }

    openModal() {
        if (this.modal) {
            this.modal.style.display = ''; // Reset display style
            this.modal.classList.add('active');
        }
    }

    closeModal() {
        const modal = document.getElementById('invoice-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none'; // Force hide immediately
            this.resetModalPosition();
        } else {
            // Fallback: try to find and hide the modal directly
            const modalElement = document.querySelector('.invoice-modal');
            if (modalElement) {
                modalElement.classList.remove('active');
                modalElement.style.display = 'none';
                this.resetModalPosition();
            }
        }

        if (this.callbacks.onModalClose) {
            this.callbacks.onModalClose();
        }

        // Clean up back button listener
        if (this.handleBackButton) {
            window.removeEventListener('popstate', this.handleBackButton);
            this.handleBackButton = null;
        }

        // Reset listeners setup flag so they can be reattached when reopened
        this.listenersSetup = false;
    }

    updateSubtotal() {
        const qty = Number(this.qtyInput.value) || 0;
        const salePrice = Number(this.salePriceInput.value) || 0;
        const subtotal = qty * salePrice;
        this.subtotalEl.textContent = '₹' + subtotal.toFixed(2);
        this.modalTotalEl.textContent = '₹' + subtotal.toFixed(2);
    }

    setDefaultsFromItem(item) {
        if (!item) return;

        this.currentItem = item;
        this.itemInput.value = item.name;
        this.purchasePriceInput.value = item.purchasePrice ? item.purchasePrice.toFixed(2) : '';
        this.salePriceInput.value = item.rate ? item.rate.toFixed(2) : '';
        this.unitSelect.value = item.unit || 'Pcs';
        this.descInput.value = item.description || '';
        this.qtyInput.value = 1;

        this.hideAutocomplete();
        this.updateSubtotal();
    }

    showAutocomplete(items, query) {
        if (items.length === 0 && query.trim() === '') {
            this.hideAutocomplete();
            return;
        }

        this.autocompleteDropdown.innerHTML = '';

        // Add existing items
        items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'autocomplete-item';
            itemDiv.onclick = () => this.setDefaultsFromItem(item);

            itemDiv.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${this.highlightMatch(item.name, query)}</div>
                    <div class="item-details">Cost Price: ₹${item.mrp || 0}, Sale Price: ₹${item.rate || 0}</div>
                </div>
            `;

            this.autocompleteDropdown.appendChild(itemDiv);
        });

        // Add "Add New Item" option if query exists
        if (query.trim() !== '') {
            const addNewDiv = document.createElement('div');
            addNewDiv.className = 'autocomplete-item add-new-item';
            addNewDiv.onclick = () => this.addNewItem(query.trim());

            addNewDiv.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${query}</div>
                    <div class="item-details">Add as new item</div>
                </div>
            `;

            this.autocompleteDropdown.appendChild(addNewDiv);
        }

        this.autocompleteDropdown.style.display = 'block';
        this.selectedIndex = -1;
    }

    hideAutocomplete() {
        if (this.autocompleteDropdown) {
            this.autocompleteDropdown.style.display = 'none';
            this.selectedIndex = -1;
        }
    }

    highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    addNewItem(name) {
        const newItem = {
            id: 'new_' + Date.now(),
            name: name,
            purchasePrice: 0,
            rate: 0,
            unit: 'Pcs',
            description: '',
            stock: 0,
            isNew: true
        };

        this.currentItem = newItem;
        this.itemInput.value = name;
        this.purchasePriceInput.value = '';
        this.salePriceInput.value = '';
        this.unitSelect.value = 'Pcs';
        this.descInput.value = '';
        this.qtyInput.value = 1;

        this.hideAutocomplete();
        this.updateSubtotal();

        // Focus on sale price input for new items
        setTimeout(() => this.salePriceInput.focus(), 100);
    }

    filterItems(query) {
        if (!query) return [];

        return this.inventoryItems.filter(item =>
            item.name.toLowerCase().includes(query.toLowerCase())
        ).sort((a, b) => {
            // Prioritize items that start with the query
            const aStarts = a.name.toLowerCase().startsWith(query.toLowerCase());
            const bStarts = b.name.toLowerCase().startsWith(query.toLowerCase());
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    setupEventListeners() {
        if (!this.modal || !this.itemInput) {
            return;
        }

        // Only setup listeners once
        if (this.listenersSetup) {
            return;
        }
        this.listenersSetup = true;

        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Close modal when clicking the close button
        const closeBtn = document.querySelector('.modal-close-btn');
        if (closeBtn) {
            // Test if button is clickable
            closeBtn.addEventListener('mousedown', () => console.log('Close button mousedown'));
            closeBtn.addEventListener('mouseup', () => console.log('Close button mouseup'));

            // Remove any existing listeners to avoid duplicates
            if (this.closeModalHandler) {
                closeBtn.removeEventListener('click', this.closeModalHandler);
            }
            // Create a bound handler
            this.closeModalHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation(); // Prevent other listeners on the same element
                this.closeModal();
            };
            closeBtn.addEventListener('click', this.closeModalHandler);
        }

        // Update subtotal on input change
        this.qtyInput.addEventListener('input', this.updateSubtotal);
        this.salePriceInput.addEventListener('input', this.updateSubtotal);

        // Handle item input autocomplete
        this.itemInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            const filteredItems = this.filterItems(query);
            this.showAutocomplete(filteredItems, query);
        });

        this.itemInput.addEventListener('focus', () => {
            const query = this.itemInput.value.trim();
            const filteredItems = this.filterItems(query);
            if (filteredItems.length > 0 || query !== '') {
                this.showAutocomplete(filteredItems, query);
            }
        });

        this.itemInput.addEventListener('keydown', (e) => {
            const items = this.autocompleteDropdown.children;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
                    this.updateSelection();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                    this.updateSelection();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                        items[this.selectedIndex].click();
                    } else if (this.itemInput.value.trim() !== '') {
                        this.addNewItem(this.itemInput.value.trim());
                    }
                    break;
                case 'Escape':
                    this.hideAutocomplete();
                    break;
            }
        });

        // Hide autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (this.itemInput && this.autocompleteDropdown &&
                !this.itemInput.contains(e.target) && !this.autocompleteDropdown.contains(e.target)) {
                this.hideAutocomplete();
            }
        });
    }

    updateSelection() {
        if (!this.autocompleteDropdown) return;
        const items = this.autocompleteDropdown.children;
        for (let i = 0; i < items.length; i++) {
            items[i].classList.toggle('selected', i === this.selectedIndex);
        }
    }

    setupSaveButtons() {
        const saveItemBtn = document.getElementById('invoice-save-item');
        const saveNewBtn = document.getElementById('invoice-save-new');

        if (saveItemBtn) {
            saveItemBtn.addEventListener('click', () => {
                const itemData = {
                    id: this.currentItem?.id || 'custom_' + Date.now(),
                    name: this.itemInput.value || 'Custom Item',
                    qty: Number(this.qtyInput.value) || 1,
                    unit: this.unitSelect.value || 'Pcs',
                    unitLabel: this.unitSelect.options[this.unitSelect.selectedIndex]?.text || 'Pcs',
                    mrp: Number(this.purchasePriceInput.value) || 0,
                    purchasePrice: Number(this.purchasePriceInput.value) || 0,
                    rate: Number(this.salePriceInput.value) || 0,
                    salePrice: Number(this.salePriceInput.value) || 0,
                    count: null,
                    description: this.descInput.value || '',
                    desc: this.descInput.value || '',
                    editIndex: this.currentEditIndex // Pass edit index for updating existing items
                };

                // Call callback if provided, otherwise dispatch event
                if (this.callbacks.onItemAdded) {
                    this.callbacks.onItemAdded(itemData);
                } else {
                    document.dispatchEvent(new CustomEvent('itemAdded', { detail: itemData }));
                }

                this.closeModal();
            });
        }

        if (saveNewBtn) {
            saveNewBtn.addEventListener('click', () => {
                const itemData = {
                    id: this.currentItem?.id || 'custom_' + Date.now(),
                    name: this.itemInput.value || 'Custom Item',
                    qty: Number(this.qtyInput.value) || 1,
                    unit: this.unitSelect.value || 'Pcs',
                    unitLabel: this.unitSelect.options[this.unitSelect.selectedIndex]?.text || 'Pcs',
                    mrp: Number(this.purchasePriceInput.value) || 0,
                    purchasePrice: Number(this.purchasePriceInput.value) || 0,
                    rate: Number(this.salePriceInput.value) || 0,
                    salePrice: Number(this.salePriceInput.value) || 0,
                    count: null,
                    description: this.descInput.value || '',
                    desc: this.descInput.value || '',
                    editIndex: this.currentEditIndex // Pass edit index for updating existing items
                };

                // Call callback if provided, otherwise dispatch event
                if (this.callbacks.onItemAdded) {
                    this.callbacks.onItemAdded(itemData);
                } else {
                    document.dispatchEvent(new CustomEvent('itemAdded', { detail: itemData }));
                }

                // Only reset form and keep modal open if not in edit mode
                if (this.currentEditIndex === -1) {
                    // Reset form but keep modal open
                    this.currentItem = null;
                    this.itemInput.value = '';
                    this.qtyInput.value = 1;
                    this.purchasePriceInput.value = '';
                    this.salePriceInput.value = '';
                    this.descInput.value = '';
                    this.updateSubtotal();
                    this.itemInput.focus();
                } else {
                    // In edit mode, just close the modal after saving
                    this.closeModal();
                }
            });
        }
    }

    setupDragFunctionality() {
        if (!this.modal) return;

        let dragStartY = 0;
        let dragCurrentY = 0;
        let isDragging = false;
        const dragThreshold = 100; // Minimum drag distance to close modal

        const dragHandle = document.getElementById('modal-drag-handle');
        const modalSheet = document.querySelector('.invoice-modal-sheet');

        if (!dragHandle || !modalSheet) return;

        const startDrag = (clientY) => {
            isDragging = true;
            dragStartY = clientY;
            dragHandle.classList.add('dragging');
            modalSheet.style.transition = 'none';
        };

        const drag = (clientY) => {
            if (!isDragging) return;

            dragCurrentY = clientY;
            const dragDistance = dragCurrentY - dragStartY;

            if (dragDistance > 0) { // Only allow downward drag
                const translateY = Math.min(dragDistance, 200); // Limit max translation
                modalSheet.style.transform = `translateY(${translateY}px)`;
                modalSheet.style.opacity = Math.max(0.7, 1 - (translateY / 200));
            }
        };

        const endDrag = () => {
            if (!isDragging) return;

            isDragging = false;
            dragHandle.classList.remove('dragging');
            modalSheet.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';

            const dragDistance = dragCurrentY - dragStartY;

            if (dragDistance > dragThreshold) {
                // Close modal with animation
                modalSheet.style.transform = 'translateY(100%)';
                modalSheet.style.opacity = '0';
                setTimeout(() => {
                    this.closeModal();
                    this.resetModalPosition();
                }, 300);
            } else {
                // Snap back to original position
                this.resetModalPosition();
            }
        };

        // Mouse events
        dragHandle.addEventListener('mousedown', (e) => {
            startDrag(e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            drag(e.clientY);
        });

        document.addEventListener('mouseup', () => {
            endDrag();
        });

        // Touch events
        dragHandle.addEventListener('touchstart', (e) => {
            startDrag(e.touches[0].clientY);
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            drag(e.touches[0].clientY);
        }, { passive: false });

        document.addEventListener('touchend', () => {
            endDrag();
        });
    }

    resetModalPosition() {
        const modalSheet = document.querySelector('.invoice-modal-sheet');
        if (modalSheet) {
            modalSheet.style.transform = '';
            modalSheet.style.opacity = '';
        }
    }

    setEditMode(editItem) {
        this.currentItem = editItem;
        this.itemInput.value = editItem.name || '';
        this.qtyInput.value = editItem.qty || 1;
        this.unitSelect.value = editItem.unit || 'Pcs';
        this.purchasePriceInput.value = editItem.mrp ? editItem.mrp.toFixed(2) : '';
        this.salePriceInput.value = editItem.rate ? editItem.rate.toFixed(2) : '';
        this.descInput.value = editItem.desc || editItem.description || '';
        this.updateSubtotal();
    }

    resetForm() {
        this.currentItem = null;
        if (this.itemInput) this.itemInput.value = '';
        if (this.qtyInput) this.qtyInput.value = 1;
        if (this.unitSelect) this.unitSelect.value = 'Pcs';
        if (this.purchasePriceInput) this.purchasePriceInput.value = '';
        if (this.salePriceInput) this.salePriceInput.value = '';
        if (this.descInput) this.descInput.value = '';
        this.updateSubtotal();
    }

    async initialize() {
        if (this.isInitialized) return;

        // Get modal elements
        this.modal = document.getElementById('invoice-modal');
        this.qtyInput = document.getElementById('invoice-qty');
        this.subtotalEl = document.getElementById('invoice-modal-subtotal');
        this.modalTotalEl = document.getElementById('invoice-modal-total');
        this.itemInput = document.getElementById('invoice-item-input');
        this.autocompleteDropdown = document.getElementById('autocomplete-dropdown');
        this.unitSelect = document.getElementById('invoice-unit');
        this.purchasePriceInput = document.getElementById('invoice-purchase-price');
        this.salePriceInput = document.getElementById('invoice-sale-price');
        this.descInput = document.getElementById('invoice-desc');

        // Load data
        await this.loadInventoryData();
        this.updateSubtotal();

        // Setup event listeners
        this.setupEventListeners();
        this.setupSaveButtons();
        this.setupDragFunctionality();

        this.isInitialized = true;
    }

    // Public methods for global access
    async show(options = {}, isEdit = false, editItem = null, editIndex = -1) {
        // Check if modal exists in DOM
        const modalExists = document.getElementById('invoice-modal');

        if (!modalExists) {
            // Reset initialization state so it will reload
            this.isInitialized = false;
            this.listenersSetup = false;
        }

        if (!this.isInitialized) {
            await this.initialize();
        } else {
            // Re-check modal elements in case they were lost
            this.modal = document.getElementById('invoice-modal');
            this.itemInput = document.getElementById('invoice-item-input');

            // Re-setup event listeners if elements exist but listeners might be lost
            if (this.modal && this.itemInput && !this.listenersSetup) {
                this.setupEventListeners();
            }
        }

        // Set callbacks if provided
        if (options.onItemAdded) {
            this.callbacks.onItemAdded = options.onItemAdded;
        }
        if (options.onModalClose) {
            this.callbacks.onModalClose = options.onModalClose;
        }

        // Handle edit mode
        if (isEdit && editItem) {
            this.currentEditIndex = editIndex;
            this.setEditMode(editItem);
            // Update modal title
            const titleEl = document.querySelector('.modal-title');
            if (titleEl) {
                titleEl.textContent = 'Edit Item in Sale';
            }
        } else {
            this.currentEditIndex = -1;
            this.resetForm();
            // Reset modal title
            const titleEl = document.querySelector('.modal-title');
            if (titleEl) {
                titleEl.textContent = 'Add Item to Sale';
            }
        }

        // Make sure event listeners are set up
        this.setupEventListeners();

        this.openModal();

        // Set up back button listener
        if (!this.handleBackButton) {
            this.handleBackButton = (e) => {
                if (this.modal && this.modal.classList.contains('active')) {
                    e.preventDefault();
                    this.closeModal();
                }
            };
            window.addEventListener('popstate', this.handleBackButton);
        }
        setTimeout(() => {
            if (this.itemInput && !isEdit) {
                this.itemInput.focus();
            } else if (this.qtyInput && isEdit) {
                this.qtyInput.focus();
            }
        }, 100);
    }

    hide() {
        this.closeModal();
    }

    // Reset callbacks
    resetCallbacks() {
        this.callbacks = {
            onItemAdded: null,
            onModalClose: null
        };
    }
}

// Global instance
if (typeof window.instantAddItemModal === 'undefined') {
    window.instantAddItemModal = new InstantAddItemModal();
}

// Backward compatibility - expose old function
if (typeof window.instantAddItemInit === 'undefined') {
    window.instantAddItemInit = async function(isEdit = false, editItem = null, editIndex = -1) {
        await window.instantAddItemModal.initialize();
        window.instantAddItemModal.show(isEdit, editItem, editIndex);
    };
}

// Global close modal function for HTML onclick handlers
if (typeof window.closeModal === 'undefined') {
    window.closeModal = function() {
        if (window.instantAddItemModal) {
            window.instantAddItemModal.closeModal();
        } else {
            // Fallback: directly hide the modal
            const modal = document.getElementById('invoice-modal');
            if (modal) {
                modal.classList.remove('active');
            }
        }
    };
}

// Function to load and show the modal
export async function loadInstantAddItemModal(isEdit = false, editItem = null, editIndex = -1) {
    try {
        // Check if modal is already loaded
        if (document.getElementById('invoice-modal')) {
            // If already exists, just trigger it
            if (window.instantAddItemInit) {
                window.instantAddItemInit(isEdit, editItem, editIndex);
                return;
            }
        }

        // Check if script is already loaded
        const existingScript = document.querySelector('script[data-instant-add-item]');
        if (existingScript && window.InstantAddItemModal) {
            // Script is already loaded, just initialize
            if (window.instantAddItemInit) {
                window.instantAddItemInit(isEdit, editItem, editIndex);
                return;
            }
        }

        // Load the HTML content
        const response = await fetch('/source/modules/merchant/invoices/instant-add-item.html');
        if (!response.ok) {
            throw new Error('Failed to load instant-add-item modal');
        }

        const htmlContent = await response.text();

        // Create a temporary container to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // Extract the modal and styles
        const modalElement = tempDiv.querySelector('#invoice-modal');
        const styleElement = tempDiv.querySelector('style');

        if (modalElement) {
            // Add modal to the page
            document.body.appendChild(modalElement);

            // Add styles to head if they exist
            if (styleElement) {
                document.head.appendChild(styleElement);
            }

            // Script is already loaded via ES6 import, just initialize the modal
            setTimeout(() => {
                if (window.instantAddItemInit) {
                    window.instantAddItemInit(isEdit, editItem, editIndex);
                }
            }, 100);
        }
    } catch (error) {
        console.error('Error loading instant add item modal:', error);
        // Show error message to user
        alert('Unable to load the add item modal. Please try again or refresh the page.');
    }
}

// Auto-initialize if modal exists on page (for direct usage)
if (typeof window.instantAddItemModalInitialized === 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('invoice-modal')) {
            if (typeof window.instantAddItemModal !== 'undefined') {
                window.instantAddItemModal.initialize();
            }
        }
    });
    window.instantAddItemModalInitialized = true;
}