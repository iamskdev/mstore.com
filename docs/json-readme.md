# 📖 Apna Store - Data Directory Guide



## 🎯 Purpose

This directory (`/firebase/data/`) contains all the mock (dummy) data for the "Apna Store" application. These JSON files simulate a database and are crucial for local development and testing. The structure of this data is designed to be easily migrated to **Firebase Firestore** in the future.

**Key Goal:** To maintain strict data integrity and consistency across all files. Please follow these rules carefully when adding or modifying data.

---

## 🔗 Data Relationship and Rules

The files in this directory are interconnected. An ID in one file often refers to an entry in another.

### 1. `users.json`
- **`userId`**: Must be unique for every user. This is the primary key.
- **`merchantId` (optional)**: If a user has a `role` of `"admin"`, they are a merchant. Their `merchantId` **must** correspond to a valid `merchantId` in `merchants.json`.

### 2. `merchants.json`
- **`merchantId`**: Must be unique for every merchant. This is the primary key.
- **Relationship**: Every merchant listed here **must** have a corresponding user in `users.json` with the `role: "admin"` and the matching `merchantId`.

### 3. `items.json`
- **`itemId`**: Must be unique for every item. This is the primary key.
- **`merchantId`**: **Must** be a valid `merchantId` from `merchants.json`. This links an item to its seller.
- **`inventory.unit`**: **Must** be a valid `code` from `units.json` (e.g., "kg", "packet", "ltr"). Do not use labels like "Kilogram".
- **`categoryId` / `subcategoryId`**: Should correspond to a valid category from `categories.json` (future file).
- **`audit.createdBy` / `updatedBy`**: **Must** be a valid `userId` from `users.json`. This tracks who created or last modified the item.
- **Structure**: This file holds both `product` and `service` types. The `attributes` object will differ based on the type. For example, a product might have `weight` and `flavor`, while a service might have `serviceTime` and `location`.

### 4. `units.json`
- This is the master file for all measurement units.
- **`code`**: This is the value that should be used in other files (like `items.json` and `order.json`). For example, use `"packet"`, not `"Packet"`.

### 5. `order.json`
- **`orderId`**: Must be unique.
- **`userId`**: **Must** be a valid `userId` from `users.json` (the customer who placed the order).
- **`merchantId`**: **Must** be a valid `merchantId` from `merchants.json` (the merchant who will fulfill the order).
- **`items[].itemId`**: Each item in the order **must** have an `itemId` that exists in `items.json`.
- **`items[].unit`**: **Must** be a valid `code` from `units.json`.

### 6. `price-logs.json`
- **`itemId`**: **Must** be a valid `itemId` from `items.json`.
- **`merchantId`**: **Must** be a valid `merchantId` from `merchants.json`.
- **`changedBy`**: **Must** be a valid `userId` from `users.json`.

### 7. `promotions.json`
- **`promotionId`**: Must be unique.
- **`merchantId`**: **Must** be a valid `merchantId` from `merchants.json`.

---

## 📝 How to Add New Data (Example: Adding a New Merchant)

To maintain data integrity, follow this order when adding a new merchant and their items:

1.  **Step 1: Add to `merchants.json`**
    - Create a new merchant object with a unique `merchantId` (e.g., `"MRC00000006"`).
    - Fill in all their business details.

2.  **Step 2: Add to `users.json`**
    - Create a new user object for this merchant with a unique `userId` (e.g., `"USR00000008"`).
    - Set their `role` to `"admin"`.
    - Most importantly, set their `merchantId` to the one you created in Step 1 (e.g., `"MRC00000006"`).

3.  **Step 3: Add Items to `items.json`**
    - Now you can add new items for this merchant.
    - In each new item, set the `merchantId` to `"MRC00000006"`.
    - Set the `audit.createdBy` field to the new user's ID (e.g., `"USR00000008"`).

By following this process, you ensure that all references are valid and the application will function correctly.

---

## 🧩 Future Data Expansion

As the application grows, you can add more `.json` files to manage different aspects of the store. This keeps the architecture modular and scalable. Some common future additions could be:

- `categories.json` – Master list of all product/service categories.
- `brands.json` – Master list of all brands.
- `coupons.json` – Discount codes and coupon management.
- `reviews.json` – Customer reviews and ratings.
- `banners.json` – Homepage banners and promotions.
- `taxes.json` – Tax rules (GST, VAT, etc.).
- `locations.json` – Store locations and service areas.
- `notifications.json` – Templates for push/email/SMS notifications.

When you add a new file, remember to update this guide with its rules and relationships!

---

## 🔥 Future Firebase Migration

This data structure is designed for a smooth transition to Firebase:

- Each `.json` file (e.g., `items.json`, `users.json`) will become a **Firestore Collection**.
- Each object inside a JSON array will become a **Firestore Document**.
- The `itemId`, `userId`, etc., will serve as the **Document ID**.

