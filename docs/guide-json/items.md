```json
{
  "meta": {
    "itemId": "ITM000000000001",
    "type": "product",
    "version": 1.0,
    "isAvailable": true,
    "isActive": true,
    "isPopular": true,
    "visibility": "catalog_search",
    "isDeleted": false,
    "isArchived": false,
    "priority": "normal",
    "currency": "INR",
    "links": {
      "merchantId": "MRC00000001",
      "categoryId": "cat_biscuits",
      "subcategoryId": "subcat_glucose",
      "brandId": "item_brand_001",
      "unitId": "unit_001"
    }
  },
  "info": {
    "name": "Parle G Biscuit 80g",
    "sku": "PARLEG-80G",
    "pricing": {
      "mrp": 12,
      "costPrice": 8,
      "sellingPrice": 10,
      "discount": 2, 
      "discountType": "fixed" 
},    
    "barcode": {
      "number": "8901234567890",
      "type": "EAN-13"
    },
    "tags": ["biscuit", "parle", "glucose", "snack"],
    "merchantNote": "price is hike",
    "descriptions": {
      "short": "Classic glucose biscuit.",
      "long": "Classic glucose biscuits good for health."
    },
    "attributes": {
      "flavor": "original",
      "weight": "80g",
      "packaging": "Plastic Packet",
      "origin": "India",
      "shelfLife": "6 months"
    }
  },
  "policies": {
    "returnPolicy": {
      "isReturnable": true,
      "returnWindowDays": 7,
      "returnType": "replacement_only",
      "conditions": [
        "Item must be unused",
        "Original packaging required",
        "Proof of purchase mandatory"
      ]
    },
    "warrantyPolicy": {
      "isWarrantyAvailable": false,
      "warrantyPeriodMonths": 0,
      "warrantyType": null,
      "provider": null
    },
    "exchangePolicy": {
      "isExchangeable": true,
      "exchangeWindowDays": 7,
      "conditions": [
        "Exchange only for same category",
        "Product must be unused and sealed"
      ]
    },
    "cancellationPolicy": {
      "isCancellable": true,
      "cancellationWindowHours": 24,
      "cancellationFeePercent": 0
    }
  },
  "media": {
    "thumbnail": "./localstore/images/items/parleg-cup.jpg",
    "images": [
      "./localstore/images/items/parleg-cup.jpg",
      "./localstore/images/items/parleg-tea.jpg",
      "./localstore/images/items/parleg-royal.jpg"
    ],
    "video": null
  },
  "inventory": {
    "stockQty": 200,
    "batchId": "BATCH001",
    "expiryDate": null,
    "lowStockThreshold": 20,
    "isLowStock": false
  },
  "logistics": {
    "package": {
      "weight": { "value": 80, "unit": "g" },
      "dimensions": { "l": 12, "w": 8, "h": 2, "unit": "cm" },
      "volume": { "value": 192, "unit": "cm³" },
      "packagingType": "plastic_packet",
      "fragile": false,
      "temperatureSensitive": false
    },
    "shipping": {
      "availableMethods": ["standard", "express"],
      "defaultMethod": "standard",
      "estimatedDays": {
        "standard": { "min": 3, "max": 5 },
        "express": { "min": 1, "max": 2 }
      },
      "charges": {
        "standard": { "value": 20, "currency": "INR" },
        "express": { "value": 50, "currency": "INR" }
      },
      "freeShippingThreshold": { "value": 500, "currency": "INR" },
      "codAvailable": true,
      "deliveryZones": ["Delhi", "Mumbai", "Pune"]
    },
    "handling": {
      "handlingTimeHours": 12,
      "specialInstructions": "Keep away from moisture"
    }
  },
  "delivery": {
    "modes": ["On Site", "Pickup", "Home Delivery", "Online"],
    "defaultMode": "On Site"
  },
  "analytics": {
    "rating": 4.5,
    "numReviews": 120,
    "views": 1500,
    "wishlists": 50,
    "totalSales": 450,
    "revenueGenerated": 4500,
    "lastSoldAt": "2025-07-21T14:30:00Z"
  },
  "seo": {
    "title": "Parle G Biscuit - Best Tea Time Snack",
    "keywords": ["parle g", "glucose biscuit", "tea snack"],
    "description": "Original Parle-G glucose biscuit at best price online."
  },
  "audit": {
    "version": 1.0,
    "createdBy": {
      "userId": "USR00000002",
      "role": "merchant",
      "name": "Rajesh Kumar"
    },
    "updatedBy": {
      "userId": "USR00000002",
      "role": "merchant",
      "name": "Rajesh Kumar"
    },
    "createdAt": "2024-06-10T12:00:00Z",
    "updatedAt": "2024-06-10T12:00:00Z"
  }
}
```
---
# 🛍 Product Item JSON Structure Guide

