
# 🛠️ Migrating Old Mock Data to items.json

This document tracks the migration of legacy mock-products.json and mock-services.json to the new unified items.json schema.

---

## 1️⃣ Migration Plan

- [x] Review all fields in old mock-products.json and mock-services.json
- [x] Identify missing/extra fields compared to new items.json schema
- [x] Map old fields to new schema fields
- [ ] Migrate each entry, filling missing fields with sensible defaults or placeholders
- [ ] Validate migrated data for JSON syntax and completeness
- [ ] Update codebase to use items.json instead of old mocks
- [ ] Archive or delete old mock files after migration

---

## 2️⃣ Field Mapping Table

| Old Field         | New Field (items.json) | Notes |
|-------------------|-----------------------|-------|
| name              | name                  |       |
| category          | categoryId            | Needs mapping to categoryId (see categories.json) |
| price             | price                 |       |
| unit              | unit                  |       |
| inStock/available | available             | Convert to boolean: "in stock"/"available" → true, "out of stock"/"unavailable" → false |
| description       | description           |       |
| tags              | tags                  |       |
| images/image      | images/thumbnail      | If array, use as images; if string, use as thumbnail |
|                   | type                  | Add: "product" or "service" |
|                   | id                    | Generate unique id (e.g., pro_XXXX or serv_XXXX) |
|                   | ...other fields...    | Fill with defaults or leave blank |

---

## 3️⃣ Migration Progress Log

### Products
- [ ] Parle-G
- [ ] Amul Butter
- [ ] Surf Excel
- [ ] Red Bull
- [ ] Colgate Paste
- [ ] Toor Dal
- [ ] Rice
- [ ] Kurkure
- [ ] Bread
- [ ] Milk 500ml
- [ ] Parle Monaco
- [ ] Parle Hide & Seek
- [ ] Parle Krackjack
- [ ] Parle Fab
- [ ] Britannia Marie Gold
- [ ] Britannia Good Day
- [ ] Sunfeast Nice
- [ ] Sunfeast Bourbon
- [ ] Treat Jim Jam
- [ ] 50-50 Maska Chaska

### Services
- [ ] Photo Print
- [ ] Mobile Recharge
- [ ] Scan Document
- [ ] A4 Lamination
- [ ] Color Print
- [ ] Xerox Copy
- [ ] PAN Card Apply
- [ ] Job Resume Print
- [ ] Photo Resize
- [ ] Document Upload

---

## 4️⃣ Migration Notes
- For any missing field in old data, fill with a default, null, or empty string as per new schema.
- For category, subcategory, brand, etc., map to IDs using categories.json, brands.json, etc.
- If you pause migration, check this file for what’s left.
- After each batch migration, tick the box above.

---

## 5️⃣ Example Migrated Entry

```json
{
  "id": "pro_XXXX",
  "type": "product",
  "name": "Parle-G",
  "categoryId": "cat_biscuit", // map from category
  "price": 10,
  "unit": "packet",
  "available": true,
  "description": "Tasty glucose biscuits perfect for tea time.",
  "tags": ["biscuit", "glucose", "snack", "parle"],
  "images": ["parleg-cup.jpg", ...],
  "thumbnail": "parleg-cup.jpg",
  // ...other fields from items.json schema, filled as needed
}
```

---

Keep updating this file as you migrate more items!
---

## 6️⃣ Code Migration Log
- [x] explore-view.js migrated to use allItems from sessionStorage (unified items.json). Old allProducts/allServices logic removed.
- [x] cart-view.js and saved-view.js checked: both now use sessionStorage and renderItemList, compatible with unified items.json.


## 7️⃣ Migration Checklist (Code Files)

- [x] main.js (unified allItems)
  - [x] Tumne dikhaya: main.js
  - [x] Maine kiya: allItems fetch/update, old logic hata diya

- [x] item-details.js (unified allItems)
  - [x] Tumne dikhaya: item-details.js
  - [x] Maine kiya: allItems se item details, sessionStorage use

- [x] explore-view.js (unified allItems)
  - [x] Tumne dikhaya: explore-view.js
  - [x] Maine kiya: allItems se explore, old products/services logic hata diya

- [x] cart-view.js (checked, compatible)
  - [x] Tumne dikhaya: cart-view.js
  - [x] Maine kiya: allItems compatible, koi migration change nahi

- [x] saved-view.js (checked, compatible)
  - [x] Tumne dikhaya: saved-view.js
  - [x] Maine kiya: allItems compatible, koi migration change nahi

- [x] data-service.js (fetches only unified items.json)
  - [x] Tumne dikhaya: data-service.js
  - [x] Maine kiya: ab sirf items.json fetch karta hai, old mocks hata diye

- [x] search-handler.js (searches only allItems)
  - [x] Tumne dikhaya: search-handler.js
  - [x] Maine kiya: ab sirf allItems me search hota hai, old logic hata diya

- [x] card.js (checked, compatible)
  - [x] Tumne dikhaya: card.js
  - [x] Maine dekha: card.js me direct fetch nahi, item object use hota hai, migration ka asar nahi

- [x] feedback-modal.js, login.js, signup.js (checked, compatible)
  - [x] Tumne dikhaya: feedback-modal.js, login.js, signup.js
  - [x] Maine dekha: inme product/service ka data nahi, migration ka asar nahi

- [x] admin.html, dev-home.html (checked, compatible)
  - [x] Tumne dikhaya: admin.html, dev-home.html
  - [x] Maine dekha: layout/role logic hai, items.json ka direct use nahi, migration ka asar nahi

- [x] shared/partials (header, drawer, footer, bottom-nav) (checked, compatible)
  - [x] Tumne dikhaya: partials
  - [x] Maine dekha: koi data fetch/render nahi, migration ka asar nahi

- [x] data-service.js (fetches only unified items.json)
  - [x] Tumne dikhaya: data-service.js
  - [x] Maine kiya: ab sirf items.json fetch karta hai, old mocks hata diye

- [x] manifest.json (checked, compatible)
  - [x] Tumne dikhaya: manifest.json
  - [x] Maine dekha: sirf PWA config hai, items.json ka koi lena dena nahi, migration ka asar nahi

- [x] package.json (checked, compatible)
  - [x] Tumne dikhaya: package.json
  - [x] Maine dekha: npm config hai, items.json ka koi lena dena nahi, migration ka asar nahi

- [x] service-worker.js (checked, compatible)
  - [x] Tumne dikhaya: service-worker.js
  - [x] Maine dekha: basic service worker hai, items.json ka koi lena dena nahi, migration ka asar nahi

- [x] index.html (checked, compatible)
  - [x] Tumne dikhaya: index.html
  - [x] Maine dekha: partials aur main.js load karta hai, direct items.json fetch nahi, migration ka asar nahi
---

## 8️⃣ Migration History

- 2025-07-15: Migration plan banaya, field mapping kiya, items.json schema ready kiya.
- 2025-07-16: main.js, item-details.js, explore-view.js migrate kiye. cart-view.js, saved-view.js check kiye.
- 2025-07-16: data-service.js, search-handler.js migrate kiye. Card, feedback-modal, login, signup, admin, dev-home, partials check kiye.
- 2025-07-17: Checklist me summary add ki, migration history likhi.

**Unified items.json path:**
```
firebase/data/items.json
```

Update all code and documentation to use this path as the single source of truth for all products and services.
main.js ab sirf allItems use karta hai (firebase/data/items.json), aur allProducts/allServices ko sessionStorage me set nahi karta. Filtering ab JS me hoti hai.
