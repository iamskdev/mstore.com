// Instant Add Item Modal Manager
import { fetchAllItems, fetchAllUnits } from '../../../../utils/data-manager.js';
import { createInstantAddItemDBOperations } from './instant-db-operation.js';
import { createInstantAddItemUIComponents } from './instant-ui-component.js';

class InstantAddItemModal {
    constructor() {
        this.modal = null;
        this.qtyInput = null;
        this.subtotalEl = null;
        this.modalTotalEl = null;
        this.itemInput = null;
        this.autocompleteDropdown = null;
        this.unitSelect = null;
        this.unitInput = null; // The visible input element
        this.selectedUnitCode = ''; // Store the selected unit code for form submission
        this.customUnitDropdown = null;
        this.purchasePriceInput = null;
        this.salePriceInput = null;
        this.descInput = null;

        // Global variables for loaded data
        this.inventoryItems = [];
        this.unitOptions = [];
        this.groupedUnits = {}; // For grouped display

        this.selectedIndex = -1;
        this.currentItem = null;
        this.currentEditIndex = -1;
        this.isInitialized = false;
        this.userIntentionalClick = false; // Flag to track intentional clicks
        this.currentSearchQuery = ''; // Current search query
        this.callbacks = {
            onItemAdded: null,
            onModalClose: null
        };

        // Initialize components
        this.dbOperations = null;
        this.uiComponents = null;
    }



    convertSelectToCombobox() {
        // Get the container for the unit select
        const unitContainer = this.unitSelect.parentElement;

        // Store original select reference
        const originalSelect = this.unitSelect;

        // Create new input element to replace select completely
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.className = 'unit-combobox invoice-input';
        inputElement.placeholder = 'Select unit...';
        inputElement.id = originalSelect.id;
        inputElement.readOnly = true; // Make it read-only for traditional dropdown behavior

        // Replace select with input
        unitContainer.replaceChild(inputElement, originalSelect);

        // Remove original select completely from DOM
        if (originalSelect.parentNode) {
            originalSelect.parentNode.removeChild(originalSelect);
        }

        // Update reference
        this.unitSelect = inputElement;

        // Create custom dropdown container
        this.customUnitDropdown = document.createElement('div');
        this.customUnitDropdown.className = 'custom-unit-dropdown';
        this.customUnitDropdown.innerHTML = `
            <div class="unit-dropdown-menu" style="display: none;">
                <div class="unit-groups"></div>
            </div>
        `;

        // Insert after the input
        unitContainer.appendChild(this.customUnitDropdown);

        // Get reference to the dropdown menu
        this.unitGroupsContainer = this.customUnitDropdown.querySelector('.unit-groups');

        // Setup event listeners for the input element
        this.setupComboboxEvents();
    }

