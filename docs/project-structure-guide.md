# 🚀 Project Structure Guide & Best Practices 🚀

This document provides a clear guide to the project's file structure. Following these principles will help keep the codebase clean, scalable, and easy for anyone to understand.

---

## 📂 Core Philosophy

The project is divided into logical domains. The goal is to separate concerns, making code more reusable and predictable.

-   **`public/`**: This is the user-facing part of the application. It contains the main `index.html` (which acts as a Single Page Application or SPA), any other standalone pages (`item-details.html`), and the JavaScript/CSS files that specifically control them.

-   **`shared/`**: This is the heart of the application. It contains code that is designed to be **reused** across all parts of the app (public, admin, and developer). This includes UI components (like cards and toasts), HTML partials (header, footer), and utility functions (data fetching, authentication logic).

-   **`admin/` & `developer/`**: These are self-contained sections for the Admin Panel and Developer Tools, respectively. They have their own assets, pages, and scripts. They can (and should) import code from the `shared/` directory.

-   **`firebase/`**: This folder centralizes all mock data and will later hold the actual Firebase configuration and rules.

---

## 🗺️ Detailed Folder Breakdown & Where to Put New Files

Use this guide to understand where new files should be created.

### `public/` - The Customer-Facing App

| Folder Path                      | Purpose                                                              | Example                                         |
| -------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| `public/pages/`                  | Standalone HTML pages that are not part of the main SPA.             | `item-details.html`                             |
| `public/scripts/`                | Logic for standalone pages and the main entry point.                 | `item-details.js`, `main.js`                    |
| `public/scripts/views/`          | **Logic for each bottom navigation tab (view)** in the SPA.          | `explore-view.js`, `cart-view.js`               |
| `public/styles/`                 | CSS specific to standalone pages.                                    | `item-details.css`                              |
| `public/assets/`                 | Images and other assets used only in the public section.             | `vivek.jpg` (user profile picture)              |

### `shared/` - The Reusable Core

| Folder Path                      | Purpose                                                              | Example                                         |
| -------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| `shared/components/`             | **Reusable UI components.** Each component has its own folder.       | `card/`, `toast/`, `feedback-modal/`            |
| `shared/partials/`               | Reusable HTML snippets loaded into pages.                            | `header.html`, `footer.html`, `bottom-nav.html` |
| `shared/utils/`                  | **Reusable helper functions** used across the entire app.            | `partial-loader.js`, `data-service.js`, `auth.js` (future) |
| `shared/styles/`                 | Global CSS files that apply to the whole app.                        | `main.css`, `theme.css`                   |
| `shared/assets/`                 | Global assets used everywhere.                                       | `app-logo.png`, `mock-images/`                  |

### `admin/` - The Shop Owner's Panel

| Folder Path                      | Purpose                                                              | Example                                         |
| -------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| `admin/pages/`                   | Standalone HTML pages for the admin panel.                           | `dashboard.html`, `inventory.html`              |
| `admin/scripts/views/`           | **(Future)** Logic for each admin bottom navigation tab.             | `dashboard-view.js`, `inventory-view.js`        |
| `admin/assets/`                  | Images and assets specific to the admin panel.                       | `shop-logo.jpg`                                 |

---

## 💡 Building Out the Bottom Navigation Tabs

Here's how to structure the development for the main tabs:

### For User/Guest Tabs (`Home`, `Explore`, `Saved`, `Cart`, `Account`)

These are "views" within the main `index.html` SPA.

1.  **HTML Structure:** The container `div` for the view is in `index.html` (e.g., `<div id="saved-view" class="page-view hidden"></div>`).
2.  **JavaScript Logic:** All logic for fetching data and rendering the UI for a view goes into its own file in `public/scripts/views/`.
    -   **Example:** To build the "Saved" items page, all your code should go into `public/scripts/views/saved-view.js`.
3.  **Initialization:** The `initializeSavedView()` function is called from `public/scripts/main.js` to load it into the app.

### For Admin Tabs (`Dashboard`, `Inventory`, `Analytics`, `Requests`)

Currently, these tabs are placeholders pointing to user views. The correct, long-term structure will be:

1.  **HTML Structure:** The admin panel will likely have its own main page, like `admin/dashboard.html`, which will act as the SPA for admins.
2.  **JavaScript Logic:** The logic for each admin tab will live in a new folder: `admin/scripts/views/`.
    -   **Example:** The logic for the inventory management tab will be in `admin/scripts/views/inventory-view.js`.
3.  **Shared Components:** The admin views will reuse components from `shared/components/` (like cards, tables, etc.) to maintain a consistent look.

---

## ✅ Best Practices & Recommendations

Your current structure is very good. Here are a few small adjustments to make it even better for the long term.

### 1. Centralize Authentication Logic

-   **Problem:** `shared/scripts/main.js` is the main entry point for `index.html`. Its primary job is to orchestrate the public-facing SPA. Placing it in `shared/` can be confusing, as `shared/` is meant for code that is *imported* by other scripts, not for a main entry point itself.
-   **Solution:** When you start implementing Firebase login/signup, create a dedicated file for it: `shared/utils/auth/auth.js`. This file will handle all user session logic (login, logout, checking user state) and can be imported by any part of the app that needs it.

### 2. Organize the `docs/` Folder

-   **Problem:** The `docs/` folder has several temporary files (`temporary.txt`, `suggesions.diff`, etc.).
-   **Solution:** Consider creating a `docs/_archive/` subfolder. Move all non--essential or temporary notes there to keep the main documentation directory clean and focused on important guides.

### 3. Clean up Mock Data

-   **Problem:** The `firebase/data/` directory contains `products.json` and `services.json`, which are likely old.
-   **Solution:** To avoid confusion, delete these files and ensure that `items.json` is the single source of truth for all mock item data.

---

By following this structure, the project will be much easier to scale and maintain as you add more complex features like Firebase integration and a multi-vendor marketplace.

