/**
 * UI Components for Instant Add Item Modal
 * Handles rendering, event management, and UI interactions
 */

export class InstantAddItemUIComponents {
    constructor(modalInstance) {
        this.modal = modalInstance;
    }

    // Unit dropdown functionality
    populateUnitDropdown() {
        // Convert the select to a combobox-style input
        if (!this.modal.unitSelect.classList.contains('unit-combobox')) {
            this.convertSelectToCombobox();
        }

        // Populate the dropdown with grouped units
        this.renderUnitDropdown();
    }

    convertSelectToCombobox() {
        // Get the container for the unit select
        const unitContainer = this.modal.unitSelect.parentElement;

        // Store original select reference
        const originalSelect = this.modal.unitSelect;

        // Create new input element to replace select completely
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.className = 'instant-add-item-unit-combobox';
        inputElement.placeholder = 'Select Primary Unit';
        inputElement.id = originalSelect.id;
        inputElement.readOnly = true; // Make it read-only for traditional dropdown behavior

        // Replace select with input
        unitContainer.replaceChild(inputElement, originalSelect);

        // Remove original select completely from DOM
        if (originalSelect.parentNode) {
            originalSelect.parentNode.removeChild(originalSelect);
        }

        // Update reference
        this.modal.unitSelect = inputElement;

        // Create custom dropdown container
        this.modal.customUnitDropdown = document.createElement('div');
        this.modal.customUnitDropdown.className = 'instant-add-item-custom-unit-dropdown';
        this.modal.customUnitDropdown.innerHTML = `
            <div class="instant-add-item-unit-dropdown-menu" style="display: none;">
                <div class="instant-add-item-unit-groups"></div>
            </div>
        `;

        // Insert after the input
        unitContainer.appendChild(this.modal.customUnitDropdown);

        // Get reference to the dropdown menu
        this.modal.unitGroupsContainer = this.modal.customUnitDropdown.querySelector('.instant-add-item-unit-groups');

        // Setup event listeners for the input element
        this.setupComboboxEvents();
    }

    setupComboboxEvents() {
        const dropdownMenu = this.modal.customUnitDropdown.querySelector('.instant-add-item-unit-dropdown-menu');

        // Handle focus to show dropdown for selection
        this.modal.unitSelect.addEventListener('focus', () => {
            // Show dropdown on focus for selection, but don't filter since input is read-only
            if (dropdownMenu.style.display === 'none') {
                dropdownMenu.style.display = 'block';
                // Don't filter - just show all units for selection
            }
        });

        // Handle blur to validate input and close dropdown
        this.modal.unitSelect.addEventListener('blur', () => {
            // Delay to allow click on dropdown items and icon clicks
            setTimeout(() => {
                // Check if we're clicking on dropdown items or if dropdown is still meant to be open
                const activeElement = document.activeElement;
                const isClickingDropdownItem = activeElement && (
                    this.modal.customUnitDropdown.contains(activeElement) ||
                    activeElement.closest('.instant-add-item-unit-dropdown-menu') ||
                    activeElement.closest('.instant-add-item-unit-item')
                );

                // Also check if user just clicked the input itself (prevent false blur closes)
                const justClickedInput = activeElement === this.modal.unitSelect;

                // Don't close if user just intentionally clicked
                if (this.modal.userIntentionalClick) {
                    return;
                }

                if (!isClickingDropdownItem && !justClickedInput) {
                    const currentValue = this.modal.unitSelect.value;
                    const validUnit = this.modal.unitOptions.find(u => u.label === currentValue);

                    if (!validUnit && currentValue.trim() !== '') {
                        // Reset to current selected unit
                        const currentSelected = this.modal.unitOptions.find(u => u.code === this.modal.selectedUnitCode);
                        if (currentSelected) {
                            this.modal.unitSelect.value = currentSelected.label;
                        } else {
                            this.modal.unitSelect.value = '';
                            this.modal.selectedUnitCode = '';
                        }
                    }

                    dropdownMenu.style.display = 'none';
                } else {
                }
            }, 300); // Increased delay to prevent premature closes
        });

        // Handle keydown for navigation
        this.modal.unitSelect.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Select first visible item if dropdown is open
                if (dropdownMenu.style.display !== 'none') {
                    const firstVisibleItem = this.modal.unitGroupsContainer.querySelector('.instant-add-item-unit-item:not([style*="display: none"])');
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
                this.filterUnits(this.modal.unitSelect.value);
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            // Don't close if clicking on the input or dropdown elements
            const clickedOnInput = e.target === this.modal.unitSelect;
            const clickedOnDropdown = this.modal.customUnitDropdown.contains(e.target);

            if (!clickedOnInput && !clickedOnDropdown) {
                dropdownMenu.style.display = 'none';
            }
        });

