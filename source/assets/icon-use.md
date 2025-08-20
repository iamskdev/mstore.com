==============================
SVG LOAD USING JS (DOMParser)
==============================

✅ HOW TO USE:

1. Keep all SVG files in a folder like: /assets/icons/
2. In your HTML, add a div with class and data-src:
   <div class="svg-icon" data-src="/assets/icons/share.svg"></div>

3. Add this JS to fetch and inject the SVG:
--------------------------------------------------
<script>
  document.querySelectorAll('.svg-icon').forEach(div => {
    const src = div.dataset.src;
    fetch(src)
      .then(res => res.text())
      .then(text => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(text, "image/svg+xml");
        const svg = svgDoc.querySelector('svg');
        if (svg) div.appendChild(svg);
      });
  });
</script>
--------------------------------------------------

✅ ADVANTAGES:

- ✔ HTML stays clean and readable
- ✔ SVG gets fully inlined, so you can style with CSS:
      e.g., fill, stroke, hover effects
- ✔ Easily reusable: Just change data-src path
- ✔ Safe approach: no use of innerHTML (avoids XSS risk)
- ✔ Lightweight — no external libraries needed
- ✔ Works offline if SVGs are local
- ✔ Better than <img> tag because:
      - SVG is accessible to screen readers
      - CSS/JS can animate it

⚠️ DISADVANTAGES:

- ❌ Requires JavaScript to be enabled
- ❌ Adds 1 fetch (HTTP request) per icon
      (but you can cache it to avoid this)
- ❌ No built-in fallback if fetch fails
- ❌ Slightly slower on first load vs <img src="...">
- ❌ Cannot use sprite-sheet optimization
      (where multiple icons are combined in one SVG)

💡 TIPS FOR BEST USAGE:

1. 📦 **Pre-cache SVGs using Service Worker**
   - In your service worker (if using PWA):
     Pre-cache the /assets/icons/ folder so that fetch() works offline.
   - This ensures icons load instantly even without internet.

2. 🛑 **Add fallback icon in case fetch fails**
   - Modify JS:
     ```
     .catch(err => {
       console.warn("SVG load failed:", err);
       div.innerHTML = '<svg><use href="#default-icon" /></svg>';
     });
     ```
   - Or simply add a default SVG inline beforehand (hidden) and reuse.

3. 🎯 **Use consistent class names like `svg-icon`, `icon-btn`, `icon-small`**
   - Helps style all icons together with a few CSS rules.

4. ⚡ **Performance Tip:**
   - Load critical icons (like menu, back) inline directly in HTML.
   - Lazy-load less important icons using this method.

5. 🎨 **Use CSS to customize SVG:**
   - Example:
     ```
     .svg-icon svg {
       width: 24px;
       height: 24px;
       fill: currentColor;
     }
     ```
   - Icons will match surrounding text or button color automatically.

6. 🔐 **Security Tip:**
   - Only load trusted local SVGs (no user-uploaded ones).
   - Never allow dynamic user-controlled URLs in data-src.

7. 🧩 **Organize icons in subfolders**
   - Example:
     /assets/icons/social/facebook.svg
     /assets/icons/ui/menu.svg
     /assets/icons/brand/logo.svg

8. 🚫 **Don’t overuse SVG fetch for hundreds of icons**
   - For big icon sets, better to use SVG sprite technique.