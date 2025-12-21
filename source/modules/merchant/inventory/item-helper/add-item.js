/**
 * Add Item Module - Production Version
 * Manages item creation form with full functionality
 */

import { fetchItemById } from '../../../../utils/data-manager.js';
import { showToast } from '../../../../utils/toast.js';
import { AuthService } from '../../../../firebase/auth/auth.js';
import { localCache } from '../../../../utils/data-manager.js';
import { saveItem, generateNewItemId, fetchItem } from './item-db-operations.js';
import { ItemDataManager, ItemFormManager, ItemUIComponents, ItemMediaHandler, ItemEventManager } from './index.js';

// Module state
let initialized = false;
const cleanupFunctions = [];

// Create helper instances
const dataManager = new ItemDataManager();
let eventManager = null;

let currentItemId = null; // Store the ID of the item being edited
let currentEditItem = null; // Store the full item object if editing

// All helper functions have been moved to item-helper/ folder
// Functions are now available through imported classes:
// - ItemDataManager: Data loading and combobox setup
// - ItemFormManager: Form population and data collection
// - ItemUIComponents: UI toggles and interactions
// - ItemMediaHandler: Photo upload and camera functionality
// - ItemEventManager: Event handling and form submission
// - ItemValidator: Form validation logic

/**
 * Initialize the module
 */
export async function init(force = false, params = {}) {
    if (initialized && !force) {
        console.log('✅ Add Item already initialized');
        return;
    }

    console.log('🚀 Initializing Add Item module...');

    // Check for itemId in parameters for edit mode
    currentItemId = params.itemId || null;
    const formTitle = document.getElementById('addItemFormTitle');
    let submitButton = document.getElementById('submitItemBtn');

    // Set initial button text based on edit mode
    const isEditMode = !!currentItemId;
    const initialButtonText = isEditMode ? 'Update Item' : 'Save Item';

    // If button is corrupted, recreate it
    if (!submitButton || submitButton.tagName !== 'BUTTON') {
        console.warn('Submit button is corrupted, recreating...');
        const bottomBar = document.querySelector('.mstore-bottom-bar');
        if (bottomBar) {
            // Remove any corrupted elements
            const existingButtons = bottomBar.querySelectorAll('button');
            existingButtons.forEach(btn => {
                if (btn.id === 'submitItemBtn' || (!btn.id && btn.classList.contains('primary'))) {
                    btn.remove();
                }
            });

            // Create new button
            const newButton = document.createElement('button');
            newButton.className = 'mstore-action-btn primary';
            newButton.id = 'submitItemBtn';
            newButton.type = 'button';
            newButton.textContent = initialButtonText;
            bottomBar.appendChild(newButton);
            submitButton = newButton;
        }
    } else {
        // Update existing button text
        submitButton.textContent = initialButtonText;
    }

    if (currentItemId) {
        console.log(`💡 Edit mode: Fetching item with ID: ${currentItemId}`);
        try {
            currentEditItem = await fetchItemById(currentItemId);
            if (currentEditItem) {
                console.log('Fetched item for editing:', currentEditItem);
                if (formTitle) formTitle.textContent = 'Update Item';
                ItemFormManager.populateForm(currentEditItem, dataManager);
            } else {
                console.warn(`Item with ID ${currentItemId} not found.`);
                currentItemId = null;
                currentEditItem = null;
                if (formTitle) formTitle.textContent = 'Add Item';
                if (submitButton) submitButton.textContent = 'Save Item';
                ItemFormManager.clearForm();
            }
        } catch (error) {
            console.error('Error fetching item for editing:', error);
            currentItemId = null;
            currentEditItem = null;
            if (formTitle) formTitle.textContent = 'Add Item';
            if (submitButton) submitButton.textContent = 'Save Item';
            ItemFormManager.clearForm();
        }
    } else {
        // Clear form for new item
        ItemFormManager.clearForm();
        if (formTitle) formTitle.textContent = 'Add Item';
    }

    // Load data first, then initialize components
    await dataManager.loadAllData();
    await ItemUIComponents.initializeAllComponents();
    ItemMediaHandler.initializePhotoUpload();
    eventManager = ItemEventManager.initializeEventHandlers(dataManager, ItemFormManager, currentItemId);

    initialized = true;
    console.log('✅ Add Item module initialized');
}

/**
 * Cleanup function
 */
export function cleanup() {
    console.log('🧹 Cleaning up Add Item module...');
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions.length = 0;

    if (eventManager) {
        eventManager.cleanup();
        eventManager = null;
    }

    initialized = false;
    currentItemId = null;
    currentEditItem = null;
    console.log('✅ Add Item cleaned up');
}

// Module exports already at top