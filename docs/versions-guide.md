# 📖 Version Control Schema Guide

> **DOCUMENT AUDIT**
> - **Status:** `Up-to-Date`
> - **Last Reviewed:** 09/09/2025 at 14:56:00 IST
> - **Reviewer:** Santosh (with Gemini)
> - **Purpose:** This document outlines the comprehensive schema for the `versions.json` file, ensuring every commit that triggers a version bump is logged with consistent and detailed information.

---

### स्वचालन (Automation)

यह सिस्टम `versioner.js` स्क्रिप्ट द्वारा स्वचालित है, जो `.husky/post-commit` हुक के माध्यम से हर योग्य कमिट के बाद चलता है।

1.  **कमिट विश्लेषण (Commit Analysis):** स्क्रिप्ट कमिट मेसेज का विश्लेषण करके यह निर्धारित करती है कि वर्शन को बढ़ाना है या नहीं (जैसे, `feat`, `fix`, `improve`, या `!` के साथ ब्रेकिंग चेंज)।
2.  **JSON अपडेट (`versions.json`):** यदि वर्शन बम्प आवश्यक है, तो यह `versions.json` में एक नया ऑब्जेक्ट जोड़ता है।
3.  **चेंजलॉग (`CHANGELOG.md`):** यह `CHANGELOG.md` में एक नया एंट्री भी जोड़ता है।
4.  **कॉन्फ़िग अपडेट (`config.json`):** यह `source/settings/config.json` में `app.version` को नए वर्शन नंबर के साथ अपडेट करता है।
5.  **ऑटो-अमेंड (Auto-Amend):** अंत में, `post-commit` हुक इन तीनों फाइलों (`versions.json`, `CHANGELOG.md`, `config.json`) को स्टेज करता है और उन्हें अंतिम कमिट में शामिल करने के लिए `git commit --amend` चलाता है।

---

### उदाहरण JSON ऑब्जेक्ट (Example JSON Object)

यहाँ `versions.json` में एक एंट्री का उदाहरण दिया गया है:

```json
{
  "version": {
    "new": "0.5.2",
    "old": "0.5.1",
    "bump": "patch"
  },
  "versionId": "VRN000000000132",
  "commit": {
    "hash": {
      "long": "b3b29333dd8ce457a971690616d0cb377ac62343",
      "short": "b3b2933"
    },
    "author": {
      "name": "ＭＲ.ＳＡＮＴＯＳＨ",
      "userName": "iamskdev"
    },
    "branch": {
      "name": "main",
      "url": "https://github.com/iamskdev/mstore.com/tree/main"
    }
  },
  "type": "improve",
  "scope": "fallbackUrl",
  "subject": "Implement fallback URL for seamless domain transitions",
  "revertedCommit": null,
  "changes": {
    "added": [
      "`fallback` field in source/settings/config.json.",
      "Fallback URL handling logic in main.js."
    ],
    "fixed": [],
    "improved": [
      "Prevents \"page not found\" errors.",
      "Supports domain and path changes.",
      "Maintains backward compatibility.",
      "Enhances overall user experience."
    ]
  },
  "breakingChanges": [],
  "notes": [],
  "tags": [],
  "tickets": [],
  "metadata": {
    "environment": "development",
    "releaseChannel": "alpha"
  },
  "status": "deployed",
  "audit": {
    "createdBy": "Santosh",
    "createdAt": "2025-09-08T18:02:38Z",
    "deployedAt": "2025-09-09T08:54:40Z",
    "deployedBy": "Santosh"
  }
}
```

---

### फ़ील्ड की परिभाषाएं (Field Definitions)

#### मुख्य ऑब्जेक्ट (Root Object)

-   **`version`** (`object`): सिमेंटिक वर्जनिंग (SemVer) का पालन करता है।
    -   `new` (`string`): नया वर्शन नंबर (जैसे, "0.5.2")।
    -   `old` (`string`): पिछला वर्शन नंबर।
    -   `bump` (`string`): वर्शन में किस प्रकार का बम्प हुआ (`patch`, `minor`, `major`)।
