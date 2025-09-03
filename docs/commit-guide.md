---
DOCUMENT AUDIT:
  Last Reviewed: Wednesday, September 3, 2025
  Reviewer: Santosh (with Gemini)
---

# Commit Message Guide: Production Standard

This guide establishes the definitive standards for crafting **clear, consistent, and professional** commit messages within this project. Adherence to these guidelines is crucial for:

-   Maintaining a clean and structured commit history.
-   Facilitating efficient debugging and code reviews.
-   Enabling accurate and automated generation of release notes.
-   Ensuring professional and uniform practices across the development team.  

---

## 0. Anatomy of a Commit Message

Each commit message adheres to a structured format to ensure clarity and machine readability:

```
<type>: <subject>

[body]

[footer]
```

**Explanation of Components:**

*   **`<type>`:** Categorizes the nature of the change (e.g., `feat`, `fix`, `docs`). This is crucial for automated tooling.
*   **`<subject>`:** A concise, single-line summary of the change, written in the imperative mood (as if giving a command).
*   **`[body]` (Optional):** Provides a detailed explanation of *what* the change is and *why* it was made, without delving into *how* it was implemented. Use bullet points for enhanced readability.
*   **`[footer]` (Optional):** Contains metadata such as breaking changes, references to issues, or other relevant information.



---

1. Allowed Commit Types

Use one of these Capital Case types:

Feat → A new feature. (Triggers a patch version bump)

Fix → A bug fix. (Triggers a patch version bump)

Perf → A code change that improves performance. (Triggers a patch version bump)

Refactor → Code restructure without new features or fixes. (Triggers a patch version bump)

Improve → Optimizations or enhancements to existing features. (Triggers a patch version bump)

Docs → Documentation-only changes. (Does NOT trigger a version bump)

Style → Code style only (formatting, spacing, semicolons). (Does NOT trigger a version bump)

Test → Adding or updating tests. (Does NOT trigger a version bump)

Chore → Build process, CI/CD, configs, tooling. (Does NOT trigger a version bump)

Revert → Reverts a previous commit. (Triggers a rollback action in the versioning system)

Rollback → Rolls back a full release or deployment. (Triggers a rollback action in the versioning system)

*Note: While Capital Case is recommended for readability, the system processes commit types case-insensitively.*

---

## 2. Subject Line (Short Summary) Rules

The subject line is the first line of the commit message and must adhere to the following rules:

*   **Length:** Must be between 50 and 72 characters.
*   **Imperative Mood:** Use the imperative mood (as if giving a command).
    *   ✅ Correct: `Add`, `Update`, `Fix`, `Remove`, `Improve`
    *   ❌ Incorrect: `Added`, `Updated`, `Fixed`
*   **Capitalization:**
    *   The `<type>` (e.g., `Feat`, `Fix`) must start with a capital letter.
    *   The `<subject>` (summary) must start with a capital letter.

**Examples:**

*   ✅ `Feat: Add JWT-based user login`
*   ✅ `Fix: Resolve crash on checkout page`
*   ❌ `feat: add jwt login` (Type lowercase is not allowed)
*   ❌ `Fix: resolve crash on checkout` (Summary lowercase is not allowed)



---

## 3. Body (Optional but Recommended)

The body of the commit message provides a more detailed explanation of the change. It should focus on *what* was changed and *why* it was changed, rather than *how* it was implemented.

*   Use bullet points or paragraphs for clarity.
*   Wrap text at 72 characters for optimal readability in various Git tools.
*   Reference relevant issues or tickets (e.g., `Closes #123`, `Fixes #456`).

**Example:**

```
Improve: Enhance search performance

- Optimized database query with proper indexing.
- Reduced response time by approximately 40%.
- Related to issue #145.
```


---

## 4. Structured Body Fields

The commit body supports specific structured fields that are automatically parsed and utilized by the versioning system. These fields enhance the detail and utility of commit messages:

*   **`Added:`** → Describes new modules, features, or functionalities introduced.
*   **`Fixed:`** → Details bug fixes, addressing specific issues or defects.
*   **`Improved:`** → Outlines optimizations, performance enhancements, or general improvements to existing features.
*   **`Note:`** → Provides additional context, warnings, or special considerations relevant to the commit.

**Example:**

```
Fix: Correct price calculation in checkout

- Fixed floating-point precision issue.
- Ensured values round to 2 decimals.

Note: Affects checkout API only, not payment gateway.
```


---

## 5. Footer (Optional)

The footer section is used for conveying critical metadata, primarily **breaking changes** and **issue references**.

