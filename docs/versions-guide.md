# Version Control Schema Guide

> This document outlines the schema for version control logs, ensuring consistent and detailed tracking of each deployment.

---

### DOCUMENT AUDIT

- **Reviewed By**: Santosh (with Gemini)
- **Last Reviewed**: 2025-09-01

---

### Example JSON Object

Below is an example of a version log entry.

```json
[
  {
    "version": "0.0.1",
    "versionId": "VRN00000001",
    "environment": "dev",
    "releaseChannel": "beta",
    "status": "deployed",
    "date": "2025-09-05T13:50:00Z",
    "commit": "d4e5f6g",
    "deployedBy": "Santosh",
    "verifiedBy": "Santosh",
    "tags": ["ui", "banner"],
    "tickets": ["BUG-123", "SUPPORT-88"],
    "breakingChanges": false,
    "rollbackPlan": "Revert commit d4e5f6g",
    "added": [
      "Universal banner container (admin panel configurable)"
    ],
    "fixed": [
      "Drawer close animation flicker issue"
    ],
    "improved": [
      "Banner styling (more professional, better mobile responsiveness)"
    ],
    "notes": [
      "Cache reset triggered automatically",
      "Tested on mobile & desktop"
    ]
  }
]
```

---

### फ़ील्ड की परिभाषाएं

**`version`**
सिमेंटिक वर्जन `MAJOR.MINOR.PATCH` (उदाहरण: 0.0.1). प्रत्येक भाग का अधिकतम मान 9 है।

**`versionId`**
प्रत्येक डिप्लॉयमेंट के लिए यूनिक आईडी (उदाहरण: `VRN00000001`), यह सुनिश्चित करता है कि यदि वर्जन नंबर दोहराया जाता है तो भी विशिष्टता बनी रहे।

**`environment`**
डिप्लॉयमेंट एनवायरनमेंट: `dev` | `test` | `staging` | `beta` | `production` | `hotfix`.

**`releaseChannel`**
यह फील्ड यह बताता है कि आपका सॉफ्टवेयर किस स्तर की टेस्टिंग और स्थिरता (stability) पर है, और यह किन उपयोगकर्ताओं के लिए है। इसका मुख्य उद्देश्य जोखिम (risk) को कम करना है।
- **`canary` (कैनरी):** यह सबसे पहला और सबसे जोखिम भरा चैनल है। जब आप कोई नया फीचर बनाते हैं, तो आप उसे सबसे पहले केवल कुछ गिने-चुने लोगों (जैसे आपकी अपनी टीम) के लिए रिलीज करते हैं ताकि बड़ी खराबियों का पता चल सके।
- **`beta` (बीटा):** अगर `canary` रिलीज सफल रहती है, तो आप फीचर को `beta` चैनल पर डालते हैं। यह एक बड़ा उपयोगकर्ता समूह होता है जिन्होंने स्वेच्छा से नई सुविधाओं का परीक्षण करने के लिए साइन-अप किया है।
- **`stable` (स्टेबल):** यह अंतिम और सबसे स्थिर रिलीज है, जो सभी उपयोगकर्ताओं के लिए है। इसे `canary` और `beta` में अच्छी तरह से परखा जा चुका है।

**`status`**
डिप्लॉयमेंट की स्थिति: `deployed` | `pending` | `failed`.

**`date`**
ISO डेट-टाइम फॉर्मेट में डिप्लॉयमेंट टाइमस्टैम्प।

**`commit`**
संदर्भ (रोलबैक/डीबगिंग) के लिए गिट कमिट हैश।

**`deployedBy`**
उस व्यक्ति का नाम जिसने इस रिलीज को डिप्लॉय किया।

**`verifiedBy`**
उस व्यक्ति का नाम जिसने QA या स्व-सत्यापन किया।

**`tags`**
त्वरित फ़िल्टरिंग/खोज के लिए वैकल्पिक श्रेणियों की ऐरे।

**`tickets`**
संबंधित इश्यू ट्रैकर आईडी (जैसे, Jira, GitHub, समर्थन टिकट)।

**`breakingChanges`**
यह एक बहुत ही महत्वपूर्ण `true` / `false` फ्लैग है। यह बताता है कि क्या आपके नए अपडेट से सिस्टम के पुराने हिस्से टूट सकते हैं। एक "ब्रेकिंग चेंज" ऐसा बदलाव है जो बैकवर्ड-कम्पेटिबल नहीं है। इसका मतलब है कि यदि कोई अन्य डेवलपर या सिस्टम आपके कोड का उपयोग कर रहा है, तो आपका नया अपडेट उनके कोड को तोड़ देगा, और उन्हें अपने कोड में बदलाव करने के लिए मजबूर होना पड़ेगा।
- **उदाहरण:** API रिस्पॉन्स में `userId` फील्ड का नाम बदलकर `user_id` करना।
- **महत्व:** जब आप `breakingChanges: true` सेट करते हैं, तो यह सभी के लिए एक चेतावनी होती है कि इस अपडेट को सावधानी से हैंडल करें। यह अक्सर MAJOR वर्जन नंबर बढ़ाने का संकेत देता है (जैसे `1.9.0` से `2.0.0` करना)।

**`rollbackPlan`**
रोलबैक के लिए वैकल्पिक निर्देश।

**`added`**
जोड़ी गई नई सुविधाओं/मॉड्यूलों का वर्णन करने वाली स्ट्रिंग्स की ऐरे।

**`fixed`**
बग फिक्स का वर्णन करने वाली स्ट्रिंग्स की ऐरे।

**`improved`**
सुधारों (UI/UX/प्रदर्शन) का वर्णन करने वाली स्ट्रिंग्स की ऐरे।

**`notes`**
अतिरिक्त जानकारी के लिए ऐरे, जैसे कैश रीसेट की जरूरत, मैन्युअल स्टेप्स, या सत्यापन नोट्स।

---

### Important Notes

-   **Versioning Limit**: The `major`, `minor`, and `patch` versions can go up to `9.9.9`. After this, the version should reset to `0.0.1` for the next environment or major release.
-   **Version Storage**: It is recommended to store all version history in Firebase for persistence and keep only the latest version information in the project's source code (e.g., in a configuration file) for display purposes.
-   **Footer Display**: The application footer of drawer should display key version information, for example: `© 2025 | V0.1.0 | Production`.