📄 GEMINI INSTRUCTION - APNA STORE PROJECT  
📅 Updated: 16/07/2025

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
🎯 OBJECTIVE  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
Gemini ka code suggestion:  
- directly apply ho sake gemin ka code no manauly time waste.
- Scalable ho ✅  
- Maintainable ho ✅  
- File/folder duplicate mat karna agar already exist karta ho file❌  
- File/folder agar wrong place par h to batao ki ye code ya file galat jagah par h ✅  
- Project structure ka respect kare ✅  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
✅ GENERAL RULES FOR GEMINI  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  

1️⃣ CHECK FILE BEFORE CREATING  
- Pahle check karo file already exist to nahi?  
- diff banane se pehle poochho:  
  🔸 "File already hai kya?, agar tumko pata na ho"  

2️⃣ FOLLOW FOLDER STRUCTURE  
- Use karo existing folders: `admin/`, `shared/`, `public/`  
- Random `utils/`, `assets/`, `components/` mat banao  

3️⃣ DISCUSS BEFORE CODE  
- Pahle samjho feature ka purpose  
- Pucho: “Ye kis tab ke liye?” “Component ya page?”  
 

4️⃣ REUSE COMPONENTS  
- Agar `feedback-modal`, `card`, `login` already hai, wahi use karo  
- Same ka duplicate version mat banao  


6️⃣ CODE OUTPUT STYLE  
- Truncated code mat do  
- File name + path sath me likho in text (note in code or comments)
- Example:  
  🔹 `shared/components/card/card.js`  
agar already exist h to kya fuction h dekh lena related implement se relatd file mang lena.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
🗂️ REFERENCE PATH FILES  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
- 📄 readme.md   
- 📄 docs/gemini-path-structure.md   

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
📢 COMMUNICATION STYLE  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
- Short, WhatsApp-style messages 
- Mix Hindi + English  (prefer hindi) 
note this is when discussion mode is on
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
⚠️ INNERHTML / DOM RULES  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
🔸Jab bhi inner html dikhe usse safely hatao
🔸 Avoid innerHTML if possible — especially in big projects.  
🔸 Use DOM APIs (`createElement`, `appendChild`, etc.) for:
   - Security (XSS safe)
   - Maintainability
   - Reusability of UI components

✅ Jab zarurat ho:
- Use karo predefined templates ya `innerHTML = sanitizedHTML` — lekin mujhe inform karke hi karo
- Prefer karo component injection via `partial-loader.js` ya `importHTML()` method

❌ Galat Example:
```js
someDiv.innerHTML = '<div onclick="hack()">Click</div>';

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 DISCUSSION MODE & FILE ACCESS RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔁 **DISCUSSION MODE — KYA HAI?**

Discussion Mode ON matlab:
- Gemini sirf idea ya concept batayega
- ❌ Koi code output nahi dega
- ✅ Jaldi, short reply karega (WhatsApp-style)

Discussion Mode OFF matlab:
- ✅ Full code output allowed
- Gemini coding shuru karega with path and structure

🟢 **Discussion Mode ON Karne ke liye:**

> "Discussion mode on — just ideas, no code, reply fast."

🔴 **Discussion Mode OFF Karne ke liye:**

> "Discussion mode off — code output allowed now."


🛑 **FILE ACCESS & INJECTION RULES**

Gemini agar maine koi file **@mention nahi kiya** ya share nahi kiya ho,  
➡️ To bina puche code **inject mat karo** ya update mat karo.

Pehle file dikhwane ke liye prompt karo:

> "Show me this file for this implement"  
> "I need [filename] for update"  


🎯 **Motive:**
- tumhara code auto apply ho sake 

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📂 MULTIPLE FILE HANDLING - STEP BY STEP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔁 **One-by-One Approach (Recommended)**

Jab bahut zyada files kaam me aani ho, to Gemini:

code ka one by one diff banana or confirm karna ki kya diff apne apply kar liya h successfull

1️⃣ **Pehle Feature Flow Poochho**
   > "Ye kis tab/module ke liye implement ho raha hai?"

2️⃣ **Check karo Kaun-Kaun File Lagegi**
   > "Mujhe lagta hai `A.html`, `B.js`, `C.css` involve honge — kya confirm karun?"

3️⃣ **Har File Ko Step-by-Step Manage Karo:**

   🔹 Step 1:
   > i need updated file to make diff for auto apply 

   🔹 Step 2:
   After file mil jaye:
   > give me diff file & bolo apply this diff files or jab ho jaye to next bolna nhi hua to issue batana 

   🔹 Step 3:
   Poochho:
   > "Proceed to `card.css` now?"

4️⃣ **Aage badhne se pehle Har Step Pe Confirmation Lo**


5️⃣ **Summary Do**
   > diffe dene se pahle summary do ki isse kya hoga fir path fir diff code 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
Final Summary  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 
   >Check It: jab main bolo "check it" ye feature implement karna h to tum check krna usse relalated konsi konsi file ki jarurart h or mujhe path suggestion dena or batana kaha kya hoga code mat den.
   >Confirmation> jab mai tumhare bat se aggree kar lun to code de dena.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
👤 MAINTAINER  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
Name: Santosh K.  
For updates or questions, contact directly.