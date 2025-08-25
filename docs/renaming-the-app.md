# 🔄 How to Rename the Application

**Last Updated:** 18/07/2025, 16:00 IST

This guide provides a complete checklist for renaming the "mStore" application. Following these steps will ensure that all parts of the app are updated correctly, whether you are doing it before or after deployment.

---

## 💡 Core Principle: Consistency is Key

The application's name is used in many places, from user-facing titles to internal configuration files. It's crucial to update all instances to maintain consistency and prevent confusion.

---

## 📋 Pre-Deployment Renaming Checklist

If you are renaming the app before the first deployment, follow these steps.

### Step 1: Update Core Configuration Files

These files define how the app is identified by browsers and operating systems.

-   **`manifest.json`**
    -   **What to change:** `name`, `short_name`, and `description`.
    -   **Why:** This controls the name and icon shown when the PWA is installed on a device.

-   **`package.json`**
    -   **What to change:** `name` and `description`.
    -   **Why:** This is important for project management and if you ever publish it as a package.

-   **`service-worker.js`**
    -   **What to change:** The `CACHE_NAME` variable (e.g., from `'apna-store-cache-v1'` to `'new-app-name-cache-v1'`).
    -   **Why:** Changing the cache name is **critical**. It forces the service worker to delete the old cache and create a new one, ensuring users get the updated files (like new logos and HTML).

### Step 2: Update User-Facing HTML & Partials

These changes affect what the user sees directly in their browser.

-   **`index.html`**
    -   **What to change:** The `<title>` tag.

-   **`public/pages/item-details.html`**
    -   **What to change:** The `<title>` tag.

-   **`shared/partials/header.html`**
    -   **What to change:** The default brand name text inside `<span class="brand-name">mStore</span>`.

-   **`shared/partials/footer.html`**
    -   **What to change:** The heading (`<h4>About mStore</h4>`) and the copyright text (`© 2025 mStore`).

### Step 3: Update Assets

-   **`shared/assets/logo/app-logo.png`**
    -   **What to do:** Replace this file with your new logo.
    -   **Tip:** It's best to keep the filename the same (`app-logo.png`) to avoid having to change the path in the HTML. If you do change the filename, make sure to update the `src` attribute in `header.html`.

### Step 4: Update Documentation

To keep the project maintainable, update all references to the old name.

-   **`readme.md`**: Update the main project title (`# mStore`).
-   **`docs/` folder**: Check all `.md` and `.txt` files (like `future-scope.md`, `project-structure-guide.md`, etc.) for any mention of "mStore" and replace it with the new name.

---

## 🚀 Post-Deployment Renaming

If the app is already live and you want to rename it, the process is the same as the pre-deployment checklist. However, there are a few extra things to keep in mind:

1.  **Follow All Steps Above:** Make all the changes listed in the checklist.

2.  **Deploy the Changes:** Upload all the updated files to your web server.

3.  **Cache Invalidation is Key:**
    -   Because you changed the `CACHE_NAME` in `service-worker.js`, the user's browser will automatically detect a new version of the service worker.
    -   When the user next visits the app, the new service worker will install, fetch all the new files (with the new name and logo), and delete the old cache.
    -   The user will see the updated app name and branding on their next visit or after they close and reopen the app.

4.  **Inform Your Users (Optional but Recommended):** If you have a significant user base, it's good practice to announce the rebranding through a banner or a notification within the app.

By following this guide, you can ensure a smooth and complete renaming process for your application at any stage.