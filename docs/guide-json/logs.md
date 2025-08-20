```json
[
  {
  "meta": {
    "activityId": "ACT00000001",
    "activityType": "order",
    "action": "order_created",
    "priority": "high",
    "tags": ["order", "create", "user"],
    "version": 1.0,
    "links": {
      "orderId": "ORD00000001",
      "userId": "USR00000002",
      "merchantId": "MRC00000001",
      "agentId": null
    }
  },

"event": {
  "timestamp": "2025-07-22T10:30:00Z",
  "serverTime": "2025-07-22T10:30:05Z",
  "status": "success",
  "description": "Order placed via mobile app", 
  "performedBy": {
    "role": "user",
    "id": "USR00000002",
    "name": "Amit Kumar"
  },
  "details": { 
    "orderValue": 139.5,
    "paymentMethod": "UPI",
    "itemsCount": 3,
    "transactionId": "TXN123456"
  }
},

  "source": {
    "device":"mobile",
    "platform": "Android",
    "address": "Ranchi, Jharkhand, India",
    "geolocation": {
      "lat": 23.6345,
      "lng": 86.1679 },
    "network": "4G",
    "ipAddress": "103.25.59.45"
    },

  "audit": {
    "createdBy": "system",
    "createdAt": "2025-07-22T10:30:00Z"
  }
}
]
```
## स्कीमा का विस्तृत विवरण

### 1. `meta` ऑब्जेक्ट  
यह ऑब्जेक्ट गतिविधि (Activity) की मुख्य पहचान और संदर्भ जानकारी संग्रहीत करता है।

- `activityId` (string, required): गतिविधि का यूनिक ID।  
- `activityType` (string, required): गतिविधि का प्रकार, जैसे `"order"`, `"payment"`, `"delivery"`।  
- `action` (string, required): हुई विशिष्ट कार्रवाई, जैसे `"order_created"`, `"payment_success"`।  
- `priority` (string): प्राथमिकता स्तर — `"low"`, `"medium"`, `"high"`।  
- `tags` (array[string]): गतिविधि से जुड़े कीवर्ड्स, खोज व फ़िल्टरिंग के लिए।  
- `version` (string): स्कीमा या डेटा स्ट्रक्चर का वर्ज़न।  
- `links` (object): संबंधित संसाधनों के IDs:  
  - `orderId` (string): संबंधित ऑर्डर का ID।  
  - `userId` (string): उस यूज़र का ID जिसने गतिविधि की।  
  - `merchantId` (string): व्यापारी का ID।  
  - `agentId` (string | null): डिलीवरी एजेंट का ID, यदि लागू हो।  

---

### 2. `event` ऑब्जेक्ट  
यह ऑब्जेक्ट घटना के वास्तविक विवरण को दर्शाता है।

- `timestamp` (string, required): वह समय जब घटना घटी।  
- `serverTime` (string): सर्वर द्वारा रिकॉर्ड किया गया समय।  
- `status` (string): घटना का परिणाम — `"success"`, `"failed"`, `"pending"`।  
- `description` (string): घटना का संक्षिप्त विवरण।  
- `performedBy` (object): किसने यह कार्रवाई की:  
  - `role` (string): `"user"`, `"merchant"`, `"agent"`, `"system"`।  
  - `id` (string): कार्रवाई करने वाले का ID।  
  - `name` (string): कार्रवाई करने वाले का नाम।  
- `details` (object, optional): घटना से संबंधित अतिरिक्त प्रासंगिक डेटा। यह एक जेनेरिक ऑब्जेक्ट है जिसमें घटना के प्रकार के आधार पर कोई भी संबंधित जानकारी हो सकती है (उदाहरण के लिए, ऑर्डर के लिए `orderValue`, `paymentMethod`, या त्रुटि के लिए `errorMessage`)।
---

### 3. `source` ऑब्जेक्ट  
यह ऑब्जेक्ट उस डिवाइस और वातावरण की जानकारी रखता है जिससे कार्रवाई की गई।

- `device` (string): `"mobile"`, `"desktop"`, `"tablet"`।  
- `platform` (string): `"Android"`, `"iOS"`, `"Web"`।  
- `appVersion` (string): उपयोग किए गए ऐप का वर्ज़न।  
- `address` (string): स्थान का विवरण।  
- `geolocation` (object): स्थान के निर्देशांक:  
  - `lat` (number): अक्षांश।  
  - `lng` (number): देशांतर।  
- `network` (string): `"WiFi"`, `"4G"`, `"5G"`।  
- `ipAddress` (string): पब्लिक IP पता।  

---

### 4. `audit` ऑब्जेक्ट  
यह ऑब्जेक्ट इस गतिविधि रिकॉर्ड के निर्माण और संशोधन का इतिहास बताता है।

- `createdBy` (string): किसने रिकॉर्ड बनाया — `"system"` या यूज़र ID।  
- `createdAt` (string): रिकॉर्ड बनने का समय।  
