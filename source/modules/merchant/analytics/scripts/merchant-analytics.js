// ===== HELPER FUNCTION =====
function getCSSVariable(variable) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
}

function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ===== INITIALIZATION =====
let anlsInitialized = false;
function initAnalytics() {
  if (anlsInitialized) return;
  anlsInitialized = true;
  initializeCharts();
  setupEventListeners();
  initializeAnimations();
}

// Make function globally available for add.js to call
window.initAnalytics = initAnalytics;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAnalytics);
} else {
  initAnalytics();
}

// ===== CHART FUNCTIONS =====
function initializeCharts() {
  // Sales Performance Chart
  const salesCtx = document.getElementById("anls-sales-chart");
  if (salesCtx) {
    new Chart(salesCtx.getContext("2d"), {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            data: [12000, 8000, 7500, 14000, 16000, 18000, 15000],
            borderColor: getCSSVariable("--analytics-chart-sales"),
            backgroundColor: hexToRgba(
              getCSSVariable("--analytics-chart-sales"),
              0.05
            ),
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            grid: {
              color:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--shadow-color")
                  .trim() || "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              callback: (value) => "₹" + value / 1000 + "k",
              maxTicksLimit: 5,
            },
          },
        },
      },
    });
  }

  // Revenue Trend Chart
  const revenueCtx = document.getElementById("anls-revenue-chart");
  if (revenueCtx) {
    new Chart(revenueCtx.getContext("2d"), {
      type: "line",
      data: {
        labels: ["1", "3", "7", "10", "14", "17", "21", "24", "28", "30"],
        datasets: [
          {
            data: [
              25000, 32000, 35000, 31000, 28000, 36000, 42000, 39000, 38000,
              41000,
            ],
            borderColor: getCSSVariable("--primary-color"),
            backgroundColor: hexToRgba(getCSSVariable("--primary-color"), 0.1),
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 5,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 6 },
          },
          y: {
            beginAtZero: false,
            ticks: {
              callback: (value) => "₹" + value / 1000 + "k",
              maxTicksLimit: 5,
            },
          },
        },
      },
    });
  }

  // Category Distribution Chart
  const categoryCtx = document.getElementById("anls-category-chart");
  if (categoryCtx) {
    new Chart(categoryCtx.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Electronics", "Clothing", "Home", "Books", "Others"],
        datasets: [
          {
            data: [35, 25, 20, 10, 10],
            backgroundColor: [
              getCSSVariable("--primary-color"),
              getCSSVariable("--success-color"),
              getCSSVariable("--warning-color"),
              getCSSVariable("--analytics-chart-sales"),
              getCSSVariable("--info-color"),
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 15,
              usePointStyle: true,
              font: { size: 11 },
            },
          },
        },
      },
    });
  }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Date range buttons
  const dateButtons = document.querySelectorAll(".anls-date-row .anls-btn");
  dateButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      dateButtons.forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      updateDateRange(this.dataset.range);
    });
  });

  // Chart type buttons
  const chartButtons = document.querySelectorAll(
    ".anls-chart-actions .anls-btn"
  );
  chartButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      chartButtons.forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      updateChartType(this.dataset.chart);
    });
  });

  // View All buttons
  const viewAllButtons = document.querySelectorAll(
    ".anls-table-header .anls-btn"
  );
  viewAllButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      showMoreData(
        this.closest(".anls-table-container").querySelector(".anls-table-title")
          .textContent
      );
    });
  });

  // Checkbox interaction
  const checkbox = document.querySelector('input[type="checkbox"]');
  if (checkbox) {
    checkbox.addEventListener("change", function () {
      if (this.checked) {
        showToast("Payment marked for follow-up");
      }
    });
  }
}

// ===== ANIMATIONS =====
function initializeAnimations() {
  // Animate chart bars on load
  setTimeout(() => {
    const chartBars = document.querySelectorAll(
      ".anls-chart-bar, .anls-chart-main-bar"
    );
    chartBars.forEach((bar) => {
      let targetSize, propertyToAnimate;

      // Determine target size and animation property based on bar type
      if (bar.closest(".anls-mini-chart")) {
        // Mini chart bars: target width is 75%
        targetSize = "75%";
        propertyToAnimate = "width";
        bar.style.width = "0%";
      } else if (bar.closest(".anls-chart-bar-container")) {
        // Inventory chart bars: target width is 60.4%
        targetSize = "60.4%";
        propertyToAnimate = "width";
        bar.style.width = "0%";
      } else {
        // Other bars
        targetSize = bar.style.width || bar.style.height || "0";
        propertyToAnimate = "width";
        bar.style.width = "0";
      }

      setTimeout(() => {
        bar.style.transition = "all 1s ease";
        bar.style[propertyToAnimate] = targetSize;
      }, 200);
    });
  }, 500);
}

// ===== UTILITY FUNCTIONS =====
function updateDateRange(range) {
  console.log("Date range updated to:", range);
  // In real app, fetch data for selected range
  // showToast(`Showing data for ${range}`);
}

// Make function globally available for add.js to call
window.updateDateRange = updateDateRange;

function updateChartType(type) {
  console.log("Chart type updated to:", type);
  showToast(`Switched to ${type} view`);
}

function showMoreData(type) {
  showToast(`Showing all ${type}`);
}

function showToast(message) {
  // Remove existing toast
  const existingToast = document.querySelector(".anls-toast");
  if (existingToast) existingToast.remove();

  // Create new toast
  const toast = document.createElement("div");
  toast.className = "anls-toast";
  toast.textContent = message;

  // Style toast
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background:
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-overlay-dark")
        .trim() || "rgba(0,0,0,0.8)",
    color:
      getComputedStyle(document.documentElement)
        .getPropertyValue("--light-color")
        .trim() || "#ffffff",
    padding: "12px 24px",
    borderRadius: "var(--radius)",
    fontSize: "14px",
    zIndex: "1000",
    animation: "toastIn 0.3s ease",
  });

  // Add animation
  const style = document.createElement("style");
  style.textContent = `
                @keyframes toastIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                @keyframes toastOut {
                    from { opacity: 1; transform: translateX(-50%) translateY(0); }
                    to { opacity: 0; transform: translateX(-50%) translateY(20px); }
                }
            `;
  document.head.appendChild(style);

  // Add to DOM
  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== RESPONSIVE HANDLING =====
window.addEventListener("resize", function () {
  // Handle any responsive adjustments
});
