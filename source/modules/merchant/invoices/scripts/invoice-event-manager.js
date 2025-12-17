/**
 * Invoice Event Manager - Handles all event bindings and form interactions
 */

import { InvoiceUIComponents } from './invoice-ui-component.js';

export class InvoiceEventManager {
    static eventListeners = [];

    static init() {
        console.log('🎯 Initializing Invoice Event Manager...');
        this.bindFormEvents();
        this.bindCustomerEvents();
        this.bindItemEvents();
        this.bindChargesEvents();
        this.bindModalEvents();
    }

    static addEventListener(element, event, handler, options = {}) {
        if (!element) return;

        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }

    static bindFormEvents() {
        // Save invoice button (will be added to bottom navigation)
        // Reset/Cancel functionality will be handled by navigation
    }

    static bindCustomerEvents() {
        // Customer input change
        const customerInput = document.getElementById('invoice-demo-customer');
        if (customerInput) {
            this.addEventListener(customerInput, 'input', this.handleCustomerInput.bind(this));
        }
    }

    static bindItemEvents() {
        // Add item button
        const addItemBtn = document.getElementById('invoice-demo-add-item');
        if (addItemBtn) {
            this.addEventListener(addItemBtn, 'click', this.handleAddItem.bind(this));
        }

        // Scan item button
        const scanBtn = document.getElementById('invoice-demo-scan-item');
        if (scanBtn) {
            this.addEventListener(scanBtn, 'click', this.handleScanItem.bind(this));
        }
    }

    static bindChargesEvents() {
        // Toggle sections
        const toggleItemsBtn = document.getElementById('invoice-demo-toggle-items');
        const toggleChargesBtn = document.getElementById('invoice-demo-toggle-charges');

        if (toggleItemsBtn) {
            this.addEventListener(toggleItemsBtn, 'click', () => {
                this.toggleSection('invoice-demo-items-section');
            });
        }

        if (toggleChargesBtn) {
            this.addEventListener(toggleChargesBtn, 'click', () => {
                this.toggleSection('invoice-demo-charges-section');
            });
        }

        // Amount inputs and charges
        const receivedInput = document.getElementById('invoice-demo-received');
        const shippingInput = document.getElementById('invoice-demo-shipping');
        const packagingInput = document.getElementById('invoice-demo-packaging');
        const adjustmentInput = document.getElementById('invoice-demo-adjustment');

        if (receivedInput) {
            this.addEventListener(receivedInput, 'input', () => {
                this.updateReceivedAmount();
            });
        }

        if (shippingInput) {
            this.addEventListener(shippingInput, 'input', () => this.updateCharges());
        }
        if (packagingInput) {
            this.addEventListener(packagingInput, 'input', () => this.updateCharges());
        }
        if (adjustmentInput) {
            this.addEventListener(adjustmentInput, 'input', () => this.updateCharges());
        }
    }

