> **DOCUMENT AUDIT**
> - **Status:** `Updated`
> - **Last Reviewed:** 04/10/2025 00:09:00 IST
> - **Reviewer:** Santosh (with Gemini)
> - **Purpose:** This document provides a comprehensive guide to all Firestore data collections, detailing each schema's structure, fields, and relationships. It is the single source of truth for the data model.

---
# 🛍️ mStore - विस्तृत स्कीमा गाइड

यह दस्तावेज़ "mStore" एप्लिकेशन के लिए उपयोग किए जाने वाले सभी फायरस्टोर डेटा संग्रह (collections) के लिए एक व्यापक गाइड है। यह प्रत्येक स्कीमा की संरचना, उसके फ़ील्ड्स के उद्देश्य और विभिन्न संग्रहों के बीच संबंधों का विवरण देता है। यह डेटा मॉडल के लिए सत्य का एकमात्र स्रोत (single source of truth) है।

---

## 🏛️ सामान्य स्कीमा सिद्धांत (General Schema Principles)

कोई भी नया कलेक्शन बनाते समय, इन सिद्धांतों का पालन करना अनिवार्य है ताकि पूरे प्रोजेक्ट में एकरूपता बनी रहे।

1.  **`meta` ऑब्जेक्ट की अनिवार्यता:**
    *   हर दस्तावेज़ में एक `meta` ऑब्जेक्ट ज़रूर होना चाहिए। यह ऑब्जेक्ट उस दस्तावेज़ के बारे में सभी आवश्यक मेटाडेटा को एक ही स्थान पर रखता है।

2.  **ID का दोहराव (ID Duplication):**
    *   प्रत्येक दस्तावेज़ की यूनिक ID (देखें: `id-generation.md`) को दो जगहों पर संग्रहीत किया जाना चाहिए:
        1.  **Firestore Document ID:** यह Firestore में दस्तावेज़ का नाम होता है।
        2.  **`meta` ऑब्जेक्ट के अंदर:** वही ID `meta` ऑब्जेक्ट के अंदर एक संबंधित फ़ील्ड (जैसे `meta.userId`, `meta.itemId`) में भी संग्रहीत की जानी चाहिए।
    *   **क्यों?** यह डेटा को "सेल्फ-कंटेन्ड" बनाता है। जब आप केवल दस्तावेज़ का डेटा प्राप्त करते हैं, तो आपको उसकी ID के लिए अलग से पूछने की ज़रूरत नहीं होती है।

3.  **`links` ऑब्जेक्ट:**
    *   `meta` ऑब्जेक्ट के अंदर एक `links` ऑब्जेक्ट होना चाहिए। यह ऑब्जेक्ट इस दस्तावेज़ का दूसरे कलेक्शन के दस्तावेज़ों से संबंध (relationship) बताता है।

4.  **डेटा और स्कीमा फ़ाइलों का स्थान:**
    *   **मॉक डेटा:** सभी मॉक डेटा `.json` फाइलें `localstore/jsons/` डायरेक्टरी में रखी जाती हैं।
    *   **स्कीमा परिभाषा:** प्रत्येक कलेक्शन के लिए, एक JSON स्कीमा फ़ाइल (`<collection-name>-schema.json`) `/source/schemas/` डायरेक्टरी में बनाई जानी चाहिए। यह फ़ाइल उस कलेक्शन के डेटा स्ट्रक्चर, फ़ील्ड्स और नियमों को परिभाषित करती है, जैसा कि `feedbacks.json` में `$schema` कुंजी में देखा गया है।

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