-   **`versionId`** (`string`): प्रत्येक एंट्री के लिए एक यूनिक, अनुक्रमिक आईडी (जैसे, `VRN000000000132`)
-   **`commit`** (`object`): इस वर्शन से जुड़े Git कमिट का विवरण।
    -   `hash` (`object`): कमिट हैश।
        -   `long` (`string`): पूरा Git कमिट हैश।
        -   `short` (`string`): छोटा 7-वर्णों का हैश।
    -   `author` (`object`): कमिट के लेखक का विवरण।
        -   `name` (`string`): लेखक का नाम।
        -   `userName` (`string`): लेखक का यूज़रनेम।
    -   `branch` (`object`): Git ब्रांच का विवरण।
        -   `name` (`string`): ब्रांच का नाम।
        -   `url` (`string`): ब्रांच का URL।
-   **`type`** (`string`): कमिट का प्रकार (जैसे, `feat`, `fix`, `improve`, `chore`, `docs` आदि)।
-   **`scope`** (`string` | `null`): कमिट के दायरे का वर्णन करता है (जैसे, `auth`, `cart`, `header`)।
-   **`subject`** (`string`): कमिट मेसेज की मुख्य पंक्ति।
-   **`revertedCommit`** (`string` | `null`): यदि यह एक रिवर्ट कमिट है, तो यह उस कमिट का हैश संग्रहीत करता है जिसे रिवर्ट किया गया था।
-   **`changes`** (`object`): परिवर्तनों का विस्तृत विवरण।
    -   `added` (`array`): नई जोड़ी गई सुविधाओं की सूची।
    -   `fixed` (`array`): ठीक किए गए बग्स की सूची।
    -   `improved` (`array`): मौजूदा सुविधाओं में किए गए सुधारों की सूची।
-   **`breakingChanges`** (`array`): यदि कोई ब्रेकिंग चेंज है, तो उसका विवरण यहाँ होता है।
-   **`notes`** (`array`): अतिरिक्त नोट्स या टिप्पणियाँ।
-   **`tags`** (`array`): त्वरित फ़िल्टरिंग के लिए टैग्स (जैसे, `ui`, `backend`)
-   **`tickets`** (`array`): संबंधित टिकट आईडी (जैसे, `JIRA-123`)।
-   **`metadata`** (`object`): वर्शन के बारे में मेटा-डेटा।
    -   `environment` (`string`): डिप्लॉयमेंट का वातावरण (`development`, `production` आदि)।
    -   `releaseChannel` (`string`): रिलीज़ चैनल (`alpha`, `beta`, `stable`)
-   **`status`** (`string`): वर्शन की स्थिति (`pending`, `deployed`, `reverted`)
-   **`audit`** (`object`): ऑडिटिंग और ट्रैकिंग के लिए जानकारी।
    -   `createdBy` (`string`): इस एंट्री को बनाने वाले का नाम।
    -   `createdAt` (`string` - ISO 8601): एंट्री बनाने का समय।
    -   `deployedAt` (`string` | `null` - ISO 8601): डिप्लॉयमेंट का समय।
    -   `deployedBy` (`string` | `null`): डिप्लॉय करने वाले का नाम।

---

### महत्वपूर्ण नोट्स (Important Notes)

-   **डेटा स्रोत (Data Source):** `versions.json` सत्य का स्रोत (source of truth) है और इसे Git रिपॉजिटरी में ट्रैक किया जाता है।
-   **डिस्प्ले (Display):** `source/settings/config.json` में मौजूद `app.version` का उपयोग ऐप के UI में (जैसे ड्रॉअर के फुटर में) वर्तमान वर्शन को प्रदर्शित करने के लिए किया जाता है।
-   **मैन्युअल बदलाव (Manual Changes):** `versioner.js` द्वारा प्रबंधित किसी भी फाइल (`versions.json`, `CHANGELOG.md`, `config.json`) में मैन्युअल रूप से बदलाव करने से बचें, क्योंकि स्वचालन आपके परिवर्तनों को ओवरराइट कर सकता है।
