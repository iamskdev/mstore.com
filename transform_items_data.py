import json

# Read items.json
with open('s:\My Projects\Apna Store\mStore_V0.0.1\localstore\jsons\items.json', 'r') as f:
    items_data = json.load(f)

# Read categories.json
with open('s:\My Projects\Apna Store\mStore_V0.0.1\localstore\jsons\categories.json', 'r') as f:
    categories_data = json.load(f)

# Create a mapping from categoryId (ICT prefix) to category object
category_map = {cat['meta']['categoryId']: cat for cat in categories_data}

# Process each item
for item in items_data:
    original_cat_id = item['meta']['links']['categoryId']
    
    # Correct the categoryId prefix from CAT to ICT
    # Assuming CAT and ICT IDs are otherwise identical (e.g., CAT001 -> ICT001)
    corrected_cat_id = original_cat_id.replace('CAT', 'ICT')
    item['meta']['links']['categoryId'] = corrected_cat_id

    # Add categories and subcategories arrays to the item
    item['categories'] = []
    item['subcategories'] = []

    if corrected_cat_id in category_map:
        main_category = category_map[corrected_cat_id]
        item['categories'].append({
            'slug': main_category['meta']['slug'],
            'categoryId': main_category['meta']['categoryId']
        })
        
        # Add subcategories if they exist
        if 'subcategories' in main_category and main_category['subcategories']:
            for subcat in main_category['subcategories']:
                item['subcategories'].append({
                    'slug': subcat['slug'],
                    'subCatId': subcat['subCatId']
                })

# Write the modified items_data back to items.json
with open('s:\My Projects\Apna Store\mStore_V0.0.1\localstore\jsons\items.json', 'w') as f:
    json.dump(items_data, f, indent=2)

print("items.json updated successfully with corrected category IDs and added category/subcategory slugs.")