-   **`meta`**: उपयोगकर्ता की पहचान, भूमिका और स्थिति के लिए मेटाडेटा।
    -   `userId` (string): अद्वितीय उपयोगकर्ता ID (जैसे `USR...`) - प्राइमरी की।
    -   `roles` (array): उपयोगकर्ता को सौंपी गई भूमिकाएँ (`user`, `merchant`, `admin`)।
    -   `primaryRole` (string): उपयोगकर्ता की प्राथमिक भूमिका।
    -   `links` (object): अन्य संग्रहों से संबंध (`accountId`, `merchantId`)।
    -   `flags` (object): बूलियन मान जो उपयोगकर्ता की स्थिति दर्शाते हैं (`isActive`, `isSuspended`, `isVerified`, `isAdmin`, `isSuperAdmin` आदि)।
-   **`info`**: उपयोगकर्ता की व्यक्तिगत जानकारी।
-   **`info`**: उपयोगकर्ता की व्यक्तिगत जानकारी।
    -   `fullName`, `nickName`, `gender`, `dob`, `avatar`, `tagline`, `bio`, `email`, `phone`।
    -   **`username` (string): एक अद्वितीय, सार्वजनिक `@username` जो उपयोगकर्ता की पहचान करता है।**
    -   **`usernameUpdatedAt` (string - ISO DateTime | null): वह तारीख जब उपयोगकर्ता नाम पिछली बार बदला गया था। यह 90-दिन की परिवर्तन नीति को लागू करने के लिए उपयोग किया जाता है।**
-   **`address`** (array): उपयोगकर्ता के पतों की सूची।
    -   प्रत्येक ऑब्जेक्ट में `label`, `isPrimary`, `street`, `city`, `state`, `zipCode`, `geoLocation` होता है।
-   **`auth`**: प्रमाणीकरण से संबंधित विस्तृत विवरण।
    -   `login` (object): लॉगिन प्रयास, विधि और पासवर्ड की जानकारी।
    -   `flags` (object): सुरक्षा-संबंधी फ़्लैग (`twoFactorEnabled`, `emailVerified`, `accountLocked`)।
    -   `recovery` (object): खाता पुनर्प्राप्ति के लिए ईमेल, फ़ोन और सुरक्षा प्रश्न।
    -   `provider` (object): फायरबेस प्रमाणीकरण प्रदाता (`uid`)।

### संबंध (Relationships)
- **`users` 1-to-1 `accounts`**: प्रत्येक `users` दस्तावेज़ `meta.links.accountId` के माध्यम से एक `accounts` दस्तावेज़ से जुड़ा होता है।
- **`users` 1-to-1 `merchants`**: यदि उपयोगकर्ता एक व्यापारी है, तो `meta.links.merchantId` उसे संबंधित `merchants` दस्तावेज़ से जोड़ता है।

---

## 3. Accounts (`accounts.json`)

**उद्देश्य:** यह संग्रह प्रत्येक उपयोगकर्ता के लिए गतिशील और डिवाइस-विशिष्ट डेटा संग्रहीत करता है, जैसे सेटिंग्स, डिवाइस जानकारी और खोज इतिहास। यह `users` संग्रह से स्थिर प्रोफ़ाइल डेटा को अलग करता है।

### मुख्य फ़ील्ड्स:

-   **`meta`**: खाते का मेटाडेटा (`accountId`, `links.userId`)।
-   **`deviceInfo`**: उपयोगकर्ता द्वारा उपयोग किए गए उपकरणों की सूची, जिसमें प्रत्येक डिवाइस के लिए `fcmToken` शामिल है।
-   **`settings`**: उपयोगकर्ता-विशिष्ट सेटिंग्स (`theme`, `language`)।
-   **`searchHistory`**: हाल की खोजें।
-   **`subscription`** (object): उपयोगकर्ता की सदस्यता का विवरण (`plan`, `type`, `status`, आदि)।

### संबंध (Relationships)
- **`accounts` 1-to-1 `users`**: प्रत्येक `accounts` दस्तावेज़ `meta.links.userId` के माध्यम से एक `users` दस्तावेज़ से वापस जुड़ता है।
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

### संबंध (Relationships)
- **`merchants` 1-to-1 `users`**: प्रत्येक `merchants` दस्तावेज़ `meta.links.userId` के माध्यम से एक `users` दस्तावेज़ से जुड़ा होता है।
---

