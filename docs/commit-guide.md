---
DOCUMENT AUDIT:
  Last Reviewed: Saturday, September 6, 2025
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
<type>(<scope>): <subject>

[body]

[footer]
```

**Explanation of Components:**

*   **`<type>`:** Categorizes the nature of the change (e.g., `feat`, `fix`, `docs`). This is crucial for automated tooling.
*   **`<scope>`** (Optional): Specifies the part of the codebase affected by the change (e.g., `auth`, `ui`, `api`, `docs`). This helps in quickly identifying the area of impact. If the change is project-wide, the scope can be omitted.
*   **`<subject>`:** A concise, single-line summary of the change. **Always** write in the imperative mood (e.g., "Add feature" not "Added feature" or "Adds feature").
*   **`[body]` (Optional):** Provides a detailed explanation of *what* the change is and *why* it was changed (the problem it solves or the value it adds), rather than *how* it was implemented. Use bullet points for enhanced readability.
*   **`[footer]` (Optional):** Contains metadata such as breaking changes, references to issues, or other relevant information.



---

1. Allowed Commit Types

Use one of these Capital Case types:

Feat → A new feature. (Triggers a patch version bump)

Fix → A bug fix. (Triggers a patch version bump)

Improve → An enhancement or optimization to an *existing* feature or functionality. This is not a new feature (`feat`) or a bug fix (`fix`). (Triggers a patch version bump)

Perf → A code change that improves performance. (Triggers a patch version bump)

Refactor → Code restructure without new features or fixes. (Does NOT trigger a version bump)

Docs → Documentation-only changes. (Does NOT trigger a version bump)

Style → Code style only (formatting, spacing, semicolons). (Does NOT trigger a version bump)

Test → Adding or updating tests. (Does NOT trigger a version bump)

Chore → Build process, CI/CD, configs, tooling. (Does NOT trigger a version bump)

Revert → Reverts a previous commit. (Triggers a rollback action in the versioning system)

Rollback → Rolls back a full release or deployment. (Triggers a rollback action in the versioning system)

*Note: While Capital Case is recommended for readability, the system processes commit types case-insensitively. However, for consistency and adherence to the standard, always use Capital Case.*
*Important: A `BREAKING CHANGE:` in the footer will always trigger a **major** version bump, regardless of the commit type.*

---

## 2. Subject Line (Short Summary) Rules

The subject line is the first line of the commit message and must adhere to the following rules:

*   **Length:** Must be between 50 and 72 characters.
*   **Capitalization:**
    *   The `<type>` (e.g., `Feat`, `Fix`) must start with a capital letter.
    *   The `<subject>` (summary) must start with a capital letter.

**Examples:**

*   ✅ `Feat: Add JWT-based user login`
*   ✅ `Fix: Resolve crash on checkout page`
*   ❌ `feat: add jwt login` (Type lowercase is not allowed)
*   ❌ `Fix: resolve crash on checkout` (Summary lowercase is not allowed)

**⚠️ Important Subject Line Formatting:**
The versioning system strictly parses the subject line. Ensure the exact format `<type>(<scope>): <subject>` or `<type>: <subject>` is used.
*   **Always include a colon and a single space** (`: `) after the `<type>` or `(<scope>)`.
*   Incorrect formatting (e.g., `Feat(auth)Add login`, `Fix-Resolve bug`) will lead to incorrect parsing and potentially malformed JSON output.



---

## 3. Body (Optional but Recommended)

The body of the commit message provides a more detailed explanation of the change. It should focus on *what* was changed and, crucially, *why* it was changed (the problem it solves or the value it adds), rather than *how* it was implemented. Use bullet points for enhanced readability.

*   Use bullet points or paragraphs for clarity.
*   Wrap text at 72 characters for optimal readability in various Git tools.
*   Reference relevant issues or tickets (e.g., `Closes #123`, `Fixes #456`).

**Example:**

---

## 4. Structured Body Fields

The commit body supports specific structured fields that are automatically parsed and utilized by the versioning system. These fields enhance the detail and utility of commit messages. The system normalizes keys (e.g., `note`/`notes` to `note`, `ticket`/`tickets` to `tickets`) for consistency. Simple lines in the body that do not follow a `key: value` format will be captured under the commit `type` (e.g., if the type is `feat`, simple lines will be added to a `feat` array).

