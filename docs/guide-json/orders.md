```json
{
  "meta": {
    "orderId": "ORD00000001",
    "platform": "android",
    "device": "mobile",
    "orderDate": "2025-07-22T10:30:00Z",
    "version": 1.0,
    "links": {
      "userId": "USR00000003",
      "agentId": null
    }
  },
    "orderItems": {
      "ITM000000000001": {
        "quantity": 3,
        "priceAtOrder": 10,
        "snapshot": {
          "name": "Parle G Biscuit 80g",
          "thumbnail": "./localstore/images/items/parleg-cup.jpg"
        }
      },
      "ITM000000000002": {
        "quantity": 2,
        "priceAtOrder": 150,
        "snapshot": {
          "name": "Amul Butter 500g",
          "thumbnail": "./localstore/images/items/amul-butter.jpg"
        }
      },
      "ITM000000000003": {
        "quantity": 1,
        "priceAtOrder": 50,
        "snapshot": {
          "name": "Colgate Paste 100g",
          "thumbnail": "./localstore/images/items/colgate-paste.jpg"
        }
      }
    },
  "delivery": {
    "type": "Home Delivery",
    "slot": {
      "date": "2025-07-23",
      "time": "10:00 AM - 12:00 PM"
    },
    "instruction": null,
    "address": {
      "name": "Santosh Kumar",
      "label": "Home",
      "isPrimary": true,
      "phone": "9876543210",
      "street": "Main Bazar",
      "area": "Durgapur",
      "city": "Chas",
      "state": "Jharkhand",
      "zipCode": "827013",
      "landmark": "Near SBI ATM",
      "geoLocation": {
        "lat": 23.6345,
        "lng": 86.1679
      }
    },
    "changedAddress": [
      {
        "changedAt": "2025-07-22T15:00:00Z",
        "reason": "Customer updated delivery address after placing the order.",
        "previousAddress": {
          "name": "Santosh Kumar",
          "label": "Home",
          "willPrimary": true,
          "phone": "9876543210",
          "street": "Old Market Road",
          "area": "Durgapur",
          "city": "Chas",
          "state": "Jharkhand",
          "zipCode": "827013",
          "landmark": "Near Bus Stand",
          "geoLocation": {
            "lat": 23.635,
            "lng": 86.1685
          }
        }
      }
    ]
  },

  "logistics": {
    "shipmentId": "SHP00000001",
    "packaging": {
      "type": "standard",
      "material": "corrugated_box",
      "sealed": true,
      "tamperEvident": true,
      "fragile": false,
      "waterResistant": false
    },
    "handling": {
      "requiresSignature": false,
      "priorityHandling": false,
      "temperatureControlled": false
    },
    "shipmentRisk": {
      "score": 10,
      "flags": ["highValue"]
    },
    "charges": {
      "delivery": 20,
      "packaging": 5,
      "handling": 0,
      "insurance": 0,
      "total": 25
    },
    "courier": {
      "provider": "Delhivery",
      "serviceLevel": "Standard",
      "trackingNumber": "DLV123456789",
      "estimatedDelivery": "2025-07-23T12:00:00Z"
    }
  },
  "orderStatus": {
    "current": "pending",
    "timeline": {
      "placedAt": "2025-07-22T10:30:00Z",
      "confirmedAt": "2025-07-22T11:00:00Z",
      "packedAt": "2025-07-22T12:00:00Z",
      "dispatchedAt": null,
      "deliveredAt": null,
      "cancelledAt": null
    },
    "tracking": {
      "lat": 23.6345,
      "lng": 86.1679,
      "time": "2025-07-22T12:30:00Z"
    },
    "flags": {
      "isCancelled": false,
      "isReturned": false,
      "isPriority": false
    }
  },

  "payment": {
    "status": "unpaid",

    "transactionId": "TXN123456",
    "paymentDate": null,
    "pricing": {
      "subtotal": 120,
      "tax": 9.5,
      "discount": 10,
      "deliveryCharge": 20,
      "totalAmount": 139.5
    }
  },

  "comments": {
    "customerNote": "Please deliver between 10–11AM",
    "merchantNote": "Pack biscuits carefully",
    "rating": 4.5,
    "review": "Good service, fast delivery"
  }
}
```

---

## ऑर्डर स्कीमा का विस्तृत विवरण

### 1. `meta` ऑब्जेक्ट  
ऑर्डर की बुनियादी पहचान और मेटा-जानकारी।  

- `orderId` (string, required): ऑर्डर का यूनिक ID।  
- `platform` (string): ऑर्डर किस प्लेटफ़ॉर्म से किया गया — `"android"`, `"ios"`, `"web"`।  
- `device` (string): डिवाइस प्रकार — `"mobile"`, `"tablet"`, `"desktop"`।  
- `orderDate` (string): ऑर्डर की तारीख और समय (ISO 8601 फ़ॉर्मेट)।  
- `version` (string): स्कीमा या डेटा स्ट्रक्चर का वर्ज़न।  

