/**
 * Item Validator - Handles form validation logic
 */

export class ItemValidator {
    /**
     * Validate basic item information
     */
    static validateBasicInfo(data) {
        const errors = [];

        if (!data.info?.name?.trim()) {
            errors.push('Item name is required');
        }

        if (!data.info?.sku?.trim()) {
            errors.push('SKU is required');
        }

        if (data.pricing?.costPrice < 0) {
            errors.push('Cost price cannot be negative');
        }

        if (data.pricing?.sellingPrice < 0) {
            errors.push('Selling price cannot be negative');
        }

        if (data.pricing?.sellingPrice < data.pricing?.costPrice) {
            errors.push('Selling price cannot be less than cost price');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate inventory data
     */
    static validateInventory(data) {
        const errors = [];

        if (data.inventory?.stockQty < 0) {
            errors.push('Stock quantity cannot be negative');
        }

        if (data.inventory?.lowStockThreshold < 0) {
            errors.push('Low stock threshold cannot be negative');
        }

        if (data.inventory?.reorderQuantity < 0) {
            errors.push('Reorder quantity cannot be negative');
        }

        if (data.inventory?.maxStockLevel < 0) {
            errors.push('Maximum stock level cannot be negative');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate pricing data
     */
    static validatePricing(data) {
        const errors = [];

        if (data.pricing?.gstRate < 0 || data.pricing?.gstRate > 100) {
            errors.push('GST rate must be between 0 and 100');
        }

        if (data.pricing?.mrp < data.pricing?.sellingPrice) {
            errors.push('MRP cannot be less than selling price');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate entire form data
     */
    static validateFormData(data) {
        const basicValidation = this.validateBasicInfo(data);
        const inventoryValidation = this.validateInventory(data);
        const pricingValidation = this.validatePricing(data);

        const allErrors = [
            ...basicValidation.errors,
            ...inventoryValidation.errors,
            ...pricingValidation.errors
        ];

        return {
            isValid: allErrors.length === 0,
            errors: allErrors
        };
    }

    /**
     * Show validation errors
     */
    static showValidationErrors(errors) {
        if (errors.length > 0) {
            const errorMessage = errors.join('\n');
            alert(`Please fix the following errors:\n\n${errorMessage}`);
            return false;
        }
        return true;
    }
}