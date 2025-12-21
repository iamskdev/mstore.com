/**
 * Item Event Manager - Handles form submission and remaining event listeners
 */

import { showToast } from '../../../../utils/toast.js';
import { saveItem } from './item-db-operations.js';

export class ItemEventManager {
    constructor(dataManager, formManager, currentItemId = null) {
        this.dataManager = dataManager;
        this.formManager = formManager;
        this.currentItemId = currentItemId;
        this.eventListeners = [];
    }

    /**
     * Initialize form submission and other event handlers
     */
    static initializeEventHandlers(dataManager, formManager, currentItemId = null) {
        const manager = new ItemEventManager(dataManager, formManager, currentItemId);
        manager.setupFormSubmission();
        manager.setupGlobalEventHandlers();
        return manager;
    }

    /**
     * Setup form submission handler
     */
    setupFormSubmission() {
        const submitItemBtn = document.getElementById('submitItemBtn');
        if (submitItemBtn && submitItemBtn.tagName === 'BUTTON') {
            this.addTrackedListener(submitItemBtn, 'click', async () => {
                console.log('Submit button clicked');
                await this.handleFormSubmission();
            });
        } else {
            console.warn('Submit button not found or corrupted during event setup');
        }

        // Setup cancel button handler
        const cancelBtn = document.querySelector('.mstore-bottom-bar .mstore-action-btn.secondary');
        if (cancelBtn) {
            this.addTrackedListener(cancelBtn, 'click', () => {
                console.log('Cancel button clicked');
                this.handleCancel();
            });
        }
    }

    /**
     * Handle form submission
     */
    async handleFormSubmission() {
        const isEditMode = this.currentItemId !== null;
        console.log(isEditMode ? 'Updating item...' : 'Creating new item...');

        try {
            // Collect form data
            const formData = this.formManager.collectFormData();

            if (!formData) {
                console.log('Form validation failed');
                return;
            }

            console.log('Form data collected:', formData);

            // Save the item to Firebase
            const savedItem = await saveItem({
                formData,
                itemId: isEditMode ? this.currentItemId : null,
                currentEditItem: isEditMode ? window.currentEditItem : null,
                isEditMode
            });

            console.log('Item saved successfully:', savedItem);

            // Show success message and keep form open until toast completes
            const successMessage = isEditMode
                ? '✅ Item updated successfully!'
                : '✅ Item created successfully!';
            showToast('success', successMessage, 3000);

            // Navigate back immediately after showing toast
            if (window.routeManager) {
                setTimeout(() => {
                    window.routeManager.switchView('merchant', 'dashboard');
                }, 0); // Immediate navigation
            }

        } catch (error) {
            console.error('Error saving item:', error);
            showToast('error', '❌ Please try again.', 4000);
        }
    }

    /**
     * Handle cancel button click
     */
    handleCancel() {
        console.log('Handling cancel action');

        // Navigate back to merchant home/add view
        if (window.routeManager) {
            window.routeManager.switchView('merchant', 'dashboard');
        } else {
            // Fallback: use browser back
            window.history.back();
        }
    }

    /**
     * Setup global event handlers
     */
    setupGlobalEventHandlers() {
        // Handle browser back button
        const handlePopState = () => {
            // Cleanup when user navigates away
            this.cleanup();
        };

        window.addEventListener("popstate", handlePopState);
        this.eventListeners.push(() => {
            window.removeEventListener("popstate", handlePopState);
        });

        // Drag and Drop Photo Reordering
        this.setupPhotoDragAndDrop();
    }

    /**
     * Setup photo drag and drop functionality
     */
    setupPhotoDragAndDrop() {
        const photoGrid = document.querySelector(".mstore-photo-grid");
        if (!photoGrid) return;

        photoGrid.addEventListener("dragstart", (e) => {
            if (e.target.classList.contains("mstore-photo-item") && !e.target.classList.contains("primary")) {
                e.target.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
            } else {
                e.preventDefault();
            }
        });

        photoGrid.addEventListener("dragend", (e) => {
            if (e.target.classList.contains("dragging")) {
                e.target.classList.remove("dragging");
            }
        });

        photoGrid.addEventListener("dragover", (e) => {
            e.preventDefault();
            const draggingItem = photoGrid.querySelector(".dragging");
            if (!draggingItem) return;

            const siblings = [...photoGrid.querySelectorAll(".mstore-photo-item:not(.primary):not(.dragging)")];
            const nextSibling = siblings.find(sibling => {
                const rect = sibling.getBoundingClientRect();
                const midpoint = rect.left + rect.width / 2;
                return e.clientX < midpoint;
            });

            if (nextSibling) {
                photoGrid.insertBefore(draggingItem, nextSibling);
            } else {
                photoGrid.appendChild(draggingItem);
            }
        });
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
        this.eventListeners.forEach(cleanup => cleanup());
        this.eventListeners = [];
    }
}