        // Handle input click to show dropdown for selection
        this.modal.unitSelect.addEventListener('click', (e) => {
            // Check if click is on the dropdown icon area (right side)
            const rect = e.target.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const isIconClick = clickX > rect.width - 25; // Icon area: rightmost 25px


            // Set flag that user intentionally clicked
            this.modal.userIntentionalClick = true;

            // Clear the flag after a short delay
            setTimeout(() => {
                this.modal.userIntentionalClick = false;
            }, 100);

            // Prevent event bubbling to avoid document click conflicts
            e.stopPropagation();

            // Traditional dropdown behavior: only icon click toggles dropdown
            if (isIconClick) {
                if (dropdownMenu.style.display === 'none') {
                    // Position dropdown below input (relative to modal)
                    const rect = this.modal.unitSelect.getBoundingClientRect();
                    const modalRect = this.modal.modal.getBoundingClientRect();

                    dropdownMenu.style.position = 'fixed';
                    dropdownMenu.style.top = (rect.bottom - modalRect.top + this.modal.modal.scrollTop + 5) + 'px';
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
        if (!this.modal.unitGroupsContainer) {
            return;
        }

        this.modal.unitGroupsContainer.innerHTML = '';

        // Sort groups by number of popular units (descending)
        const sortedGroupTypes = Object.keys(this.modal.groupedUnits).sort((a, b) => {
            const aPopularCount = this.modal.groupedUnits[a].filter(unit => unit.isPopular).length;
            const bPopularCount = this.modal.groupedUnits[b].filter(unit => unit.isPopular).length;
            return bPopularCount - aPopularCount; // Descending order
        });

        sortedGroupTypes.forEach(groupType => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'instant-add-item-unit-group';

            const groupTitle = document.createElement('div');
            groupTitle.className = 'instant-add-item-unit-group-title';
            groupTitle.textContent = this.modal.capitalizeFirst(groupType);

            const groupItems = document.createElement('div');
            groupItems.className = 'instant-add-item-unit-group-items';

            this.modal.groupedUnits[groupType].forEach(unit => {
                const unitItem = document.createElement('div');
                unitItem.className = 'instant-add-item-unit-item';
                unitItem.dataset.code = unit.code;
                unitItem.innerHTML = `
                    <span class="instant-add-item-unit-title">${unit.title} (${unit.code})</span>
                    ${unit.isPopular ? '<span class="instant-add-item-popular-star">★</span>' : ''}
                `;

                unitItem.addEventListener('click', () => {
                    this.selectUnit(unit);
                });

                groupItems.appendChild(unitItem);
            });

            groupDiv.appendChild(groupTitle);
            groupDiv.appendChild(groupItems);
            this.modal.unitGroupsContainer.appendChild(groupDiv);
        });
    }

    filterUnits(query) {
        // Since search box is removed, always show all units
        const groups = this.modal.unitGroupsContainer.querySelectorAll('.instant-add-item-unit-group');

        groups.forEach(group => {
            const items = group.querySelectorAll('.instant-add-item-unit-item');

            items.forEach(item => {
                item.style.display = 'flex'; // Show all items
            });

            // Always show groups since all items are visible
            group.style.display = 'block';
        });
    }

    selectUnit(unit) {
        // Update the selected unit code for form submission
        this.modal.selectedUnitCode = unit.code;
        // Update the input display value
        this.modal.unitSelect.value = unit.label;

        // Hide dropdown
        this.modal.customUnitDropdown.querySelector('.unit-dropdown-menu').style.display = 'none';

        // Update subtotal if needed
        this.updateSubtotal();
    }

    setUnitValue(unitCode) {
        // Update the selected unit code
        this.modal.selectedUnitCode = unitCode;

        // Update the input display value
        const unit = this.modal.unitOptions.find(u => u.code === unitCode);
        if (unit) {
            this.modal.unitSelect.value = unit.label;
        } else if (unitCode) {
            this.modal.unitSelect.value = unitCode;
        } else {
            this.modal.unitSelect.value = '';
        }
    }

    closeDropdown() {
        const dropdownMenu = this.modal.customUnitDropdown?.querySelector('.unit-dropdown-menu');
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
        this.modal.currentSearchQuery = '';
        this.filterUnits(''); // Empty query shows all units
    }

    // Form management methods
    updateSubtotal() {
        const qty = Number(this.modal.qtyInput.value) || 0;
        const salePrice = Number(this.modal.salePriceInput.value) || 0;
        const subtotal = qty * salePrice;
        this.modal.subtotalEl.textContent = '₹' + subtotal.toFixed(2);
        this.modal.modalTotalEl.textContent = '₹' + subtotal.toFixed(2);
    }

    setDefaultsFromItem(item) {
        if (!item) return;

        this.modal.currentItem = item;
        this.modal.itemInput.value = item.name;
        this.modal.purchasePriceInput.value = item.purchasePrice ? item.purchasePrice.toFixed(2) : '';
        this.modal.salePriceInput.value = item.rate ? item.rate.toFixed(2) : '';
        this.setUnitValue(item.unit || 'Pcs');
        this.modal.descInput.value = item.description || '';
        this.modal.qtyInput.value = 1;

        this.hideAutocomplete();
        this.updateSubtotal();
    }

    // Autocomplete functionality
    showAutocomplete(items, query) {
        if (items.length === 0 && query.trim() === '') {
            this.hideAutocomplete();
            return;
        }

        this.modal.autocompleteDropdown.innerHTML = '';

        // Add existing items
        items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'instant-add-item-autocomplete-item';
            itemDiv.onclick = () => this.setDefaultsFromItem(item);

            itemDiv.innerHTML = `
                <div class="instant-add-item-item-info">
                    <div class="instant-add-item-item-name">${this.highlightMatch(item.name, query)}</div>
                    <div class="instant-add-item-item-details">Cost Price: ₹${item.mrp || 0}, Sale Price: ₹${item.rate || 0}</div>
                </div>
            `;

            this.modal.autocompleteDropdown.appendChild(itemDiv);
        });

        // Add "Add New Item" option if query exists
        if (query.trim() !== '') {
            const addNewDiv = document.createElement('div');
            addNewDiv.className = 'instant-add-item-autocomplete-item instant-add-item-add-new-item';
            addNewDiv.onclick = () => this.addNewItem(query.trim());

            addNewDiv.innerHTML = `
                <div class="instant-add-item-item-info">
                    <div class="instant-add-item-item-name">${query}</div>
                    <div class="instant-add-item-item-details">Add as new item</div>
                </div>
            `;

            this.modal.autocompleteDropdown.appendChild(addNewDiv);
        }

        this.modal.autocompleteDropdown.style.display = 'block';
        this.modal.selectedIndex = -1;
    }