- `links` (object): संबंधित ID लिंक्स।  
  - `userId` (string): ग्राहक का ID।  
  - `agentId` (string|null): डिलीवरी एजेंट का ID।
---
### 1.1 `orderItems` ऑब्जेक्ट 
- `orderItems` (object): आइटम IDs और उनकी quantity, साथ ही ऑर्डर के समय की स्नैपशॉट जानकारी का मैप।  
  - Key: `itemId` (string) — आइटम का यूनिक ID।  
  - Value: (object) — आइटम की जानकारी:  
    - `quantity` (number) — उस आइटम की मात्रा।  
    - `priceAtOrder` (number) — ऑर्डर के समय आइटम का मूल्य।  
    - `snapshot` (object) — ऑर्डर के समय आइटम की महत्वपूर्ण जानकारी का स्नैपशॉट।  
      - `name` (string) — आइटम का नाम।  
      - `thumbnail` (string) — आइटम की थंबनेल इमेज का URL।  
### 2. `delivery` ऑब्जेक्ट  
डिलीवरी से जुड़ी जानकारी।  

- `type` (string): `"Home Delivery"`, `"Pickup"`, आदि।  
- `slot` (object): डिलीवरी का स्लॉट।  
  - `date` (string): डिलीवरी की तारीख।  
  - `time` (string): डिलीवरी का समय अंतराल।  
- `instruction` (string|null): विशेष डिलीवरी निर्देश।  
- `address` (object): वर्तमान डिलीवरी पता।  
  - `name` (string): प्राप्तकर्ता का नाम।  
  - `label` (string): `"Home"`, `"Work"` आदि।  
  - `isPrimary` (boolean): क्या यह प्राथमिक पता है।  
  - `phone` (string): फ़ोन नंबर।  
  - `street`, `area`, `city`, `state`, `zipCode` (string): पता विवरण।  
  - `landmark` (string): पास का महत्वपूर्ण स्थान।  
  - `geoLocation` (object): अक्षांश (`lat`) और देशांतर (`lng`)।  
- `changedAddress` (array[object]): पते में बदलाव का इतिहास।  
  - `changedAt` (string): पता कब बदला गया।  
  - `reason` (string): बदलाव का कारण।  
  - `previousAddress` (object): पुराना पता विवरण।  

---

### 3. `logistics` ऑब्जेक्ट  
शिपमेंट और पैकेजिंग से जुड़ी जानकारी।  

- `shipmentId` (string): शिपमेंट का यूनिक ID।  
- `packaging` (object): पैकेजिंग की जानकारी।  
  - `type`, `material` (string): पैकेजिंग प्रकार और सामग्री।  
  - `sealed`, `tamperEvident`, `fragile`, `waterResistant` (boolean): पैकेजिंग गुण।  
- `handling` (object): हैंडलिंग की विशेष शर्तें।  
- `shipmentRisk` (object): रिस्क लेवल और फ़्लैग्स।  
- `charges` (object): लॉजिस्टिक शुल्क।  
  - `delivery`, `packaging`, `handling`, `insurance` (number): अलग-अलग शुल्क।  
  - `total` (number): कुल लॉजिस्टिक चार्ज।  
- `courier` (object): कुरियर की जानकारी।  

---


### 4. `orderStatus` ऑब्जेक्ट  
ऑर्डर की वर्तमान स्थिति और टाइमलाइन।  

- `current` (string): `"pending"`, `"confirmed"`, `"shipped"`, `"delivered"` आदि।  
- `timeline` (object): विभिन्न चरणों के समय।  
- `tracking` (object): वर्तमान ट्रैकिंग लोकेशन और समय।  
- `flags` (object): स्टेटस फ़्लैग्स जैसे `isCancelled`, `isReturned`, `isPriority`।  

---

### 5. `payment` ऑब्जेक्ट  
भुगतान से जुड़ी जानकारी।  

- `status` (string): `"unpaid"`, `"paid"`, `"refunded"` आदि।  
- `transactionId` (string): लेन-देन का ID।  
- `paymentDate` (string|null): भुगतान की तारीख।  
- `pricing` (object): मूल्य संरचना।  
  - `subtotal` (number): कुल कीमत (बिना टैक्स/डिलीवरी)।  
  - `tax` (number): टैक्स राशि।  
  - `discount` (number): छूट।  
  - `deliveryCharge` (number): डिलीवरी शुल्क।  
  - `totalAmount` (number): अंतिम भुगतान राशि।  

---

### 6. `comments` ऑब्जेक्ट  
नोट्स और समीक्षा।  

- `customerNote` (string): ग्राहक द्वारा दी गई टिप्पणी।  
- `merchantNote` (string): व्यापारी की टिप्पणी।  
- `rating` (number): ग्राहक की रेटिंग।  
- `review` (string): समीक्षा का विवरण।