    setupComboboxEvents() {
        const dropdownMenu = this.customUnitDropdown.querySelector('.unit-dropdown-menu');

        // Handle input typing for filtering (disabled for traditional dropdown)
        // this.unitSelect.addEventListener('input', (e) => {
        //     // Disabled - input is read-only for traditional dropdown behavior
        // });

        // Handle focus to show dropdown for selection
        this.unitSelect.addEventListener('focus', () => {
            // Show dropdown on focus for selection, but don't filter since input is read-only
            if (dropdownMenu.style.display === 'none') {
                dropdownMenu.style.display = 'block';
                // Don't filter - just show all units for selection
            }
        });

        // Handle blur to validate input and close dropdown
        this.unitSelect.addEventListener('blur', () => {
            // Delay to allow click on dropdown items and icon clicks
            setTimeout(() => {
                // Check if we're clicking on dropdown items or if dropdown is still meant to be open
                const activeElement = document.activeElement;
                const isClickingDropdownItem = activeElement && (
                    this.customUnitDropdown.contains(activeElement) ||
                    activeElement.closest('.unit-dropdown-menu') ||
                    activeElement.closest('.unit-item')
                );

                // Also check if user just clicked the input itself (prevent false blur closes)
                const justClickedInput = activeElement === this.unitSelect;

                // Don't close if user just intentionally clicked
                if (this.userIntentionalClick) {
                    return;
                }

                if (!isClickingDropdownItem && !justClickedInput) {
                    const currentValue = this.unitSelect.value;
                    const validUnit = this.unitOptions.find(u => u.label === currentValue);

                    if (!validUnit && currentValue.trim() !== '') {
                        // Reset to current selected unit
                        const currentSelected = this.unitOptions.find(u => u.code === this.selectedUnitCode);
                        if (currentSelected) {
                            this.unitSelect.value = currentSelected.label;
                        } else {
                            this.unitSelect.value = '';
                            this.selectedUnitCode = '';
                        }
                    }

                    dropdownMenu.style.display = 'none';
                } else {
                }
            }, 300); // Increased delay to prevent premature closes
        });

        // Handle keydown for navigation
        this.unitSelect.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Select first visible item if dropdown is open
                if (dropdownMenu.style.display !== 'none') {
                    const firstVisibleItem = this.unitGroupsContainer.querySelector('.unit-item:not([style*="display: none"])');
                    if (firstVisibleItem) {
                        firstVisibleItem.click();
                    }
                }
            } else if (e.key === 'Escape') {
                dropdownMenu.style.display = 'none';
            } else if (e.key === 'ArrowDown' && dropdownMenu.style.display === 'none') {
                // Show dropdown on arrow down if not visible
                e.preventDefault();
                dropdownMenu.style.display = 'block';
                this.filterUnits(this.unitSelect.value);
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            // Don't close if clicking on the input or dropdown elements
            const clickedOnInput = e.target === this.unitSelect;
            const clickedOnDropdown = this.customUnitDropdown.contains(e.target);

            if (!clickedOnInput && !clickedOnDropdown) {
                dropdownMenu.style.display = 'none';
            }
        });

        // Handle input click to show dropdown for selection
        this.unitSelect.addEventListener('click', (e) => {
            // Check if click is on the dropdown icon area (right side)
            const rect = e.target.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const isIconClick = clickX > rect.width - 25; // Icon area: rightmost 25px


            // Set flag that user intentionally clicked
            this.userIntentionalClick = true;

            // Clear the flag after a short delay
            setTimeout(() => {
                this.userIntentionalClick = false;
            }, 100);

            // Prevent event bubbling to avoid document click conflicts
            e.stopPropagation();

            // Traditional dropdown behavior: only icon click toggles dropdown
            if (isIconClick) {
                if (dropdownMenu.style.display === 'none') {
                    // Position dropdown below input (relative to modal)
                    const rect = this.unitSelect.getBoundingClientRect();
                    const modalRect = this.modal.getBoundingClientRect();

                    dropdownMenu.style.position = 'fixed';
                    dropdownMenu.style.top = (rect.bottom - modalRect.top + this.modal.scrollTop + 5) + 'px';
                    dropdownMenu.style.left = (rect.left - modalRect.left + 2) + 'px';
                    dropdownMenu.style.width = rect.width + 'px';
                    dropdownMenu.style.display = 'block';
                    dropdownMenu.style.visibility = 'visible';
                    dropdownMenu.style.opacity = '1';
                    dropdownMenu.style.zIndex = '99999';

                    // Show all units (don't filter since input is read-only)
                    this.showAllUnits();
                } else {
                    this.closeDropdown();
                }
            }
            // No action for input area clicks in traditional dropdown
        });
    }

    renderUnitDropdown() {
        if (!this.unitGroupsContainer) {
            return;
        }

        this.unitGroupsContainer.innerHTML = '';

        // Reset search query since there's no search box
        this.currentSearchQuery = '';

        // Sort groups by number of popular units (descending)
        const sortedGroupTypes = Object.keys(this.groupedUnits).sort((a, b) => {
            const aPopularCount = this.groupedUnits[a].filter(unit => unit.isPopular).length;
            const bPopularCount = this.groupedUnits[b].filter(unit => unit.isPopular).length;
            return bPopularCount - aPopularCount; // Descending order
        });

        sortedGroupTypes.forEach(groupType => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'unit-group';

            const groupTitle = document.createElement('div');
            groupTitle.className = 'unit-group-title';
            groupTitle.textContent = this.capitalizeFirst(groupType);

            const groupItems = document.createElement('div');
            groupItems.className = 'unit-group-items';

            this.groupedUnits[groupType].forEach(unit => {
                const unitItem = document.createElement('div');
                unitItem.className = 'unit-item';
                unitItem.dataset.code = unit.code;
                unitItem.innerHTML = `
                    <span class="unit-title">${unit.title} (${unit.code})</span>
                    ${unit.isPopular ? '<span class="popular-star">★</span>' : ''}
                `;

                unitItem.addEventListener('click', () => {
                    this.selectUnit(unit);
                });

                groupItems.appendChild(unitItem);
            });

            groupDiv.appendChild(groupTitle);
            groupDiv.appendChild(groupItems);
            this.unitGroupsContainer.appendChild(groupDiv);
        });
    }

    filterUnits(query) {
        // Since search box is removed, always show all units
        const groups = this.unitGroupsContainer.querySelectorAll('.unit-group');

        groups.forEach(group => {
            const items = group.querySelectorAll('.unit-item');

            items.forEach(item => {
                item.style.display = 'flex'; // Show all items
            });

            // Always show groups since all items are visible
            group.style.display = 'block';
        });
    }

    selectUnit(unit) {
        // Update the selected unit code for form submission
        this.selectedUnitCode = unit.code;
        // Update the input display value
        this.unitSelect.value = unit.label;

        // Hide dropdown
        this.customUnitDropdown.querySelector('.unit-dropdown-menu').style.display = 'none';

        // Update subtotal if needed
        this.updateSubtotal();
    }

    setUnitValue(unitCode) {
        // Update the selected unit code
        this.selectedUnitCode = unitCode;

        // Update the input display value
        const unit = this.unitOptions.find(u => u.code === unitCode);
        if (unit) {
            this.unitSelect.value = unit.label;
        } else if (unitCode) {
            this.unitSelect.value = unitCode;
        } else {
            this.unitSelect.value = '';
        }
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    openModal() {
        if (this.modal) {
            this.modal.style.display = ''; // Reset display style
            this.modal.classList.add('active');
            // Lock background scroll
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100vh';
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

        // Restore background scroll
        document.body.style.overflow = '';
        document.body.style.height = '';

        if (this.callbacks.onModalClose) {
            this.callbacks.onModalClose();
        }

        // Clean up back button listeners
        if (this.handleBackButton) {
            window.removeEventListener('popstate', this.handleBackButton);
            this.handleBackButton = null;
        }
        if (this.handleVisibilityChange) {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
            this.handleVisibilityChange = null;
        }
        if (this.handlePageHide) {
            window.removeEventListener('pagehide', this.handlePageHide);
            this.handlePageHide = null;
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
        this.setUnitValue(item.unit || 'Pcs');
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
        this.setUnitValue('Pcs');
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

        // FIRST: Setup close button handler (capture phase to ensure it runs before modal handler)
        const closeBtn = document.querySelector('.modal-close-btn');
        if (closeBtn) {
            // Remove any existing listeners to avoid duplicates
            if (this.closeModalHandler) {
                closeBtn.removeEventListener('click', this.closeModalHandler, true);
            }
            // Create a bound handler - use capture phase
            this.closeModalHandler = (e) => {
                e.preventDefault();
                e.stopImmediatePropagation(); // Stop all other handlers
                this.closeModal();
            };
            closeBtn.addEventListener('click', this.closeModalHandler, true); // Capture phase
        } else {
        }

        // SECOND: Close modal when clicking outside (only if not clicking on close button)
        this.modal.addEventListener('click', (e) => {
            // Don't close if clicking on close button or its children
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Also handle touch events for mobile
        this.modal.addEventListener('touchend', (e) => {
            // Don't close if touching close button or its children
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

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
        this.setUnitValue(editItem.unit || 'Pcs');
        this.purchasePriceInput.value = editItem.mrp ? editItem.mrp.toFixed(2) : '';
        this.salePriceInput.value = editItem.rate ? editItem.rate.toFixed(2) : '';
        this.descInput.value = editItem.desc || editItem.description || '';
        this.updateSubtotal();
    }

    resetForm() {
        this.currentItem = null;
        if (this.itemInput) this.itemInput.value = '';
        if (this.qtyInput) this.qtyInput.value = 1;
        if (this.unitSelect) this.setUnitValue(''); // Leave empty to show placeholder
        if (this.purchasePriceInput) this.purchasePriceInput.value = '';
        if (this.salePriceInput) this.salePriceInput.value = '';
        if (this.descInput) this.descInput.value = '';
        this.updateSubtotal();
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

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

        // Initialize components
        this.dbOperations = createInstantAddItemDBOperations(this);
        this.uiComponents = createInstantAddItemUIComponents(this);

        // Load data
        const data = await this.dbOperations.loadInventoryData(fetchAllItems, fetchAllUnits);
        this.inventoryItems = data.inventoryItems;
        this.unitOptions = data.unitOptions;
        this.groupedUnits = data.groupedUnits;

        // Setup UI
        this.uiComponents.populateUnitDropdown();
        this.uiComponents.updateSubtotal();

        // Setup event listeners
        this.setupEventListeners();
        this.dbOperations.setupSaveButtons();
        this.uiComponents.setupDragFunctionality();

        this.isInitialized = true;
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

        // FIRST: Setup close button handler (capture phase to ensure it runs before modal handler)
        const closeBtn = document.querySelector('.modal-close-btn');
        if (closeBtn) {
            // Remove any existing listeners to avoid duplicates
            if (this.closeModalHandler) {
                closeBtn.removeEventListener('click', this.closeModalHandler, true);
            }
            // Create a bound handler - use capture phase
            this.closeModalHandler = (e) => {
                e.preventDefault();
                e.stopImmediatePropagation(); // Stop all other handlers
                this.uiComponents.closeModal();
            };
            closeBtn.addEventListener('click', this.closeModalHandler, true); // Capture phase
        }

        // SECOND: Close modal when clicking outside (only if not clicking on close button)
        this.modal.addEventListener('click', (e) => {
            // Don't close if clicking on close button or its children
            if (e.target === this.modal) {
                this.uiComponents.closeModal();
            }
        });

        // Also handle touch events for mobile
        this.modal.addEventListener('touchend', (e) => {
            // Don't close if touching close button or its children
            if (e.target === this.modal) {
                this.uiComponents.closeModal();
            }
        });

        // Update subtotal on input change
        this.qtyInput.addEventListener('input', () => this.uiComponents.updateSubtotal());
        this.salePriceInput.addEventListener('input', () => this.uiComponents.updateSubtotal());

        // Handle item input autocomplete
        this.itemInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            const filteredItems = this.uiComponents.filterItems(query);
            this.uiComponents.showAutocomplete(filteredItems, query);
        });

        this.itemInput.addEventListener('focus', () => {
            const query = this.itemInput.value.trim();
            const filteredItems = this.uiComponents.filterItems(query);
            if (filteredItems.length > 0 || query !== '') {
                this.uiComponents.showAutocomplete(filteredItems, query);
            }
        });

        this.itemInput.addEventListener('keydown', (e) => {
            const items = this.autocompleteDropdown.children;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
                    this.uiComponents.updateSelection();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                    this.uiComponents.updateSelection();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                        items[this.selectedIndex].click();
                    } else if (this.itemInput.value.trim() !== '') {
                        this.uiComponents.addNewItem(this.itemInput.value.trim());
                    }
                    break;
                case 'Escape':
                    this.uiComponents.hideAutocomplete();
                    break;
            }
        });

        // Hide autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (this.itemInput && this.autocompleteDropdown &&
                !this.itemInput.contains(e.target) && !this.autocompleteDropdown.contains(e.target)) {
                this.uiComponents.hideAutocomplete();
            }
        });
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
            this.uiComponents.setEditMode(editItem);
            // Update modal title
            const titleEl = document.querySelector('.modal-title');
            if (titleEl) {
                titleEl.textContent = 'Edit Item in Sale';
            }
        } else {
            this.currentEditIndex = -1;
            this.uiComponents.resetForm();
            // Reset modal title
            const titleEl = document.querySelector('.modal-title');
            if (titleEl) {
                titleEl.textContent = 'Add Item to Sale';
            }
        }

        // Make sure event listeners are set up
        this.setupEventListeners();

        this.uiComponents.openModal();

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

        // Additional mobile back button handling
        if (!this.handleVisibilityChange) {
            this.handleVisibilityChange = () => {
                if (document.visibilityState === 'hidden' && this.modal && this.modal.classList.contains('active')) {
                    this.closeModal();
                }
            };
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
        }

        if (!this.handlePageHide) {
            this.handlePageHide = () => {
                if (this.modal && this.modal.classList.contains('active')) {
                    this.closeModal();
                }
            };
            window.addEventListener('pagehide', this.handlePageHide);
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
        this.uiComponents.closeModal();
    }

    // Reset callbacks
    resetCallbacks() {
        this.callbacks = {
            onItemAdded: null,
            onModalClose: null
        };
    }

    closeDropdown() {
        const dropdownMenu = this.customUnitDropdown?.querySelector('.unit-dropdown-menu');
        if (dropdownMenu) {
            dropdownMenu.style.display = 'none';
            dropdownMenu.style.visibility = 'hidden';
            dropdownMenu.style.opacity = '0';
            // Reset position
            dropdownMenu.style.position = '';
            dropdownMenu.style.top = '';
            dropdownMenu.style.left = '';
            dropdownMenu.style.width = '';
            dropdownMenu.style.zIndex = '';
        }
    }

    showAllUnits() {
        // Reset search query and show all units
        this.currentSearchQuery = '';
        this.filterUnits(''); // Empty query shows all units
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
            // Restore background scroll in fallback
            document.body.style.overflow = '';
            document.body.style.height = '';
        }
    };
}

