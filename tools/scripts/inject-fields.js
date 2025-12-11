const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const TARGET_FILE = path.join(__dirname, '../../localstore/jsons/items.json'); // Path relative to this script
const DRY_RUN = false; // Set to true to see changes without saving

/**
 * Custom logic to inject/update fields for a single item.
 * Modify this function to change what gets injected.
 * @param {object} item - The JSON object (a single item from the array).
 * @returns {object} - The modified item.
 */
function processItem(item) {
    // Example: Injecting 'isAvailable' based on our stock logic

    // Ensure inventory object exists
    if (!item.inventory) item.inventory = {};

    // Logic:
    // 1. If it's a SERVICE, default isAvailable = true (unless manually set, but this is a migration)
    // 2. If it's a PRODUCT, isAvailable = (stockQty > 0)

    if (item.meta.type === 'service') {
        // For services, we default to available. 
        // We preserve existing value if it exists, but since this is new, we set true.
        if (item.inventory.isAvailable === undefined) {
            item.inventory.isAvailable = true;
        }
    } else {
        // Product
        const qty = item.inventory.stockQty || 0;

        // If isAvailable doesn't exist, calculate it from stock
        if (item.inventory.isAvailable === undefined) {
            item.inventory.isAvailable = (qty > 0);
        }
    }

    return item;
}

// --- EXECUTION ---
async function run() {
    try {
        console.log(`\n📦 Reading file: ${TARGET_FILE}`);
        if (!fs.existsSync(TARGET_FILE)) {
            console.error(`❌ File not found: ${TARGET_FILE}`);
            return;
        }

        const rawData = fs.readFileSync(TARGET_FILE, 'utf8');
        let data = JSON.parse(rawData);

        let countModified = 0;

        // Handle both Array and Object (Dictionary) structures
        if (Array.isArray(data)) {
            console.log(`   Found Array with ${data.length} items.`);
            data = data.map(item => {
                const original = JSON.stringify(item);
                const modified = processItem(item);
                if (JSON.stringify(modified) !== original) countModified++;
                return modified;
            });
        } else if (typeof data === 'object' && data !== null) {
            console.log(`   Found Object.`);
            // If the file is a single object, process it directly
            // Or if it's a dict like { "id1": {...}, "id2": {...} }
            // We'll assume for items.json it is an array based on previous view_file.
            // But if specific key-value map:
            Object.keys(data).forEach(key => {
                processItem(data[key]);
            });
        }

        console.log(`✨ Processed. Modified items: ${countModified}`);

        if (DRY_RUN) {
            console.log(`🚧 DRY RUN: Changes NOT saved.`);
            // console.log(JSON.stringify(data, null, 2).substring(0, 500) + "..."); 
        } else {
            fs.writeFileSync(TARGET_FILE, JSON.stringify(data, null, 2), 'utf8');
            console.log(`✅ File saved successfully.`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

run();
