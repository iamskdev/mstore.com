# How to Extend the Item Card Component

यह गाइड बताती है कि आइटम कार्ड में नई जानकारी कैसे जोड़ें, जैसे कि डिस्काउंट बैज या टैग।

कार्ड कंपोनेंट को आसानी से बढ़ाने लायक बनाया गया है। नई जानकारी जोड़ने के लिए आपको इन चार चरणों का पालन करना होगा:

1.  **डेटा सोर्स को अपडेट करें** (`items.json`)
2.  **HTML टेम्पलेट को अपडेट करें** (`card.html`)
3.  **कार्ड बनाने वाले लॉजिक को अपडेट करें** (`card.js`)
4.  **नई स्टाइल जोड़ें** (`card.css`)

### उदाहरण: कार्ड में "Discount Badge" जोड़ना

चलिए एक उदाहरण देखते हैं जहाँ हम एक डिस्काउंट बैज जोड़ेंगे जो दिखाएगा कि आइटम पर कितने प्रतिशत की छूट है।

---

### Step 1: डेटा सोर्स को अपडेट करें (`items.json`)

सबसे पहले, अपने `items.json` फ़ाइल में उस आइटम में एक नया फ़ील्ड जोड़ें जिसे आप अपडेट करना चाहते हैं। हम `discountPercentage` नाम का एक फ़ील्ड जोड़ेंगे।

```json
{
  "id": "item_015",
  "type": "product",
  "name": "Amul Butter 500g",
  "price": 270,
  "mrp": 290,
  "discountPercentage": 7,
  "available": true,
  "images": ["amul-butter.jpg"],
  "shortDescription": "Amul Butter 500g Pack",
  "description": "Creamy and delicious Amul Butter for your breakfast."
}
```

---

### Step 2: HTML टेम्पलेट को अपडेट करें (`card.html`)

अब, `shared/components/card/card.html` में नए डेटा के लिए एक प्लेसहोल्डर जोड़ें। हमने पहले ही इमेज के चारों ओर एक रैपर (`item-card-image-wrapper`) बना दिया है, इसलिए अब हम आसानी से बैज जोड़ सकते हैं।

```html
<!-- File: shared/components/card/card.html -->

<div class="item-card-image-wrapper">
  <img 
    src="{{IMAGE_SRC}}" 
    alt="{{ITEM_NAME}}" 
    class="item-card-img" 
    onerror="this.src='{{DEFAULT_IMAGE_SRC}}'" 
  />
  <!-- New Discount Badge Placeholder -->
  <div class="discount-badge">{{DISCOUNT_BADGE}}</div>
</div>
```
*नोट: आपको यह कोड `card.html` में `item-card-image-wrapper` के अंदर डालना होगा।*

---

### Step 3: कार्ड बनाने वाले लॉजिक को अपडेट करें (`card.js`)

`shared/components/card/card.js` में, `createItemCard` फंक्शन को अपडेट करें ताकि यह नए डेटा को पढ़ सके और HTML में डाल सके।

```javascript
// File: shared/components/card/card.js

export async function createItemCard(item, context = '') {
  // ... (existing code to get template and set up variables)

  const cardNode = await getCardTemplate();
  const cardElement = cardNode.cloneNode(true);

  // ... (existing code for href, image, name, price, etc.)

  // --- NEW: Handle Discount Badge ---
  const discountBadgeEl = cardElement.querySelector('.discount-badge');
  if (discountBadgeEl && item.discountPercentage && item.discountPercentage > 0) {
    // Round the number and add the text
    discountBadgeEl.textContent = `${Math.round(item.discountPercentage)}% OFF`;
    // Make sure the badge is visible
    discountBadgeEl.style.display = 'block';
  } else if (discountBadgeEl) {
    // If there's no discount, hide the badge element
    discountBadgeEl.style.display = 'none';
  }
  // --- END NEW ---

  // ... (existing code for stock status, click listener, etc.)

  return cardElement;
}
```

---

### Step 4: नई स्टाइल जोड़ें (`card.css`)

अंत में, `shared/components/card/card.css` में नए `.discount-badge` के लिए स्टाइल जोड़ें।

```css
/* File: shared/components/card/card.css */

/* Style the new badge */
.discount-badge {
  position: absolute;
  top: 6px;
  left: -4px; /* A little offset for style */
  background-color: var(--error-color);
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
  z-index: 1;
  box-shadow: 1px 1px 3px rgba(0,0,0,0.3);
  transform: rotate(-10deg); /* Tilted effect */
  display: none; /* Hide by default */
}
```

इन चरणों का पालन करके, आप भविष्य में कार्ड में कोई भी नई जानकारी आसानी से जोड़ सकते हैं।