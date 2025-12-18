import { loadInstantAddItemModal } from './instant-add-item.js';
import { InvoiceEventManager } from './invoice-event-manager.js';

export async function init() {
    const itemsUrl = '../../../localstore/jsons/items.json';
    const unitsUrl = '../../../localstore/jsons/units.json';

    const itemsListEl = document.getElementById('invoice-demo-items');
    const totalEl = document.getElementById('invoice-demo-total');
    const balanceEl = document.getElementById('invoice-demo-balance');
    const receivedEl = document.getElementById('invoice-demo-received');

    // Modal elements removed - now using instant-add-item modal

    const itemsSummaryEl = document.getElementById('invoice-demo-items-summary');
    const subtotalSummaryEl = document.getElementById('invoice-demo-subtotal');
    const totalQtySummaryEl = document.getElementById('invoice-demo-total-qty');
    const totalCountSummaryEl = document.getElementById('invoice-demo-total-count');
    const totalTaxSummaryEl = document.getElementById('invoice-demo-total-tax');
    const totalDiscSummaryEl = document.getElementById('invoice-demo-total-disc');

    let catalog = [];
    let unitOptions = [];


    // Pre-filled sample billed items so UI samajhne ke liye bina add kiye hi list dikhe
    let billedItems = [
      {
        id: 'SAMPLE-ITEM-1',
        name: 'Sample Item 1',
        qty: 2,
        unit: 'Pcs',
        unitLabel: 'Pcs',
        mrp: 5,
        rate: 5,
        count: 0,
        desc: ''
      }
    ];

    async function loadLocalJson(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load ' + url);
        return res.json();
    }

    function formatCurrency(amount) {
        return '₹ ' + (amount || 0).toFixed(2);
    }


    // Functions for handling modal removed - now handled by instant-add-item modal

    function renderItems() {
      if (!itemsListEl) return;
      if (billedItems.length === 0) {
        itemsListEl.innerHTML = '<div class="invoice-item-sub">No items added yet.</div>';
        totalEl.textContent = '0.00';
        balanceEl.textContent = '0.00';
        if (itemsSummaryEl) {
          itemsSummaryEl.style.display = 'none';
        }
        return;
      }

      itemsListEl.innerHTML = billedItems
        .map((entry, index) => {
          const lineTotal = entry.qty * entry.rate;
          return `
          <div class="invoice-item-card" data-item-id="${entry.id}" onclick="editInvoiceItem(${index})">
            <div class="invoice-item-header">
              <div class="invoice-item-name">${index + 1}. ${entry.name}</div>
              <div class="invoice-amount">${formatCurrency(lineTotal)}</div>
            </div>
            <div class="invoice-item-details">
              <span class="invoice-item-sub invoice-item-sub-label">Subtotal</span>
              <div class="invoice-item-sub invoice-item-sub-value">
                ${entry.qty} ${entry.unitLabel} × ${formatCurrency(entry.rate)} = ${formatCurrency(lineTotal)}
              </div>
            </div>
          </div>
        `;
        })
        .join('');

      const total = billedItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
      const totalQty = billedItems.reduce((sum, item) => sum + (item.qty || 0), 0);
      const totalCount = billedItems.reduce((sum, item) => sum + (item.count || 0), 0);
      totalEl.textContent = total.toFixed(2);
      const received = Number(receivedEl.value) || 0;
      balanceEl.textContent = Math.max(total - received, 0).toFixed(2);

      if (itemsSummaryEl) {
        itemsSummaryEl.style.display = 'grid';
        if (subtotalSummaryEl) subtotalSummaryEl.textContent = total.toFixed(2);
        if (totalQtySummaryEl) totalQtySummaryEl.textContent = totalQty.toFixed(1);
        if (totalCountSummaryEl) totalCountSummaryEl.textContent = String(totalCount);
        if (totalTaxSummaryEl) totalTaxSummaryEl.textContent = '0.0';
        if (totalDiscSummaryEl) totalDiscSummaryEl.textContent = '0.0';
      }
    }

    function addItemFromModal(itemData) {
      // itemData comes from instant-add-item modal
      const entry = {
        id: itemData.id || 'custom_' + Date.now(),
        name: itemData.name || 'Custom Item',
        qty: Number(itemData.qty) || 0,
        unit: itemData.unit || 'Pcs',
        unitLabel: itemData.unitLabel || itemData.unit || 'Pcs',
        mrp: Number(itemData.mrp || itemData.purchasePrice) || 0,
        rate: Number(itemData.rate || itemData.salePrice) || 0,
        count: Number(itemData.count) || null,
        desc: itemData.description || itemData.desc || ''
      };

      if (!entry.qty || !entry.rate) {
        alert('Please enter Quantity and Rate to add item.');
        return;
      }

      // Check if this is an edit operation
      if (itemData.editIndex !== undefined && itemData.editIndex >= 0) {
        // Update existing item
        billedItems[itemData.editIndex] = entry;
      } else {
        // Add new item
        billedItems.push(entry);
      }

      renderItems();
    }

    // Global function to edit invoice items
    window.editInvoiceItem = function(index) {
      const item = billedItems[index];
      if (!item) return;

      // Open the modal with pre-filled data for editing
      loadInstantAddItemModal(true, item, index);
    }

    async function init() {
      try {
        const [itemsData, unitsData] = await Promise.all([
          loadLocalJson(itemsUrl),
          loadLocalJson(unitsUrl)
        ]);
        catalog = Array.isArray(itemsData) ? itemsData : [];

        // Flatten units.json to simple options (prefer popular subunits)
        unitOptions = [];
        unitsData.forEach((unitGroup) => {
          (unitGroup.subunits || []).forEach((sub) => {
            unitOptions.push({
              code: sub.code,
              label: sub.title || sub.symbol || sub.code
            });
          });
        });

      } catch (err) {
        console.error(err);
        // Fallback demo data if fetch fails (e.g., opened via file://)
        catalog = [
          {
            meta: { itemId: 'DEMO-ITEM-1' },
            info: { name: 'Demo Item 1', description: 'Sample demo item' },
            pricing: { mrp: 10, sellingPrice: 10 }
          }
        ];
        unitOptions = [{ code: 'Pcs', label: 'Pcs' }];
      }

      if (unitOptions.length === 0) {
        unitOptions = [{ code: 'Pcs', label: 'Pcs' }];
      }

      renderItems();
    }

    document.getElementById('invoice-demo-add-item').addEventListener('click', () => {
      loadInstantAddItemModal();
    });

    // Included items collapse / expand
    const itemsSection = document.getElementById('invoice-demo-items-section');
    const toggleItemsBtn = document.getElementById('invoice-demo-toggle-items');
    if (itemsSection && toggleItemsBtn) {
      toggleItemsBtn.addEventListener('click', () => {
        itemsSection.classList.toggle('section-collapsed');
      });
    }

    // Included charges collapse / expand
    const chargesSection = document.getElementById('invoice-demo-charges-section');
    const toggleChargesBtn = document.getElementById('invoice-demo-toggle-charges');
    if (chargesSection && toggleChargesBtn) {
      toggleChargesBtn.addEventListener('click', () => {
        chargesSection.classList.toggle('section-collapsed');
      });
    }

    // Payment type badge cycling
    const paymentBadge = document.getElementById('invoice-demo-payment-badge');
    const paymentTypes = ['Cash', 'Online', 'Card', 'UPI'];
    let currentPaymentIndex = 0;

    if (paymentBadge) {
      paymentBadge.addEventListener('click', () => {
        currentPaymentIndex = (currentPaymentIndex + 1) % paymentTypes.length;
        paymentBadge.textContent = paymentTypes[currentPaymentIndex];
      });
    }

    // Old modal event listeners removed - now using instant-add-item modal
    receivedEl.addEventListener('input', renderItems);

    // Listen for item added from instant-add-item modal
    document.addEventListener('itemAdded', (e) => {
      addItemFromModal(e.detail);
    });

    // Initialize invoice meta field event handlers
    const invoiceEventManager = InvoiceEventManager.initializeEventHandlers();

    // Attachment field icons visibility and ripple effect
    const attachmentInput = document.getElementById('invoice-demo-attachment');
    const attachmentIcons = document.getElementById('invoice-demo-attachment-icons');

    if (attachmentInput && attachmentIcons) {
      attachmentInput.addEventListener('change', () => {
        if (attachmentInput.files && attachmentInput.files.length > 0) {
          attachmentIcons.style.display = 'flex';
        } else {
          attachmentIcons.style.display = 'none';
        }
      });
    }

    // Add ripple effect to attachment icons
    const attachmentIconButtons = document.querySelectorAll('.invoice-attachment-icon');
    attachmentIconButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        // Get button dimensions
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        // Remove existing ripples
        const existingRipples = this.querySelectorAll('.ripple');
        existingRipples.forEach(r => r.remove());

        this.appendChild(ripple);

        // Remove ripple after animation
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });

    // Add ripple effect to action buttons (Save and Save & New)
    const actionButtons = document.querySelectorAll('.primary-btn, .secondary-btn');
    actionButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        // Get button dimensions
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        // Remove existing ripples
        const existingRipples = this.querySelectorAll('.ripple');
        existingRipples.forEach(r => r.remove());

        this.appendChild(ripple);

        // Remove ripple after animation
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });

    init();
}