    static bindModalEvents() {
        // Modal close button
        const closeBtn = document.getElementById('invoice-item-modal-close');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.closeItemModal());
        }

        // Modal cancel button
        const cancelBtn = document.getElementById('invoice-item-modal-cancel');
        if (cancelBtn) {
            this.addEventListener(cancelBtn, 'click', () => this.closeItemModal());
        }

        // Modal save button
        const saveBtn = document.getElementById('invoice-item-modal-save');
        if (saveBtn) {
            this.addEventListener(saveBtn, 'click', this.handleSaveItem.bind(this));
        }

        // Modal overlay click
        const overlay = document.getElementById('invoice-item-modal-overlay');
        if (overlay) {
            this.addEventListener(overlay, 'click', (e) => {
                if (e.target === overlay) {
                    this.closeItemModal();
                }
            });
        }

        // Item selection change
        const itemSelect = document.getElementById('invoice-item-select');
        if (itemSelect) {
            this.addEventListener(itemSelect, 'change', this.handleItemSelection.bind(this));
        }

        // Quantity and rate inputs for live calculation
        const qtyInput = document.getElementById('invoice-qty');
        const rateInput = document.getElementById('invoice-rate');

        if (qtyInput) {
            this.addEventListener(qtyInput, 'input', this.updateModalTotal.bind(this));
        }

        if (rateInput) {
            this.addEventListener(rateInput, 'input', this.updateModalTotal.bind(this));
        }
    }

    static updateCharges() {
        // Update calculations when charges change
        import('./add-invoice.js').then(module => {
            module.calculateTotals();
        });
    }

    static async handleSaveInvoice() {
        try {
            const { saveInvoice } = await import('./add-invoice.js');
            await saveInvoice();

            // Show success message
            if (window.showToast) {
                window.showToast('success', 'Invoice saved successfully!', 3000);
            }

            // Navigate back or reset form
            setTimeout(() => {
                // Reset form after success
                this.handleResetInvoice();
            }, 1500);

        } catch (error) {
            console.error('Save invoice error:', error);
            if (window.showToast) {
                window.showToast('error', 'Failed to save invoice. Please try again.', 5000);
            }
        }
    }

    static async handleResetInvoice() {
        const { resetInvoice } = await import('./add-invoice.js');
        resetInvoice();
    }

    static handleCustomerSearch() {
        // Open customer search modal or dropdown
        console.log('Customer search clicked');
        // TODO: Implement customer search functionality
    }

    static handleAddCustomer() {
        // Open add customer modal
        console.log('Add customer clicked');
        // TODO: Implement add customer functionality
    }

    static handleCustomerInput(event) {
        const query = event.target.value;
        // TODO: Implement customer autocomplete
        console.log('Customer input:', query);
    }

    static handleAddItem() {
        this.openItemModal();
    }

    static handleScanItem() {
        // TODO: Implement barcode scanning
        console.log('Scan item clicked');
    }

    static openItemModal() {
        const modal = document.getElementById('invoice-item-modal-overlay');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            // Focus first input
            const firstInput = document.getElementById('invoice-item-select');
            if (firstInput) firstInput.focus();
        }
    }

    static closeItemModal() {
        const modal = document.getElementById('invoice-item-modal-overlay');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';

            // Reset modal form
            this.resetModalForm();
        }
    }

    static resetModalForm() {
        const formElements = [
            'invoice-item-select',
            'invoice-unit',
            'invoice-qty',
            'invoice-rate'
        ];

        formElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (element.tagName === 'SELECT') {
                    element.selectedIndex = 0;
                } else {
                    element.value = '';
                }
            }
        });

        // Reset total
        const totalEl = document.getElementById('invoice-modal-total');
        if (totalEl) totalEl.textContent = '₹0.00';
    }

    static handleItemSelection(event) {
        const itemId = event.target.value;
        if (!itemId) return;

        // TODO: Load item details and auto-fill rate/unit
        console.log('Item selected:', itemId);
    }

    static updateModalTotal() {
        const qtyInput = document.getElementById('invoice-qty');
        const rateInput = document.getElementById('invoice-rate');
        const totalEl = document.getElementById('invoice-modal-total');

        if (!qtyInput || !rateInput || !totalEl) return;

        const qty = parseFloat(qtyInput.value) || 0;
        const rate = parseFloat(rateInput.value) || 0;
        const total = qty * rate;

        totalEl.textContent = `₹${total.toFixed(2)}`;
    }

    static async handleSaveItem() {
        try {
            const itemData = this.getModalFormData();
            if (!this.validateItemData(itemData)) return;

            const { addItem } = await import('./add-invoice.js');
            addItem(itemData);

            this.closeItemModal();

            if (window.showToast) {
                window.showToast('success', 'Item added to invoice!', 2000);
            }

        } catch (error) {
            console.error('Save item error:', error);
            if (window.showToast) {
                window.showToast('error', 'Failed to add item. Please try again.', 3000);
            }
        }
    }

    static getModalFormData() {
        const itemSelect = document.getElementById('invoice-item-select');
        const unitSelect = document.getElementById('invoice-unit');
        const qtyInput = document.getElementById('invoice-qty');
        const rateInput = document.getElementById('invoice-rate');

        const selectedOption = itemSelect?.options[itemSelect.selectedIndex];
        const unitOption = unitSelect?.options[unitSelect.selectedIndex];

        return {
            id: Date.now().toString(), // Temporary ID
            itemId: itemSelect?.value,
            name: selectedOption?.text || '',
            unitId: unitSelect?.value,
            unitLabel: unitOption?.text || '',
            quantity: parseFloat(qtyInput?.value) || 0,
            rate: parseFloat(rateInput?.value) || 0,
            timestamp: new Date()
        };
    }

    static validateItemData(data) {
        if (!data.itemId) {
            if (window.showToast) {
                window.showToast('error', 'Please select an item.', 3000);
            }
            return false;
        }

        if (!data.quantity || data.quantity <= 0) {
            if (window.showToast) {
                window.showToast('error', 'Please enter a valid quantity.', 3000);
            }
            return false;
        }

        if (!data.rate || data.rate <= 0) {
            if (window.showToast) {
                window.showToast('error', 'Please enter a valid rate.', 3000);
            }
            return false;
        }

        return true;
    }

    static cleanup() {
        console.log('🧹 Cleaning up Invoice Event Manager...');

        // Remove all event listeners
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            if (element) {
                element.removeEventListener(event, handler, options);
            }
        });

        this.eventListeners = [];
        console.log('✅ Invoice Event Manager cleaned up');
    }
}