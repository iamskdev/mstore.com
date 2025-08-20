# 🔥 Firebase Field Injector (Single File Full Setup)

Is script ka use Firestore ke existing documents me **ek ya zyada fields auto inject** karne ke liye hota hai. Useful for test data tagging (`isMock: true`), environment labels (`env: "staging"`), audit fields, etc.

---

## 📁 Directory Structure

```
firebase/
├── data/
│   └── field-inject.json          ← Injection config (fields + collections)
├── scripts/
│   └── firebase-field-inject.js   ← Injection script (run this)
├── serviceAccountKey.json         ← Firebase admin key (add manually)
```

---

## 🧩 Step 1: field-inject.json

```json
{
  "collections": ["items", "users", "merchants", "promotions", "orders", "units", "price-logs"],
  "fields": {
    "isMock": true
  },
  "applyTo": "all"
}
```

- `"fields"`: Jo fields inject karni hai
- `"collections"`: Kin collections me inject karna hai

---

## ⚙️ Step 2: firebase-field-inject.js

```js
// Path: firebase/scripts/firebase-field-inject.js

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccount = require("./serviceAccountKey.json");
const configPath = path.join(__dirname, "../data/field-inject.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function injectFields() {
  console.log("🚀 Firebase Admin SDK initialized.");
  console.log("📦 Loading injection config...");

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const collections = config.collections || [];
  const fieldsToInject = config.fields || {};
  const applyTo = config.applyTo || "all"; // default: all

  for (const collectionName of collections) {
    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
      console.log(`⚠️ No documents found in collection: ${collectionName}`);
      continue;
    }

    console.log(`\n✏️ Updating documents in collection: "${collectionName}"...`);

    const batch = db.batch();
    let count = 0;

    snapshot.forEach((doc) => {
      const docRef = collectionRef.doc(doc.id);
      batch.update(docRef, fieldsToInject);
      count++;
    });

    await batch.commit();
    console.log(`✅ Injected ${count} document(s) in "${collectionName}".`);
  }

  console.log("\n🎉 Field injection completed for all collections.");
}

injectFields().catch((err) => {
  console.error("❌ Error injecting fields:", err);
});
```

---

## ▶️ Step 3: Run It

```bash
node firebase/scripts/firebase-field-inject.js
```

Make sure:
- `field-inject.json` is configured
- `serviceAccountKey.json` exists
- `firebase-admin` installed (`npm install firebase-admin`)

---

## 📌 Why `../` Twice in Path?

Script file is in:  
`firebase/scripts/firebase-field-inject.js`  
Config file is in:  
`firebase/data/field-inject.json`

So relative path from script → data = `../data/field-inject.json`  
Similarly service key is `.././serviceAccountKey.json`

---

## ✅ Sample Use Cases

| Purpose        | Field Injected                          |
|----------------|------------------------------------------|
| Mock Data Tag  | `"isMock": true`                        |
| Env Marking    | `"env": "staging"`                      |
| Created Marker | `"createdBy": "admin"`                 |
| Temp Disable   | `"visible": false`                      |

---

## ❓ FAQ

**Q. Script naye docs banata hai kya?**  
Nope, bas existing documents me field add/update karta hai.

**Q. Field already ho to kya?**  
Overwrite karega.

**Q. Future me naye field chahiye?**  
Bas JSON me field add karo, script dobara run karo.

**Q. Sirf ek collection me inject karna ho to?**  
`collections` array me sirf us collection ka naam likho.

---

## 🧠 Pro Tip

Multiple fields add karna ho to JSON me likh do:

```json
"fields": {
  "isMock": true,
  "env": "dev",
  "createdBy": "system"
}
```

---

## 🏁 Done!

Ab seedha copy-paste karo, folder banao, bas config set karo aur `node` se chala do 💥