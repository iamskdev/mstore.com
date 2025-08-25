// notification-view.js

const tabMapping = {
  promotional: "offers",
  reminder: "reminders",
  system: "system",
  transactional: "orders",   // alerts ke liye
  order_update: "orders"     // alerts ke liye
};

// Utility: create notification card
function createNotificationCard(item, type = "campaign") {
  const content = item.content || {};
  const icon = content.richContent?.icon ? `<i class="${content.richContent.icon}"></i>` : "🔔";
  const image = content.richContent?.image ? `<img src="${content.richContent.image}" class="notification-img" />` : "";
  const time = item.meta?.createdAt || item.meta?.schedule?.sendAt || new Date().toISOString();

  // CTA buttons
  let ctas = "";
  if (content.cta && content.cta.length > 0) {
    ctas = `<div class="notification-cta">
              ${content.cta.map(c => `<a href="${c.url}" class="btn ${c.type}">${c.label}</a>`).join("")}
            </div>`;
  }

  return `
    <div class="notification-card">
      <div class="notification-icon">${icon}</div>
      <div class="notification-info">
        <h4 class="notification-title">${content.title || "No Title"}</h4>
        <div class="notification-message-wrapper">
          <p class="notification-message-content">${content.message || ""}</p>
          <button class="read-more-btn hidden">Read More</button>
        </div>
        ${image}
        <span class="notification-time">${new Date(time).toLocaleString()}</span>
        ${ctas}
      </div>
    </div>
  `;
}

// Render data into tabs
function renderNotifications(campaigns, alerts) {
  const allTab = document.querySelector("#all");
  const tabPanels = document.querySelectorAll(".tab-panel");

  // Clear old
  tabPanels.forEach(panel => panel.innerHTML = "");

  // Combine campaigns + alerts
  const allItems = [
    ...campaigns.map(c => ({...c, _src: "campaign"})),
    ...alerts.map(a => ({...a, _src: "alert"}))
  ];

  allItems.forEach(item => {
    let category;

    if (item._src === "campaign") {
      category = tabMapping[item.meta?.type] || "offers";
    } else {
      category = tabMapping[item.meta?.category] || "orders";
    }

    const html = createNotificationCard(item, item._src);

    // Add to respective tab
    const panel = document.querySelector(`#${category}`);
    if (panel) panel.innerHTML += html;

    // Add to "all"
    allTab.innerHTML += html;
  });

  // After rendering, initialize expand/collapse for all cards
  initializeExpandCollapse();
}

// Load JSON
async function loadData() {
  try {
    const [campRes, alertRes] = await Promise.all([
      fetch("campaigns.json"),
      fetch("alerts.json")
    ]);

    const campaigns = await campRes.json();
    const alerts = await alertRes.json();

    renderNotifications(campaigns, alerts);

  } catch (err) {
    console.error("Error loading notifications:", err);
  }
}

// Tabs switch logic
// Main initialization function for this view
export function init() {
  // loadData(); // Removed real data fetching
  addDummyNotifications();

  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const currentActiveBtn = document.querySelector(".tab-btn.active");
      if (currentActiveBtn) {
        currentActiveBtn.classList.remove("active");
      }
      btn.classList.add("active");

      const target = btn.dataset.tab;
      const currentActivePanel = document.querySelector(".tab-panel.active");
      if (currentActivePanel) {
        currentActivePanel.classList.remove("active");
      }
      document.querySelector(`#${target}`).classList.add("active");

      // Re-initialize expand/collapse when tabs switch
      initializeExpandCollapse();
    });
  });

  // Swipe functionality
  const notificationContent = document.querySelector(".notification-content");
  let startX = 0;
  let startY = 0; // Added
  let currentX = 0;
  let currentY = 0; // Added
  let isSwiping = false;

  notificationContent.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY; // Added
    isSwiping = true;
  });

  notificationContent.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    currentX = e.touches[0].clientX;
    currentY = e.touches[0].clientY; // Added
  });

  notificationContent.addEventListener('touchend', () => {
    if (!isSwiping) return;
    isSwiping = false;

    const diffX = currentX - startX;
    const diffY = currentY - startY; // Added
    const swipeThreshold = 50; // pixels

    // Only trigger if horizontal swipe is dominant and exceeds threshold
    if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) { // Modified condition
      const activeTabBtn = document.querySelector(".tab-btn.active");
      const tabBtns = Array.from(document.querySelectorAll(".tab-btn"));
      const currentIndex = tabBtns.indexOf(activeTabBtn);

      if (diffX < 0) { // Swiped left (next tab)
        const nextIndex = (currentIndex + 1) % tabBtns.length;
        tabBtns[nextIndex].click();
      } else { // Swiped right (previous tab)
        const nextIndex = (currentIndex - 1 + tabBtns.length) % tabBtns.length;
        tabBtns[nextIndex].click();
      }
    }
  });
}

