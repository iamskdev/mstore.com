import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Read serviceAccountKey.json via fs
const serviceKeyPath = path.join(__dirname, '../data/serviceAccountKey.json');
const serviceKeyJSON = await fs.readFile(serviceKeyPath, 'utf-8');
const serviceAccount = JSON.parse(serviceKeyJSON);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// ✅ Read items.json
const itemsPath = path.join(__dirname, '../../localstore/jsons/items.json');
const itemsData = await fs.readFile(itemsPath, 'utf-8');
const items = JSON.parse(itemsData);

// ✅ Upload
for (const item of items) {
  const docRef = db.collection('items').doc(item.itemId);
  await docRef.set(item);
  console.log(`✅ Uploaded: ${item.itemId}`);
}

console.log('🎉 All items uploaded!');