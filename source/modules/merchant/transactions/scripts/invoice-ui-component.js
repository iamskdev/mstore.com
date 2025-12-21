/**
 * Invoice UI Components - Handles all UI rendering and interactions
 */

export class InvoiceUIComponents {
    static async init() {
        console.log('🎨 Initializing Invoice UI Components...');
        this.bindEvents();
    }

    static bindEvents() {
        // Toggle sections
        const toggleItemsBtn = document.getElementById('invoice-toggle-items');
        const toggleChargesBtn = document.getElementById('invoice-toggle-charges');

        if (toggleItemsBtn) {
            toggleItemsBtn.addEventListener('click', () => {
                this.toggleSection('invoice-items-section');
            });
        }

        if (toggleChargesBtn) {
            toggleChargesBtn.addEventListener('click', () => {
                this.toggleSection('invoice-charges-section');
            });
        }

        // Discount type change
        const discountTypeSelect = document.getElementById('invoice-discount-type');
        if (discountTypeSelect) {
            discountTypeSelect.addEventListener('change', (e) => {
                this.toggleDiscountField(e.target.value);
            });
        }

        // Amount inputs
        const receivedInput = document.getElementById('invoice-received');
        if (receivedInput) {
            receivedInput.addEventListener('input', () => {
                this.updateReceivedAmount();
            });
        }
    }

    static toggleSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.toggle('section-collapsed');
        }
    }

    static toggleDiscountField(discountType) {
        const discountRow = document.getElementById('invoice-discount-row');
        if (discountRow) {
            discountRow.style.display = discountType !== 'none' ? 'flex' : 'none';
        }
    }

    static updateReceivedAmount() {
        const receivedInput = document.getElementById('invoice-received');
        if (receivedInput) {
            const received = parseFloat(receivedInput.value) || 0;
            // Import and call calculateTotals from main module
            import('./add-invoice.js').then(module => {
                module.calculateTotals();
            });
        }
    }

    static populateCustomerDropdown(customers, type = 'sale') {
        // For the demo, we'll use a simple input field instead of dropdown
        // The original demo uses a text input for customer name
        console.log('Customer dropdown populated:', customers.length, 'customers');
    }

    static populateItemDropdown(items) {
        const select = document.getElementById('invoice-item-select');
        if (!select) return;

        // Clear existing options except placeholder
        select.innerHTML = '<option value="">Choose an item...</option>';

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            select.appendChild(option);
        });
    }

    static populateUnitDropdown(units) {
        const select = document.getElementById('invoice-unit');
        if (!select) return;

        // Clear existing options except placeholder
        select.innerHTML = '<option value="">Select unit...</option>';

        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.id;
            option.textContent = unit.name;
            select.appendChild(option);
        });
    }

    static addItemToList(itemData) {
        const container = document.getElementById('invoice-demo-items');
        if (!container) return;

        const itemCard = this.createItemCard(itemData);
        container.appendChild(itemCard);

        this.updateItemsSummary();
    }

    static createItemCard(itemData) {
        const card = document.createElement('div');
        card.className = 'invoice-item-card';
        card.dataset.itemId = itemData.id;

        const lineTotal = itemData.quantity * itemData.rate;

        card.innerHTML = `
            <div>
                <div class="invoice-item-name">${itemData.name}</div>
                <div class="invoice-item-sub-row">
                    <span class="invoice-item-badge">Product</span>
                    <span class="invoice-item-sub invoice-item-sub-label">Subtotal</span>
                </div>
            </div>
            <div class="invoice-amount-block">
                <div class="invoice-amount">₹${lineTotal.toFixed(2)}</div>
                <div class="invoice-item-sub invoice-item-sub-value">
                    ${itemData.quantity} ${itemData.unitLabel} × ₹${itemData.rate.toFixed(2)} = ₹${lineTotal.toFixed(2)}
                </div>
            </div>
        `;

        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'invoice-item-remove';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
            import('./add-invoice.js').then(module => {
                module.removeItem(itemData.id);
            });
        };

        card.appendChild(removeBtn);
        return card;
    }

    static removeItemFromList(itemId) {
        const itemCard = document.querySelector(`[data-item-id="${itemId}"]`);
        if (itemCard) {
            itemCard.remove();
        }
        this.updateItemsSummary();
    }

    static updateItemsSummary(items) {
        const summaryEl = document.getElementById('invoice-demo-items-summary');
        if (!summaryEl) return;

        const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalCount = items.length;
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

        // Update summary values
        const qtyEl = document.getElementById('invoice-demo-total-qty');
        const countEl = document.getElementById('invoice-demo-total-count');
        const subtotalEl = document.getElementById('invoice-demo-subtotal');

        if (qtyEl) qtyEl.textContent = totalQty.toFixed(1);
        if (countEl) countEl.textContent = totalCount;
        if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);
    }

    static updateTotals(totals) {
        // Update total amount
        const totalEl = document.getElementById('invoice-demo-total');
        if (totalEl) totalEl.textContent = totals.total.toFixed(2);

        // Update received amount
        const receivedEl = document.getElementById('invoice-demo-received');
        if (receivedEl) receivedEl.value = totals.received.toFixed(2);

        // Update balance
        const balanceEl = document.getElementById('invoice-demo-balance');
        if (balanceEl) balanceEl.textContent = totals.balance.toFixed(2);
    }

    static updateItemsSummary(items) {
        const summaryEl = document.getElementById('invoice-items-summary');
        if (!summaryEl) return;

        const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalCount = items.length;
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

        // Update summary values
        const qtyEl = document.getElementById('invoice-total-qty');
        const countEl = document.getElementById('invoice-total-count');
        const subtotalEl = document.getElementById('invoice-subtotal');

        if (qtyEl) qtyEl.textContent = totalQty.toFixed(1);
        if (countEl) countEl.textContent = totalCount;
        if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);
    }

    static updateCustomerDisplay(customerData, type = 'sale') {
        const input = document.getElementById('invoice-demo-customer');
        if (input && customerData) {
            input.value = customerData.name;
        }
    }

    static resetForm() {
        // Reset customer
        const customerInput = document.getElementById('invoice-demo-customer');
        const phoneInput = document.getElementById('invoice-demo-phone');
        if (customerInput) customerInput.value = '';
        if (phoneInput) phoneInput.value = '';

        // Reset items
        const itemsContainer = document.getElementById('invoice-demo-items');
        if (itemsContainer) itemsContainer.innerHTML = '';

        // Reset charges
        const shippingInput = document.getElementById('invoice-demo-shipping');
        const packagingInput = document.getElementById('invoice-demo-packaging');
        const adjustmentInput = document.getElementById('invoice-demo-adjustment');

        if (shippingInput) shippingInput.value = '0.00';
        if (packagingInput) packagingInput.value = '0.00';
        if (adjustmentInput) adjustmentInput.value = '0.00';

        // Reset amounts
        const receivedInput = document.getElementById('invoice-demo-received');
        if (receivedInput) receivedInput.value = '0.00';

        this.updateTotals({
            subtotal: 0,
            charges: 0,
            discount: 0,
            tax: 0,
            total: 0,
            received: 0,
            balance: 0
        });
    }
}