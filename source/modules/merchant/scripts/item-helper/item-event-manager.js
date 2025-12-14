/**
 * Item Event Manager - Handles form submission and remaining event listeners
 */

import { showToast } from '../../../../utils/toast.js';

export class ItemEventManager {
    constructor(dataManager, formManager) {
        this.dataManager = dataManager;
        this.formManager = formManager;
        this.eventListeners = [];
    }

    /**
     * Initialize form submission and other event handlers
     */
    static initializeEventHandlers(dataManager, formManager) {
        const manager = new ItemEventManager(dataManager, formManager);
        manager.setupFormSubmission();
        manager.setupGlobalEventHandlers();
        return manager;
    }

    /**
     * Setup form submission handler
     */
    setupFormSubmission() {
        const submitItemBtn = document.getElementById('submitItemBtn');
        if (submitItemBtn) {
            this.addTrackedListener(submitItemBtn, 'click', async () => {
                console.log('Submit button clicked');
                await this.handleFormSubmission();
            });
        }
    }

    /**
     * Handle form submission
     */
    async handleFormSubmission() {
        const isEditMode = window.currentItemId !== null;
        console.log(isEditMode ? 'Updating item...' : 'Creating new item...');

        try {
            // Collect form data
            const formData = this.formManager.collectFormData();

            if (!formData) {
                console.log('Form validation failed');
                return;
            }

            console.log('Form data collected:', formData);

            // Here you would typically save the data using your data manager
            // For now, just show success message
            const successMessage = isEditMode ? 'Item updated successfully!' : 'Item created successfully!';
            showToast(successMessage, 'success');

            // Optionally navigate back or to item details
            if (window.routeManager) {
                // Navigate to appropriate page
                setTimeout(() => {
                    window.routeManager.switchView('merchant', 'dashboard');
                }, 1500);
            }

        } catch (error) {
            console.error('Error saving item:', error);
            showToast('Failed to save item. Please try again.', 'error');
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