const dummyCampaigns = [
  {
    content: {
      title: "Welcome Offer!",
      message: "Get 10% off on your first purchase. This is a long message to test the expand/collapse functionality. It should span multiple lines and then be truncated. Click 'Read More' to see the full content.",
      richContent: { icon: "fas fa-gift" },
      cta: [{ label: "Shop Now", url: "#/user/explore", type: "primary" }]
    },
    meta: { type: "promotional" }
  },
  {
    content: {
      title: "New Feature Alert",
      message: "Check out our new dark mode! It's sleek, modern, and easy on the eyes. We've worked hard to bring you this new experience. Enjoy!",
      richContent: { icon: "fas fa-moon" }
    },
    meta: { type: "system" }
  },
  {
    content: {
      title: "Flash Sale: Electronics",
      message: "Don't miss out on our limited-time flash sale on all electronics! Up to 50% off on smartphones, laptops, and accessories. Grab yours before they're gone!",
      richContent: { icon: "fas fa-bolt" },
      cta: [{ label: "Shop Electronics", url: "#/user/electronics", type: "secondary" }]
    },
    meta: { type: "promotional" }
  },
  {
    content: {
      title: "App Update Available",
      message: "A new version of Apna Store is available with performance improvements and bug fixes. Update now for a smoother shopping experience!",
      richContent: { icon: "fas fa-mobile-alt" }
    },
    meta: { type: "system" }
  },
  {
    content: {
      title: "Exclusive Deal for You!",
      message: "As a valued customer, enjoy an exclusive 20% discount on all fashion items this week. Use code FASHION20 at checkout. Limited stock!",
      richContent: { icon: "fas fa-percent" },
      cta: [{ label: "Explore Fashion", url: "#/user/fashion", type: "primary" }]
    },
    meta: { type: "promotional" }
  },
  {
    content: {
      title: "Security Notice: Password Reset",
      message: "We've detected unusual activity on your account. For your security, please reset your password immediately. If this wasn't you, contact support.",
      richContent: { icon: "fas fa-exclamation-triangle" },
      cta: [{ label: "Reset Password", url: "#/user/reset-password", type: "danger" }]
    },
    meta: { type: "system" }
  }
];

const dummyAlerts = [
  {
    content: {
      title: "Order #5678 Confirmed",
      message: "Your order has been successfully placed and will be delivered within 3-5 business days. You will receive another notification when it's out for delivery.",
      richContent: { icon: "fas fa-check-circle" }
    },
    meta: { category: "order_update" }
  },
  {
    content: {
      title: "Reminder: Pay Bill",
      message: "Your electricity bill is due tomorrow, August 26, 2025. Please make the payment to avoid late fees. You can pay through the app or our website.",
      richContent: { icon: "fas fa-bell" }
    },
    meta: { category: "reminder" }
  },
  {
    content: {
      title: "Price Drop: Your Wishlist Item",
      message: "Good news! The 'Smartwatch X' from your wishlist just dropped in price. Don't miss this chance to get it at a lower price!",
      richContent: { icon: "fas fa-tag" },
      cta: [{ label: "View Item", url: "#/user/wishlist/item/smartwatch-x", type: "primary" }]
    },
    meta: { category: "promotional" } // Assuming promotional alerts can also be in alerts.json
  },
  {
    content: {
      title: "Delivery Update: Order #1234",
      message: "Your order #1234 is out for delivery and expected to arrive today between 2 PM and 4 PM. Please ensure someone is available to receive it.",
      richContent: { icon: "fas fa-truck" }
    },
    meta: { category: "order_update" }
  },
  {
    content: {
      title: "New Message from Support",
      message: "You have a new message from our support team regarding your recent inquiry. Please check your inbox for details.",
      richContent: { icon: "fas fa-envelope" },
      cta: [{ label: "View Message", url: "#/user/messages", type: "secondary" }]
    },
    meta: { category: "system" } // Assuming system alerts can also be in alerts.json
  },
  {
    content: {
      title: "Low Stock Alert: Milk",
      message: "Your favorite milk brand is running low on stock! Order now to ensure you don't run out.",
      richContent: { icon: "fas fa-box-open" },
      cta: [{ label: "Order Now", url: "#/user/dairy", type: "primary" }]
    },
    meta: { category: "reminder" }
  }
];

function addDummyNotifications() {
  renderNotifications(dummyCampaigns, dummyAlerts);
}

function initializeExpandCollapse() {
  document.querySelectorAll('.notification-card').forEach(card => {
    const messageContent = card.querySelector('.notification-message-content');
    const readMoreBtn = card.querySelector('.read-more-btn');

    if (!messageContent || !readMoreBtn) return; // Ensure elements exist

    // Check if content overflows
    if (messageContent.scrollHeight > messageContent.clientHeight) {
      readMoreBtn.classList.remove('hidden');
      readMoreBtn.textContent = 'Read More';
    } else {
      readMoreBtn.classList.add('hidden');
    }

    readMoreBtn.addEventListener('click', (event) => { // Added event parameter
      event.stopPropagation(); // Stop propagation for read more button
      const isExpanded = card.classList.toggle('expanded');
      readMoreBtn.textContent = isExpanded ? 'Read Less' : 'Read More';
    });

    // Add click listener to the card itself to stop propagation
    card.addEventListener('click', (event) => { // Added event parameter
      event.stopPropagation(); // Stop propagation for the notification card
    });
  });
}