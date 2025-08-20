```json
{
  "meta": {
    "priceLogId": "PLG00000001",
    "version": 1.0,
    "currency": "INR",
    "links": {
      "itemId": "ITM000000000001",
      "merchantId": "MRC00000001"
    }
  },
  "price": {
    "mrp": 14,
    "costPrice": 9,
    "sellingPrice": 11
  },
  "changeContext": {
    "changeType": "manual_update",
    "reason": "Festival discount",
    "notes": "Special Diwali offer applied"
  },
  "audit": {
    "changedAt": "2025-08-05T14:30:00Z",
    "changedBy": {
      "userId": "MRC00000001",
      "role": "merchant",
      "name": "Rajesh Kumar"
    },
    "previousPrice": {
      "mrp": 12,
      "costPrice": 8,
      "sellingPrice": 10
    }
  }
}
```
---

# 📦 Price Log JSON Structure Guide

यह JSON किसी product के **price changes** को track करने के लिए है।  
हर बार price बदलने पर एक **नया log entry** बनाया जाता है।  
इसमें **पुराने और नए price दोनों की जानकारी** रहती है।

---

## 1️⃣ `meta` — Price Log Metadata
- `priceLogId` — यूनिक price log ID  
- `version` (string): स्कीमा या डेटा स्ट्रक्चर का वर्ज़न।  
- `appVersion` — डेटा स्कीमा/ऐप का वर्ज़न  
- `currency` — मुद्रा कोड (जैसे `"INR"`)  
- `links` — संबंधित IDs  
  - `itemId` — जिस product का price बदला  
  - `merchantId` — जिस व्यापारी का product है  

---

## 2️⃣ `price` — New Price Details
- `mrp` — नया Maximum Retail Price  
- `costPrice` — नई लागत कीमत  
- `sellingPrice` — नई बिक्री कीमत  

---

## 3️⃣ `changeContext` — Price Change Context
- `changeType` — price change का प्रकार (`manual_update`, `system_update`, `promotion` आदि)  
- `reason` — change का कारण  
- `notes` — अतिरिक्त विवरण  

---

## 4️⃣ `audit` — Change Tracking
- `changedAt` — change का समय (ISO format)  
- `changedBy` — जिसने change किया  
  - `userId` — user की ID  
  - `role` — user का role (`merchant`, `staff`, `admin`)  
  - `name` — user का नाम  
- `previousPrice` — पुरानी कीमतें  
  - `mrp` — पुराना MRP  
  - `costPrice` — पुरानी लागत कीमत  
  - `sellingPrice` — पुरानी बिक्री कीमत