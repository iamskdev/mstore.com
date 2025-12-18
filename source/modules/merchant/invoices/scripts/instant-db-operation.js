/**
 * Database operations for Instant Add Item Modal
 * Handles item saving, form submission, data loading, and related database interactions
 */

export class InstantAddItemDBOperations {
    constructor(modalInstance) {
        this.modal = modalInstance;
    }

    setupSaveButtons() {
        const saveItemBtn = document.getElementById('invoice-save-item');
        const saveNewBtn = document.getElementById('invoice-save-new');

        if (saveItemBtn) {
            saveItemBtn.addEventListener('click', () => {
                this.saveItem(false); // false = don't keep modal open
            });
        }

        if (saveNewBtn) {
            saveNewBtn.addEventListener('click', () => {
                this.saveItem(true); // true = keep modal open for new item
            });
        }
    }

    saveItem(keepModalOpen = false) {
        const itemData = this.collectItemData();

        // Call callback if provided, otherwise dispatch event
        if (this.modal.callbacks.onItemAdded) {
            this.modal.callbacks.onItemAdded(itemData);
        } else {
            document.dispatchEvent(new CustomEvent('itemAdded', { detail: itemData }));
        }

        if (keepModalOpen && this.modal.currentEditIndex === -1) {
            // Reset form but keep modal open for adding another item
            this.resetFormForNewItem();
        } else {
            // Close modal (for save or edit mode)
            this.modal.closeModal();
        }
    }

    collectItemData() {
        return {
            id: this.modal.currentItem?.id || 'custom_' + Date.now(),
            name: this.modal.itemInput.value || 'Custom Item',
            qty: Number(this.modal.qtyInput.value) || 1,
            unit: this.modal.selectedUnitCode || 'Pcs',
            unitLabel: this.getUnitLabel(this.modal.selectedUnitCode) || 'Pcs',
            mrp: Number(this.modal.purchasePriceInput.value) || 0,
            purchasePrice: Number(this.modal.purchasePriceInput.value) || 0,
            rate: Number(this.modal.salePriceInput.value) || 0,
            salePrice: Number(this.modal.salePriceInput.value) || 0,
            count: null,
            description: this.modal.descInput.value || '',
            desc: this.modal.descInput.value || '',
            editIndex: this.modal.currentEditIndex // Pass edit index for updating existing items
        };
    }

    getUnitLabel(unitCode) {
        const unit = this.modal.unitOptions.find(u => u.code === unitCode);
        return unit ? unit.label : unitCode;
    }

    resetFormForNewItem() {
        // Reset form but keep modal open
        this.modal.currentItem = null;
        this.modal.itemInput.value = '';
        this.modal.qtyInput.value = 1;
        this.modal.setUnitValue(''); // Reset unit to empty
        this.modal.purchasePriceInput.value = '';
        this.modal.salePriceInput.value = '';
        this.modal.descInput.value = '';
        this.modal.updateSubtotal();
        this.modal.itemInput.focus();
    }

    // Data loading methods
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

    async loadInventoryData(fetchAllItems, fetchAllUnits) {
        try {
            // Load items and units data using data-manager
            const [itemsData, unitsData] = await Promise.all([
                fetchAllItems(),
                fetchAllUnits()
            ]);

            // Process items data
            const inventoryItems = Array.isArray(itemsData) ? itemsData.slice(0, 50).map(item => ({
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
            const unitOptions = [];
            const groupedUnits = {};
            if (Array.isArray(unitsData)) {
                unitsData.forEach((unitGroup) => {
                    const groupType = unitGroup.meta?.type || 'other';
                    if (!groupedUnits[groupType]) {
                        groupedUnits[groupType] = [];
                    }

                    if (unitGroup.subunits) {
                        unitGroup.subunits.forEach((sub) => {
                            const unitData = {
                                code: sub.code,
                                label: `${sub.title} (${sub.code})`,
                                title: sub.title,
                                symbol: sub.symbol,
                                isPopular: sub.isPopular || false,
                                type: groupType
                            };
                            unitOptions.push(unitData);
                            groupedUnits[groupType].push(unitData);
                        });
                    }
                });
            }

            // Sort units within each group: popular first, then alphabetically
            Object.keys(groupedUnits).forEach(type => {
                groupedUnits[type].sort((a, b) => {
                    if (a.isPopular && !b.isPopular) return -1;
                    if (!a.isPopular && b.isPopular) return 1;
                    return a.label.localeCompare(b.label);
                });
            });

            // Sort units: popular first, then alphabetically
            unitOptions.sort((a, b) => {
                if (a.isPopular && !b.isPopular) return -1;
                if (!a.isPopular && b.isPopular) return 1;
                return a.label.localeCompare(b.label);
            });

            return {
                inventoryItems,
                unitOptions,
                groupedUnits
            };

        } catch (err) {
            console.error('Error loading data, using fallback:', err);
            // Fallback data - ensure modal works even without data
            const inventoryItems = [
                { id: 'fallback1', name: 'Sample Item 1', mrp: 10.00, rate: 10.00, unit: 'Pcs', description: 'Fallback item', stock: 10 },
                { id: 'fallback2', name: 'Sample Item 2', mrp: 20.00, rate: 18.00, unit: 'Pcs', description: 'Another fallback item', stock: 5 }
            ];
            const unitOptions = [
                { code: 'Pcs', label: 'Pieces (Pcs)', isPopular: true, type: 'count' },
                { code: 'Kg', label: 'Kilogram (Kg)', isPopular: true, type: 'weight' },
                { code: 'Ltr', label: 'Liters (Ltr)', isPopular: false, type: 'volume' }
            ];
            const groupedUnits = {
                count: [unitOptions[0]],
                weight: [unitOptions[1]],
                volume: [unitOptions[2]]
            };

            return {
                inventoryItems,
                unitOptions,
                groupedUnits
            };
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
}

// Export factory function for easy instantiation
export function createInstantAddItemDBOperations(modalInstance) {
    return new InstantAddItemDBOperations(modalInstance);
}
