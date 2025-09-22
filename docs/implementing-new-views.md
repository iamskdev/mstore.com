> **DOCUMENT AUDIT**
> - **Status:** `Updated`
> - **Last Reviewed:** 24/08/2025 18:58:34 +05:30
> - **Reviewer:** Santosh (with Gemini)
> - **Purpose:** This document provides a mandatory guide for developers on how to create new pages and views within the "mStore" project, ensuring consistency, performance, and adherence to the established architecture. It has been updated to reflect the latest routeManager architecture and best practices.

---

# 📖 How to Implement New Pages and Views (नए पेज और व्यू कैसे लागू करें)

यह गाइड "mStore" प्रोजेक्ट में एक नया पेज या व्यू बनाने की प्रक्रिया का विवरण देता है। एक सुसंगत और रखरखाव योग्य कोडबेस बनाए रखने के लिए इन चरणों का पालन करना अनिवार्य है।

## 🎯 मुख्य सिद्धांत (Core Principles)

1.  **मॉड्यूलरिटी (Modularity):** प्रत्येक पेज को एक आत्मनिर्भर मॉड्यूल के रूप में माना जाना चाहिए, जिसकी अपनी HTML, CSS, और JS फाइलें हों।
2.  **केंद्रीकृत स्टेट मैनेजमेंट (Centralized State Management):** सभी व्यू ट्रांज़िशन और भूमिका परिवर्तन को **`routeManager`** द्वारा नियंत्रित किया जाना चाहिए। `routeManager` गतिशील रूप से व्यू `div` तत्वों को बनाता है और उनके संबंधित HTML, CSS, और JS को लोड करता है। सीधे DOM में हेरफेर करके व्यू को न दिखाएँ या छिपाएँ।
3.  **डेटा एब्स्ट्रैक्शन (Data Abstraction):** फायरस्टोर से सीधे डेटा प्राप्त करने के बजाय हमेशा **`data-manager.js`** में मौजूद फंक्शन्स (जैसे `fetchItemById`, `fetchAllUsers`) का उपयोग करें। यह सुनिश्चित करता है कि ऐप `firebase`, `emulator`, या `localstore` डेटा स्रोतों के बीच आसानी से स्विच कर सके।
4.  **पुन: प्रयोज्यता (Reusability):** नए कंपोनेंट्स बनाने से पहले, देखें कि क्या `/source/components/` में कोई मौजूदा कंपonent (जैसे `card.js`) आपकी आवश्यकता को पूरा कर सकता है।

---

## 🚀 एक नया पेज बनाने के चरण (Steps to Create a New Page)

मान लीजिए कि हम एक व्यापारी के लिए एक नया "प्रोफाइल एडिट" पेज बना रहे हैं।

### चरण 1: फ़ाइल संरचना (File Structure)

सही डायरेक्टरी में आवश्यक फाइलें बनाएँ।

```
/source/
└── modules/
    └── merchant/
        ├── pages/
        │   └── merchant-profile-edit.html  <-- (नई HTML)
        ├── scripts/
        │   └── merchant-profile-edit.js    <-- (नई JS)
        └── styles/
            └── merchant-profile-edit.css   <-- (नई CSS)
```

### चरण 2: व्यू को कॉन्फ़िगर करें (`view-config.js`)

`source/routes.js` खोलें और `routeConfig` ऑब्जेक्ट में अपने नए व्यू के लिए एक एंट्री जोड़ें।

```javascript
const routeConfig = {
    // ... other roles
    merchant: {
        // ... other merchant views
        'profile-edit': { // <-- नया व्यू
            id: 'merchant-profile-edit-view', // यह ID गतिशील रूप से बनाए गए div को दी जाएगी
            path: './source/modules/merchant/pages/merchant-profile-edit.html',
            // JS और CSS पथ वैकल्पिक हैं, लेकिन अनुशंसित हैं
            jsPath: './source/modules/merchant/scripts/merchant-profile-edit.js',
            cssPath: './source/modules/merchant/styles/merchant-profile-edit.css',
            embedFooter: false, // इस पेज पर फुटर की आवश्यकता नहीं है
            showFilterBar: false, // इस पेज पर फिल्टर बार की आवश्यकता नहीं है
            title: 'प्रोफाइल एडिट' // पेज का शीर्षक
        },
        'dynamic-content-example': { // एक उदाहरण जहां HTML सीधे लोड नहीं होता है
            id: 'dynamic-content-view',
            path: null, // HTML फ़ाइल लोड नहीं की जाएगी
            jsPath: './source/modules/consumer/scripts/dynamic-content.js', // JS अभी भी लोड होगा
            embedFooter: true, // फुटर को एम्बेड करें
            title: 'डायनामिक कंटेंट'
        }
    }
    // ... other roles
};
```
**नोट:**
*   `path: null` का उपयोग उन व्यू के लिए किया जाता है जो सीधे HTML फ़ाइल से कंटेंट लोड नहीं करते हैं (जैसे कि वे जो JavaScript में अपना UI बनाते हैं या केवल एक प्लेसहोल्डर के रूप में कार्य करते हैं)।
*   `embedFooter: true` और `showFilterBar: true` गुण `routeManager` को स्वचालित रूप से संबंधित कंपोनेंट्स को व्यू में एम्बेड करने का निर्देश देते हैं।

