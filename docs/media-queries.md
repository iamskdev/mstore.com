📄 Responsive Design: Mobile-First Strategy + 2 Media Queries
──────────────────────────────────────────────────────────────

📌 STRUCTURE:
  ✅ Mobile Styles (Default)
  ✅ Tablet / Landscape Styles (Query 1)
  ✅ Desktop Styles (Query 2)

──────────────────────────────────────────────────────────────

📱 1. MOBILE (Default – No Media Query Needed)

→ Target: All mobile phones (portrait)
→ Width Range: 0px – 599px

Write base styles directly:
------------------------------------------------
.container {
  padding: 1rem;
  font-size: 1rem;
  display: block;
}
------------------------------------------------

──────────────────────────────────────────────────────────────

📲 2. LANDSCAPE / TABLET (Query 1)

→ Target: Tablets & landscape phones
→ Width Range: 600px – 1023px

@media screen and (min-width: 600px) and (max-width: 1023px) {
  .container {
    font-size: 1.1rem;
    flex-direction: row;
  }
}

──────────────────────────────────────────────────────────────

🖥️ 3. DESKTOP (Query 2)

→ Target: Laptops and large screens
→ Width Range: 1024px and above

@media screen and (min-width: 1024px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
    font-size: 1.2rem;
  }
}

──────────────────────────────────────────────────────────────

✅ Notes:
- Use `min-width` for scalable, future-proof CSS.
- Stick to 2 media queries: Tablet & Desktop.
- Keep mobile as the base layout = clean, fast, and responsive.

──────────────────────────────────────────────────────────────

gemini 

📄 Responsive Design: A Simple & Robust Strategy
──────────────────────────────────────────────────────────────

📌 **STRATEGY: Mobile-First with a Single Breakpoint**
This project uses a simple and effective two-tier responsive design strategy. This keeps the CSS clean, predictable, and easy to maintain.

  ✅ **Mobile Styles (Default):** All base styles are written for mobile first.
  ✅ **Tablet & Desktop (Single Media Query):** A single media query handles all larger screens.

──────────────────────────────────────────────────────────────

### 📱 1. Mobile-First (Default – No Media Query)

-   **Target:** All mobile devices (portrait view).
-   **Width Range:** `0px` – `599px`

-------------------------------------------------
-------------------------------------------------
All base styles are written without a media query, making them the default for all screen sizes. This is the core of the mobile-first approach.

**Example:**
```css
/* Base styles apply to all screens, but are designed for mobile */
.item-card {
  display: flex;
  flex-direction: row; /* Horizontal layout for list view on mobile */
  padding: 0.5rem;
}
```

──────────────────────────────────────────────────────────────

### 🖥️ 2. Tablet & Desktop (Single Media Query)

-   **Target:** Tablets, landscape phones, and all desktop screens.
-   **Width Range:** `600px` and above.

A single media query is used to adapt the layout for any screen larger than a typical mobile phone. This is where layouts might change from a single column to a grid.

**Example:**
```css
@media screen and (min-width: 600px) {
  /* Change card layout to vertical for grids on larger screens */
  .items-grid .item-card {
    flex-direction: column;
  }

  /* Make the main content area wider */
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

──────────────────────────────────────────────────────────────

### ✨ Why This Approach?

-   **Simplicity:** Fewer breakpoints mean less code to write and debug.
-   **Maintainability:** It's easier to reason about the layout when there are only two main states.
-   **Flexibility:** Using modern CSS like Flexbox and Grid within these two states allows components to be naturally responsive without needing many specific breakpoints.

> **Note on Exceptions:** For highly complex components like the `item-details` page, an additional, more specific breakpoint (e.g., `@media screen and (min-width: 1024px)`) can be used to fine-tune the layout for very large screens. However, the primary strategy for the rest of the app remains the simple two-tier system.


