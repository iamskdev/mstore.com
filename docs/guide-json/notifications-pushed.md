```json
{
  "meta": {
    "pushNfId": "ALT00000001",
    "type": "transactional", 
    "category": "order_update",
    "priority": "high",
    "version": 1.0,
    "links": {
      "orderId": "ORD00000001",
      "userId": "USR00000002",
      "merchantId": "MRC00000001"
    },
    "schedule": {
      "sendAt": "2025-08-05T10:00:00Z",
      "expireAt": "2025-08-06T10:00:00Z"
    },
    "status": {
      "isActive": true,
      "isSent": false
    },
    "createdAt": "2025-08-04T09:00:00Z",
    "updatedAt": "2025-08-04T09:30:00Z"
  },
  "targeting": {
    "audience": {
      "roles": ["customer"],
      "platforms": ["android", "ios", "web"],
      "locations": ["Delhi", "Mumbai"],
      "userGroups": ["loyal_customers", "new_users"]
    }
  },
  "content": {
    "title": "Order Shipped 🚚",
    "message": "Your order #ORD12345 has been shipped and will arrive soon!",
    "richContent": {
      "image": "/notifications/images/order-shipped.jpg",
      "icon": "fas fa-truck",
      "badge": 1
    },
"cta": [
  {
    "label": "Track Order",
    "url": "/user/orders/ORD12345",
    "deeplink": "apnastore://order/ORD12345",
    "type": "primary"
  },
  {
    "label": "View Details",
    "url": "/user/orders/details/ORD12345",
    "deeplink": "apnastore://order/details/ORD12345",
    "type": "secondary"
  }
],
    "sound": "default",
    "vibration": true
  },
  "delivery": {
    "strategy": {
      "primary": "in_app",
      "fallback": ["device_alert", "email", "sms"]
    },
    "channels": {
      "in_app": {
        "enabled": true,
        "priority": 1,
        "maxRetries": 1,
        "expiry": null
      },
      "device_alert": {
        "enabled": true,
        "priority": 2,
        "maxRetries": 2,
        "expiry": 86400
      },
      "email": {
        "enabled": false,
        "priority": 3,
        "maxRetries": 1,
        "expiry": 172800
      },
      "sms": {
        "enabled": false,
        "priority": 4,
        "maxRetries": 1,
        "expiry": 172800
      }
    }
  },
  "tracking": {
    "sentCount": 0,
    "deliveredCount": 0,
    "openedCount": 0,
    "clickedCount": 0,
    "conversionCount": 0
  }
}
```
----
## 📌 Push Notification JSON Structure Guide

---

### 1. `meta` Object
यह नोटिफिकेशन की मुख्य पहचान और मैनेजमेंट से जुड़ी जानकारी रखता है।

- **`pushNfId`** (string, required) — यूनिक नोटिफिकेशन ID।
- **`type`** (enum, required) — नोटिफिकेशन का प्रकार:
  - `transactional` — ऑर्डर, पेमेंट, डिलीवरी से जुड़े अपडेट।
  - `promotional` — ऑफ़र, डिस्काउंट, मार्केटिंग नोटिफिकेशन।
  - `reminder` — यूज़र को किसी कार्य या इवेंट की याद दिलाने के लिए।
  - `system_alert` — सिस्टम से जुड़े अलर्ट या वॉर्निंग।
- **`category`** (string) — नोटिफिकेशन का विषय, जैसे `order_update`, `payment_update`।
- **`priority`** (enum) — प्राथमिकता स्तर:
  - `low`, `medium`, `high`, `urgent`
- **`links`** (object) — संबंधित IDs:
  - `orderId`
  - `userId`
  - `merchantId`
- **`schedule`** (object) — नोटिफिकेशन का टाइमिंग:
  - `sendAt` (ISO date-time) — कब भेजना है।
  - `expireAt` (ISO date-time \| null) — कब तक वैध है।
- **`status`** (object) — नोटिफिकेशन की स्थिति:
  - `isActive` (boolean) — नोटिफिकेशन चालू है या नहीं।
  - `isSent` (boolean) — भेजा गया या नहीं।
- **`createdAt`** (ISO date-time) — कब बनाया गया।
- **`updatedAt`** (ISO date-time) — आखिरी अपडेट कब हुआ।
- `version` (string): स्कीमा या डेटा स्ट्रक्चर का वर्ज़न।  

---

### 2. `targeting` Object
यह तय करता है कि नोटिफिकेशन किन यूज़र्स को भेजना है।

- **`audience`** (object):
  - `roles` — जैसे `customer`, `merchant`, `admin`
  - `platforms` — `android`, `ios`, `web`
  - `locations` — शहर/क्षेत्र जैसे `Delhi`, `Mumbai`
  - `userGroups` — जैसे `loyal_customers`, `new_users`

---

### 3. `content` Object
नोटिफिकेशन का असली मैसेज और मीडिया कंटेंट।

- **`title`** (string) — नोटिफिकेशन का टाइटल।
- **`message`** (string) — मुख्य मैसेज।
- **`richContent`** (object):
  - `image` — इमेज URL/पाथ।
  - `icon` — Font Awesome या custom आइकन क्लास।
  - `badge` — बैज नंबर (जैसे unread count)।
- **`cta`** (Call To Action, array of objects): एक या एक से अधिक कॉल-टू-एक्शन बटन।  
  प्रत्येक ऑब्जेक्ट में:  
  - `label` — बटन पर दिखने वाला टेक्स्ट।  
  - `url` — वेब URL।  
  - `deeplink` — ऐप डीपलिंक।  
  - `type` (string, optional) — बटन का प्रकार (जैसे `primary`, `secondary`)। 
- **`sound`** (string) — नोटिफिकेशन साउंड (`default`, `silent`, custom)।
- **`vibration`** (boolean) — वाइब्रेशन ऑन/ऑफ।

---

### 4. `delivery` Object
यह बताता है कि नोटिफिकेशन किस माध्यम से और किस प्राथमिकता में भेजा जाएगा।

- **`strategy`** (object):
  - `primary` — प्राथमिक चैनल (जैसे `in_app`)।
  - `fallback` — अगर primary fail हो तो किन चैनल से भेजना है।
- **`channels`** (object):
  - **`in_app`**:
    - `enabled` — true/false
    - `priority` — 1 (सबसे ऊँची)
    - `maxRetries` — रिट्राई कितनी बार
    - `expiry` — सेकंड में expiry (null मतलब कोई expiry नहीं)
  - **`device_alert`**:
    - `enabled`, `priority`, `maxRetries`, `expiry`
  - **`email`**:
    - `enabled`, `priority`, `maxRetries`, `expiry`
  - **`sms`**:
    - `enabled`, `priority`, `maxRetries`, `expiry`

---

### 5. `tracking` Object
यह ट्रैक करता है कि नोटिफिकेशन कैसा परफॉर्म कर रहा है।

- **`sentCount`** — भेजे गए नोटिफिकेशन्स की गिनती।
- **`deliveredCount`** — सफल डिलीवरी की गिनती।
- **`openedCount`** — कितने यूज़र ने नोटिफिकेशन खोला।
- **`clickedCount`** — CTA क्लिक काउंट।
- **`conversionCount`** — कन्वर्ज़न काउंट।

---