### चरण 3: पेज का लॉजिक लिखें (JS फाइल)

अपनी नई `.js` फ़ाइल (`merchant-profile-edit.js`) में, एक `export function init()` फ़ंक्शन बनाएँ। `routeManager` इस `init()` फ़ंक्शन को स्वचालित रूप से कॉल करेगा जब आपका पेज पहली बार लोड होगा।

```javascript
import { fetchMerchantById } from '../../firebase/firestore/merchants.js'; // सही पथ का उपयोग करें
import { showToast } from '../../utils/toast.js';

export function init() {
    const view = document.getElementById('merchant-profile-edit-view');
    if (!view || view.dataset.initialized) return; // दोबारा शुरू होने से रोकें

    console.log('Initializing Merchant Profile Edit page...');

    // यहाँ अपना लॉजिक लिखें:
    // 1. DOM एलिमेंट्स प्राप्त करें (जैसे, फॉर्म, इनपुट)
    // 2. data-manager.js का उपयोग करके आवश्यक डेटा प्राप्त करें
    //    उदाहरण: fetchMerchantById(someMerchantId).then(data => { /* ... */ });
    // 3. इवेंट लिसनर्स जोड़ें (जैसे, 'submit' या 'click')

    view.dataset.initialized = 'true';
}
```
**महत्वपूर्ण:** सुनिश्चित करें कि आपके JS मॉड्यूल में `export function init()` है। `routeManager` इस फ़ंक्शन को आपके व्यू के लिए एंट्री पॉइंट के रूप में उपयोग करता है।

### चरण 4: नेविगेशन को ट्रिगर करें

किसी अन्य पेज (जैसे, `merchant-account.html`) से, आप एक बटन या लिंक पर एक इवेंट लिसनर जोड़ सकते हैं जो `routeManager` को आपके नए पेज पर स्विच करने के लिए कहेगा।

```javascript
// उदाहरण: merchant-account.js में
const editProfileBtn = document.getElementById('edit-profile-btn');
editProfileBtn.addEventListener('click', () => {
    // सीधे window.routeManager को कॉल करें
    window.routeManager.switchView('merchant', 'profile-edit');
});
```

---

## ✅ चेकलिस्ट और सर्वोत्तम प्रथाएँ

-   **क्या आपने `view-config.js` को अपडेट किया है?** यह सबसे महत्वपूर्ण कदम है।
-   **क्या आपका सारा लॉजिक एक `export function init()` फ़ंक्शन के अंदर है?** यह लेज़ी-लोडिंग और `routeManager` द्वारा सही निष्पादन के लिए आवश्यक है।
-   **क्या आप डेटा के लिए `data-manager.js` का उपयोग कर रहे हैं?** यह डेटा स्रोत एब्स्ट्रैक्शन के लिए महत्वपूर्ण है।
-   **क्या आप फीडबैक के लिए `showToast()` का उपयोग कर रहे हैं?**
-   **क्या आपने अपने पेज के शीर्ष पर एक `data-initialized` एट्रिब्यूट सेट किया है** ताकि लॉजिक दोबारा न चले?
-   **आपको अब `index.html` में मैन्युअल रूप से `div` जोड़ने की आवश्यकता नहीं है!** `routeManager` इसे आपके लिए गतिशील रूप से बनाता है।
-   **क्या आपने `view-config.js` में `embedFooter` और `showFilterBar` गुणों को सही ढंग से सेट किया है?** `routeManager` इन गुणों के आधार पर फुटर और फिल्टर बार को स्वचालित रूप से एम्बेड करेगा।