*   **Breaking Changes:** Indicate any changes that are not backward-compatible. This must start with `BREAKING CHANGE:` followed by a description of the change and migration instructions.
*   **Issue References:** Link to related issues or tickets in your issue tracking system. Use keywords like `Closes #123`, `Fixes #456`, or `Resolves #789`.

**Example:**

```
BREAKING CHANGE: Removed old Cart API v1

The previous Cart API (v1) has been deprecated and removed.
Migrate to Cart API v2 for all cart-related operations.
```


---

## 6. Rollback & Revert Rules

This section clarifies the distinction and usage of `Revert` and `Rollback` operations within the version control system.

*   **`Revert`:** Used for undoing a specific commit. This creates a new commit that reverses the changes introduced by the target commit.
    *   **Example:**
        ```
        Revert: "Feat(auth): Add JWT login"

        - Removed JWT login feature due to critical vulnerability.
        - This reverts commit a1b2c3d.
        ```
    *   **Note:** While `Revert` is a commit type for undoing specific commits, it triggers a `rollback` action in the versioning system, indicating a reversal of a previous state.

*   **`Rollback`:** Used for undoing a full release or deployment to a previous stable version. This typically involves deploying an older version of the application.
    *   **Example:**
        ```
        Rollback: Revert production deploy v1.2.3

        - Deployment rolled back to version v1.2.2.
        - Triggered due to payment gateway outage.
        ```



---

## 7. Good Commit Examples

Here are several examples illustrating well-formed commit messages that adhere to these guidelines:

*   **Feature (Feat):**
    ```
    Feat: Implement user profile management API

    - Added endpoints for creating, retrieving, updating, and deleting user profiles.
    - Integrated with authentication module for secure access.
    - Closes #450
    ```

*   **Fix (Fix):**
    ```
    Fix: Resolve incorrect price calculation in checkout

    - Corrected floating-point precision issue affecting total price.
    - Ensured all monetary values are rounded to two decimal places.
    ```

*   **Improvement (Improve)::**
    ```
    Improve: Optimize product image loading performance

    - Implemented lazy loading for all product images.
    - Reduced initial page load size by approximately 1.5MB.
    ```

*   **Revert (Revert):**
    ```
    Revert: "Feat(auth): Add JWT login"

    - Removed JWT login feature due to discovered critical security vulnerability.
    - This reverts commit a1b2c3d.
    ```

*   **Rollback (Rollback):**
    ```
    Rollback: Revert production deployment to v1.2.3

    - Rolled back the production environment to version v1.2.2.
    - Reason: Unexpected outage in payment gateway service.
    ```

---


## Example Commit (CLI/Git)

This example demonstrates a comprehensive commit message, as it would appear when authored via the command line interface (CLI) or a Git client:

```
Feat: Implement user authentication module

- Added login UI with form validation.
- Fixed responsive navigation bar issue on mobile devices.
- Improved login API response time by optimizing database queries.
- Tickets: JIRA-102, GH-55
- Tags: frontend, auth
- Note: This commit introduces the core user authentication module.
- RollbackPlan: Revert to VRN0000151 if login functionality introduces critical regressions.
```


---

## Example Generated JSON Output
```json
{
  "title": "Meaning full summries heading",
  "type": "feat",
  "commitHash": "IAMSKDEV_1756919500000",
  "version": "2.3.0",
  "versionId": "VRN0000152",
  "environment": "development",
  "releaseChannel": "alpha",
  "status": "pending",
  "breakingChanges": false,

  "added": [
    "login UI with form validation"
  ],
  "fixed": [
    "navbar issue on mobile"
  ],
  "improved": [
    "login API response time"
  ],
  "tickets": [
    "JIRA-102",
    "GH-55"
  ],
  "tags": [
    "frontend",
    "auth"
  ],
  "note": "This commit introduces login module.",
  "rollbackPlan": "Revert to VRN0000151 if login breaks",

  "audit": {
    "createdBy": "Santosh",
    "createdAt": "2025-09-03T17:45:00Z",
    "deployedAt": null,
    "deployedBy": null
  }
}


---


## 8. Best Practices

Adhering to these best practices will further enhance the quality and utility of your commit messages:

*   **Consistency is Key:** Always follow the defined format and guidelines to maintain a uniform and predictable commit history.
*   **Concise Summaries:** Keep subject lines short and to the point, as they are prominently displayed in logs and release notes.
*   **Judicious Use of `Improve`:** Reserve the `Improve` type specifically for commits focused on performance optimizations or significant enhancements to existing features.
*   **Careful `Revert`/`Rollback` Usage:** Employ `Revert` and `Rollback` operations only for critical undo scenarios, understanding their implications on the project history.
*   **Automate Enforcement:** Utilize commit linting tools (e.g., Husky with commitlint) to automatically validate commit messages against these standards, ensuring compliance across the team.



---
