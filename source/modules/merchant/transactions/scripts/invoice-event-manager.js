/**
 * Invoice Event Manager - Handles invoice meta field interactions
 */

export class InvoiceEventManager {
    constructor() {
        this.eventListeners = [];
        this.invoiceMeta = {
            number: '116',
            date: '16/12/2025',
            time: '02:26 PM'
        };


        // Prevent multiple modals
        this.activeModal = null;
    }

    /**
     * Initialize invoice meta field event handlers
     */
    static initializeEventHandlers() {
        const manager = new InvoiceEventManager();
        manager.setupMetaFieldHandlers();
        return manager;
    }


    /**
     * Set invoice type label based on sessionStorage
     */
    setInvoiceTypeLabel() {
        const labelElement = document.getElementById('invoice-number-label');
        if (!labelElement) return;

        // Read invoice type from sessionStorage
        const invoiceType = sessionStorage.getItem('invoiceType') || 'sale';

        if (invoiceType === 'purchase') {
            labelElement.textContent = 'Bill No.';
            console.log('Set label to: Bill No. (Purchase)');
        } else {
            labelElement.textContent = 'Invoice No.';
            console.log('Set label to: Invoice No. (Sale)');
        }

        // Clear the sessionStorage after reading
        sessionStorage.removeItem('invoiceType');
    }