Maintaining the relationships described above will make writing Firestore security rules and application logic much simpler.

---

## 🎯 Purpose

This directory (`/firebase/data/`) contains all the mock (dummy) data for the "Apna Store" application. These JSON files simulate a database and are crucial for local development and testing. The structure of this data is designed to be easily migrated to **Firebase Firestore** in the future.

**Key Goal:** To maintain strict data integrity and consistency across all files. Please follow these rules carefully when adding or modifying data.

---

## 🔗 Data Relationship and Rules

The files in this directory are interconnected. An ID in one file often refers to an entry in another.

### 1. `users.json`
- **`userId`**: Must be unique for every user. This is the primary key.
- **`merchantId` (optional)**: If a user has a `role` of `"admin"`, they are a merchant. Their `merchantId` **must** correspond to a valid `merchantId` in `merchants.json`.

### 2. `merchants.json`
- **`merchantId`**: Must be unique for every merchant. This is the primary key.
- **Relationship**: Every merchant listed here **must** have a corresponding user in `users.json` with the `role: "admin"` and the matching `merchantId`.

### 3. `items.json`
- **`itemId`**: Must be unique for every item. This is the primary key.
- **`merchantId`**: **Must** be a valid `merchantId` from `merchants.json`. This links an item to its seller.
- **`inventory.unit`**: **Must** be a valid `code` from `units.json` (e.g., "kg", "packet", "ltr"). Do not use labels like "Kilogram".
- **`categoryId` / `subcategoryId`**: Should correspond to a valid category from `categories.json` (future file).
- **`audit.createdBy` / `updatedBy`**: **Must** be a valid `userId` from `users.json`. This tracks who created or last modified the item.
- **Structure**: This file holds both `product` and `service` types. The `attributes` object will differ based on the type. For example, a product might have `weight` and `flavor`, while a service might have `serviceTime` and `location`.

### 4. `units.json`
- This is the master file for all measurement units.
- **`code`**: This is the value that should be used in other files (like `items.json` and `order.json`). For example, use `"packet"`, not `"Packet"`.

### 5. `order.json`
- **`orderId`**: Must be unique.
- **`userId`**: **Must** be a valid `userId` from `users.json` (the customer who placed the order).
- **`merchantId`**: **Must** be a valid `merchantId` from `merchants.json` (the merchant who will fulfill the order).
- **`items[].itemId`**: Each item in the order **must** have an `itemId` that exists in `items.json`.
- **`items[].unit`**: **Must** be a valid `code` from `units.json`.

### 6. `price-logs.json`
- **`itemId`**: **Must** be a valid `itemId` from `items.json`.
- **`merchantId`**: **Must** be a valid `merchantId` from `merchants.json`.
- **`changedBy`**: **Must** be a valid `userId` from `users.json`.

### 7. `promotions.json`
- **`promotionId`**: Must be unique.
- **`merchantId`**: **Must** be a valid `merchantId` from `merchants.json`.

---

## 📝 How to Add New Data (Example: Adding a New Merchant)

To maintain data integrity, follow this order when adding a new merchant and their items:

1.  **Step 1: Add to `merchants.json`**
    - Create a new merchant object with a unique `merchantId` (e.g., `"MRC00000006"`).
    - Fill in all their business details.

2.  **Step 2: Add to `users.json`**
    - Create a new user object for this merchant with a unique `userId` (e.g., `"USR00000008"`).
    - Set their `role` to `"admin"`.
    - Most importantly, set their `merchantId` to the one you created in Step 1 (e.g., `"MRC00000006"`).

3.  **Step 3: Add Items to `items.json`**
    - Now you can add new items for this merchant.
    - In each new item, set the `merchantId` to `"MRC00000006"`.
    - Set the `audit.createdBy` field to the new user's ID (e.g., `"USR00000008"`).

By following this process, you ensure that all references are valid and the application will function correctly.

---

## 🧩 Future Data Expansion

As the application grows, you can add more `.json` files to manage different aspects of the store. This keeps the architecture modular and scalable. Some common future additions could be:

- `categories.json` – Master list of all product/service categories.
- `brands.json` – Master list of all brands.
- `coupons.json` – Discount codes and coupon management.
- `reviews.json` – Customer reviews and ratings.
- `banners.json` – Homepage banners and promotions.
- `taxes.json` – Tax rules (GST, VAT, etc.).
- `locations.json` – Store locations and service areas.
- `notifications.json` – Templates for push/email/SMS notifications.

When you add a new file, remember to update this guide with its rules and relationships!

---

## 🔥 Future Firebase Migration

This data structure is designed for a smooth transition to Firebase:

- Each `.json` file (e.g., `items.json`, `users.json`) will become a **Firestore Collection**.
- Each object inside a JSON array will become a **Firestore Document**.
- The `itemId`, `userId`, etc., will serve as the **Document ID**.

Maintaining the relationships described above will make writing Firestore security rules and application logic much simpler.