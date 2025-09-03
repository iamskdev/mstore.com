---
DOCUMENT AUDIT:
  Last Reviewed: 03/09/2025 15:46:00 IST
  Reviewer: Santosh (with Gemini)
---

# 🚀 Commit Message Guide: Production Standard

This guide outlines the standard for writing clear, concise, and informative commit messages within this project. Adhering to these guidelines ensures a consistent commit history, facilitates easier code reviews, and improves the generation of release notes.

## 0. Quick Reference: The Anatomy of a Commit Message

Every commit message is structured into four distinct parts:

```
<Type>: <Short summary>

<body> (optional)

<footer> (optional)
```

*   **Type**: Categorizes the nature of the change (e.g., `Feat`, `Fix`, `Docs`).
*   **Short Summary**: A brief, single-line description of the change, starting with a capital letter.
*   **Body**: (Optional) A detailed explanation of *what* and *why* the change was made.
*   **Footer**: (Optional) Contains information about breaking changes or issue references.

---

## 1. Types: Allowed Prefixes

The following prefixes are mandatory for the `<Type>` field, and they must be in **Capital Case**:

*   `Feat`: A new feature.
*   `Fix`: A bug fix.
*   `Docs`: Documentation-only changes.
*   `Style`: Changes that do not affect the meaning of the code (e.g., formatting, missing semicolons, whitespace).
*   `Refactor`: A code change that neither fixes a bug nor adds a feature, but improves the code structure or readability.
*   `Test`: Adding missing tests or correcting existing tests.
*   `Chore`: Changes to the build process or auxiliary tools and libraries (e.g., configuration files, CI/CD setup).
*   `Improve`: Enhancements or optimizations to an existing feature, without introducing new functionality or fixing a bug.
*   `Revert`: Reverts a previous commit.
*   `Rollback`: Reverts a release or deployment.

---

## 2. Title: Short Summary Guidelines

*   The first line (subject line) should be no more than **50-72 characters** in length.
*   Always use the **imperative tense** in the subject line. This means writing as if you are giving a command.
    *   ✅ **Correct**: `Add`, `Update`, `Fix`, `Remove`, `Improve`
    *   ❌ **Incorrect**: `Added`, `Updated`, `Fixed`, `Removed`, `Improved`
*   The commit **Type must be in Capital Case**, and the **summary must start with a Capital letter**.
    *   ✅ **Correct**: `Chore: Improve versioning logic`
    *   ✅ **Correct**: `Fix: Resolve crash on checkout page`
    *   ❌ **Incorrect**: `chore: improve versioning logic` (lowercase type is not allowed)
    *   ❌ **Incorrect**: `Fix: resolve crash on checkout page` (summary must start with a capital letter)

**Examples:**

*   `Feat: Add JWT-based user login`
*   `Fix: Resolve crash on checkout page`
*   `Improve: Optimize checkout page loading time`
*   `Revert: "Feat(auth): Add JWT login"`
*   `Rollback: Revert production deploy v1.2.3`

---

## 3. Body: Detailed Explanation (Optional, Recommended)

The body of the commit message should explain *what* was changed and *why* it was changed, not *how*.

*   Each line should be wrapped at **72 characters** for readability.
*   Use bullet points for clarity.
*   Reference any related issues or tickets.

**Example:**

```
Improve: Enhance search performance

- Optimized database query by adding necessary indexes.
- Reduced response time by approximately 40% for common search queries.
- Related to issue #145.
```

---

**Example: For include Note**

Fix: Correct price calculation in checkout

- Fixed floating-point precision issue.
- Ensured values are rounded to 2 decimals.

Notes: Affects only checkout API, no impact on payment gateway.


git commit -m "Fix: Correct price calculation in checkout" \
-m "- Fixed floating-point precision issue." \
-m "- Ensured values are rounded to 2 decimals." \
-m "Notes: Affects only checkout API, no impact on payment gateway."


## 4. Footer: Breaking Changes & Issue References (Optional)

The footer is used for important metadata, such as:

*   **Breaking Changes**: Indicate any changes that might break existing functionality for users or other parts of the system.
*   **Issue References**: Further references to issues or tickets that are resolved or related to the commit.

**Example:**

```
BREAKING CHANGE: Removed old cart API v1
```

---

## 5. Good Commit Examples

Here are some examples of well-structured commit messages:

```
Feat: Add order history API integration

- Implemented the /orders endpoint for fetching user order history.
- Added a new UI component to display past orders.
- Closes #450
```

```
Fix: Correct total price calculation

- Fixed a floating-point precision issue in the checkout process.
- Ensured all price calculations are rounded to 2 decimal places.
```

```
Improve: Optimize product image loading

- Implemented lazy loading for product images to improve initial page load time.
- Reduced the initial page size by 1.5MB.
```

```
Revert: "feat(auth): add JWT login"

- Removed the JWT login feature due to a critical security vulnerability discovered post-deployment.
- This reverts commit a1b2c3d.
```

```
Rollback: Revert production deploy v1.2.3

- The deployment was rolled back to version v1.2.2.
- This action was taken due to an unexpected outage in the payment gateway integration.
```

---

## 6. Best Practices

*   **Consistency is Key**: Always follow these patterns to maintain a clean and understandable commit history.
*   **Clear Summaries**: The short summary is often used in release notes, so ensure it is descriptive and meaningful.
*   **Use `Improve` Wisely**: This type is specifically for enhancing or optimizing existing features, not for new features or bug fixes.
*   **Use `Revert`/`Rollback` Carefully**: These types should be used sparingly and primarily for emergency fixes or critical rollbacks.
*   **Automated Enforcement**: Consider using commit message linters or Git hooks (like Husky) to automatically enforce these guidelines.