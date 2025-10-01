> **DOCUMENT AUDIT**
> - **Status:** `Updated`
> - **Last Reviewed:** 02/10/2025 00:41:00 IST (Updated by Gemini)
> - **Reviewer:** Santosh (with Gemini)
> - **Purpose:** This document provides a comprehensive guide to all Firestore data collections, detailing each schema's structure, fields, and relationships. It is the single source of truth for the data model.

---
# 🛍️ mStore - विस्तृत स्कीमा गाइड

यह दस्तावेज़ "mStore" एप्लिकेशन के लिए उपयोग किए जाने वाले सभी फायरस्टोर डेटा संग्रह (collections) के लिए एक व्यापक गाइड है। यह प्रत्येक स्कीमा की संरचना, उसके फ़ील्ड्स के उद्देश्य और विभिन्न संग्रहों के बीच संबंधों का विवरण देता है।

---

## 📖 विषय-सूची (Table of Contents)

1.  [Config (`config.json`)](#1-config-configjson) - एप्लिकेशन कॉन्फ़िगरेशन।
2.  [Users (`users.json`)](#2-users-usersjson) - उपयोगकर्ता प्रोफाइल और प्रमाणीकरण।
3.  [Accounts (`accounts.json`)](#3-accounts-accountsjson) - उपयोगकर्ता-विशिष्ट डेटा जैसे कार्ट और सेटिंग्स।
4.  [Merchants (`merchants.json`)](#4-merchants-merchantsjson) - व्यापारी और स्टोरफ्रंट जानकारी।
5.  [Items (`items.json`)](#5-items-itemsjson) - व्यापारियों द्वारा बेचे जाने वाले उत्पाद और सेवाएँ।
6.  [Categories (`categories.json`)](#6-categories-categoriesjson) - उत्पादों और सेवाओं के लिए श्रेणियाँ।
7.  [Orders (`orders.json`)](#7-orders-ordersjson) - ग्राहक के ऑर्डर और उनकी स्थिति।
8.  [Alerts & Campaigns (`alerts.json`, `campaigns.json`)](#8-alerts--campaigns-alertsjson-campaignsjson) - अधिसूचना प्रणाली।
9.  [Promotions (`promotions.json`)](#9-promotions-promotionsjson) - विशेष UI ओवरराइड और प्रचार।
10. [Stories (`stories.json` and `stories-schema.json`)](#10-stories-storiesjson-and-stories-schemajson) - Stories created by merchants.
11. [Logs (`logs.json`)](#11-logs-logsjson) - ऑडिटिंग और डिबगिंग के लिए इवेंट लॉग।
12. [Price Logs (`price-logs.json`)](#12-price-logs-price-logsjson) - मूल्य परिवर्तन का इतिहास।
13. [Units (`units.json`)](#13-units-unitsjson) - माप की इकाइयाँ।
14. [Brands (`brands.json`)](#14-brands-brandsjson) - उत्पाद ब्रांड.

---

## 1. Config (`config.json`)

यह फ़ाइल एप्लिकेशन के व्यवहार को नियंत्रित करने वाली सभी वैश्विक सेटिंग्स और कॉन्फ़िगरेशन को संग्रहीत करती है। यह ऐप के विभिन्न पहलुओं के लिए सत्य का स्रोत है, जिसमें वातावरण, डेटा स्रोत, UI प्राथमिकताएं और सुविधा फ़्लैग शामिल हैं।

### मुख्य ऑब्जेक्ट्स:

-   **`app`**: एप्लिकेशन के बारे में सामान्य जानकारी।
    -   `owner` (string): एप्लिकेशन का मालिक (जैसे, `"santosh"`)।
    -   `name` (string): एप्लिकेशन का नाम (जैसे, `"mStore"`)।
    -   `version` (string): एप्लिकेशन का वर्तमान संस्करण (जैसे, `"0.6.0"`)।
    -   `environment` (string): एप्लिकेशन का वर्तमान वातावरण (`"development"`, `"production"`)।
    -   `description` (string): एप्लिकेशन का संक्षिप्त विवरण।
-   **`urls`**: एप्लिकेशन द्वारा उपयोग किए जाने वाले विभिन्न URL।
    -   `localIp` (string): स्थानीय विकास के लिए IP पता (जैसे, `"http://127.0.0.1:3000/"`)।
    -   `pageUrl` (string): एप्लिकेशन का मुख्य होस्टेड URL (जैसे, `"https://iamskdev.github.io/mstore.com/"`)।
    -   `fallbackUrl` (string): पुराने या अप्रचलित URL से रीडायरेक्ट करने के लिए उपयोग किया जाने वाला URL।
    -   `customDomain` (string): यदि एप्लिकेशन एक कस्टम डोमेन पर होस्ट किया गया है।
-   **`source`**: डेटा स्रोत कॉन्फ़िगरेशन।
    -   `data` (string): डेटा का स्रोत (`"firebase"`, `"emulator"`, `"localstore"`)।
    -   `offlineCache` (boolean): क्या ऑफ़लाइन कैशिंग सक्षम है।
-   **`ui`**: उपयोगकर्ता इंटरफ़ेस से संबंधित सेटिंग्स।
    -   `theme` (string): डिफ़ॉल्ट थीम (`"dark"`, `"light"`)।
    -   `headerStyle` (string): हेडर की शैली (`"logo"`, `"menu"`)।
-   **`flags`**: विभिन्न सुविधा फ़्लैग जो ऐप के व्यवहार को नियंत्रित करते हैं।
    -   `maintenanceMode` (boolean): क्या एप्लिकेशन रखरखाव मोड में है।
    -   `phoneVerification` (boolean): क्या फ़ोन नंबर सत्यापन सक्षम है।
    -   `roleSwitcher` (boolean): क्या भूमिका स्विचिंग UI सक्षम है (केवल विकास के लिए)।
    -   `promotionEnabled` (boolean): क्या प्रचार मोड सक्षम है।

### संभावित स्थितियाँ और भविष्य के सुधार:

-   **वातावरण स्विचिंग:** `environment` फ़ील्ड का उपयोग करके, ऐप विभिन्न वातावरणों (जैसे विकास, उत्पादन) के लिए अलग-अलग व्यवहार कर सकता है।
-   **डेटा स्रोत स्विचिंग:** `source.data` फ़ील्ड ऐप को आसानी से लाइव फायरबेस, स्थानीय एम्युलेटर या स्थानीय JSON फ़ाइलों के बीच डेटा स्रोत स्विच करने की अनुमति देता है।
-   **सुविधा टॉगल:** `flags` ऑब्जेक्ट में बूलियन फ़्लैग्स का उपयोग करके, नई सुविधाओं को कोड डिप्लॉयमेंट के बिना सक्षम या अक्षम किया जा सकता है।
-   **डायनामिक थीमिंग:** `ui.theme` फ़ील्ड ऐप की डिफ़ॉल्ट थीम को नियंत्रित करता है, जिसे उपयोगकर्ता द्वारा ओवरराइड किया जा सकता है।
---

## 2. Users (`users.json`)

यह संग्रह ऐप के सभी उपयोगकर्ताओं (ग्राहक, व्यापारी, एडमिन) के लिए मुख्य पहचान और प्रोफ़ाइल जानकारी संग्रहीत करता है।

### मुख्य ऑब्जेक्ट्स:

-   **`meta`**: उपयोगकर्ता की पहचान, भूमिकाएँ और स्थिति के लिए मेटाडेटा।
    -   `userId` (string): अद्वितीय उपयोगकर्ता ID (जैसे `USR...`) - प्राइमरी की।
    -   `roles` (array): उपयोगकर्ता को सौंपी गई भूमिकाएँ (`user`, `merchant`, `admin`)।
    -   `primaryRole` (string): उपयोगकर्ता की प्राथमिक भूमिका।
    -   `links` (object): अन्य संग्रहों से संबंध (`accountId`, `merchantId`)।
    -   `flags` (object): बूलियन मान जो उपयोगकर्ता की स्थिति दर्शाते हैं (`isActive`, `isSuspended`, `isVerified`, `isAdmin`, `isSuperAdmin` आदि)।
    -   `version` (number): दस्तावेज़ का संस्करण।
-   **`info`**: उपयोगकर्ता की व्यक्तिगत जानकारी।
    -   `fullName`, `nickName`, `gender`, `dob`, `avatar`, `tags` (array of strings), `bio`, `email`, `phone`।
    -   **`username` (string): एक अद्वितीय, सार्वजनिक `@username` जो उपयोगकर्ता की पहचान करता है।**
-   **`address`** (array): उपयोगकर्ता के पतों की सूची।
    -   प्रत्येक ऑब्जेक्ट में `label`, `isPrimary`, `street`, `city`, `state`, `zipCode`, `geoLocation` होता है।
-   **`auth`**: प्रमाणीकरण से संबंधित विस्तृत विवरण।
    -   `login` (object): लॉगिन प्रयास, विधि और पासवर्ड की जानकारी।
    -   `flags` (object): सुरक्षा-संबंधी फ़्लैग (`twoFactorEnabled`, `emailVerified`, `accountLocked`)।
    -   `recovery` (object): खाता पुनर्प्राप्ति के लिए ईमेल, फ़ोन और सुरक्षा प्रश्न।
    -   `provider` (object): फायरबेस प्रमाणीकरण प्रदाता (`uid`)। `fcmToken` को `accounts` संग्रह में ले जाया गया है।

### संभावित स्थितियाँ और भविष्य के सुधार:
-   **अतिथि से पंजीकृत उपयोगकर्ता:** जब एक अतिथि (guest) उपयोगकर्ता साइन अप करता है, तो उसके अतिथि खाते (`isGuest: true` वाले `accounts` दस्तावेज़) को एक नए `users` दस्तावेज़ से जोड़ा जा सकता है, जिससे उसकी कार्ट और सहेजी गई वस्तुएँ बनी रहें।
-   **भूमिका परिवर्तन:** यदि कोई `user` एक `merchant` बन जाता है, तो `roles` ऐरे को अपडेट किया जाएगा और एक नया `merchantId` `links` ऑब्जेक्ट में जोड़ा जाएगा। `primaryRole` यह निर्धारित करेगा कि उपयोगकर्ता को डिफ़ॉल्ट रूप से कौन सा डैशबोर्ड दिखाई देता है।
-   **खाता निलंबन (Suspension):** `meta.flags.isSuspended` को `true` पर सेट करके किसी उपयोगकर्ता को अस्थायी रूप से निलंबित किया जा सकता है। सुरक्षा नियमों को यह सुनिश्चित करना चाहिए कि निलंबित उपयोगकर्ता लॉगिन नहीं कर सकते।
-   **KYC सत्यापन:** भविष्य में, `kycStatus` (`pending`, `verified`, `rejected`) का उपयोग उच्च-मूल्य वाले लेनदेन या व्यापारी ऑनबोर्डिंग के लिए किया जा सकता है।

---

## 3. Accounts (`accounts.json`)

यह संग्रह प्रत्येक उपयोगकर्ता के लिए गतिशील और व्यक्तिगत डेटा संग्रहीत करता है। `cart` और `saved` जैसे ऑब्जेक्ट हटा दिए गए हैं।

### मुख्य फ़ील्ड्स:

-   **`meta`**: खाते का मेटाडेटा (`accountId`, `links.userId`)।
-   **`deviceInfo`**: उपयोगकर्ता द्वारा उपयोग किए गए उपकरणों की सूची, जिसमें प्रत्येक डिवाइस के लिए `fcmToken` शामिल है।
-   **`settings`**: उपयोगकर्ता-विशिष्ट सेटिंग्स (`theme`, `language`)।
-   **`searchHistory`**: हाल की खोजें।
-   **`subscription`** (object): उपयोगकर्ता की सदस्यता का विवरण (`plan`, `type`, `status`, आदि)।

### संभावित स्थितियाँ और भविष्य के सुधार:
-   जब कोई नया उपयोगकर्ता पंजीकरण करता है, तो एक `users` दस्तावेज़ और एक संबंधित `accounts` दस्तावेज़ स्वचालित रूप से एक साथ बनाए जाते हैं।
-   `deviceInfo` का उपयोग यह ट्रैक करने के लिए किया जा सकता है कि उपयोगकर्ता कितने उपकरणों पर लॉग इन है और प्रत्येक को पुश सूचनाएं भेजने के लिए।
-   **क्रॉस-डिवाइस सिंक:** जब उपयोगकर्ता किसी नए डिवाइस पर लॉग इन करता है, तो `deviceInfo` में एक नई प्रविष्टि जोड़ी जाती है।
-   **निजीकरण (Personalization):** `personalized` ऑब्जेक्ट का उपयोग उपयोगकर्ता के व्यवहार (देखे गए आइटम, खरीदे गए ब्रांड) के आधार पर एक वैयक्तिकृत अनुभव प्रदान करने के लिए किया जा सकता है।

---

## 4. Merchants (`merchants.json`)

यह संग्रह प्लेटफॉर्म पर पंजीकृत व्यापारियों की सभी जानकारी संग्रहीत करता है।

### मुख्य ऑब्जेक्ट्स:

-   **`meta`**: व्यापारी का मेटाडेटा।
    -   `merchantId`, `version`, `type`, `status`, `priority`, `flags`, `links`, `info` (जिसमें `name`, `logo`, `qrCode`, `tagline` शामिल हैं)।
-   **`openingHours`** (object): स्टोर के खुलने का समय, `isOpen` फ़्लैग और नोट।
-   **`addresses`** (array): भौतिक स्टोर के पते।
-   **`socialLinks`** (object): फेसबुक, इंस्टाग्राम, ट्विटर के लिए लिंक।
-   **`engagement`** (object): `rank`, `rating`, `reviews`, `views` जैसे मीट्रिक्स।
-   **`seo`** (object): SEO के लिए `title`, `description`, `keywords`।
-   **`subscription`** (object): व्यापारी की सदस्यता का विवरण।
-   **`audit`** (object): `createdAt`, `createdBy`, `updatedAt`, `updatedBy` के साथ ऑडिट ट्रेल्स।

### संभावित स्थितियाँ और भविष्य के सुधार:
-   एक नया व्यापारी पंजीकरण करने पर `pending` स्थिति में हो सकता है जब तक कि एक एडमिन उसे `approved` न कर दे।
-   `flags.isPopular` या `flags.isNew` का उपयोग करके व्यापारियों को होमपेज पर विशेष रूप से प्रदर्शित किया जा सकता है।
-   **स्टाफ प्रबंधन:** भविष्य में, एक `staff` संग्रह बनाया जा सकता है। व्यापारी अपने `meta.links.staffIds` में स्टाफ सदस्यों को जोड़ सकते हैं और `permissions` ऑब्जेक्ट का उपयोग करके उनकी पहुँच को नियंत्रित कर सकते हैं (जैसे, एक स्टाफ सदस्य केवल ऑर्डर देख सकता है, लेकिन आइटम संपादित नहीं कर सकता)।
-   **भुगतान विवरण:** भविष्य में, बैंक खाते के विवरण या UPI ID को संग्रहीत करने के लिए एक `payouts` या `banking` ऑब्जेक्ट जोड़ा जा सकता है ताकि व्यापारी को भुगतान किया जा सके।

---

## 5. Items (`items.json`)

यह संग्रह व्यापारियों द्वारा बेचे जाने वाले सभी उत्पादों और सेवाओं का प्रतिनिधित्व करता है।

### मुख्य ऑब्जेक्ट्स:

-   **`meta`**: आइटम का मेटाडेटा।
    -   `itemId`, `type` (`product`/`service`), `version`, `priority`, `flags`, `links` (`merchantId`, `brandId`, `unitId`, `categoryId` - **अब `ICT` उपसर्ग के साथ**)।
    -   **`categories`** (array): आइटम से संबंधित मुख्य श्रेणियों की सूची (प्रत्येक में `slug` और `categoryId` शामिल)।
    -   **`subcategories`** (array): आइटम से संबंधित उप-श्रेणियों की सूची (प्रत्येक में `slug` और `subCatId` शामिल)।
-   **`info`**: आइटम का विस्तृत विवरण।
    -   `name`, `sku`, `hsnCode`, `barcode`, `note`, `description`, `attributes`।
-   **`pricing`**: मूल्य निर्धारण की जानकारी।
    -   `mrp`, `costPrice`, `sellingPrice`, `currency`, `discounts` (array)।
-   **`inventory`**: स्टॉक प्रबंधन।
    -   `stockQty`, `batchId`, `expiryDate`, `lowStockThreshold`, `isLowStock`।
-   **`media`**: आइटम की मीडिया फ़ाइलें।
    -   `thumbnail` (string), `gallery` (array), `video` (string)।
-   **`analytics`**: आइटम का प्रदर्शन।
    -   `rating`, `numReviews`, `views`, `saved`, `carted`, `totalSales`।
-   **`seo`** (object): SEO के लिए `title`, `keywords`, `description`।
-   **`audit`** (object): `createdAt`, `createdBy`, `updatedAt`, `updatedBy` के साथ ऑडिट ट्रेल्स।

### संभावित स्थितियाँ और भविष्य के सुधार:
-   एक "सेवा" (service) के लिए, `inventory` ऑब्जेक्ट में अधिकांश फ़ील्ड `null` होंगे।
-   `flags.isFeatured` का उपयोग करके किसी आइटम को होमपेज पर प्रमुखता से दिखाया जा सकता है।
-   **कैटेगरी और सबकैटेगरी लिंकिंग:** `items.json` में `categories` और `subcategories` एरे को `categories.json` में परिभाषित स्लग और IDs के साथ पॉपुलेट किया जाता है, जिससे फ़िल्टरिंग और नेविगेशन आसान हो जाता है।
-   **उत्पाद वेरिएंट (Product Variants):** भविष्य में, एक ही उत्पाद के विभिन्न वेरिएंट (जैसे, टी-शर्ट के लिए अलग-अलग आकार और रंग) को संभालने के लिए स्कीमा को बढ़ाया जा सकता है। यह एक `variants` ऐरे जोड़कर किया जा सकता है, जहाँ प्रत्येक ऑब्जेक्ट का अपना `sku`, `price`, और `attributes` (जैसे `size: "M"`, `color: "Red"`) होता है।
-   **बंडल उत्पाद (Bundled Products):** एक `isBundle: true` ध्वज और एक `bundledItems` ऐरे जोड़ा जा सकता है जिसमें बंडल में शामिल `itemId` और `quantity` की सूची हो।

---
## 6. Categories (`categories.json`)

यह संग्रह उत्पादों और सेवाओं को व्यवस्थित करने के लिए एक पदानुक्रमित संरचना प्रदान करता है।

### मुख्य फ़ील्ड्स:

-   **`meta`**: श्रेणी का मेटाडेटा (`categoryId`, `slug`, `icon`)।
-   **`subcategories`** (array): इस मुख्य श्रेणी के अंतर्गत आने वाली उप-श्रेणियों की एक सूची।

### संभावित स्थितियाँ और भविष्य के सुधार:
-   एक श्रेणी में उप-श्रेणियाँ नहीं हो सकती हैं, उस स्थिति में `subcategories` ऐरे खाली या अनुपस्थित होगा।
-   **बहु-स्तरीय पदानुक्रम (Multi-level Hierarchy):** भविष्य में, `subcategories` के भीतर एक और `subcategories` ऐरे जोड़कर गहरे स्तर की श्रेणियाँ (जैसे, Electronics > Mobiles > Smartphones) बनाई जा सकती हैं।
-   **विशेषता लिंकिंग (Attribute Linking):** प्रत्येक श्रेणी को उन विशेषताओं (attributes) से जोड़ा जा सकता है जो उस श्रेणी के उत्पादों के लिए प्रासंगिक हैं (जैसे, 'Mobiles' श्रेणी के लिए 'RAM', 'Storage', 'Screen Size')। यह फ़िल्टरिंग को अधिक गतिशील बना देगा।

---

## 7. Orders (`orders.json`)

यह संग्रह ग्राहकों द्वारा दिए गए सभी ऑर्डर का रिकॉर्ड रखता है।

### मुख्य फ़ील्ड्स:

-   **`meta`**: ऑर्डर का मेटाडेटा (`orderId`, `links.userId`)।
-   **`orderItems`** (object): ऑर्डर किए गए आइटमों का एक मैप, जिसमें `quantity` और `snapshot` शामिल है।
-   **`delivery`**: डिलीवरी का पता और निर्देश।
-   **`orderStatus`**: ऑर्डर की वर्तमान स्थिति (`current`) और उसका इतिहास (`timeline`)।
-   **`payment`**: भुगतान की स्थिति और विवरण।
-   **`logistics`**: शिपमेंट और कूरियर से संबंधित विवरण।
-   **`comments`**: ग्राहक और व्यापारी द्वारा जोड़े गए नोट्स।

### संभावित स्थितियाँ और भविष्य के सुधार:
-   यदि कोई उपयोगकर्ता ऑर्डर देने के बाद अपना डिलीवरी पता बदलता है, तो `delivery.changedAddress` ऐरे में पुराने पते का रिकॉर्ड रखा जा सकता है।
-   **ऑर्डर रद्दीकरण (Cancellation):** जब कोई ऑर्डर रद्द किया जाता है, तो `orderStatus.current` को `"cancelled"` पर सेट किया जाता है और `cancelledAt` टाइमस्टैम्प जोड़ा जाता है। रद्द किए गए आइटमों को वापस इन्वेंट्री में जोड़ा जाना चाहिए।
-   **रिटर्न और रिफंड (Returns & Refunds):** भविष्य में, रिटर्न को संभालने के लिए एक `returns` ऑब्जेक्ट जोड़ा जा सकता है, जिसमें रिटर्न का कारण, स्थिति (`pending`, `approved`, `rejected`), और रिफंड विवरण शामिल होंगे।
-   **आंशिक डिलीवरी (Partial Delivery):** यदि एक ऑर्डर को कई शिपमेंट में विभाजित किया जाता है, तो `orderItems` में प्रत्येक आइटम को एक `shipmentId` से जोड़ा जा सकता है।

---

## 8. Alerts & Campaigns (`alerts.json`, `campaigns.json`)

यह दो-भाग वाली प्रणाली ऐप की अधिसूचना प्रणाली को शक्ति प्रदान करती है। `campaigns` का उपयोग बड़े पैमाने पर घोषणाओं के लिए किया जाता है, जो बाद में प्रत्येक लक्षित उपयोगकर्ता के लिए `alerts` संग्रह में व्यक्तिगत अलर्ट उत्पन्न करता है।

---

## 9. Promotions (`promotions.json`)

यह संग्रह ऐप के UI के कुछ हिस्सों (जैसे हेडर, बॉटम नेविगेशन) को गतिशील रूप से ओवरराइड करने के लिए उपयोग किया जाता है, आमतौर पर किसी विशिष्ट व्यापारी को बढ़ावा देने या सामान्य घोषणाएं प्रदर्शित करने के लिए।

### मुख्य ऑब्जेक्ट्स:

-   **`meta`**: प्रमोशन का मेटाडेटा।
    -   `promoId` (string): प्रमोशन के लिए अद्वितीय ID (जैसे `PRM...`)।
    -   `title` (string | null): प्रमोशन का शीर्षक (यदि लागू हो)।
    -   `type` (string): प्रमोशन का प्रकार (`"storefront"`, `"banner"`, आदि)।
    -   `version` (number): प्रमोशन स्कीमा का संस्करण।
    -   `links` (object): संबंधित संस्थाओं के लिंक।
        -   `userId` (string | null): यदि प्रमोशन किसी विशिष्ट उपयोगकर्ता के लिए है।
        -   `merchantId` (string | null): यदि प्रमोशन किसी विशिष्ट व्यापारी के लिए है।
    -   `status` (object): प्रमोशन की वर्तमान स्थिति।
        -   `isActive` (boolean): क्या प्रमोशन सक्रिय है।
        -   `priority` (number): प्रमोशन की प्राथमिकता (उच्च संख्या = उच्च प्राथमिकता)।
        -   `visibility` (string): प्रमोशन की दृश्यता (`"public"`, `"private"`)।
    -   `schedule` (object): प्रमोशन की समय-सीमा।
        -   `start` (string - ISO DateTime): प्रमोशन शुरू होने की तारीख और समय।
        -   `end` (string - ISO DateTime): प्रमोशन समाप्त होने की तारीख और समय।
    -   `createdAt` (string - ISO DateTime): प्रमोशन कब बनाया गया था।
    -   `updatedAt` (string - ISO DateTime): प्रमोशन को आखिरी बार कब अपडेट किया गया था।
-   **`display`**: प्रमोशन के दृश्य घटक।
    -   `banner` (object): बैनर डिस्प्ले के लिए विवरण।
        -   `type` (string): बैनर का प्रकार (`"AD"`, `"INFO"`)।
        -   `title` (string): बैनर का शीर्षक।
        -   `subtitle` (string): बैनर का उपशीर्षक।
        -   `imageUrl` (string): बैनर छवि का URL।
        -   `priceText` (string): मूल्य या कॉल-टू-एक्शन टेक्स्ट।
    -   `brand` (object): ब्रांडिंग जानकारी।
        -   `logoUrl` (string): ब्रांड लोगो का URL।
        -   `name` (string): ब्रांड का नाम।
        -   `itemBrandText` (string): आइटम ब्रांड टेक्स्ट।
    -   `action` (object): बैनर पर क्लिक करने पर की जाने वाली कार्रवाई।
        -   `type` (string): कार्रवाई का प्रकार (`"LINK"`, `"DEEPLINK"`)।
        -   `value` (string): कार्रवाई का गंतव्य (URL या डीपलिंक)।
        -   `ctaText` (string): कॉल-टू-एक्शन बटन का टेक्स्ट।
    -   `notification` (object, optional): यदि प्रमोशन एक अधिसूचना भी ट्रिगर करता है।
        -   `enabled` (boolean): क्या अधिसूचना सक्षम है।
        -   `title` (string): अधिसूचना का शीर्षक।
        -   `message` (string): अधिसूचना का संदेश।
        -   `type` (string): अधिसूचना का प्रकार (`"info"`, `"warning"`, `"error"`)।
        -   `icon` (string): अधिसूचना आइकन (जैसे, `"fas fa-bullhorn"`)।
-   **`targeting`** (object, optional): प्रमोशन के लिए लक्ष्यीकरण मानदंड।
    -   `locations` (array): लक्षित स्थानों की सूची।
    -   `userGroups` (array): लक्षित उपयोगकर्ता समूहों की सूची।
    -   `platforms` (array): लक्षित प्लेटफॉर्म की सूची (`"web"`, `"android"`, `"ios"`, `"desktop"`)।
-   **`rules`** (object, optional): प्रमोशन के लिए नियम।
    -   `minOrderValue` (number): न्यूनतम ऑर्डर मूल्य।
    -   `maxUsagePerUser` (number | null): प्रति उपयोगकर्ता अधिकतम उपयोग।
    -   `applicableItems` (object): आइटम जिन पर प्रमोशन लागू होता है।
        -   `type` (string): प्रकार (`"include"`, `"exclude"`)।
        -   `itemIds` (array): लक्षित आइटम ID की सूची।
        -   `categoryIds` (array): लक्षित श्रेणी ID की सूची।
-   **`reward`** (object, optional): प्रमोशन का इनाम।
    -   `type` (string): इनाम का प्रकार (`"fixed_discount"`, `"percentage_discount"`, `"free_shipping"`)।
    -   `value` (object): इनाम का मूल्य।
        -   `amount` (number): निश्चित छूट राशि या प्रतिशत।
    -   `description` (string): इनाम का विवरण।
    -   `couponCode` (string | null): यदि कोई कूपन कोड आवश्यक है।
-   **`ui_overrides`** (object, optional): UI तत्वों के लिए विशिष्ट ओवरराइड।
    -   `header` (object): हेडर के लिए ओवरराइड।
        -   `backgroundColor` (string): हेडर का पृष्ठभूमि रंग।
        -   `textColor` (string): हेडर का टेक्स्ट रंग।
        -   `logo` (string): हेडर लोगो का URL।
        -   `title` (string): हेडर का शीर्षक।
    -   `bottomNav` (array): बॉटम नेविगेशन के लिए कस्टम आइटम।
        -   प्रत्येक ऑब्जेक्ट में `label`, `icon`, `link` होता है।
-   **`analytics`** (object, optional): प्रमोशन के प्रदर्शन के लिए एनालिटिक्स डेटा।
    -   `views` (number): प्रमोशन के देखे जाने की संख्या।
    -   `clicks` (number): प्रमोशन पर क्लिक की संख्या।
    -   `conversions` (number): प्रमोशन से रूपांतरणों की संख्या।

### संभावित स्थितियाँ और भविष्य के सुधार:

-   **स्टोरफ्रंट प्रमोशन:** `type: "storefront"` वाले प्रमोशन किसी विशिष्ट व्यापारी के लिए ऐप के हेडर और बॉटम नेविगेशन को पूरी तरह से बदल सकते हैं, जिससे एक ब्रांडेड अनुभव मिलता है।
-   **बैनर प्रमोशन:** `type: "banner"` वाले प्रमोशन ऐप के भीतर विभिन्न स्थानों पर विज्ञापन या सूचनात्मक बैनर प्रदर्शित कर सकते हैं।
-   **लक्षित वितरण:** `targeting` फ़ील्ड का उपयोग करके, प्रमोशन को विशिष्ट उपयोगकर्ता समूहों, स्थानों या प्लेटफॉर्म पर लक्षित किया जा सकता है।
-   **नियम-आधारित सक्रियण:** `rules` फ़ील्ड न्यूनतम ऑर्डर मूल्य या प्रति उपयोगकर्ता अधिकतम उपयोग जैसी शर्तों को परिभाषित करने की अनुमति देता है।
-   **गतिशील UI:** `ui_overrides` फ़ील्ड ऐप के UI को कोड परिवर्तन के बिना गतिशील रूप से अनुकूलित करने की अनुमति देता है।

---

## 10. Stories (`stories.json` and `stories-schema.json`)

This collection stores the stories created by merchants. The `stories.json` file contains the actual data for the stories, while `stories-schema.json` provides a detailed blueprint of the entire data structure, including all possible fields and configurations.

### `stories-schema.json`

This file is the "master guide" for the stories feature. It defines everything that a story *can* contain, even if it's not currently used in the app.

#### Key Objects in Schema:

*   **`meta`**: Contains metadata about the story collection, such as version, API compatibility, and supported features (like AR, live, shoppable, etc.).
*   **`stories` (array)**: An array of story objects. Each object can have a very rich structure:
    *   **`flags`**: Boolean flags for visibility, interactivity, and other attributes.
    *   **`content`**: The actual visual content of the story, built with a layer-based system. It can include images, videos, text overlays, and interactive components like polls.
    *   **`navigation`**: Defines swipe and tap actions.
    *   **`cta`**: Call-to-action buttons.
    *   **`products`**: Links to products featured in the story.
    *   **`analytics`**: A very detailed structure for tracking views, engagement, audience demographics, etc.
    *   **`monetization`**: Defines how the story can generate revenue.
    *   **`audit`**: Tracks when the story was created, published, and when it expires.
*   **`config`**: Configuration for performance, fallbacks, and experiments.

### `stories.json`

This file contains the actual story data that the app currently uses. It is a simplified version of the `stories-schema.json`.

#### Key Objects in `stories.json`:

*   **`meta`**: Basic metadata, including links to the merchant (`merchantId`) and the user who created it (`userId`).
*   **`stories` (array)**: A list of the merchant's active stories.
    *   **`storyId`**: Unique ID for the story.
    *   **`status`**: The current status of the story (e.g., `active`).
    *   **`content`**: The visual content, typically with a `background` layer (image) and sometimes a `text_overlay`.
    *   **`analytics`**: Basic analytics, like `views` and `likes`.
    *   **`audit`**: `created` and `expires` timestamps.

### Relationship and Workflow

1.  `stories-schema.json` serves as the complete reference for developers. It shows the full potential of the stories feature.
2.  `stories.json` is the "live" data, containing only the fields necessary for the current features of the app.
3.  When a developer wants to add a new feature to stories (e.g., polls), they would:
    1.  Refer to `stories-schema.json` to see how the `poll` object should be structured.
    2.  Update the application code to render and handle polls.
    3.  Update `stories.json` to include poll data in new stories.

This approach allows the feature to evolve without breaking the existing structure. The app is built to handle the fields present in `stories.json`, and can be extended in the future to support more of the fields defined in `stories-schema.json`.

---

## 11. Logs (`logs.json`)

यह संग्रह ऑडिटिंग, डिबगिंग और विश्लेषण के लिए ऐप के भीतर होने वाली महत्वपूर्ण घटनाओं (`order_created`, `user_registered`) का रिकॉर्ड रखता है।

---

## 12. Price Logs (`price-logs.json`)

यह संग्रह किसी आइटम के मूल्य में होने वाले प्रत्येक परिवर्तन को ट्रैक करता है, जो पारदर्शिता और ऐतिहासिक डेटा विश्लेषण के लिए महत्वपूर्ण है।

---

## 13. Units (`units.json`)

यह संग्रह माप की विभिन्न इकाइयों (`weight`, `volume`) और उनके रूपांतरण कारकों को परिभाषित करता है।

---

## 14. Brands (`brands.json`)

यह संग्रह उन सभी ब्रांडों की सूची संग्रहीत करता है जिनके उत्पाद प्लेटफॉर्म पर बेचे जाते हैं।

---

## हाल के परिवर्तन (Recent Changes) - 09 September 2025

- **Config Schema Added:** `config.json` schema has been added to the guide, detailing its structure and fields.
- **Document Reviewed:** The document has been reviewed and updated by Santosh (with Gemini).

## हाल के परिवर्तन (Recent Changes) - 31 August 2025

- **Schema Guide Overhaul:** `users`, `items`, और `merchants` संग्रहों के लिए स्कीमा को वर्तमान JSON डेटा संरचना को दर्शाने के लिए पूरी तरह से अपडेट किया गया। कई नए ऑब्जेक्ट्स और फ़ील्ड्स जोड़े गए जो पहले दस्तावेज़ में नहीं थे।
- **Added Future Scenarios:** Re-integrated the "Potential Scenarios and Future Improvements" sections to provide context for future development.