    /**
     * Setup click handlers for invoice meta fields
     */
    setupMetaFieldHandlers() {
        console.log('Setting up meta field handlers...');

        // Set invoice type label based on sessionStorage
        this.setInvoiceTypeLabel();

        // Use event delegation on the invoice grid to handle all clicks
        const invoiceGrid = document.querySelector('.invoice-grid');
        if (invoiceGrid) {
            this.addTrackedListener(invoiceGrid, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const target = e.target;
                const clickX = e.clientX;
                const clickY = e.clientY;

                // Check if clicked on invoice number area
                if (target.closest('.invoice-col:nth-child(1)') ||
                    target.classList.contains('invoice-col') &&
                    target.querySelector('.invoice-pill-label')?.textContent?.includes('Invoice No.')) {
                    console.log('Invoice number area clicked');
                    this.openInvoiceNumberModal();
                    return;
                }

                // Check if clicked on date area
                if (target.closest('.invoice-col:nth-child(2)') ||
                    target.classList.contains('invoice-col') &&
                    target.querySelector('.invoice-pill-label')?.textContent?.includes('Date')) {
                    console.log('Date area clicked at:', clickX, clickY);
                    this.triggerDatePicker(clickX, clickY);
                    return;
                }

                // Check if clicked on time area
                if (target.closest('.invoice-col:nth-child(3)') ||
                    target.classList.contains('invoice-col') &&
                    target.querySelector('.invoice-pill-label')?.textContent?.includes('Time')) {
                    console.log('Time area clicked at:', clickX, clickY);
                    this.triggerTimePicker(clickX, clickY);
                    return;
                }
            });

            // Set cursor pointer for all clickable elements
            const allPillValues = invoiceGrid.querySelectorAll('.pill-value, .pill-arrow');
            allPillValues.forEach(el => {
                el.style.cursor = 'pointer';
            });
        }
    }

    /**
     * Create invoice meta modal
     */
    createInvoiceMetaModal(title, inputElement, onSave) {
        // Prevent multiple modals
        if (this.activeModal) {
            console.log('Modal already active, ignoring request');
            return null;
        }

        console.log('Creating modal for:', title);

        const overlay = document.createElement('div');
        overlay.className = 'invoice-meta-modal-overlay';
        this.activeModal = overlay;

        const modal = document.createElement('div');
        modal.className = 'invoice-meta-modal';

        const header = document.createElement('div');
        header.className = 'invoice-meta-modal-header';
        header.textContent = title;

        const body = document.createElement('div');
        body.className = 'invoice-meta-modal-body';
        body.appendChild(inputElement);

        const footer = document.createElement('div');
        footer.className = 'invoice-meta-modal-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'invoice-meta-modal-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => {
            console.log('Cancel clicked');
            this.closeActiveModal();
        };

        const saveBtn = document.createElement('button');
        saveBtn.className = 'invoice-meta-modal-save';
        saveBtn.textContent = 'Save';
        saveBtn.onclick = () => {
            console.log('Save clicked');
            if (onSave()) {
                this.closeActiveModal();
            }
        };

        footer.appendChild(cancelBtn);
        footer.appendChild(saveBtn);

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                console.log('Overlay clicked');
                this.closeActiveModal();
            }
        };

        // Close on Escape key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                console.log('Escape pressed');
                this.closeActiveModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        return overlay;
    }

    /**
     * Close active modal
     */
    closeActiveModal() {
        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
        }
    }

    /**
     * Open invoice number modal
     */
    openInvoiceNumberModal() {
        console.log('Opening invoice number modal');

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'invoice-meta-input';
        input.value = this.invoiceMeta.number;
        input.focus();
        input.select();

        const modal = this.createInvoiceMetaModal(
            'Edit Invoice Number',
            input,
            () => {
                const newValue = input.value.trim();
                if (newValue && !isNaN(newValue)) {
                    this.invoiceMeta.number = newValue;
                    this.updateInvoiceMetaDisplay();
                    console.log('Invoice number updated to:', newValue);
                    return true;
                }
                console.log('Invalid invoice number:', newValue);
                return false;
            }
        );

        if (modal) {
            document.body.appendChild(modal);
        }
    }

    /**
     * Trigger native date picker
     */
    triggerDatePicker(clickX, clickY) {
        console.log('Triggering date picker at:', clickX, clickY);

        // Create a temporary input at the exact click location
        const tempInput = document.createElement('input');
        tempInput.type = 'date';

        // Convert DD/MM/YYYY to YYYY-MM-DD for date input
        const dateParts = this.invoiceMeta.date.split('/');
        tempInput.value = dateParts.length === 3 ?
            `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}` :
            '';

        // Position at click location
        tempInput.style.cssText = `
            position: fixed;
            left: ${clickX || window.innerWidth / 2}px;
            top: ${clickY || window.innerHeight / 2}px;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
            z-index: -1;
            border: none;
            outline: none;
        `;

        document.body.appendChild(tempInput);

        // Listen for changes and cleanup triggers
        let cleanupTimer;

        const cleanupInput = () => {
            if (cleanupTimer) clearTimeout(cleanupTimer);
            if (tempInput.parentNode) {
                tempInput.parentNode.removeChild(tempInput);
                console.log('Date picker input cleaned up');
            }
        };

        tempInput.onchange = () => {
            if (tempInput.value) {
                const date = new Date(tempInput.value);
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                this.invoiceMeta.date = `${day}/${month}/${year}`;
                this.updateInvoiceMetaDisplay();
                console.log('Date changed to:', this.invoiceMeta.date);

                // Clean up immediately after value change
                setTimeout(cleanupInput, 100);
            }
        };

        tempInput.onblur = () => {
            // Clean up after losing focus (picker closed)
            cleanupTimer = setTimeout(cleanupInput, 500);
        };

        // Trigger the picker
        setTimeout(() => {
            tempInput.focus();
            if (tempInput.showPicker) {
                try {
                    tempInput.showPicker();
                    console.log('Date picker triggered with showPicker');
                } catch (error) {
                    console.warn('showPicker failed:', error.message);
                    tempInput.click();
                }
            } else {
                tempInput.click();
                console.log('Date picker triggered with click');
            }
        }, 10);

        // Fallback cleanup after 30 seconds (in case something goes wrong)
        setTimeout(cleanupInput, 30000);
    }


    /**
     * Trigger native time picker
     */
    triggerTimePicker(clickX, clickY) {
        console.log('Triggering time picker at:', clickX, clickY);

        // Create a temporary input at the exact click location
        const tempInput = document.createElement('input');
        tempInput.type = 'time';

        // Convert 12-hour to 24-hour format for time input
        const timeMatch = this.invoiceMeta.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2];
            const ampm = timeMatch[3].toUpperCase();

            if (ampm === 'PM' && hours !== 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;

            tempInput.value = `${hours.toString().padStart(2, '0')}:${minutes}`;
        }

        // Position at click location
        tempInput.style.cssText = `
            position: fixed;
            left: ${clickX || window.innerWidth / 2}px;
            top: ${clickY || window.innerHeight / 2}px;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
            z-index: -1;
            border: none;
            outline: none;
        `;

        document.body.appendChild(tempInput);

        // Listen for changes and cleanup triggers
        let cleanupTimer;

        const cleanupInput = () => {
            if (cleanupTimer) clearTimeout(cleanupTimer);
            if (tempInput.parentNode) {
                tempInput.parentNode.removeChild(tempInput);
                console.log('Time picker input cleaned up');
            }
        };

        tempInput.onchange = () => {
            if (tempInput.value) {
                // Convert 24-hour back to 12-hour format
                const [hours24, minutes] = tempInput.value.split(':');
                const hours = parseInt(hours24);
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

                this.invoiceMeta.time = `${hours12}:${minutes} ${ampm}`;
                this.updateInvoiceMetaDisplay();
                console.log('Time changed to:', this.invoiceMeta.time);

                // Clean up immediately after value change
                setTimeout(cleanupInput, 100);
            }
        };

        tempInput.onblur = () => {
            // Clean up after losing focus (picker closed)
            cleanupTimer = setTimeout(cleanupInput, 500);
        };

        // Trigger the picker
        setTimeout(() => {
            tempInput.focus();
            if (tempInput.showPicker) {
                try {
                    tempInput.showPicker();
                    console.log('Time picker triggered with showPicker');
                } catch (error) {
                    console.warn('showPicker failed:', error.message);
                    tempInput.click();
                }
            } else {
                tempInput.click();
                console.log('Time picker triggered with click');
            }
        }, 10);

        // Fallback cleanup after 30 seconds (in case something goes wrong)
        setTimeout(cleanupInput, 30000);
    }

    /**
     * Fallback time picker for browsers that don't support showPicker
     */

    /**
     * Update invoice meta display
     */
    updateInvoiceMetaDisplay() {
        const numberSpan = document.querySelector('.invoice-col:nth-child(1) .pill-value span:first-child');
        const dateSpan = document.querySelector('.invoice-col:nth-child(2) .pill-value span:first-child');
        const timeSpan = document.querySelector('.invoice-col:nth-child(3) .pill-value span:first-child');

        if (numberSpan) {
            numberSpan.textContent = this.invoiceMeta.number;
            console.log('Updated number display to:', this.invoiceMeta.number);
        }
        if (dateSpan) {
            dateSpan.textContent = this.invoiceMeta.date;
            console.log('Updated date display to:', this.invoiceMeta.date);
        }
        if (timeSpan) {
            timeSpan.textContent = this.invoiceMeta.time;
            console.log('Updated time display to:', this.invoiceMeta.time);
        }
    }

    /**
     * Add event listener with cleanup tracking
     */
    addTrackedListener(element, event, handler, options) {
        if (!element) return;

        element.addEventListener(event, handler, options);
        this.eventListeners.push(() => element.removeEventListener(event, handler, options));
    }

    /**
     * Cleanup all event listeners
     */
    cleanup() {
        console.log('Cleaning up invoice event listeners');
        this.eventListeners.forEach(cleanup => cleanup());
        this.eventListeners = [];
    }
}