> **DOCUMENT AUDIT**
> - **Status:** `Updated`
> - **Last Reviewed:** 02/10/2025 20:41:00 IST (Updated by Gemini)
> - **Reviewer:** Santosh (with Gemini)
> - **Purpose:** This document explains the global ID generation system used across the project, including its format, rules, and best practices.

---

# Global ID Generation System

## Format
TYPE-YYYYMMDD-HHMMSS-SSS-RRRR

- **TYPE** → 3-letter uppercase code representing entity  
- **YYYYMMDD** → Current date  
- **HHMMSS** → Current time  
- **SSS** → Milliseconds (for uniqueness)  
- **RRRR** → 4-character random string (for guaranteed uniqueness)

---

## Examples

- User → `USR-20250908-163030-123-A4B1`  
- Item → `ITM-20250908-163035-456-C8D2`
- Merchant → `MRC-20250908-163040-789-E6F3`
- Order → `ORD-20250908-163045-012-G5H4`
- Message → `MSG-20250908-163050-345-I7J6`

> **Note:** Koi bhi naya entity banega, isi format ko follow kare.  

---

## Type Codes

- **USR** → User (all types: customer, admin, etc.)
- **ACC** → Account
- **ALT** → Alert
- **BRD** → Brand
- **CMP** → Campaign
- **CON** → Conversation
- **CTG** → Category (Main collection)
- **ICT** → Item Category (Link/reference within an item)
- **ITM** → Item (Products/Services/etc)
- **ISC** → Item Sub-Category (Link/reference within an item)
- **LOG** → Log
- **MRC** → Merchant
- **MSG** → Message (in a conversation)
- **ORD** → Order
- **PLG** → Price Log
- **PRM** → Promotion
- **STY** → Story
- **UNT** → Unit

---

## Generation Rules

1. **TYPE** → 3 letters uppercase  
2. **TIMESTAMP** → `YYYYMMDD-HHMMSS`  
3. **MILLISECONDS** → `SSS` (000–999)  
4. **RANDOM** -> 4-character random alphanumeric string.

---

## Benefits

- ✅ Consistent across all entities  
- ✅ Globally unique  
- ✅ Chronologically sortable (by timestamp part)
- ✅ Human readable  
- ✅ No manual sequence management needed  

---

## ⚠️ Considerations: Server Time vs. Client Time

The `generateId` function relies on the system time of the machine where it is executed.

-   **Problem:** If an ID is generated on a client's machine (a user's browser) and that user's computer has an incorrect date or time, the generated ID will contain an incorrect timestamp. While the ID will still be unique (due to the random part), it will break chronological sorting.

-   **✅ Solution (Best Practice):** For critical data where chronological order is important (like users, orders, logs), **always generate the ID on the server-side** (e.g., in a Firebase Cloud Function).

    -   **Why?** Server clocks are synchronized with Network Time Protocol (NTP) and are highly accurate and reliable. You have full control over the server environment, whereas you cannot trust the clock on a client's machine.

> By generating IDs on a trusted server, you guarantee both uniqueness and correct chronological order.


---

## JavaScript Implementation

> **Note:** This function uses **UTC (Coordinated Universal Time)** to ensure that all timestamps are standardized, regardless of the server's or user's local time zone. This is critical for maintaining chronological order in a global system.

```javascript
function generateId(entityType) {
  const now = new Date();
  // Use UTC methods to ensure global consistency
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  const ms = String(now.getUTCMilliseconds()).padStart(3, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${entityType}-${yyyy}${mm}${dd}-${hh}${min}${ss}-${ms}-${random}`;
}

// Example:
console.log(generateId('USR')); // e.g., USR-20251002-133000-123-ABCD (in UTC)