    hideAutocomplete() {
        if (this.modal.autocompleteDropdown) {
            this.modal.autocompleteDropdown.style.display = 'none';
            this.modal.selectedIndex = -1;
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

        this.modal.currentItem = newItem;
        this.modal.itemInput.value = name;
        this.modal.purchasePriceInput.value = '';
        this.modal.salePriceInput.value = '';
        this.setUnitValue('Pcs');
        this.modal.descInput.value = '';
        this.modal.qtyInput.value = 1;

        this.hideAutocomplete();
        this.updateSubtotal();

        // Focus on sale price input for new items
        setTimeout(() => this.modal.salePriceInput.focus(), 100);
    }

    filterItems(query) {
        if (!query) return [];

        return this.modal.inventoryItems.filter(item =>
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

    updateSelection() {
        if (!this.modal.autocompleteDropdown) return;
        const items = this.modal.autocompleteDropdown.children;
        for (let i = 0; i < items.length; i++) {
            items[i].classList.toggle('selected', i === this.modal.selectedIndex);
        }
    }

    // Modal functionality
    openModal() {
        if (this.modal.modal) {
            this.modal.modal.style.display = ''; // Reset display style
            this.modal.modal.classList.add('active');
            // Lock background scroll
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100vh';
        }
    }

    closeModal() {
        const modal = document.getElementById('instant-add-item-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none'; // Force hide immediately
            this.resetModalPosition();
        } else {
            // Fallback: try to find and hide the modal directly
            const modalElement = document.querySelector('.instant-add-item-modal');
            if (modalElement) {
                modalElement.classList.remove('active');
                modalElement.style.display = 'none';
                this.resetModalPosition();
            }
        }

        // Restore background scroll
        document.body.style.overflow = '';
        document.body.style.height = '';

        if (this.modal.callbacks.onModalClose) {
            this.modal.callbacks.onModalClose();
        }

        // Clean up back button listeners
        if (this.modal.handleBackButton) {
            window.removeEventListener('popstate', this.modal.handleBackButton);
            this.modal.handleBackButton = null;
        }
        if (this.modal.handleVisibilityChange) {
            document.removeEventListener('visibilitychange', this.modal.handleVisibilityChange);
            this.modal.handleVisibilityChange = null;
        }
        if (this.modal.handlePageHide) {
            window.removeEventListener('pagehide', this.modal.handlePageHide);
            this.modal.handlePageHide = null;
        }

        // Reset listeners setup flag so they can be reattached when reopened
        this.modal.listenersSetup = false;
    }

    resetModalPosition() {
        const modalSheet = document.querySelector('.instant-add-item-modal-sheet');
        if (modalSheet) {
            modalSheet.style.transform = '';
            modalSheet.style.opacity = '';
        }
    }

    setEditMode(editItem) {
        this.modal.currentItem = editItem;
        this.modal.itemInput.value = editItem.name || '';
        this.modal.qtyInput.value = editItem.qty || 1;
        this.setUnitValue(editItem.unit || 'Pcs');
        this.modal.purchasePriceInput.value = editItem.mrp ? editItem.mrp.toFixed(2) : '';
        this.modal.salePriceInput.value = editItem.rate ? editItem.rate.toFixed(2) : '';
        this.modal.descInput.value = editItem.desc || editItem.description || '';
        this.updateSubtotal();
    }

    resetForm() {
        this.modal.currentItem = null;
        if (this.modal.itemInput) this.modal.itemInput.value = '';
        if (this.modal.qtyInput) this.modal.qtyInput.value = 1;
        if (this.modal.unitSelect) this.setUnitValue(''); // Leave empty to show placeholder
        if (this.modal.purchasePriceInput) this.modal.purchasePriceInput.value = '';
        if (this.modal.salePriceInput) this.modal.salePriceInput.value = '';
        if (this.modal.descInput) this.modal.descInput.value = '';
        this.updateSubtotal();
    }

    // Drag functionality
    setupDragFunctionality() {
        if (!this.modal.modal) return;

        let dragStartY = 0;
        let dragCurrentY = 0;
        let isDragging = false;
        const dragThreshold = 100; // Minimum drag distance to close modal

        const dragHandle = document.getElementById('modal-drag-handle');
        const modalSheet = document.querySelector('.instant-add-item-modal-sheet');

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
}

// Export factory function for easy instantiation
export function createInstantAddItemUIComponents(modalInstance) {
    return new InstantAddItemUIComponents(modalInstance);
}