यह गाइड एक **Product Item Object** का पूरा स्ट्रक्चर बताती है।  
इसे सभी प्रोडक्ट्स को एक **consistent format** में स्टोर और मैनेज करने के लिए इस्तेमाल किया जा सकता है।  

---

## 1️⃣ `meta` — Product Metadata
- `itemId` — यूनिक प्रोडक्ट ID  
- `type` — प्रोडक्ट का टाइप (जैसे `"product"`)  
- `appVersion` — डेटा स्कीमा/ऐप का वर्ज़न  
- `isAvailable` — प्रोडक्ट उपलब्ध है या नहीं  
- `isActive` — सक्रिय है या नहीं  
- `version` (string): स्कीमा या डेटा स्ट्रक्चर का वर्ज़न।  

- `isFeatured` — फीचर्ड प्रोडक्ट है या नहीं  
- `visibility` — प्रोडक्ट की विज़िबिलिटी मोड (`catalog_search`, `hidden`, आदि)  
- `isDeleted` — डिलीट किया गया या नहीं  
- `isArchived` — आर्काइव किया गया या नहीं  
- `priority` — प्रोडक्ट की प्राथमिकता (`low`, `normal`, `high`)  
- `currency` — प्रोडक्ट की मुद्रा कोड (`"INR"`)  
- `pricing`  
  - `mrp` — अधिकतम खुदरा मूल्य  
  - `costPrice` — लागत मूल्य  
  - `sellingPrice` — बिक्री मूल्य  
- `links`  
  - `merchantId` — व्यापारी का ID  
  - `categoryId` — मुख्य कैटेगरी ID  
  - `subcategoryId` — सब-कैटेगरी ID  
  - `brandId` — ब्रांड ID  
  - `unitId` — यूनिट ID  

---

## 2️⃣ `info` — Product Information
- `name` — प्रोडक्ट का नाम  
- `sku` — SKU कोड  
- `barcode`  
  - `number` — बारकोड नंबर  
  - `type` — बारकोड टाइप (जैसे `EAN-13`)  
- `tags` — प्रोडक्ट टैग्स की लिस्ट  
- `merchantNote` — व्यापारी द्वारा लिखा गया नोट  
- `descriptions`  
  - `short` — शॉर्ट डिस्क्रिप्शन  
  - `long` — डिटेल डिस्क्रिप्शन  
- `attributes`  
  - `flavor` — फ्लेवर  
  - `weight` — वज़न  
  - `packaging` — पैकेजिंग टाइप  
  - `origin` — निर्माण स्थान  
  - `shelfLife` — शेल्फ लाइफ  

---

## 3️⃣ `policies` — Product Policies
- `returnPolicy`  
  - `isReturnable` — रिटर्न की अनुमति  
  - `returnWindowDays` — रिटर्न विंडो (दिनों में)  
  - `returnType` — `replacement_only` या अन्य  
  - `conditions` — रिटर्न की शर्तें  
- `warrantyPolicy`  
  - `isWarrantyAvailable` — वारंटी उपलब्ध है या नहीं  
  - `warrantyPeriodMonths` — वारंटी अवधि (महीनों में)  
  - `warrantyType` — वारंटी टाइप  
  - `provider` — वारंटी प्रोवाइडर  
- `exchangePolicy`  
  - `isExchangeable` — एक्सचेंज की अनुमति  
  - `exchangeWindowDays` — एक्सचेंज विंडो (दिनों में)  
  - `conditions` — एक्सचेंज शर्तें  
- `cancellationPolicy`  
  - `isCancellable` — कैंसिल की अनुमति  
  - `cancellationWindowHours` — कैंसिल विंडो (घंटों में)  
  - `cancellationFeePercent` — कैंसिल शुल्क प्रतिशत  

---

## 4️⃣ `media` — Product Media
- `thumbnail` — मुख्य थंबनेल इमेज  
- `images` — इमेज लिस्ट  
- `video` — वीडियो URL या null  

---

## 5️⃣ `inventory` — Stock Information
- `stockQty` — स्टॉक मात्रा  
- `batchId` — बैच ID  
- `expiryDate` — समाप्ति तिथि  
- `lowStockThreshold` — कम स्टॉक का अलर्ट स्तर  
- `isLowStock` — कम स्टॉक है या नहीं  

---

