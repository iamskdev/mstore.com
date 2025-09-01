# Version Control Schema Guide

> This document outlines the schema for version control logs, ensuring consistent and detailed tracking of each deployment.

---

### DOCUMENT AUDIT

- **Reviewed By**: Santosh (with Gemini)
- **Last Reviewed**: 2025-09-01

---

### Example JSON Object

Below is an example of a version log entry with the new audit structure.

```json
[
  {
    "version": "0.0.1",
    "versionId": "VRN0000001",
    "environment": "dev",
    "releaseChannel": "beta",
    "status": "deployed",
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
    ],
    "audit": {
      "commitHash": "d4e5f6g",
      "createdBy": "Santosh",
      "createdAt": "2025-09-05T13:00:00Z",
      "deployedBy": "Santosh",
      "deploymentDate": "2025-09-05T13:50:00Z",
      "verifiedBy": "Gemini",
      "verificationDate": "2025-09-05T18:00:00Z",
      "lastModifiedBy": "Gemini",
      "lastModifiedAt": "2025-09-06T09:30:00Z"
    }
  }
]
```

---

### फ़ील्ड की परिभाषाएं

**`version`**
सिमेंटिक वर्जन `MAJOR.MINOR.PATCH` (उदाहरण: 0.0.1). प्रत्येक भाग का अधिकतम मान 9 है।

**`versionId`**
प्रत्येक डिप्लॉयमेंट के लिए यूनिक आईडी (उदाहरण: `VRN0000001`), यह सुनिश्चित करता है कि यदि वर्जन नंबर दोहराया जाता है तो भी विशिष्टता बनी रहे।

**`environment`**
डिप्लॉयमेंट एनवायरनमेंट: `dev` | `test` | `staging` | `beta` | `production` | `hotfix`.

**`releaseChannel`**
यह फील्ड यह बताता है कि आपका सॉफ्टवेयर किस स्तर की टेस्टिंग और स्थिरता (stability) पर है, और यह किन उपयोगकर्ताओं के लिए है।

**`status`**
डिप्लॉयमेंट की स्थिति: `deployed` | `pending` | `failed`.

**`audit`**
यह ऑब्जेक्ट डिप्लॉयमेंट और लॉग एंट्री के पूरे जीवनचक्र को ट्रैक करता है। इसमें निम्नलिखित फील्ड्स शामिल हैं:

-   **`commitHash`** (`string`): Git कमिट हैश जो इस वर्ज़न से जुड़ा है। उदाहरण: `"d4e5f6g"`
-   **`createdBy`** (`string`): उस व्यक्ति का नाम जिसने इस वर्ज़न एंट्री को पहली बार बनाया। उदाहरण: `"Santosh"`
-   **`createdAt`** (`string` - ISO DateTime): इस वर्ज़न एंट्री को कब बनाया गया। उदाहरण: `"2025-09-05T13:00:00Z"`
-   **`deployedBy`** (`string`): उस व्यक्ति का नाम जिसने इस वर्ज़न को डिप्लॉय किया। उदाहरण: `"Santosh"`
-   **`deploymentDate`** (`string` - ISO DateTime): इस वर्ज़न को कब डिप्लॉय किया गया। उदाहरण: `"2025-09-05T13:50:00Z"`
-   **`verifiedBy`** (`string`): उस व्यक्ति का नाम जिसने इस डिप्लॉयमेंट का QA/सत्यापन किया। उदाहरण: `"Gemini"`
-   **`verificationDate`** (`string` - ISO DateTime): इस डिप्लॉयमेंट का QA/सत्यापन कब हुआ। उदाहरण: `"2025-09-05T18:00:00Z"`
-   **`lastModifiedBy`** (`string`): उस व्यक्ति का नाम जिसने इस वर्ज़न एंट्री में आख़िरी बार बदलाव किया। उदाहरण: `"Gemini"`
-   **`lastModifiedAt`** (`string` - ISO DateTime): इस वर्ज़न एंट्री में आख़िरी बार बदलाव कब हुआ। उदाहरण: `"2025-09-06T09:30:00Z"`

**`tags`**
त्वरित फ़िल्टरिंग/खोज के लिए वैकल्पिक श्रेणियों की ऐरे।

**`tickets`**
संबंधित इश्यू ट्रैकर आईडी (जैसे, Jira, GitHub, समर्थन टिकट)।

**`breakingChanges`**
यह एक बहुत ही महत्वपूर्ण `true` / `false` फ्लैग है। यह बताता है कि क्या आपके नए अपडेट से सिस्टम के पुराने हिस्से टूट सकते हैं।

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
-   **Footer Display**: The application footer of drawer should display key version information, for example: `© 2025 | V0.1.0 | "environmet"`.