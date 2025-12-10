import { createListCard, initCardHelper } from '../../../templates/cards/card-helper.js';
import { fetchAllItems } from '../../../utils/data-manager.js';

let isInitialized = false;
let eventListeners = []; // To keep track of added event listeners

function addManagedEventListener(element, type, listener, options) {
    if (!element) return;
    element.addEventListener(type, listener, options);
    eventListeners.push({ element, type, listener, options });
}

export async function init() {
    const view = document.getElementById('merchant-add-view');
    if (!view || isInitialized) {
        return;
    }

    // Initialize card helper
    initCardHelper({}); // Pass an empty object for now, unitsData might not be directly relevant here

    // --- NEW: Inventory Card Configuration ---
    const inventoryCardConfig = {
        fields: [
            { selector: '.card-image', type: 'image', key: 'media.thumbnail', default: './localstore/images/default-product.jpg' },
            { selector: '.card-title', key: 'info.name' },
            { selector: '.selling-price', key: 'pricing.sellingPrice', formatter: (price) => `₹${price.toFixed(2)}` },
            {
                selector: '.max-price',
                key: 'pricing.mrp',
                formatter: (mrp, item) => item.pricing.mrp > item.pricing.sellingPrice ? `₹${mrp.toFixed(2)}` : '',
                visible: (item) => item.pricing.mrp > item.pricing.sellingPrice
            },
            {
                selector: '.card-discount',
                visible: (item) => item.pricing.mrp > item.pricing.sellingPrice,
                formatter: (value, item) => {
                    const discount = ((item.pricing.mrp - item.pricing.sellingPrice) / item.pricing.mrp) * 100;
                    return `${discount.toFixed(0)}% off`;
                }
            },
            { selector: '.cost-price', key: 'pricing.costPrice', formatter: (price) => price ? `Cost: ₹${price.toFixed(2)}` : '', visible: (item) => item.pricing.costPrice > 0 },
            { selector: '.stars', visible: false }, // Rating display removed as per request
            { selector: '.stock-status', key: 'inventory.stockQty' } // This will be handled by createListCard's internal logic for stock/service status
        ],
        buttons: [
            { label: (item) => item.meta.flags.isPublic ? 'Private' : 'Public', action: 'TOGGLE_VISIBILITY' }, // Public/Private button
            { label: 'Edit', action: 'EDIT_ITEM' },
            { label: 'View Details', action: 'VIEW_DETAILS' },
            { label: 'Share me', action: 'SHARE_ITEM' }
        ],
        actionHandlers: {
            TOGGLE_VISIBILITY: (item) => {
                const newVisibility = !item.meta.flags.isPublic;
                alert(`${item.info.name} is now ${newVisibility ? 'Public' : 'Private'}`);
                // Implement actual logic to update item visibility
            },
            EDIT_ITEM: (item) => {
                alert(`Edit item: ${item.info.name}`);
                // Implement actual edit logic here
            },
            VIEW_DETAILS: (item) => {
                alert(`View details for: ${item.info.name}`);
                // Implement actual view details logic here
            },
            SHARE_ITEM: (item) => {
                alert(`Share item: ${item.info.name}`);
                // Implement actual share logic here
            }
        }
    };

    console.log('🚀 Initializing Merchant Add View...');

    const tabsContainer = document.querySelector('.add-primary-tabs');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabIndicator = document.querySelector('.tab-indicator');
    const contentContainer = document.querySelector('.add-screen-content');
    const contentPanes = document.querySelectorAll('.add-scrollable-content');
    const fabContainer = document.querySelector('.fab-container');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const fabMain = document.querySelector('.fab-main');
    const fabOptionsContainer = document.querySelector('.fab-options');
    const fabOverlay = document.querySelector('.fab-overlay-btn');
    const dateFilterPanel = document.getElementById('date-filter-panel');
    const dateFilterOverlay = document.getElementById('date-filter-overlay');
    const dateFilterCloseBtn = document.getElementById('date-filter-close-btn');

    // --- NEW: Centralized filter state ---
    let currentFilters = {
        primary: 'all', // 'all', 'sale', 'purchase', 'due'
        date: null      // { startDate, endDate, range: 'today'|'yesterday'|... } or null
    };

    // --- NEW: Centralized function to apply all filters and re-render ---
    function applyAllFiltersAndRender() {
        let filtered = [...dummyTransactions];

        // 1. Apply date filter first (if it exists)
        if (currentFilters.date) {
            const { startDate, endDate } = currentFilters.date;
            // Set end of day for the end date to include all transactions on that day
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);

            filtered = filtered.filter(tx => {
                const txDate = new Date(tx.details.transactionDate);
                return txDate >= startDate && txDate <= endOfDay;
            });
        }

        // 2. Apply primary filter (sale, purchase, etc.) on the already date-filtered list
        if (currentFilters.primary !== 'all') {
            filtered = filtered.filter(tx => tx.meta.type === currentFilters.primary);
        }
        renderTransactions(filtered);
    }


    // --- Speed Dial Actions Data ---
    const fabActions = {
        // REVISED: Actions are now clearer and more logical
        transactions: [
            { label: 'Payment Out', icon: 'fa-solid fa-money-bill-wave' }, // Money going out
            { label: 'Payment In', icon: 'fa-solid fa-hand-holding-dollar' }, // Money coming in
            { label: 'Purchase', icon: 'fa-solid fa-receipt' },
            { label: 'Sale', icon: 'fa-solid fa-cart-plus' },



        ],
        // REVISED: Reordered inventory actions as per user request
        inventory: [
            { label: 'Add Bulk Items', icon: 'fa-solid fa-boxes-stacked' },
            { label: 'Update Stock', icon: 'fa-solid fa-arrow-down-1-9' },
            { label: 'Add Item', icon: 'fa-solid fa-box-open' }
        ],
        parties: [
            { label: 'Add Customer', icon: 'fa-solid fa-user-plus' },
            { label: 'Add Supplier', icon: 'fa-solid fa-user-tie' },
        ],
        posts: [
            { label: 'Create Post', icon: 'fa-solid fa-pen-to-square' },
            { label: 'Create Poll', icon: 'fa-solid fa-poll' },
            { label: 'Add Story', icon: 'fa-solid fa-circle-plus' },
        ],
        offers: [
            { label: 'Add Offer / Discount', icon: 'fa-solid fa-percent' },
            { label: 'Schedule Flash Sale', icon: 'fa-solid fa-bolt' },
            { label: 'Add Coupon', icon: 'fa-solid fa-ticket' },

        ],
        banners: [
            { label: 'Design From Template', icon: 'fa-solid fa-pen-ruler' },
            { label: 'Add New Banner', icon: 'fa-solid fa-image' },

        ]
    };

    // --- NEW: Fetch all inventory items ---
    const allInventoryItems = await fetchAllItems();

    // --- NEW: Dummy Transaction Data & Rendering Logic ---
    const dummyTransactions = [
        {
            "meta": {
                "transactionId": "TRN-20251008-110000-123-ABCD",
                "type": "sale",
                "status": "partially_paid"
            },
            "party": {
                "name": "Priya Singh"
            },
            "details": {
                "billNumber": "SLE-123",
                "transactionDate": "2025-10-08T11:00:00Z"
            },
            "financials": {
                "currency": "INR",
                "totalAmount": 550.00,
                "paidAmount": 465.00,
                "due": 85.00
            }
        },
        {
            "meta": {
                "transactionId": "TRN-20251007-054500-456-EFGH",
                "type": "purchase",
                "status": "paid"
            },
            "party": {
                "name": "Global Distributors"
            },
            "details": {
                "billNumber": "PUR-456",
                "transactionDate": "2025-10-07T05:45:00Z"
            },
            "financials": {
                "currency": "INR",
                "totalAmount": 1200.00,
                "paidAmount": 1200.00,
                "due": 0.00
            }
        },
        // --- NEW: Example where a supplier is also a customer ---
        {
            "meta": {
                "transactionId": "TRN-20251009-091500-789-IJKL",
                "type": "sale", // This is a SALE to the supplier
                "status": "paid"
            },
            "party": {
                "name": "Global Distributors" // The same party from the purchase
            },
            "details": {
                "billNumber": "SLE-124",
                "transactionDate": "2025-10-09T09:15:00Z"
            },
            "financials": {
                "currency": "INR",
                "totalAmount": 300.00,
                "paidAmount": 300.00,
                "due": 0.00
            }
        },
        {
            "meta": {
                "transactionId": "TRN-20251010-143000-101-MNOP",
                "type": "sale",
                "status": "partially_paid"
            },
            "party": {
                "name": "Rohan Verma"
            },
            "details": {
                "billNumber": "SLE-125",
                "transactionDate": "2025-10-10T14:30:00Z"
            },
            "financials": {
                "currency": "INR",
                "totalAmount": 800.00,
                "paidAmount": 500.00,
                "due": 300.00
            }
        },
        {
            "meta": {
                "transactionId": "TRN-20251010-180000-102-QRST",
                "type": "purchase",
                "status": "paid"
            },
            "party": {
                "name": "National Suppliers"
            },
            "details": {
                "billNumber": "PUR-457",
                "transactionDate": "2025-10-10T18:00:00Z"
            },
            "financials": {
                "currency": "INR",
                "totalAmount": 2500.00,
                "paidAmount": 2500.00,
                "due": 0.00
            }
        },
        {
            "meta": {
                "transactionId": "TRN-20251011-100000-103-UVWX",
                "type": "sale",
                "status": "paid"
            },
            "party": {
                "name": "Anjali Sharma"
            },
            "details": {
                "billNumber": "SLE-126",
                "transactionDate": "2025-10-11T10:00:00Z"
            },
            "financials": {
                "currency": "INR",
                "totalAmount": 150.00,
                "paidAmount": 150.00,
                "due": 0.00
            }
        },
        {
            "meta": {
                "transactionId": "TRN-20251011-162000-104-YZAB",
                "type": "purchase",
                "status": "unpaid"
            },
            "party": {
                "name": "Local Wholesalers"
            },
            "details": {
                "billNumber": "PUR-458",
                "transactionDate": "2025-10-11T16:20:00Z"
            },
            "financials": {
                "currency": "INR",
                "totalAmount": 3200.00,
                "paidAmount": 0.00,
                "due": 3200.00
            }
        },
        {
            "meta": {
                "transactionId": "TRN-20251012-114500-105-CDEF",
                "type": "sale",
                "status": "paid"
            },
            "party": {
                "name": "Priya Singh"
            },
            "details": {
                "billNumber": "SLE-127",
                "transactionDate": "2025-10-12T11:45:00Z"
            },
            "financials": {
                "currency": "INR",
                "totalAmount": 275.00,
                "paidAmount": 275.00,
                "due": 0.00
            }
        }
    ];

    function renderTransactions(transactions) {
        const container = document.getElementById('transaction-list-container');
        if (!container) return;

        if (transactions.length === 0) {
            container.innerHTML = `<div class="placeholder-content" style="padding-top: 20px;"><i class="fas fa-receipt"></i><p>No transactions found.</p></div>`;
            return;
        }

        const cardsHTML = transactions.map(tx => {
            const { meta, party, details, financials } = tx;

            // Format date and time
            const date = new Date(details.transactionDate);
            const formattedDateTime = date.toLocaleString('en-IN', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true
            }).replace(',', '');

            // Determine badge class and total amount class
            const typeClass = meta.type === 'sale' ? 'sale' : 'purchase';
            const totalAmountClass = meta.type === 'sale' ? 'success' : 'danger';

            // Determine due amount class
            let dueAmountClass = '';
            if (financials.due > 0) {
                dueAmountClass = 'due';
            }

            // Format amounts
            const formattedTotal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: financials.currency }).format(financials.totalAmount);
            const formattedPaid = new Intl.NumberFormat('en-IN', { style: 'currency', currency: financials.currency }).format(financials.paidAmount);
            const formattedDue = new Intl.NumberFormat('en-IN', { style: 'currency', currency: financials.currency }).format(financials.due);

            return `
                        <div class="transaction-card" data-id="${meta.transactionId}">
                            <!-- Row 1: Party Name & Actions -->
                            <div class="transaction-row">
                                <span class="party-name">${party.name}</span>
                                <div class="transaction-actions">
                                    <button class="action-icon-btn" title="Print"><i class="fas fa-print"></i></button>
                                    <button class="action-icon-btn" title="Share"><i class="fas fa-share-alt"></i></button>
                                    <button class="action-icon-btn" title="More"><i class="fas fa-ellipsis-v"></i></button>
                                </div>
                            </div>
                            <!-- Row 2: Meta & Datetime -->
                            <div class="transaction-row">
                                <div class="transaction-meta">
                                    <span class="transaction-badge ${typeClass}">${meta.type}</span>
                                    <span class="bill-no">#${details.billNumber}</span>
                                </div>
                                <span class="transaction-datetime">${formattedDateTime}</span>
                            </div>
                            <!-- Row 3: Financials -->
                            <div class="transaction-row transaction-financials">
                                <span>Total: <span class="amount ${totalAmountClass}">${formattedTotal}</span></span>
                                <span class="text-center">Paid: <span class="amount success">${formattedPaid}</span></span>
                                <span class="text-right">Due: <span class="amount ${dueAmountClass}">${formattedDue}</span></span>
                            </div>
                        </div>
                    `;
        }).join('');

        container.innerHTML = cardsHTML;
    }

    // --- NEW: Function to render inventory items ---
    function renderInventory(inventory, filter = 'all') {
        const container = document.getElementById('inventory-list-container');
        if (!container) return;

        let filteredInventory = inventory;
        if (filter === 'product' || filter === 'service') {
            filteredInventory = inventory.filter(item => item.meta.type === filter);
        }

        if (filteredInventory.length === 0) {
            container.innerHTML = `<div class="placeholder-content" style="padding-top: 20px;"><i class="fas fa-boxes"></i><p>No items found for this filter.</p></div>`;
            return;
        }

        container.innerHTML = ''; // Clear existing content

        filteredInventory.forEach(item => {
            const cardElement = createListCard(item, inventoryCardConfig);
            if (cardElement) {
                container.appendChild(cardElement);
            }
        });
    }

    // --- NEW: Listener for inventory filter buttons ---
    document.querySelectorAll('.add-scrollable-content[data-tab="inventory"] .filter-btn').forEach(button => {
        button.addEventListener('click', function () {
            const filter = this.dataset.inventoryFilter;
            if (filter !== 'advanced') {
            renderInventory(allInventoryItems, filter);
            }
        });
    });
    // --- REFACTORED: Function to render parties based on filter ---
    function renderParties(filter = 'all') { // 'all', 'customer', 'supplier'
        const container = document.getElementById('party-list-container');
        const placeholderText = 'No parties found.';
        const defaultIcon = 'fa-user-circle';

        if (!container) return;

        // 1. Filter transactions based on the selected party filter
        let relevantTransactions;
        if (filter === 'customer') {
            relevantTransactions = dummyTransactions.filter(tx => tx.meta.type === 'sale');
        } else if (filter === 'supplier') {
            relevantTransactions = dummyTransactions.filter(tx => tx.meta.type === 'purchase');
        } else {
            relevantTransactions = dummyTransactions; // 'all'
        }

        if (relevantTransactions.length === 0) {
            container.innerHTML = `<div class="placeholder-content" style="padding-top: 20px;"><i class="fas ${defaultIcon}"></i><p>${placeholderText}</p></div>`;
            return;
        }

        // 2. Create a map of unique parties and their last transaction date
        const partiesMap = new Map();
        relevantTransactions.forEach(tx => {
            const partyName = tx.party.name;
            const partyType = tx.meta.type; // 'sale' or 'purchase'
            const txDate = new Date(tx.details.transactionDate);

            if (!partiesMap.has(partyName)) {
                // Initialize with balance
                partiesMap.set(partyName, { lastDate: txDate, types: new Set(), balance: 0 });
            }
            const existing = partiesMap.get(partyName);
            existing.types.add(partyType);
            existing.balance += (partyType === 'sale' ? tx.financials.due : -tx.financials.due);
            if (txDate > existing.lastDate) { // Update last transaction date
                existing.lastDate = txDate;
            }
        });

        // 3. Generate HTML for each unique party card
        const partyCardsHTML = Array.from(partiesMap.entries()).map(([name, data]) => {
            const now = new Date();
            const lastDate = data.lastDate;
            const diffTime = Math.abs(now - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            let subtitle = '';
            if (diffDays <= 1) subtitle = `Last transaction: Today`;
            else if (diffDays === 2) subtitle = `Last transaction: Yesterday`;
            else if (diffDays <= 7) subtitle = `Last transaction: ${diffDays - 1} days ago`;
            else if (diffDays <= 30) subtitle = `Last transaction: ${Math.floor((diffDays - 1) / 7)} weeks ago`;
            else subtitle = `Last transaction: ${new Date(lastDate).toLocaleDateString('en-GB')}`;

            // Determine balance display
            let balanceHTML = '';
            let balanceLabelHTML = '';
            if (data.balance !== 0) {
                const balance = Math.abs(data.balance);
                // Positive balance means party owes us (Receivable -> Danger/Red)
                // Negative balance means we owe the party (Payable -> Success/Green)
                const balanceClass = data.balance > 0 ? 'danger' : 'success';
                const balanceLabel = data.balance > 0 ? 'Receivable' : 'Payable';
                balanceHTML = `<div class="party-balance-amount content-card-amount ${balanceClass}">₹${balance.toLocaleString('en-IN')}</div>`;
                balanceLabelHTML = `<div class="party-balance-label">${balanceLabel}</div>`;
            } else {
                // NEW: Handle zero balance case for consistent layout
                balanceHTML = `<div class="party-balance-amount" style="color: var(--text-secondary);">₹00</div>`;
                balanceLabelHTML = `<div class="party-balance-label" style="color: var(--text-secondary);">Settled</div>`;
            }

            // Determine icon based on party type(s)
            let iconClass;
            // NEW LOGIC (as per user feedback): Prioritize supplier. If a party has ANY purchase transaction, they are a supplier.
            // Only show customer icon if they have ONLY sale transactions.
            if (data.types.has('purchase')) {
                iconClass = 'fa-user-tie'; // Supplier (or both, but supplier icon takes priority)
            } else {
                iconClass = 'fa-user'; // Customer only
            }

            return `
                        <div class="content-card">
                            <div class="content-card-icon"><i class="fas ${iconClass}"></i></div>
                            <!-- RESTRUCTURED: Details are now in a 2-row layout -->
                            <div class="content-card-details">
                                <div class="party-details-row">
                                    <div class="content-card-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
                                    ${balanceHTML}
                                </div>
                                <div class="party-details-row">
                                    <div class="content-card-subtitle">${subtitle}</div>
                                    ${balanceLabelHTML}
                                </div>
                            </div>
                        </div>
                    `;
        }).join('');

        container.innerHTML = partyCardsHTML;
    }

    let activeTabIndex = 0;
    let activeTabId = 'transactions';

    // --- FAB & Speed Dial Logic ---
    function updateFabOptions() {
        const actions = fabActions[activeTabId] || [];
        fabOptionsContainer.innerHTML = actions.map(action => `
                    <div class="fab-option-item">
                        <span class="fab-option-label">${action.label}</span>
                        <div class="fab-option-icon"><i class="${action.icon}"></i></div>
                    </div>
                `).join('');
    }

    function toggleFabMenu(forceState) {
        const isOpen = fabContainer.classList.contains('open');
        const shouldOpen = forceState !== undefined ? forceState : !isOpen;

        if (shouldOpen) {
            fabContainer.classList.add('open');
            fabMain.classList.add('open');
            fabOverlay.classList.add('visible');
        } else {
            fabContainer.classList.remove('open');
            fabMain.classList.remove('open');
            fabOverlay.classList.remove('visible');
        }
    }

    addManagedEventListener(fabMain, 'click', (e) => {
        e.stopPropagation();
        toggleFabMenu();
    });

    addManagedEventListener(fabOverlay, 'click', () => {
        toggleFabMenu(false);
    });

    addManagedEventListener(fabOptionsContainer, 'click', (e) => {
        const optionItem = e.target.closest('.fab-option-item');
        if (optionItem) {
            const label = optionItem.querySelector('.fab-option-label').textContent;
            console.log(`Action clicked: ${label}`);
            // Here you would trigger the actual action, e.g., opening a new form/view
            alert(`Action: ${label}`);
            toggleFabMenu(false);
        }
    });

    // --- Tab Switching Logic ---

    function updateIndicator(activeTab) {
        tabIndicator.style.width = `${activeTab.offsetWidth}px`;
        tabIndicator.style.left = `${activeTab.offsetLeft}px`;
    }

    function switchTab(index) {
        if (index < 0 || index >= tabButtons.length) return;

        const newActiveTab = tabButtons[index];
        activeTabId = newActiveTab.dataset.tab;

        // Update button active state
        tabButtons.forEach(btn => btn.classList.remove('active'));
        newActiveTab.classList.add('active');

        // Update indicator position
        updateIndicator(newActiveTab);

        // Scroll tab into view
        newActiveTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

        // Slide content panes
        const offset = -index * 100;
        contentPanes.forEach(pane => {
            pane.style.transform = `translateX(${offset}%)`;
        });

        activeTabIndex = index;

        // --- NEW: Render content for specific tabs when they become active ---
        if (activeTabId === 'parties') {
            renderParties(); // Render with default 'all' filter
        } else if (activeTabId === 'inventory') {
            renderInventory(allInventoryItems); // Render with default 'all' filter
        }


        // Update the FAB options for the new tab
        updateFabOptions();
    }

    function updateIndicator(activeTab) {
        tabIndicator.style.width = `${activeTab.offsetWidth}px`;
        tabIndicator.style.left = `${activeTab.offsetLeft}px`;
    }

    // Initialize
    const initialActiveTab = document.querySelector('.tab-btn.active');
    if (initialActiveTab) {
        activeTabIndex = Array.from(tabButtons).indexOf(initialActiveTab);
        updateIndicator(initialActiveTab);
        switchTab(activeTabIndex); // Set initial content position
        updateFabOptions(); // Initial FAB options
    }

    // --- Initial Render Call ---
    addManagedEventListener(tabsContainer, 'click', (e) => {
        const clickedTab = e.target.closest('.tab-btn');
        if (clickedTab) {
            switchTab(Array.from(tabButtons).indexOf(clickedTab));
        }
    });
    renderTransactions(dummyTransactions);

    // --- NEW: Inventory Filter Button Listeners ---
    document.querySelectorAll('.add-scrollable-content[data-tab="inventory"] .filter-btn').forEach(button => {
        addManagedEventListener(button, 'click', function () {
            const filter = this.dataset.inventoryFilter;

            // If the advanced filter icon is clicked, handle it separately.
            if (filter === 'advanced') {
                const inventoryFilterPanel = document.getElementById('inventory-filter-panel');
                const inventoryFilterOverlay = document.getElementById('inventory-filter-overlay');
                inventoryFilterPanel.classList.add('visible');
                inventoryFilterOverlay.classList.add('visible');

                document.getElementById('inventory-filter-close-btn').onclick = () => {
                    inventoryFilterPanel.classList.remove('visible');
                    inventoryFilterOverlay.classList.remove('visible');
                };
                inventoryFilterOverlay.onclick = () => {
                    inventoryFilterPanel.classList.remove('visible');
                    inventoryFilterOverlay.classList.remove('visible');
                };
                // Do not change the primary filter's active state.
                return;
            }

            // For primary filters (All, Products, Services), update the active state and re-render.
            updateActiveFilterButton(this);
            renderInventory(dummyInventory, filter);
        });
    });

    // --- NEW: Event listeners for the newly added filter bars ---

    // Listener for Posts Tab
    document.querySelectorAll('.add-scrollable-content[data-tab="posts"] .filter-btn').forEach(button => {
        addManagedEventListener(button, 'click', function () {
            const filter = this.dataset.contentFilter;
            if (filter === 'advanced') {
                // Handle advanced filter separately, maybe open a modal
                console.log('Advanced Posts filter clicked. Not changing primary active state.');
                return;
            }
            updateActiveFilterButton(this);
        });
    });

    // Listener for Offers Tab
    document.querySelectorAll('.add-scrollable-content[data-tab="offers"] .filter-btn').forEach(button => {
        addManagedEventListener(button, 'click', function () {
            updateActiveFilterButton(this);
            console.log('Offer filter clicked:', this.dataset.offerFilter);
        });
    });

    // Listener for Banners Tab
    document.querySelectorAll('.add-scrollable-content[data-tab="banners"] .filter-btn').forEach(button => {
        addManagedEventListener(button, 'click', function () {
            updateActiveFilterButton(this);
            console.log('Banner filter clicked:', this.dataset.bannerFilter);
        });
    });
    // --- NEW: Function to check if party filters are active ---
    function arePartyFiltersActive() {
        const selectedSort = document.querySelector('input[name="party_sort"]:checked');
        return selectedSort && selectedSort.value !== 'name_asc'; // 'name_asc' is the default
    }

    function updatePartyFilterIcon() {
        document.querySelector('.filter-btn[data-party-filter="advanced"]').classList.toggle('active', arePartyFiltersActive());
    }

    // --- NEW: Party Filter Button Listeners ---
    // FIX: Make selector more specific to only target party filters
    document.querySelectorAll('.add-scrollable-content[data-tab="parties"] .filter-btn').forEach(button => {
        addManagedEventListener(button, 'click', function () {
            const newFilter = this.dataset.partyFilter;

            // --- NEW: Open the party filter panel ---
            if (newFilter === 'advanced') {
                const partyFilterPanel = document.getElementById('party-filter-panel');
                const partyFilterOverlay = document.getElementById('party-filter-overlay');

                // Toggle Panel
                const isVisible = partyFilterPanel.classList.contains('visible');
                if (isVisible) {
                    partyFilterPanel.classList.remove('visible');
                    partyFilterOverlay.classList.remove('visible');
                } else {
                    partyFilterPanel.classList.add('visible');
                    partyFilterOverlay.classList.add('visible');
                }

                // Add close listeners if not already added
                document.getElementById('party-filter-close-btn').onclick = () => {
                    partyFilterPanel.classList.remove('visible');
                    partyFilterOverlay.classList.remove('visible');
                };
                partyFilterOverlay.onclick = () => {
                    partyFilterPanel.classList.remove('visible');
                    partyFilterOverlay.classList.remove('visible');
                };
                return;
            }
            // Update active state
            document.querySelectorAll('.filter-btn[data-party-filter]').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Re-render the party list with the new filter
            renderParties(this.dataset.partyFilter);
        });
    });

    // --- NEW: Party Filter Panel Apply/Reset Logic ---
    addManagedEventListener(document.getElementById('party-filter-apply-btn'), 'click', () => {
        const selectedSort = document.querySelector('input[name="party_sort"]:checked').value;
        // In a real app, you would re-fetch/re-sort data here based on `selectedSort`
        console.log('Applying party sort:', selectedSort);
        updatePartyFilterIcon();
        document.getElementById('party-filter-panel').classList.remove('visible');
        document.getElementById('party-filter-overlay').classList.remove('visible');
    });

    addManagedEventListener(document.getElementById('party-filter-reset-btn'), 'click', () => {
        document.querySelector('input[name="party_sort"][value="name_asc"]').checked = true;
        console.log('Resetting party sort to default.');
        updatePartyFilterIcon();
        document.getElementById('party-filter-panel').classList.remove('visible');
        document.getElementById('party-filter-overlay').classList.remove('visible');
    });

    // --- NEW: Function to check if inventory filters are active ---
    function areInventoryFiltersActive() {
        const selectedSort = document.querySelector('input[name="inventory_sort"]:checked');
        return selectedSort && selectedSort.value !== 'stock_desc'; // 'stock_desc' is the default
    }

    function updateInventoryFilterIcon() {
        document.querySelector('.filter-btn[data-inventory-filter="advanced"]').classList.toggle('active', areInventoryFiltersActive());
    }

    // --- NEW: Inventory Filter Panel Apply/Reset Logic (Placeholder) ---
    addManagedEventListener(document.getElementById('inventory-filter-apply-btn'), 'click', () => {
        // In a real app, you would re-fetch/re-sort data here
        const selectedSort = document.querySelector('input[name="inventory_sort"]:checked').value;
        console.log('Applying inventory sort:', selectedSort);
        updateInventoryFilterIcon();
        document.getElementById('inventory-filter-panel').classList.remove('visible');
        document.getElementById('inventory-filter-overlay').classList.remove('visible');
    });

    addManagedEventListener(document.getElementById('inventory-filter-reset-btn'), 'click', () => {
        document.querySelector('input[name="inventory_sort"][value="stock_desc"]').checked = true;
        console.log('Resetting inventory sort to default.');
        updateInventoryFilterIcon();
        document.getElementById('inventory-filter-panel').classList.remove('visible');
        document.getElementById('inventory-filter-overlay').classList.remove('visible');
    });

    // --- NEW: Centralized function to update active state across ALL filter bars ---
    // This is the key fix for the inconsistent highlighting issue.
    function updateActiveFilterButton(clickedButton) {
        // 1. Find the specific filter bar containing the clicked button.
        const parentFilterBar = clickedButton.closest('.content-filter-bar');
        if (!parentFilterBar) return;

        // 2. Remove 'active' class ONLY from buttons within that specific bar.
        parentFilterBar.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));

        // 3. Add 'active' class ONLY to the button that was clicked.
        clickedButton.classList.add('active');
    }

    // --- NEW: Filter Button Listeners ---
    // FIX: Make selector more specific to only target transaction filters
    document.querySelectorAll('.add-scrollable-content[data-tab="transactions"] .filter-btn').forEach(button => {
        addManagedEventListener(button, 'click', function () {
            // 1. Update active class for the button
            const newFilter = this.dataset.filter;

            // If date filter button is clicked, just open the panel
            if (newFilter === 'date') {
                toggleDateFilterPanel(true);
                return; // Stop here, don't change active states
            }

            // --- FIX: When switching primary filters, keep the date filter icon active if a date filter is set. ---
            // This ensures the calendar icon stays highlighted, indicating the date filter is still applied.
            updateActiveFilterButton(this);

            // Update the primary filter state
            currentFilters.primary = newFilter;

            applyAllFiltersAndRender();
        });
    });

    // --- NEW: Date Filter Panel Logic ---
    function toggleDateFilterPanel(show) {
        if (show) {
            dateFilterPanel.classList.add('visible');
            dateFilterOverlay.classList.add('visible');
        } else {
            // When hiding, clear any active preset buttons
            document.querySelectorAll('.date-filter-options .date-filter-btn.active').forEach(btn => {
                btn.classList.remove('active');
            });

            // And re-apply the active class based on the current filter state
            if (currentFilters.date?.range) {
                const activePresetBtn = document.querySelector(`.date-filter-options .date-filter-btn[data-range="${currentFilters.date.range}"]`);
                if (activePresetBtn) activePresetBtn.classList.add('active');
            }

            dateFilterPanel.classList.remove('visible');
            dateFilterOverlay.classList.remove('visible');
        }
    }

    addManagedEventListener(dateFilterCloseBtn, 'click', () => toggleDateFilterPanel(false));
    addManagedEventListener(dateFilterOverlay, 'click', () => toggleDateFilterPanel(false));

    // --- FIX: Make the selector more specific to only target preset range buttons ---
    document.querySelectorAll('.date-filter-options .date-filter-btn').forEach(button => {
        addManagedEventListener(button, 'click', function () {
            // Visually update active preset button
            document.querySelectorAll('.date-filter-options .date-filter-btn.active').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');

            const range = this.dataset.range;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let startDate, endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            switch (range) {
                case 'today':
                    startDate = today;
                    break;
                case 'yesterday':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 1);
                    endDate = new Date(startDate);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'this_week':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - today.getDay());
                    break;
                case 'this_month':
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    break;
            }
            // Clear custom date inputs when a preset is chosen
            startDateInput.value = '';
            endDateInput.value = '';

            // FIX: Do not apply filter or close panel here. Just stage the selection.
            // The "Apply" button will handle the logic.
        });
    });
    // --- FIX: When a date filter is applied, also update the active filter button ---
    function setActiveFilterButton(filterName, isDateFilterActive = false) {
        filterButtons.forEach(btn => {
            if (btn.dataset.filter === 'date') {
                btn.classList.toggle('active', isDateFilterActive);
            } else {
                btn.classList.toggle('active', btn.dataset.filter === filterName);
            }
        });
    }

    // --- NEW: Update display when a date is selected ---
    const startDateInput = document.getElementById('date-filter-start');
    const endDateInput = document.getElementById('date-filter-end');
    const startDateDisplay = document.getElementById('date-display-start');
    const endDateDisplay = document.getElementById('date-display-end');

    addManagedEventListener(startDateInput, 'change', function () {
        const startDate = this.value;
        startDateDisplay.querySelector('span').textContent = startDate ? new Date(startDate).toLocaleDateString('en-GB') : 'Start Date';

        // When a custom date is changed, clear the active state from preset buttons
        document.querySelectorAll('.date-filter-options .date-filter-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });
        if (currentFilters.date) currentFilters.date.range = 'custom';

        // --- FIX: Prevent end date from being before start date ---
        endDateInput.min = startDate; // Set the minimum allowed end date
        if (endDateInput.value && endDateInput.value < startDate) {
            endDateInput.value = startDate; // Auto-correct the end date
            endDateDisplay.querySelector('span').textContent = new Date(startDate).toLocaleDateString('en-GB');
        }
    });

    addManagedEventListener(endDateInput, 'change', function () {
        const endDate = this.value;
        endDateDisplay.querySelector('span').textContent = endDate ? new Date(endDate).toLocaleDateString('en-GB') : 'End Date';

        // When a custom date is changed, clear the active state from preset buttons
        document.querySelectorAll('.date-filter-options .date-filter-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });
        if (currentFilters.date) currentFilters.date.range = 'custom';

        // --- FIX: Prevent start date from being after end date ---
        if (startDateInput.value && startDateInput.value > endDate) {
            startDateInput.value = endDate; // Auto-correct the start date
            startDateDisplay.querySelector('span').textContent = new Date(endDate).toLocaleDateString('en-GB');
        }
    });

    // --- NEW: Reset button functionality ---
    addManagedEventListener(document.getElementById('date-filter-reset-btn'), 'click', () => {
        startDateInput.value = '';
        endDateInput.value = '';
        startDateDisplay.querySelector('span').textContent = 'Start Date';
        endDateDisplay.querySelector('span').textContent = 'End Date';
        document.querySelectorAll('.date-filter-options .date-filter-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });

        // Reset filter state and re-render
        currentFilters.primary = 'all';
        currentFilters.date = null;
        setActiveFilterButton('all', false); // Set 'all' as active, and date icon as inactive

        applyAllFiltersAndRender();
        toggleDateFilterPanel(false); // Close the panel
    });

    // --- REFACTORED: Apply button now updates state and calls the main filter function ---
    addManagedEventListener(document.getElementById('date-filter-apply-btn'), 'click', () => {
        // --- NEW: Centralized apply logic ---
        const startDateValue = startDateInput.value;
        const endDateValue = endDateInput.value;
        const activePresetBtn = document.querySelector('.date-filter-options .date-filter-btn.active');

        let newDateFilter = null;

        // Case 1: A preset button is active
        if (activePresetBtn) {
            const range = activePresetBtn.dataset.range;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let startDate, endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            switch (range) {
                case 'today':
                    startDate = today;
                    break;
                case 'yesterday':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 1);
                    endDate = new Date(startDate);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'this_week':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - today.getDay());
                    break;
                case 'this_month':
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    break;
            }
            if (startDate && endDate) {
                newDateFilter = { startDate, endDate, range: range };
            }
        }
        // Case 2: Custom date range is selected
        else if (startDateValue && endDateValue) {
            newDateFilter = {
                startDate: new Date(startDateValue),
                endDate: new Date(endDateValue),
                range: 'custom'
            };
        }

        currentFilters.date = newDateFilter;
        // --- FIX: Correctly highlight the date icon if a date filter is applied ---
        const dateIconBtn = document.querySelector('.add-scrollable-content[data-tab="transactions"] .filter-btn[data-filter="date"]');
        if (dateIconBtn) {
            dateIconBtn.classList.toggle('active', !!newDateFilter);
        }
        applyAllFiltersAndRender();
        toggleDateFilterPanel(false);
    });

    // Swipe listeners
    let touchStartX = 0;
    let touchEndX = 0;

    addManagedEventListener(contentContainer, 'touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    addManagedEventListener(contentContainer, 'touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50; // Minimum pixels for a swipe
        if (touchEndX < touchStartX - swipeThreshold) {
            // Swiped left
            switchTab(activeTabIndex + 1);
        }
        if (touchEndX > touchStartX + swipeThreshold) {
            // Swiped right
            switchTab(activeTabIndex - 1);
        }
    }

    enableHorizontalScroll('.content-filter-bar'); // For the filter bar
    enableHorizontalScroll('.add-primary-tabs');     // For the top tabs

    isInitialized = true;
    console.log('✅ Merchant Add View Initialized.');
}

export function cleanup() {
    console.log('🧹 Cleaning up Merchant Add View...');
    eventListeners.forEach(({ element, type, listener, options }) => {
        if (element) {
            element.removeEventListener(type, listener, options);
        }
    });
    eventListeners = []; // Clear the array

    // --- NEW: Remove dynamically added card-helper elements ---
    const styleElement = document.getElementById('card-list-component-styles');
    if (styleElement) {
        styleElement.remove();
    }
    const templateElement = document.getElementById('list-card-template');
    if (templateElement) {
        templateElement.remove();
    }

    isInitialized = false;
    console.log('🧹 Merchant Add View Cleaned.');
}

// --- NEW: Horizontal Mouse Wheel Scroll for Scrollable Bars ---
function enableHorizontalScroll(selector) {
    const element = document.querySelector(selector);
    addManagedEventListener(element, 'wheel', (e) => {
        // Prevent the default vertical scroll when scrolling over the element
        e.preventDefault();
        // Scroll the element horizontally instead
        element.scrollLeft += e.deltaY;
    }, { passive: false });
}