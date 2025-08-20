# ❤️ Saved Items JSON Structure Guide 

यह JSON किसी user के **'बाद के लिए सहेजे गए' (Saved for Later) या 'विशलिस्ट' (Wishlist)** आइटम्स को स्टोर करने के लिए है।
  
इसमें केवल **minimum details** रखी जाती हैं, ताकि latest product info हमेशा product database से fetch हो सके।

```json
{
  "meta": {
    "savedId": "SVD0000000",
    "version": 1.0,
    "link": {
      "userId": "USR00000002"
    }
  },
"savedItems": [
  {
    "itemId": "ITM000000000001",
    "savedAt": "2025-08-04T15:00:00Z"
  },
  {
    "itemId": "ITM000000000002",
    "savedAt": "2025-08-04T15:10:00Z"
  }
]
  }
```
---


## 1️⃣ `meta` — Cart Metadata

- `savedId` — saved का unique identifier।  
- `version` (string): स्कीमा या डेटा स्ट्रक्चर का वर्ज़न।  
- `link`  
 - `userId` — यह cart किस user का है।

---

## 2️⃣ `savedItems` — Saved Item List
- `savedItems` (array of objects): सहेजे गए आइटम्स की सूची।  
  प्रत्येक ऑब्जेक्ट में:  
  - `itemId` (string) — आइटम का यूनिक ID।  
  - `savedAt` (string) — आइटम को कब सहेजा गया (ISO 8601 फ़ॉर्मेट)।  
---
