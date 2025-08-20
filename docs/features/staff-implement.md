📌 Staff User Implementation Plan – ApnaStore

🧩 Objective:
Allow merchants (admin role) to create and manage staff accounts under their business.

🔐 Structure:
Each staff account is a separate user object with a unique login, but linked to its parent merchant via:
  - "linkedTo": "merchant_userId"

🔄 Switching Strategy (Planned):
- Enable fast switch between main (merchant) and staff accounts using:
  - Session switcher UI
  - Secure PIN or re-auth confirmation
  - Contextual store lock to avoid cross-shop actions

📁 Sample User Object:
{
  "userId": "USR00000003",
  "name": "Ankit Staff",
  "role": "staff",
  "linkedTo": "USR00000002", // merchant userId
  ...
}

🎯 Future Features:
- Staff permission levels (view-only, edit, orders)
- Activity tracking per staff
- Merchant dashboard to manage all staff

🛠️ Notes:
- Staff should not modify `merchantId`, only inherit context.
- Logout or switch must reset store session context.

💡 Implementation Phase:
1. Backend logic and JSON support ✅
2. Staff creation form (Admin panel) 🔄
3. Session switch UI (optional) 🔄

— Team ApnaStore