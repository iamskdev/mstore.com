/**
 * @file add-hsn-code.js
 * This script adds an 'hsnCode' field to the 'info' object of each item in items.json.
 * चलाने के लिए: node tools/scripts/add-hsn-code.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ITEMS_FILE_PATH = path.resolve(__dirname, '../../localstore/jsons/items.json');

async function addHsnCodeToItems() {
    try {
        console.log(`Reading items from: ${ITEMS_FILE_PATH}`);
        const fileContent = await fs.readFile(ITEMS_FILE_PATH, 'utf8');
        const items = JSON.parse(fileContent);

        if (!Array.isArray(items)) {
            console.error('Error: items.json does not contain a JSON array.');
            return;
        }

        let modifiedCount = 0;
        for (const item of items) {
            if (item.info && typeof item.info === 'object') {
                if (!item.info.hsnCode) {
                    item.info.hsnCode = "XXXXXX"; // Placeholder HSN code
                    modifiedCount++;
                }
            }
        }

        await fs.writeFile(ITEMS_FILE_PATH, JSON.stringify(items, null, 2), 'utf8');
        console.log(`✅ Successfully added hsnCode to ${modifiedCount} items in items.json.`);
        console.log('कृपया ध्यान दें: आपको "XXXXXX" placeholder को वास्तविक HSN codes से बदलना होगा।');

    } catch (error) {
        console.error('❌ An error occurred:', error);
    }
}

addHsnCodeToItems();