## 5. Items (`items.json`)

यह संग्रह व्यापारियों द्वारा बेचे जाने वाले सभी उत्पादों और सेवाओं का प्रतिनिधित्व करता है।

### मुख्य ऑब्जेक्ट्स:

-   **`meta`**: आइटम का मेटाडेटा।
    -   `itemId`, `type` (`product`/`service`), `version`, `priority`, `flags`, `links` (`merchantId`, `brandId`, `unitId`, `categoryId` - **अब `ICT` उपसर्ग के साथ**)।
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

### संबंध (Relationships)
- **`items` Many-to-One `merchants`**: कई आइटम एक ही `meta.links.merchantId` से जुड़े हो सकते हैं।
- **`items` Many-to-One `categories`**: आइटम `meta.links.categoryId` और `meta.links.subCatId` के माध्यम से श्रेणियों से जुड़े होते हैं।
---
## 6. Categories (`categories.json`)

यह संग्रह उत्पादों और सेवाओं को व्यवस्थित करने के लिए एक पदानुक्रमित संरचना प्रदान करता है।

### मुख्य फ़ील्ड्स:

-   **`meta`**: श्रेणी का मेटाडेटा (`categoryId`, `slug`, `icon`)।
-   **`subcategories`** (array): इस मुख्य श्रेणी के अंतर्गत आने वाली उप-श्रेणियों की एक सूची।

### संबंध (Relationships)
- **`categories` One-to-Many `items`**: एक श्रेणी कई आइटमों से जुड़ी हो सकती है।
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

### संबंध (Relationships)
- **`orders` Many-to-One `users`**: कई ऑर्डर एक ही `meta.links.userId` से जुड़े हो सकते हैं।
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

### संबंध (Relationships)
- **`promotions` Many-to-One `merchants`**: प्रमोशन `meta.links.merchantId` के माध्यम से किसी विशिष्ट व्यापारी से जुड़े हो सकते हैं।
---
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

**उद्देश्य:** यह संग्रह ऑडिटिंग, डिबगिंग और विश्लेषण के लिए ऐप के भीतर होने वाली महत्वपूर्ण घटनाओं (`order_created`, `user_registered`) का रिकॉर्ड रखता है।

### मुख्य ऑब्जेक्ट्स:
- **`meta`**: लॉग का मेटाडेटा (`logId`, `type`, `action`, `priority`, `tags`, `links`)।
- **`event`**: घटना का विवरण।
    -   `timestamp` और `serverTime`: घटना का समय।
    -   `status`: घटना की स्थिति (`success`, `fail`, `info`)।
    -   `description`: घटना का मानव-पठनीय विवरण।
    -   `performedBy`: घटना को करने वाले की जानकारी (`role`, `id`, `name`)।
    -   `details`: घटना से संबंधित कोई भी अतिरिक्त संरचित डेटा।
- **`source`**: घटना कहाँ से उत्पन्न हुई।
    -   `device`, `platform`, `browser`, `ipAddress`, `userAgent`।
- **`audit`**: ऑडिटिंग के लिए फ़ील्ड (`createdBy`, `createdAt`)।

---

## 12. Price Logs (`price-logs.json`)

यह संग्रह किसी आइटम के मूल्य में होने वाले प्रत्येक परिवर्तन को ट्रैक करता है, जो पारदर्शिता और ऐतिहासिक डेटा विश्लेषण के लिए महत्वपूर्ण है।

---

## 13. Units (`units.json`)

यह संग्रह माप की विभिन्न इकाइयों (`weight`, `volume`) और उनके रूपांतरण कारकों को परिभाषित करता है।

---
## 14. Feedbacks (`feedbacks.json`)

**उद्देश्य:** यह संग्रह उपयोगकर्ताओं (लॉग-इन और मेहमान दोनों) से प्राप्त सभी प्रकार की प्रतिक्रिया, जैसे बग रिपोर्ट, सुविधा अनुरोध और सामान्य सुझाव, को संग्रहीत करता है।

