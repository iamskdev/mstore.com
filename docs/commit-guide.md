---
DOCUMENT AUDIT:
  Last Reviewed: 2025-09-03
  Reviewer: Santosh (with Gemini)
---

# 🚀 Commit Message Guide: Production Standard

This guide outlines the standard for writing clear, concise, and informative commit messages within this project. Adhering to these guidelines ensures a consistent commit history, facilitates easier code reviews, and improves the generation of release notes.

## 0. Quick Reference: The Anatomy of a Commit Message

Every commit message is structured into four distinct parts:

```
<type>: <short summary>

<body> (optional)

<footer> (optional)
```

*   **Type**: Categorizes the nature of the change (e.g., `feat`, `fix`, `docs`).
*   **Short Summary**: A brief, single-line description of the change.
*   **Body**: (Optional) A detailed explanation of *what* and *why* the change was made.
*   **Footer**: (Optional) Contains information about breaking changes or issue references.

---

## 1. Types: Allowed Prefixes

The following prefixes are mandatory for the `<type>` field:

*   `feat`: A new feature.
*   `fix`: A bug fix.
*   `docs`: Documentation-only changes.
*   `style`: Changes that do not affect the meaning of the code (e.g., formatting, missing semicolons, whitespace).
*   `refactor`: A code change that neither fixes a bug nor adds a feature, but improves the code structure or readability.
*   `test`: Adding missing tests or correcting existing tests.
*   `chore`: Changes to the build process or auxiliary tools and libraries (e.g., configuration files, CI/CD setup).
*   `improve`: Enhancements or optimizations to an existing feature, without introducing new functionality or fixing a bug.
*   `revert`: Reverts a previous commit.
*   `rollback`: Reverts a release or deployment.

---

## 2. Title: Short Summary Guidelines

*   The first line (subject line) should be no more than **50-72 characters** in length.
*   Always use the **imperative tense** in the subject line. This means writing as if you are giving a command.
    *   ✅ **Correct**: `add`, `update`, `fix`, `remove`, `improve`
    *   ❌ **Incorrect**: `added`, `updated`, `fixed`, `removed`, `improved`

**Examples:**

*   `feat: add JWT-based user login`
*   `fix: resolve crash on checkout page`
*   `improve: optimize checkout page loading time`
*   `revert: "feat(auth): add JWT login"`
*   `rollback: revert production deploy v1.2.3`

---

## 3. Body: Detailed Explanation (Optional, Recommended)

The body of the commit message should explain *what* was changed and *why* it was changed, not *how*.

*   Each line should be wrapped at **72 characters** for readability.
*   Use bullet points for clarity.
*   Reference any related issues or tickets.

**Example:**

```
improve: enhance search performance

- Optimized database query by adding necessary indexes.
- Reduced response time by approximately 40% for common search queries.
- Related to issue #145.
```

---

## 4. Footer: Breaking Changes & Issue References (Optional)

The footer is used for important metadata, such as:

*   **Breaking Changes**: Indicate any changes that might break existing functionality for users or other parts of the system.
*   **Issue References**: Further references to issues or tickets that are resolved or related to the commit.

**Example:**

```
BREAKING CHANGE: removed old cart API v1
```

---

## 5. Good Commit Examples

Here are some examples of well-structured commit messages:

```
feat: add order history API integration

- Implemented the /orders endpoint for fetching user order history.
- Added a new UI component to display past orders.
- Closes #450
```

```
fix: correct total price calculation

- Fixed a floating-point precision issue in the checkout process.
- Ensured all price calculations are rounded to 2 decimal places.
```

```
improve: optimize product image loading

- Implemented lazy loading for product images to improve initial page load time.
- Reduced the initial page size by 1.5MB.
```

```
revert: "feat(auth): add JWT login"

- Removed the JWT login feature due to a critical security vulnerability discovered post-deployment.
- This reverts commit a1b2c3d.
```

```
rollback: revert production deploy v1.2.3

- The deployment was rolled back to version v1.2.2.
- This action was taken due to an unexpected outage in the payment gateway integration.
```

---

## 6. Best Practices

*   **Consistency is Key**: Always follow these patterns to maintain a clean and understandable commit history.
*   **Clear Summaries**: The short summary is often used in release notes, so ensure it is descriptive and meaningful.
*   **Use `improve` Wisely**: This type is specifically for enhancing or optimizing existing features, not for new features or bug fixes.
*   **Use `revert`/`rollback` Carefully**: These types should be used sparingly and primarily for emergency fixes or critical rollbacks.
*   **Automated Enforcement**: Consider using commit message linters or Git hooks (like Husky) to automatically enforce these guidelines.