*   **`Added:`** → Describes new modules, features, or functionalities introduced.
*   **`Fixed:`** → Details bug fixes, addressing specific issues or defects.
*   **`Improved:`** → Outlines optimizations, performance enhancements, or general improvements to existing features.
*   **`Note:`** → Provides additional context, warnings, or special considerations relevant to the commit.
*   **`Tickets:`** → References to related issue tracking tickets (e.g., `JIRA-123`, `GH-456`). Can be a comma-separated list.
*   **`Tags:`** → Categorization tags for the commit (e.g., `frontend`, `backend`, `auth`). Can be a comma-separated list.
*   **`RollbackPlan:`** → Describes the plan to revert the changes if necessary (e.g., `Revert to VRN000000000151 if login functionality introduces critical regressions`).

**⚠️ Important Body Formatting for Structured Fields:**
For proper parsing into JSON, adhere to these strict formatting rules:
*   **Key-Value Pairs:** Always use the exact `Key: Value` format (e.g., `Note: This is a note.`). A colon and a single space (`: `) are mandatory after the key. Keys must be alphabetic (e.g., `Note`, `Tickets`, `Added`).
*   **Bullet Points:** For `Added:`, `Fixed:`, and `Improved:` sections, use a hyphen followed by a single space (`- `) for each item (e.g., `- Fixed a bug.`). Other bullet point styles (e.g., `* `, `+ `) will not be parsed.

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

**⚠️ Important Footer Formatting for Breaking Changes:**
The `BREAKING CHANGE:` keyword must be followed by a colon and a single space (`: `) for the versioning system to correctly parse it.
*   Example: `BREAKING CHANGE: Removed old API endpoint.`
*   Incorrect formatting (e.g., `BREAKING CHANGE - Removed`, `BREAKINGCHANGE:`) will prevent proper parsing and may lead to an incorrect major version bump.

**Example:**

```
BREAKING CHANGE: Removed old Cart API v1

The previous Cart API (v1) has been deprecated and removed.
Migrate to Cart API v2 for all cart-related operations.
```

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
## Dummy Commit R
node versioner/versioner.js commit -F docs/commit_message.txt

## Example Commit (CLI/Git)

This example demonstrates a comprehensive commit message, as it would appear when authored via the command line interface (CLI) or a Git client:

### node versioner/versioner.js commit -F docs/commit_message.txt 
### git commit -F docs/commit_message.txt  

```
Feat(banner): Implement banner display on home page and refine card styling

Added:
- banner successfully added in home view.
Fixed:
- husky pre/post-commit issue fixed.
- description fon size issue in card grid.
- Ensured consistent CHANGELOG.md updates during versioning.
Improved:
- commit body parsing for 'Added', 'Fixed', 'Improved' sections.

```
---

## Example Generated JSON Output
```json
  {
    "version": {
      "new": "1.3.0",
      "old": "1.2.4",
      "bump": "minor"
    },
    "versionId": "VRN000000000125",
    "commit": {
      "hash": {
        "long": "ab70b9408fa1f8d3effa7f4bb16e2e8ac00710bf",
        "short": "ab70b94",
        "url": "https://github.com/iamskdev/apnastore.com/commit/ab70b9408fa1f8d3effa7f4bb16e2e8ac00710bf"
      },
      "author": {
        "name": "ＭＲ.ＳＡＮＴＯＳＨ",
        "userName": "iamskdev"
      },
      "branch": {
        "name": "main",
        "url": "https://github.com/iamskdev/apnastore.com/tree/main"
      }
    },
    "type": "feat",
    "scope": "banner",
    "subject": "Implement banner display on home page and refine card styling",
    "revertedCommit": null,
    "changes": {
      "added": [
        "banner successfully added in home view."
      ],
      "fixed": [
        "husky pre/post-commit issue fixed.",
        "description fon size issue in card grid.",
        "Ensured consistent CHANGELOG.md updates during versioning."
      ],
      "improved": [
        "commit body parsing for 'Added', 'Fixed', 'Improved' sections."
      ]
    },
    "breakingChanges": [],
    "notes": [],
    "tags": [],
    "tickets": [],
    "metadata": {
      "environment": "development",
      "releaseChannel": "alpha"
    },
    "status": "deployed",
    "audit": {
      "createdBy": "Santosh",
      "createdAt": "2025-09-05T18:24:25Z",
      "deployedAt": "2025-09-05T18:25:01Z",
      "deployedBy": "Santosh"
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
*   **Learn from Examples:** Refer to the "Good Commit Examples" and "Example Commit (CLI/Git)" sections for practical demonstrations of well-formed messages.