### मुख्य ऑब्जेक्ट्स:

-   **`meta`**: फीडबैक का मेटाडेटा।
    -   `feedbackId` (string): अद्वितीय फीडबैक ID (`FDB...`) - प्राइमरी की।
    -   `type` (string): दस्तावेज़ का प्रकार, हमेशा `"feedback"`।
    -   `version` (number): स्कीमा का संस्करण।
    -   `flags` (object): फीडबैक की स्थिति को ट्रैक करने के लिए बूलियन मान।
        -   `reviewed` (boolean): क्या फीडबैक की समीक्षा की गई है।
        -   `resolved` (boolean): क्या फीडबैक का समाधान हो गया है।
        -   `archived` (boolean): क्या फीडबैक को संग्रहीत किया गया है।
        -   `guest` (boolean): क्या यह एक मेहमान उपयोगकर्ता द्वारा सबमिट किया गया था।
    -   `links` (object): अन्य संबंधित दस्तावेज़ों के ID (`userId`, `merchantId`)।
-   **`submitter`**: फीडबैक सबमिट करने वाले की जानकारी।
-   **`submitter`**: फीडबैक सबमिट करने वाले की जानकारी।
    -   `id` (string | null): सबमिट करने वाले की प्राथमिक ID (`userId` या `merchantId`)।
    -   `role` (string): सबमिट करते समय उपयोगकर्ता की भूमिका (`consumer`, `merchant`, `admin`, `guest`)।
    -   `submittedAt` (string - ISO DateTime): फीडबैक कब सबमिट किया गया था।
-   **`details`**: फीडबैक का वास्तविक विवरण।
    -   `subject` (string): फीडबैक का विषय (जैसे, संबंधित आइटम का नाम)।
    -   `message` (string): उपयोगकर्ता का विस्तृत संदेश।
    -   `category` (string): फीडबैक की श्रेणी (`bug_report`, `feature_request`, आदि)।
    -   `sentiment` (string): संदेश की भावना (`positive`, `neutral`, `negative`) - इसे बाद में AI से एनालाइज किया जा सकता है।
    -   `attachments` (array): उपयोगकर्ता द्वारा संलग्न की गई फ़ाइलों के ऑब्जेक्ट्स की सूची।
    -   `phone` (string): उपयोगकर्ता का संपर्क नंबर।
-   **`lifecycle`**: फीडबैक की स्थिति का जीवनचक्र।
    -   `status` (string): फीडबैक की वर्तमान स्थिति (`pending`, `reviewed`, `resolved`, `archived`)।
    -   `milestones` (object): मुख्य घटनाओं के टाइमस्टैम्प।
        -   `reviewedAt` (string | null): कब समीक्षा की गई।
        -   `resolvedAt` (string | null): कब समाधान किया गया।
        -   `archivedAt` (string | null): कब संग्रहीत किया गया।
    -   `history` (array): स्थिति में हुए सभी परिवर्तनों का एक लॉग।
        -   प्रत्येक ऑब्जेक्ट में `from`, `to`, `updatedAt`, `updatedBy`, और `note` होता है।

### संबंध (Relationships)
- **`feedbacks` Many-to-One `users`**: यदि फीडबैक एक लॉग-इन उपयोगकर्ता द्वारा दिया गया है, तो `meta.links.userId` उसे `users` संग्रह से जोड़ता है।

---

## 15. Ratings (`ratings.json`)

**उद्देश्य:** यह संग्रह ऐप, आइटम, ऑर्डर या व्यापारियों के लिए उपयोगकर्ताओं से प्राप्त रेटिंग को संग्रहीत करता है। यह 1-5 स्टार मान, टिप्पणियाँ, टैग और प्रासंगिक जानकारी कैप्चर करता है कि रेटिंग कब और कैसे सबमिट की गई थी।

### मुख्य ऑब्जेक्ट्स:

