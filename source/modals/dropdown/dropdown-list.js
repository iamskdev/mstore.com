/**
 * Reusable Dropdown Modal Component
 * Handles dropdown selection with search, multi-select, and create new functionality
 */
class DropdownModal {
    constructor() {
        // Initialize properties to null or empty arrays, not trying to get DOM elements here
        this.modal = null;
        this.titleElement = null;
        this.searchElement = null;
        this.listElement = null;
        this.closeButton = null;
        this.addNewButton = null;
        this.applyButton = null;
        this.footerElement = null;

        this.options = [];
        this.onSelectCallback = null;
        this.onAddNewCallback = null;
        this.filterText = '';
        this.isInitialized = false;
        this.multiSelect = false;
        this.selectedValues = new Set();
        this.enableCreate = false;
        this.enableGrouping = false;
        this.collapsedGroups = new Set(); // Track collapsed groups
        this.isModalOpen = false; // Track modal state for back navigation
    }

    /**
     * Initialize DOM elements and attach event listeners
     */
    _initializeDomElements() {
        if (this.isInitialized) return; // Only run once

        this.modal = document.getElementById('dropdownModal');
        this.titleElement = document.getElementById('dropdownModalTitle');
        this.searchElement = document.getElementById('dropdownModalSearch');
        this.listElement = document.getElementById('dropdownModalList');
        this.closeButton = document.getElementById('dropdownModalCloseBtn');
        this.addNewButton = document.getElementById('dropdownModalAddNewBtn');
        this.applyButton = document.getElementById('dropdownModalApplyBtn');
        this.footerElement = document.getElementById('dropdownModalFooter');

        // Only attach event listeners if elements are found
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.hide());
        } else {
            console.error("DropdownModal: closeButton not found!");
        }
        
        if (this.searchElement) {
            this.searchElement.addEventListener('input', (e) => {
                this.filterText = e.target.value.toLowerCase();
                this.renderOptions();
            });
        } else {
            console.error("DropdownModal: searchElement not found!");
        }
        
        if (this.addNewButton) {
            this.addNewButton.addEventListener('click', async () => {
                if (this.onAddNewCallback) {
                    try {
                        const newItem = await this.onAddNewCallback(this.filterText);
                        // If a new item was created, select it
                        if (newItem && newItem.value) {
                            if (this.multiSelect) {
                                this.selectedValues.add(newItem.value);
                            } else {
                                this.selectedValues.clear();
                                this.selectedValues.add(newItem.value);
                            }
                            // Call the select callback with the new item
                            if (this.onSelectCallback) {
                                const selectedItems = this.multiSelect ?
                                    Array.from(this.selectedValues).map(val =>
                                        this.options.find(opt => opt.value === val)
                                    ).filter(Boolean) :
                                    this.options.find(opt => opt.value === newItem.value);

                                this.onSelectCallback(selectedItems);
                            }
                        }
                    } catch (error) {
                        console.error("Error in onAddNew callback:", error);
                    }
                }
                this.hide();
            });
        } else {
            console.error("DropdownModal: addNewButton not found!");
        }

        // Close on backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });
        }

        // Setup mobile back navigation handling
        this.handleMobileBackNavigation();

        this.isInitialized = true;
    }

    /**
     * Load modal HTML and styles dynamically
     */
    async loadModal() {
        try {
            console.log('🔄 Loading dropdown modal HTML...');
            const response = await fetch('./source/modals/dropdown/dropdown-list.html');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const htmlContent = await response.text();
            console.log('📄 Dropdown modal HTML fetched');

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;

            // Extract and append styles if they are embedded in the HTML
            const styleElement = tempDiv.querySelector('style');
            if (styleElement) {
                // Add a unique ID to prevent duplicates
                styleElement.id = 'dropdown-modal-styles';
                // Remove any existing styles first
                const existingStyle = document.getElementById('dropdown-modal-styles');
                if (existingStyle) {
                    existingStyle.remove();
                    console.log('🗑️ Removed existing dropdown modal styles');
                }
                document.head.appendChild(styleElement);
                console.log('🎨 Dropdown modal styles appended to head');

                // Verify styles were added
                const addedStyle = document.getElementById('dropdown-modal-styles');
                if (addedStyle) {
                    console.log('✅ Styles element found in document.head');
                } else {
                    console.error('❌ Failed to add styles to document.head');
                }
            } else {
                console.warn('⚠️ No style element found in dropdown modal HTML');
            }

            // Check if modal already exists
            if (!document.getElementById('dropdownModal')) {
                // Extract the modal element and append it
                const modalElement = tempDiv.querySelector('#dropdownModal');
                if (!modalElement) {
                    throw new Error('Dropdown modal element not found in dropdown-list.html');
                }
                document.body.appendChild(modalElement);
                console.log('✅ Dropdown modal HTML appended to body');
            } else {
                console.log('✅ Dropdown modal already exists in DOM');
            }

            return true;
        } catch (error) {
            console.error('❌ Error loading dropdown modal:', error);
            return false;
        }
    }

    /**
     * Ensure modal is loaded before showing
     */
    async ensureModalLoaded() {
        const isLoaded = await this.loadModal();
        if (!isLoaded) {
            throw new Error('Failed to load dropdown modal');
        }
    }

    /**
     * Refresh options in the dropdown (useful after adding new items)
     * @param {Array<Object>} newOptions - New options array (optional, uses current if not provided)
     */
    refreshOptions(newOptions = null) {
        if (newOptions) {
            this.options = newOptions.map(opt => ({
                value: opt.value || opt.code || '',
                label: opt.label || opt.displayName || opt.value || '',
                code: opt.code || opt.value || '',
                displayName: opt.displayName || opt.label || opt.value || '',
                symbol: opt.symbol || '',
                type: opt.type || 'Others'
            }));
        }
        this.renderOptions();
    }

    /**
     * Show the dropdown modal with options
     * @param {Array<Object>} options - Array of option objects with format: { value, label, code?, displayName?, symbol?, type? }
     * @param {string} title - Modal title
     * @param {Function} onSelect - Callback function when option is selected. Receives selected value(s)
     * @param {Object} config - Configuration object
     * @param {Function} [config.onAddNew] - Optional callback for "Add New" button
     * @param {boolean} [config.multiSelect=false] - Enable multi-select mode
     * @param {boolean} [config.enableCreate=false] - Show "Add New" button
     * @param {boolean} [config.enableGrouping=false] - Group options by type
     * @param {Array<string>} [config.selectedValues=[]] - Pre-selected values
     */
    async show(options, title, onSelect, config = {}) {
        // Ensure modal is loaded before proceeding
        await this.ensureModalLoaded();

        // Ensure DOM elements are initialized before trying to use them
        this._initializeDomElements();

        // Check if modal element is actually present after initialization
        if (!this.modal) {
            console.error("DropdownModal: Modal element (id='dropdownModal') not found in DOM.");
            return; // Cannot proceed if the modal itself is missing
        }

        // Normalize options format - support both {value, label} and {code, displayName} formats
        this.options = options.map(opt => ({
            value: opt.value || opt.code || '',
            label: opt.label || opt.displayName || opt.value || '',
            code: opt.code || opt.value || '',
            displayName: opt.displayName || opt.label || opt.value || '',
            symbol: opt.symbol || '',
            type: opt.type || 'Others'
        }));

        this.onSelectCallback = onSelect;
        this.onAddNewCallback = config.onAddNew || null;
        this.multiSelect = config.multiSelect || false;
        this.enableCreate = config.enableCreate || false;
        this.enableGrouping = config.enableGrouping || false;
        this.filterText = '';
        this.selectedValues = new Set(config.selectedValues || []);
        this.collapsedGroups = new Set(); // Reset collapsed groups when showing modal

        if (this.titleElement) this.titleElement.textContent = title || 'Select Option';
        if (this.searchElement) this.searchElement.value = '';

        // Show/hide footer with Apply button based on multiSelect mode
        if (this.footerElement) {
            this.footerElement.style.display = this.multiSelect ? 'block' : 'none';
        }
        
        // Set up Apply button handler
        if (this.applyButton && this.multiSelect) {
            // Remove existing listeners by cloning
            const newApplyBtn = this.applyButton.cloneNode(true);
            this.applyButton.parentNode.replaceChild(newApplyBtn, this.applyButton);
            this.applyButton = newApplyBtn;
            
            newApplyBtn.addEventListener('click', () => {
                // Get all selected options
                const selectedOptions = Array.from(this.selectedValues).map(val =>
                    this.options.find(opt => opt.value === val || opt.code === val)
                ).filter(Boolean);
                
                console.log('Apply button clicked. Selected options:', selectedOptions);
                console.log('Selected values:', Array.from(this.selectedValues));
                console.log('Available options:', this.options);
                
                // Call the select callback with selected items (even if empty array)
                if (this.onSelectCallback) {
                    console.log('Calling onSelectCallback with:', selectedOptions);
                    this.onSelectCallback(selectedOptions);
                } else {
                    console.warn('onSelectCallback is not set!');
                }
                
                // Close the modal
                this.hide();
            });
        }

        this.renderOptions();

        // Show modal
        if (this.modal) {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Lock background scroll
            this.isModalOpen = true;
            console.log('🔍 Modal shown with active class');

            // Debug: Check if styles are applied
            const computedStyle = window.getComputedStyle(this.modal);
            console.log('🎨 Modal opacity:', computedStyle.opacity);
            console.log('🎨 Modal visibility:', computedStyle.visibility);
        }

        // Focus search input after a slight delay to ensure modal is visible
        setTimeout(() => {
            if (this.searchElement) {
                this.searchElement.focus();
            }
        }, 300);
    }

    /**
     * Hide the dropdown modal
     */
    hide() {
        if (this.modal) {
            this.modal.classList.remove('active');
            document.body.style.overflow = ''; // Restore background scroll
        }
        this.filterText = '';
        this.selectedValues.clear();
        this.isModalOpen = false;
    }

    /**
     * Handle mobile back navigation
     */
    handleMobileBackNavigation() {
        // Handle mobile back button to close modal instead of navigating away
        const handlePopState = (e) => {
            if (this.isModalOpen) {
                e.preventDefault();
                this.hide();
                // Prevent the default back navigation by pushing state back
                window.history.pushState(null, '', window.location.href);
            }
        };

        // Add the event listener
        window.addEventListener('popstate', handlePopState);

        // Store reference to remove listener later if needed
        this._popStateHandler = handlePopState;
    }

    /**
     * Render options in the dropdown list
     */
    renderOptions() {
        // Ensure listElement is initialized
        if (!this.listElement) {
            console.error("DropdownModal: listElement not found for rendering options.");
            return;
        }

        this.listElement.innerHTML = '';
        const fragment = document.createDocumentFragment();

        // Filter options based on search text
        const filteredOptions = this.options.filter(option => {
            const searchTerm = this.filterText.toLowerCase();
            const label = option.label.toLowerCase();
            const code = option.code.toLowerCase();
            const displayName = option.displayName.toLowerCase();
            return label.includes(searchTerm) || code.includes(searchTerm) || displayName.includes(searchTerm);
        });

        // Show "No results" message if filtered list is empty
        if (filteredOptions.length === 0 && this.filterText.length > 0) {
            const noResults = document.createElement('div');
            noResults.className = 'mstore-dropdown-option mstore-dropdown-no-results';
            noResults.textContent = `No results for "${this.filterText}"`;
            fragment.appendChild(noResults);
        } else if (filteredOptions.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'mstore-dropdown-option mstore-dropdown-no-results';
            noResults.textContent = 'No options available';
            fragment.appendChild(noResults);
        } else {
            // Add "Create New Category" option at the top if enabled (always show, not just when searching)
            if (this.enableCreate) {
                const createNewOption = this._createCreateNewOption();
                fragment.appendChild(createNewOption);
            }

            // Group options if enabled
            if (this.enableGrouping) {
                const grouped = this._groupOptions(filteredOptions);
                this._renderGroupedOptions(grouped, fragment);
            } else {
                this._renderFlatOptions(filteredOptions, fragment);
            }
        }

        this.listElement.appendChild(fragment);
    }

    /**
     * Group options by type
     */
    _groupOptions(options) {
        return options.reduce((acc, opt) => {
            const type = opt.type ? 
                opt.type.charAt(0).toUpperCase() + opt.type.slice(1).replace(/_/g, ' ') : 
                'Others';
            if (!acc[type]) acc[type] = [];
            acc[type].push(opt);
            return acc;
        }, {});
    }

    /**
     * Render grouped options
     */
    _renderGroupedOptions(grouped, fragment) {
        // Sort group keys alphabetically (put "Others" at the end)
        const groupKeys = Object.keys(grouped).sort((a, b) => {
            if (a === 'Others') return 1;
            if (b === 'Others') return -1;
            return a.localeCompare(b);
        });
        const hasMultipleGroups = groupKeys.length > 1;

        groupKeys.forEach(type => {
            const groupOptions = grouped[type];

            // Sort options within each group alphabetically by display name
            groupOptions.sort((a, b) => {
                const aText = a.displayName || a.label || a.value || '';
                const bText = b.displayName || b.label || b.value || '';
                return aText.localeCompare(bText);
            });

            // Only show group title if there are multiple groups or type is not "Others"
            if (hasMultipleGroups || type !== 'Others') {
                const groupTitle = document.createElement('div');
                groupTitle.className = 'mstore-dropdown-group-title';
                groupTitle.dataset.groupType = type;

                // Add expand/collapse icon
                const icon = document.createElement('i');
                icon.className = 'fas mstore-dropdown-group-icon';
                const isCollapsed = this.collapsedGroups.has(type);
                icon.className += isCollapsed ? ' fa-chevron-right' : ' fa-chevron-down';

                // Add click handler for collapse/expand
                groupTitle.addEventListener('click', () => {
                    this._toggleGroupCollapse(type);
                });

                const titleText = document.createElement('span');
                titleText.textContent = type;
                groupTitle.appendChild(titleText);

                groupTitle.appendChild(icon);

                fragment.appendChild(groupTitle);
            }

            // Render options in this group (only if not collapsed)
            const isCollapsed = this.collapsedGroups.has(type);
            if (!isCollapsed) {
                groupOptions.forEach(option => {
                    fragment.appendChild(this._createOptionElement(option));
                });
            }
        });
    }

    /**
     * Render flat list of options
     */
    _renderFlatOptions(options, fragment) {
        // Sort options alphabetically by display name
        const sortedOptions = [...options].sort((a, b) => {
            const aText = a.displayName || a.label || a.value || '';
            const bText = b.displayName || b.label || b.value || '';
            return aText.localeCompare(bText);
        });

        sortedOptions.forEach(option => {
            fragment.appendChild(this._createOptionElement(option));
        });
    }

    /**
     * Toggle group collapse/expand
     */
    _toggleGroupCollapse(groupType) {
        if (this.collapsedGroups.has(groupType)) {
            this.collapsedGroups.delete(groupType);
        } else {
            this.collapsedGroups.add(groupType);
        }

        // Update the UI
        this.renderOptions();

        // Update the icon in the group title
        const groupTitle = this.listElement.querySelector(`[data-group-type="${groupType}"]`);
        if (groupTitle) {
            const icon = groupTitle.querySelector('.mstore-dropdown-group-icon');
            const isCollapsed = this.collapsedGroups.has(groupType);
            if (icon) {
                icon.className = 'fas mstore-dropdown-group-icon';
                icon.className += isCollapsed ? ' fa-chevron-right' : ' fa-chevron-down';
            }
        }
    }

    /**
     * Create a "Create New" option element
     */
    _createCreateNewOption() {
        const optionElement = document.createElement('div');
        optionElement.className = 'mstore-dropdown-option mstore-dropdown-create-new';

        // Create label span
        const labelSpan = document.createElement('span');
        labelSpan.textContent = 'Create New Category';
        optionElement.appendChild(labelSpan);

        // Add plus icon with circle on the right
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'mstore-dropdown-create-icon-wrapper';
        const icon = document.createElement('i');
        icon.className = 'fas fa-plus mstore-dropdown-create-icon';
        iconWrapper.appendChild(icon);
        optionElement.appendChild(iconWrapper);

        // Add click handler
        optionElement.addEventListener('click', () => {
            // Call the onAddNewCallback - the parent should handle opening the modal
            // We pass an object with the search text and a reference to this modal instance
            if (this.onAddNewCallback) {
                this.onAddNewCallback({
                    searchText: this.filterText.trim() || '',
                    dropdownModal: this
                });
            }
        });

        return optionElement;
    }

    /**
     * Create an option element
     */
    _createOptionElement(option) {
        const optionElement = document.createElement('div');
        optionElement.className = 'mstore-dropdown-option';
        
        const isSelected = this.selectedValues.has(option.value) || this.selectedValues.has(option.code);
        if (isSelected) {
            optionElement.classList.add('selected');
        }

        optionElement.dataset.value = option.value;
        optionElement.dataset.code = option.code;

        // Build label text
        let labelText = option.label || option.displayName || option.value;
        if (option.symbol) {
            labelText += ` (${option.symbol})`;
        }

        // Create label span
        const labelSpan = document.createElement('span');
        labelSpan.textContent = labelText;
        optionElement.appendChild(labelSpan);

        // Add icon/checkbox based on mode
        if (this.multiSelect) {
            const icon = document.createElement('i');
            icon.className = `fas ${isSelected ? 'fa-check-square' : 'fa-square'} mstore-dropdown-checkbox-icon`;
            if (isSelected) {
                icon.classList.add('checked');
            }
            optionElement.appendChild(icon);
        } else if (isSelected) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-check mstore-dropdown-check-icon';
            optionElement.appendChild(icon);
        }

        // Add click handler
        optionElement.addEventListener('click', () => {
            if (this.multiSelect) {
                // Toggle selection
                if (this.selectedValues.has(option.value) || this.selectedValues.has(option.code)) {
                    this.selectedValues.delete(option.value);
                    this.selectedValues.delete(option.code);
                } else {
                    this.selectedValues.add(option.value);
                    this.selectedValues.add(option.code);
                }
                
                // Re-render to update checkboxes
                this.renderOptions();
                
                // Don't call callback immediately in multi-select - wait for Apply button
            } else {
                // Single select - call callback and hide
                if (this.onSelectCallback) {
                    this.onSelectCallback(option);
                }
                this.hide();
            }
        });

        return optionElement;
    }
}

// Global instance to be used throughout the application
export const dropdownModal = new DropdownModal();