## 6️⃣ `logistics` — Shipping & Handling
- `package`  
  - `weight` — वज़न (value, unit)  
  - `dimensions` — लम्बाई, चौड़ाई, ऊँचाई (unit सहित)  
  - `volume` — वॉल्यूम  
  - `packagingType` — पैकेजिंग टाइप  
  - `fragile` — नाज़ुक है या नहीं  
  - `temperatureSensitive` — तापमान संवेदनशील है या नहीं  
- `shipping`  
  - `availableMethods` — उपलब्ध शिपिंग मेथड्स  
  - `defaultMethod` — डिफ़ॉल्ट शिपिंग मेथड  
  - `estimatedDays` — अनुमानित डिलीवरी दिन  
  - `charges` — शिपिंग चार्जेज  
  - `freeShippingThreshold` — फ्री शिपिंग की सीमा  
  - `codAvailable` — COD उपलब्ध है या नहीं  
  - `deliveryZones` — डिलीवरी के ज़ोन  
- `handling`  
  - `handlingTimeHours` — पैकिंग/हैंडलिंग का समय (घंटों में)  
  - `specialInstructions` — विशेष निर्देश  

---

## 7️⃣ `delivery` — Delivery Options
- `modes` — डिलीवरी मोड्स की लिस्ट  
- `defaultMode` — डिफ़ॉल्ट डिलीवरी मोड  

---

## 8️⃣ `analytics` — Performance Stats
- `rating` — औसत रेटिंग  
- `numReviews` — रिव्यू की संख्या  
- `views` — व्यूज़  
- `wishlists` — विशलिस्ट में जोड़े गए बार  
- `totalSales` — कुल बिक्री  
- `revenueGenerated` — उत्पन्न राजस्व  
- `lastSoldAt` — आखिरी बिक्री की तारीख  

---

## 9️⃣ `seo` — SEO Metadata
- `title` — SEO टाइटल  
- `keywords` — SEO कीवर्ड्स  
- `description` — SEO डिस्क्रिप्शन  

---