-   **`meta`**: रेटिंग का मेटाडेटा।
    -   `ratingId` (string): अद्वितीय रेटिंग ID (`RTG...`) - प्राइमरी की।
    -   `type` (string): दस्तावेज़ का प्रकार, हमेशा `"rating"`।
    -   `version` (number): स्कीमा का संस्करण।
    -   `flags` (object): रेटिंग की स्थिति को ट्रैक करने के लिए बूलियन मान।
        -   `reviewed` (boolean): क्या रेटिंग की समीक्षा की गई है।
        -   `responded` (boolean): क्या रेटिंग पर प्रतिक्रिया दी गई है।
        -   `archived` (boolean): क्या रेटिंग को संग्रहीत किया गया है।
        -   `isHighImpact` (boolean): यदि रेटिंग कम है (जैसे 1-2 स्टार) तो `true`।
        -   `guest` (boolean): क्या यह एक मेहमान उपयोगकर्ता द्वारा सबमिट किया गया था।
    -   `links` (object): अन्य संबंधित दस्तावेज़ों के ID (`userId`, `orderId`, `itemId`, `merchantId`)
-   **`submitter`**: रेटिंग सबमिट करने वाले की जानकारी।
    -   `id` (string | null): सबमिट करने वाले की प्राथमिक ID (`userId` या `merchantId`)
    -   `role` (string): सबमिट करते समय उपयोगकर्ता की भूमिका (`consumer`, `merchant`, `guest` आदि)।
    -   `submittedAt` (string - ISO DateTime): रेटिंग सबमिट करने का समय।
-   **`details`**: रेटिंग का वास्तविक कंटेंट।
    -   `value` (integer): स्टार रेटिंग (1 से 5 तक)।
    -   `comment` (string): उपयोगकर्ता द्वारा दिया गया टेक्स्ट कमेंट।
    -   `tags` (array): उपयोगकर्ता द्वारा चुने गए टैग (जैसे `'ui_ux'`, `'performance'`)।
-   **`context`**: यह जानकारी देता है कि रेटिंग कहाँ और कैसे सबमिट की गई थी।
    -   `source` (string): ऐप में रेटिंग कहाँ से शुरू हुई (जैसे `'order_confirmation_page'`)।
    -   `triggerEvent` (string): रेटिंग प्रॉम्प्ट को ट्रिगर करने वाली घटना।
    -   `appVersion` (string): ऐप का संस्करण।
    -   `platform` (string): प्लेटफ़ॉर्म (जैसे `'web_mobile'`)।
    -   `device` (object): डिवाइस की जानकारी (OS, ब्राउज़र)।
-   **`lifecycle`**: यह रेटिंग के प्रशासनिक जीवनचक्र को ट्रैक करता है।
    -   `status` (string): वर्तमान स्थिति (`pending`, `reviewed`, `responded`, `archived`)।
    -   `milestones` (object): मुख्य घटनाओं के टाइमस्टैम्प।
    -   `history` (array): रेटिंग पर की गई सभी कार्रवाइयों का एक लॉग।

### संबंध (Relationships)
- **`ratings` Many-to-One `users`**: `meta.links.userId` के माध्यम से उपयोगकर्ता से जुड़ता है।
- **`ratings` Many-to-One `orders`**: यदि रेटिंग किसी ऑर्डर के लिए है तो `meta.links.orderId` के माध्यम से जुड़ता है।
- **`ratings` Many-to-One `items`**: यदि रेटिंग किसी आइटम के लिए है तो `meta.links.itemId` के माध्यम से जुड़ता है।
- **`ratings` Many-to-One `merchants`**: यदि रेटिंग किसी व्यापारी के लिए है तो `meta.links.merchantId` के माध्यम से जुड़ता है।

---

## 15. Brands (`brands.json`)

यह संग्रह उन सभी ब्रांडों की सूची संग्रहीत करता है जिनके उत्पाद प्लेटफॉर्म पर बेचे जाते हैं।