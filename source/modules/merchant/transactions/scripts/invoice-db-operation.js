/**
 * Invoice Database Operations - Handles all Firebase/database operations
 */

import { fetchAllItems, fetchAllUsers, fetchAllUnits, localCache } from '../../../utils/data-manager.js';
import { AuthService } from '../../../firebase/auth/auth.js';

export class InvoiceDBOperations {
    /**
     * Fetch customers/suppliers for invoice
     */
    static async fetchCustomers(type = 'sale') {
        try {
            console.log('📥 Fetching customers...');

            // Get all users and filter based on type
            const allUsers = await fetchAllUsers();
            let filteredUsers;

            if (type === 'sale') {
                // For sales, show customers (consumers)
                filteredUsers = allUsers.filter(user =>
                    user.meta?.role === 'consumer' ||
                    user.meta?.roles?.includes('consumer')
                );
            } else {
                // For purchases, show suppliers (merchants)
                filteredUsers = allUsers.filter(user =>
                    user.meta?.role === 'merchant' ||
                    user.meta?.roles?.includes('merchant')
                );
            }

            const customers = filteredUsers.map(user => ({
                id: user.meta?.userId || user.id,
                name: user.profile?.name || user.email || `Unknown ${type === 'sale' ? 'Customer' : 'Supplier'}`,
                email: user.email,
                phone: user.profile?.phone
            }));

            console.log(`✅ Found ${customers.length} ${type === 'sale' ? 'customers' : 'suppliers'}`);
            return customers;

        } catch (error) {
            console.error('❌ Failed to fetch customers:', error);
            return [];
        }
    }

    /**
     * Fetch items for invoice
     */
    static async fetchItems() {
        try {
            console.log('📥 Fetching items...');

            const allItems = await fetchAllItems();
            const activeItems = allItems.filter(item =>
                item.meta?.visibility === 'public' &&
                item.inventory?.isAvailable !== false
            ).map(item => ({
                id: item.meta?.itemId || item.id,
                name: item.info?.name || 'Unknown Item',
                rate: item.pricing?.sellingPrice || 0,
                unit: item.inventory?.unit || 'pcs',
                category: item.category?.name
            }));

            console.log(`✅ Found ${activeItems.length} items`);
            return activeItems;

        } catch (error) {
            console.error('❌ Failed to fetch items:', error);
            return [];
        }
    }

    /**
     * Fetch units for items
     */
    static async fetchUnits() {
        try {
            console.log('📥 Fetching units...');

            const allUnits = await fetchAllUnits();
            const units = allUnits.map(unit => ({
                id: unit.id,
                name: unit.name || unit.label,
                symbol: unit.symbol
            }));

            console.log(`✅ Found ${units.length} units`);
            return units;

        } catch (error) {
            console.error('❌ Failed to fetch units:', error);
            // Return default units if fetch fails
            return [
                { id: 'pcs', name: 'Pieces', symbol: 'pcs' },
                { id: 'kg', name: 'Kilograms', symbol: 'kg' },
                { id: 'ltr', name: 'Liters', symbol: 'ltr' },
                { id: 'mtr', name: 'Meters', symbol: 'mtr' }
            ];
        }
    }