// Specific function for close button in instant-add-item modal
if (typeof window.closeInstantAddItemModal === 'undefined') {
    window.closeInstantAddItemModal = function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (window.instantAddItemModal) {
            window.instantAddItemModal.closeModal();
        } else {
            // Fallback: directly hide the modal
            const modal = document.getElementById('invoice-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
            // Restore background scroll in fallback
            document.body.style.overflow = '';
            document.body.style.height = '';
        }
    };
}

// Function to load and show the modal
export async function loadInstantAddItemModal(isEdit = false, editItem = null, editIndex = -1) {
    try {

        // Check if modal is already loaded
        let modalElement = document.getElementById('invoice-modal');
        if (modalElement) {
            // If already exists, just trigger it
            if (window.instantAddItemInit) {
                window.instantAddItemInit(isEdit, editItem, editIndex);
                return;
            }
        }

        // Load the HTML content
        const response = await fetch('./source/modules/merchant/invoices/instant-add-item.html');
        if (!response.ok) {
            throw new Error('Failed to load instant-add-item modal');
        }

        const htmlContent = await response.text();

        // Create a temporary container to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // Extract the modal and styles
        modalElement = tempDiv.querySelector('#invoice-modal');
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
                } else {
                    console.error('window.instantAddItemInit not found');
                }
            }, 100);
        } else {
            console.error('Modal element not found in HTML content');
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