## 🔟 `audit` — Record Tracking
- `version` — डेटा वर्ज़न  
- `createdBy` — किसने बनाया  
- `updatedBy` — किसने अपडेट किया  
- `createdAt` — निर्माण तिथि  
- `updatedAt` — आखिरी अपडेट तिथि  
- `role` — किस रोल वाले यूज़र ने बनाया/अपडेट किया (`merchant`, `staff`, `admin`)
```
---
# 🛍 Product Item JSON Structure Guide

यह गाइड एक **Product Item Object** का पूरा स्ट्रक्चर बताती है।  
इसे सभी प्रोडक्ट्स को एक **consistent format** में स्टोर और मैनेज करने के लिए इस्तेमाल किया जा सकता है।  

---

## 1️⃣ `meta` — Product Metadata
- `itemId` — यूनिक प्रोडक्ट ID  
- `type` — प्रोडक्ट का टाइप (जैसे `"product"`)  
- `appVersion` — डेटा स्कीमा/ऐप का वर्ज़न  
- `isAvailable` — प्रोडक्ट उपलब्ध है या नहीं  
- `isActive` — सक्रिय है या नहीं  
- `version` (string): स्कीमा या डेटा स्ट्रक्चर का वर्ज़न।  

- `isFeatured` — फीचर्ड प्रोडक्ट है या नहीं  
- `visibility` — प्रोडक्ट की विज़िबिलिटी मोड (`catalog_search`, `hidden`, आदि)  
- `isDeleted` — डिलीट किया गया या नहीं  
- `isArchived` — आर्काइव किया गया या नहीं  
- `priority` — प्रोडक्ट की प्राथमिकता (`low`, `normal`, `high`)  
- `currency` — प्रोडक्ट की मुद्रा कोड (`"INR"`)  
- `pricing`  
  - `mrp` — अधिकतम खुदरा मूल्य  
  - `costPrice` — लागत मूल्य  
  - `sellingPrice` — बिक्री मूल्य  
- `links`  
  - `merchantId` — व्यापारी का ID  
  - `categoryId` — मुख्य कैटेगरी ID  
  - `subcategoryId` — सब-कैटेगरी ID  
  - `brandId` — ब्रांड ID  
  - `unitId` — यूनिट ID  

---

## 2️⃣ `info` — Product Information
- `name` — प्रोडक्ट का नाम  
- `sku` — SKU कोड  
- `barcode`  
  - `number` — बारकोड नंबर  
  - `type` — बारकोड टाइप (जैसे `EAN-13`)  
- `tags` — प्रोडक्ट टैग्स की लिस्ट  
- `merchantNote` — व्यापारी द्वारा लिखा गया नोट  
- `descriptions`  
  - `short` — शॉर्ट डिस्क्रिप्शन  
  - `long` — डिटेल डिस्क्रिप्शन  
- `attributes`  
  - `flavor` — फ्लेवर  
  - `weight` — वज़न  
  - `packaging` — पैकेजिंग टाइप  
  - `origin` — निर्माण स्थान  
  - `shelfLife` — शेल्फ लाइफ  

---

## 3️⃣ `policies` — Product Policies
- `returnPolicy`  
  - `isReturnable` — रिटर्न की अनुमति  
  - `returnWindowDays` — रिटर्न विंडो (दिनों में)  
  - `returnType` — `replacement_only` या अन्य  
  - `conditions` — रिटर्न की शर्तें  
- `warrantyPolicy`  
  - `isWarrantyAvailable` — वारंटी उपलब्ध है या नहीं  
  - `warrantyPeriodMonths` — वारंटी अवधि (महीनों में)  
  - `warrantyType` — वारंटी टाइप  
  - `provider` — वारंटी प्रोवाइडर  
- `exchangePolicy`  
  - `isExchangeable` — एक्सचेंज की अनुमति  
  - `exchangeWindowDays` — एक्सचेंज विंडो (दिनों में)  
  - `conditions` — एक्सचेंज शर्तें  
- `cancellationPolicy`  
  - `isCancellable` — कैंसिल की अनुमति  
  - `cancellationWindowHours` — कैंसिल विंडो (घंटों में)  
  - `cancellationFeePercent` — कैंसिल शुल्क प्रतिशत  

---

## 4️⃣ `media` — Product Media
- `thumbnail` — मुख्य थंबनेल इमेज  
- `images` — इमेज लिस्ट  
- `video` — वीडियो URL या null  

---

## 5️⃣ `inventory` — Stock Information
- `stockQty` — स्टॉक मात्रा  
- `batchId` — बैच ID  
- `expiryDate` — समाप्ति तिथि  
- `lowStockThreshold` — कम स्टॉक का अलर्ट स्तर  
- `isLowStock` — कम स्टॉक है या नहीं  

---

## 6️⃣ `logistics` — Shipping & Handling
- `package`  
  - `weight` — वज़न (value, unit)  
  - `dimensions` — लम्बाई, चौड़ाई, ऊँचाई (unit सहित)  
  - `volume` — वॉल्यूम  
  - `packagingType` — पैकेजिंग टाइप  
  - `fragile` — नाज़ुक है या नहीं  
  - `temperatureSensitive` — तापमान संवेदनशील है या नहीं  
- `shipping`  
  - `availableMethods` — उपलब्ध शिपिंग मेथड्स  
  - `defaultMethod` — डिफ़ॉल्ट शिपिंग मेथड  
  - `estimatedDays` — अनुमानित डिलीवरी दिन  
  - `charges` — शिपिंग चार्जेज  
  - `freeShippingThreshold` — फ्री शिपिंग की सीमा  
  - `codAvailable` — COD उपलब्ध है या नहीं  
  - `deliveryZones` — डिलीवरी के ज़ोन  
- `handling`  
  - `handlingTimeHours` — पैकिंग/हैंडलिंग का समय (घंटों में)  
  - `specialInstructions` — विशेष निर्देश  

---

## 7️⃣ `delivery` — Delivery Options
- `modes` — डिलीवरी मोड्स की लिस्ट  
- `defaultMode` — डिफ़ॉल्ट डिलीवरी मोड  

---

## 8️⃣ `analytics` — Performance Stats
- `rating` — औसत रेटिंग  
- `numReviews` — रिव्यू की संख्या  
- `views` — व्यूज़  
- `wishlists` — विशलिस्ट में जोड़े गए बार  
- `totalSales` — कुल बिक्री  
- `revenueGenerated` — उत्पन्न राजस्व  
- `lastSoldAt` — आखिरी बिक्री की तारीख  

---

## 9️⃣ `seo` — SEO Metadata
- `title` — SEO टाइटल  
- `keywords` — SEO कीवर्ड्स  
- `description` — SEO डिस्क्रिप्शन  

---

## 🔟 `audit` — Record Tracking
- `version` — डेटा वर्ज़न  
- `createdBy` — किसने बनाया  
- `updatedBy` — किसने अपडेट किया  
- `createdAt` — निर्माण तिथि  
- `updatedAt` — आखिरी अपडेट तिथि  
- `role` — किस रोल वाले यूज़र ने बनाया/अपडेट किया (`merchant`, `staff`, `admin`)