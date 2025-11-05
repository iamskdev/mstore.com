> **DOCUMENT AUDIT**
> - **Status:** `Updated`
> - **Last Reviewed:** 02/10/2025 21:31:00 IST
> - **Reviewer:** Santosh (with Gemini)
> - **Purpose:** This document explains how to set up and use the Firebase Emulator Suite for local development and testing.

---

# 0. Firebase CLI इंस्टॉल करें (एक बार की प्रक्रिया)

एम्युलेटर का उपयोग करने से पहले, आपको अपने कंप्यूटर पर Firebase CLI (कमांड-लाइन इंटरफ़ेस) इंस्टॉल करना होगा।

1.  एक नया टर्मिनल या PowerShell खोलें।
2.  यह कमांड चलाएँ:
    ```bash
    npm install -g firebase-tools
    ```
3.  इंस्टॉलेशन के बाद, टर्मिनल को पुनरारंभ करें और `firebase --version` चलाकर सत्यापित करें। यदि यह संस्करण संख्या दिखाता है, तो आप तैयार हैं।

---

# Firebase Emulator Suite का उपयोग कैसे करें

## ⚠️ पूर्वापेक्षाएँ (Prerequisites)

Firebase एम्युलेटर (विशेषकर Firestore) को चलाने के लिए **Java** की आवश्यकता होती है। यदि आपके कंप्यूटर पर Java इंस्टॉल नहीं है, तो आपको `firebase emulators:start` चलाते समय एक एरर मिलेगा।

1.  **Java डाउनलोड करें:** Adoptium (Eclipse Temurin) JDK वेबसाइट पर जाएँ।
    -   **Operating System:** Windows
    -   **Architecture:** x64
    -   **Version:** 17 (LTS) या 21 (LTS) चुनें।
    -   `.msi` फ़ाइल डाउनलोड करें।
2.  **Java इंस्टॉल करें:** डाउनलोड की गई `.msi` फ़ाइल चलाएँ। इंस्टॉलेशन के दौरान, जब आप "Custom Setup" स्क्रीन पर पहुँचें, तो सुनिश्चित करें कि आप इन दो विकल्पों को सक्षम करते हैं:
    -   `Add to PATH`
    -   `Set JAVA_HOME variable`
2.  **सत्यापित करें:** इंस्टॉलेशन के बाद, एक **नया** टर्मिनल खोलें और `java -version` चलाएँ। यदि यह संस्करण की जानकारी दिखाता है, तो आप तैयार हैं।

यह गाइड आपको अपने कंप्यूटर पर स्थानीय रूप से Firebase सेवाओं (Firestore, Auth, आदि) को चलाने के लिए Firebase Emulator Suite को सेट अप करने और उपयोग करने का तरीका बताती है। यह आपको बिना लाइव डेटा को छुए या कोई पैसा खर्च किए तेजी से विकास और परीक्षण करने की अनुमति देता है।

---

## 1. सेटअप (एक बार की प्रक्रिया)

यदि आपने पहले से एम्युलेटर सेट अप नहीं किया है, तो अपने प्रोजेक्ट की रूट डायरेक्टरी में टर्मिनल खोलें और यह कमांड चलाएँ:

```bash
firebase init emulators
```

यह आपसे कुछ सवाल पूछेगा:

1.  **"Which emulators do you want to set up?"**
    -   `Authentication Emulator` चुनें।
    -   `Firestore Emulator` चुनें।
    -   `Functions Emulator` चुनें।
    -   `Hosting Emulator` चुनें।
    -   (स्पेसबार से चुनें, एरो की (arrow keys) से ऊपर-नीचे जाएँ, और एंटर दबाएँ)।

2.  **"Which port do you want to use for the... Emulator?"**
    -   सभी के लिए डिफ़ॉल्ट पोर्ट का उपयोग करने के लिए बस एंटर दबाते रहें।

3.  **"Would you like to enable the Emulator UI?"**
    -   `Yes` चुनें। यह बहुत उपयोगी है।

4.  **"Would you like to download the emulators now?"**
    -   `Yes` चुनें।

यह आपके प्रोजेक्ट में `firebase.json` और `.firebaserc` जैसी कुछ कॉन्फ़िगरेशन फाइलें बनाएगा।

---

## 2. ऐप को कनेक्ट करना

आपको अपने वेब ऐप को यह बताना होगा कि वह लाइव फायरबेस के बजाय स्थानीय एम्युलेटर से कनेक्ट हो। यह `/source/firebase/firebase-config.js` में किया जाता है। मैंने यह बदलाव आपके लिए पहले ही कर दिया है।

जब `source/settings/config.json` में `source.data` को `'emulator'` पर सेट किया जाता है, तो ऐप स्वचालित रूप से एम्युलेटर से कनेक्ट हो जाएगा।

---

## 3. एम्युलेटर चलाना

विकास शुरू करने से पहले, एक नया टर्मिनल खोलें और यह कमांड चलाएँ:

```bash
firebase emulators:start
```

यह आपके स्थानीय फायरबेस सेवाओं को शुरू कर देगा। आपको टर्मिनल में एक लिंक दिखाई देगा (आमतौर पर `http://localhost:4000`) जहाँ आप **Emulator UI** देख सकते हैं। इस UI में, आप अपने स्थानीय डेटाबेस को देख सकते हैं, उपयोगकर्ताओं को प्रबंधित कर सकते हैं, और नियमों का परीक्षण कर सकते हैं।

---

## 4. आपका वर्कफ़्लो

1.  एक टर्मिनल में `firebase emulators:start` चलाएँ।
2.  दूसरे टर्मिनल में, अपना स्थानीय वेब सर्वर (जैसे VS Code Live Server) शुरू करें।
3.  अपने ऐप पर काम करें। सभी डेटा स्थानीय रूप से सहेजा और पढ़ा जाएगा।
4.  जब आप अपने बदलावों से खुश हों, तभी `firebase deploy` का उपयोग करके उन्हें लाइव करें।