    /**
     * Save invoice to database
     */
    static async saveInvoice(invoiceData) {
        try {
            console.log('💾 Saving invoice...', invoiceData);

            // Validate required data
            if (!this.validateInvoiceData(invoiceData)) {
                throw new Error('Invalid invoice data');
            }

            // Get current user
            const currentUser = AuthService.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not authenticated');
            }

            // Prepare invoice document
            const invoiceDoc = {
                meta: {
                    invoiceId: this.generateInvoiceId(),
                    merchantId: currentUser.merchantId || currentUser.uid,
                    createdBy: currentUser.uid,
                    createdAt: new Date(),
                    status: invoiceData.status || 'draft'
                },
                customer: invoiceData.customer,
                items: invoiceData.items,
                charges: invoiceData.charges,
                totals: invoiceData.totals,
                audit: {
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            };

            // TODO: Save to Firestore
            // For now, just store in localStorage for demo
            const existingInvoices = localCache.get('invoices') || [];
            existingInvoices.push(invoiceDoc);
            localCache.set('invoices', existingInvoices);

            console.log('✅ Invoice saved successfully');
            return {
                success: true,
                invoiceId: invoiceDoc.meta.invoiceId,
                data: invoiceDoc
            };

        } catch (error) {
            console.error('❌ Failed to save invoice:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate invoice data before saving
     */
    static validateInvoiceData(data) {
        if (!data.customer || !data.customer.id) {
            console.error('❌ Validation failed: No customer selected');
            return false;
        }

        if (!data.items || data.items.length === 0) {
            console.error('❌ Validation failed: No items in invoice');
            return false;
        }

        if (!data.totals || typeof data.totals.total !== 'number') {
            console.error('❌ Validation failed: Invalid totals');
            return false;
        }

        return true;
    }

    /**
     * Generate unique invoice ID
     */
    static generateInvoiceId() {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `INV-${timestamp}-${random}`;
    }

    /**
     * Fetch existing invoices for a merchant
     */
    static async fetchInvoices(merchantId, filters = {}) {
        try {
            console.log('📥 Fetching invoices...', { merchantId, filters });

            // TODO: Fetch from Firestore
            // For now, get from localStorage
            const allInvoices = localCache.get('invoices') || [];
            const merchantInvoices = allInvoices.filter(invoice =>
                invoice.meta?.merchantId === merchantId
            );

            // Apply filters
            let filteredInvoices = merchantInvoices;
            if (filters.status) {
                filteredInvoices = filteredInvoices.filter(inv =>
                    inv.meta?.status === filters.status
                );
            }

            if (filters.dateFrom) {
                const fromDate = new Date(filters.dateFrom);
                filteredInvoices = filteredInvoices.filter(inv =>
                    new Date(inv.meta?.createdAt) >= fromDate
                );
            }

            if (filters.dateTo) {
                const toDate = new Date(filters.dateTo);
                filteredInvoices = filteredInvoices.filter(inv =>
                    new Date(inv.meta?.createdAt) <= toDate
                );
            }

            console.log(`✅ Found ${filteredInvoices.length} invoices`);
            return filteredInvoices;

        } catch (error) {
            console.error('❌ Failed to fetch invoices:', error);
            return [];
        }
    }

    /**
     * Update invoice status
     */
    static async updateInvoiceStatus(invoiceId, status) {
        try {
            console.log('📝 Updating invoice status...', { invoiceId, status });

            // TODO: Update in Firestore
            // For now, update in localStorage
            const invoices = localCache.get('invoices') || [];
            const invoiceIndex = invoices.findIndex(inv => inv.meta?.invoiceId === invoiceId);

            if (invoiceIndex === -1) {
                throw new Error('Invoice not found');
            }

            invoices[invoiceIndex].meta.status = status;
            invoices[invoiceIndex].audit.updatedAt = new Date();

            localCache.set('invoices', invoices);

            console.log('✅ Invoice status updated');
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to update invoice status:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete invoice
     */
    static async deleteInvoice(invoiceId) {
        try {
            console.log('🗑️ Deleting invoice...', invoiceId);

            // TODO: Delete from Firestore
            // For now, remove from localStorage
            const invoices = localCache.get('invoices') || [];
            const filteredInvoices = invoices.filter(inv => inv.meta?.invoiceId !== invoiceId);

            if (filteredInvoices.length === invoices.length) {
                throw new Error('Invoice not found');
            }

            localCache.set('invoices', filteredInvoices);

            console.log('✅ Invoice deleted');
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to delete invoice:', error);
            return { success: false, error: error.message };
        }
    }
}