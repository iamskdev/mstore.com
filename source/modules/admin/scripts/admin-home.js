import { showToast } from '../../../utils/toast.js';
import { fetchAllUsers, fetchAllLogs, fetchAllMerchants, fetchAllFeedbacks, fetchAllRatings } from '../../../utils/data-manager.js';
import { formatCurrency, formatRelativeTime, formatDateForIndia } from '../../../utils/formatters.js';

/** Renders statistical cards with real data. */function renderStats(users = [], merchants = [], feedbacks = [], ratings = []) {
  const usersEl = document.getElementById('admin-stat-users');
  const pendingTasksEl = document.getElementById('admin-stat-pending-tasks');

  if (usersEl) {
    usersEl.textContent = users.length;
  }
  if (pendingTasksEl) {
    // Count pending feedbacks and ratings as they require admin review.
    const pendingFeedbacks = feedbacks.filter(f => f.lifecycle?.status === 'pending').length;
    const pendingRatings = ratings.filter(r => r.lifecycle?.status === 'pending').length;
    
    pendingTasksEl.textContent = pendingFeedbacks + pendingRatings;
  }
}

/** Renders a doughnut chart for user roles. */
function renderUserRolesChart(users = []) {
  const ctx = document.getElementById('user-roles-chart');
  if (!ctx || typeof Chart === 'undefined') return;

  // If no users are found (e.g., due to a fetch error), display a message instead of an empty chart.
  if (users.length === 0) {
    const wrapper = ctx.closest('.chart-wrapper');
    if (wrapper) {
      wrapper.innerHTML = `<div class="chart-placeholder">User data could not be loaded.</div>`;
    }
    return;
  }

  const roleCounts = users.reduce((acc, user) => {
    // FIX: Correctly determine the role. Prioritize primaryRole, then the roles array.
    // This handles cases where a user might have multiple roles but no primary one set.
    let role = user.meta?.primaryRole;
    if (!role && Array.isArray(user.meta?.roles) && user.meta.roles.length > 0) {
      // Prefer 'admin' or 'merchant' over 'consumer' if multiple roles exist without a primary.
      if (user.meta.roles.includes('admin')) role = 'admin';
      else if (user.meta.roles.includes('merchant')) role = 'merchant';
      else role = user.meta.roles[0]; // Fallback to the first role in the array
    }
    role = role || 'consumer'; // Final fallback if no role is found at all.
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  new Chart(ctx, {
    type: 'doughnut', // Doughnut is a nice variation of pie
    data: {
      labels: Object.keys(roleCounts).map(r => r.charAt(0).toUpperCase() + r.slice(1)),
      datasets: [{
        label: 'User Roles',
        data: Object.values(roleCounts),
        backgroundColor: [
          'rgba(78, 115, 223, 0.8)', // Admin Blue
          'rgba(28, 200, 138, 0.8)', // User Green
          'rgba(246, 194, 62, 0.8)', // Merchant Yellow
          'rgba(108, 117, 125, 0.8)'  // Unknown/Other Grey
        ],
        borderColor: 'var(--bg-primary)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          // The color is now handled globally by Chart.defaults.color
        }
      }
    }
  });
}

/** Renders a pie chart for order statuses. */
function renderOrderStatusChart(orders = []) {
  const ctx = document.getElementById('order-status-chart');
  if (!ctx || typeof Chart === 'undefined') return;

  const statusCounts = orders.reduce((acc, order) => {
    const status = order.meta?.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(statusCounts).map(s => s.charAt(0).toUpperCase() + s.slice(1)), // Capitalize
      datasets: [{
        label: 'Order Status',
        data: Object.values(statusCounts),
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)', // Blue (e.g., 'processing')
          'rgba(75, 192, 192, 0.8)', // Green (e.g., 'completed')
          'rgba(255, 99, 132, 0.8)',  // Red (e.g., 'cancelled')
          'rgba(255, 206, 86, 0.8)', // Yellow (e.g., 'pending')
          'rgba(153, 102, 255, 0.8)' // Purple (e.g., 'shipped')
        ],
        borderColor: 'var(--bg-primary)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: 'var(--text-secondary)' } }
      }
    }
  });
}

/** Renders a bar chart for user signups. */
function renderSignupsChart() {
  const ctx = document.getElementById('signupsChart').getContext('2d');
  if (!ctx || typeof Chart === 'undefined') return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [...Array(30).keys()].map(i => `Day ${i+1}`),
      datasets: [{
        label: 'Signups',
        data: Array.from({length:30}, () => Math.floor(Math.random() * 50) + 5),
        backgroundColor: '#10b981'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Add this line
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

/** Renders a pie chart for top categories. */
function renderCategoriesChart() {
  const ctx = document.getElementById('categoriesPieChart').getContext('2d');
  if (!ctx || typeof Chart === 'undefined') return;

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Electronics', 'Clothing', 'Home & Garden', 'Books', 'Others'],
      datasets: [{
        data: [30, 25, 20, 15, 10],
        backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#6b7280']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Add this line
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

/** Renders the most recent activity logs. */
function renderActivityLog(logs = [], users = []) {
  const container = document.getElementById('admin-activity-items'); // Corrected ID
  if (!container) return;

  // Create a map for efficient user lookup
  const userMap = new Map(users.map(user => [user.meta.userId, user]));

  // Get the 5 most recent logs
  const recentLogs = logs.sort((a, b) => new Date(b.event?.timestamp) - new Date(a.event?.timestamp)).slice(0, 5);

  if (recentLogs.length === 0) {
    container.innerHTML = '<div class="activity-item placeholder">No recent activity found.</div>'; // Changed to div
    return;
  }

  container.innerHTML = recentLogs.map(log => {
    const userId = log.meta?.links?.userId; // Correct path for userId
    const user = userId ? userMap.get(userId) : null;
    const userName = user?.info?.nickName || user?.info?.username || 'Unknown User';
    const actionText = (log.meta?.action || 'unknown_action').replace(/_/g, ' '); // Correct path for action

    return `
      <div class="activity-item">
        <div class="activity-content">
          <span class="activity-details"><strong>${userName}</strong> ${actionText}</span>
          <span class="activity-time">${formatDateForIndia(log.event?.timestamp)}</span>
        </div>
      </div>
    `;
  }).join('');
}

export function init() {
  console.log("🚀 Admin Home View Initialized");

  // FIX: Set the default color for all chart text (labels, scales, etc.)
  // to use a CSS variable. This ensures that when the theme changes (light/dark mode),
  // the chart text color updates automatically.
  if (typeof Chart !== 'undefined') {
    Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
  }

  async function loadAdminData() {
    try {
      // Use Promise.allSettled to fetch all data, even if some requests fail due to permissions.
      // This prevents the entire dashboard from failing if one data source is inaccessible.
      const results = await Promise.allSettled([
        fetchAllUsers(true),
        fetchAllLogs(true),
        fetchAllMerchants(true),
        fetchAllFeedbacks(true),
        fetchAllRatings(true)
      ]);

      // Helper to safely extract data or return an empty array on failure
      const getData = (result, name) => {
        if (result.status === 'fulfilled') {
          return result.value || [];
        }
        // Log a clear warning for the specific collection that failed.
        console.warn(`⚠️ Partial Load Warning: Could not fetch '${name}'. Reason: ${result.reason.message}`);
        return []; // Return empty array on failure so other components don't break.
      };

      const users = getData(results[0], 'users');
      const logs = getData(results[1], 'logs');
      const merchants = getData(results[2], 'merchants');
      const feedbacks = getData(results[3], 'feedbacks');
      const ratings = getData(results[4], 'ratings');

      // Render all components with the fetched data
      renderStats(users, merchants, feedbacks, ratings);
      renderUserRolesChart(users);
      // renderOrderStatusChart(orders); // This chart is already commented out in HTML
      renderSignupsChart();
      renderCategoriesChart();
      renderActivityLog(logs, users);

    } catch (error) {
      console.error("❌ Failed to load admin dashboard data:", error);
      showToast('error', 'Could not load admin data.');
    }
  }

  // Initial data load
  loadAdminData();

  // Add event listeners for buttons that are still present
  document.getElementById('maintenance-toggle')?.addEventListener('click', () => showToast('info', 'Maintenance mode toggled (Simulated).'));
  document.getElementById('flush-cache')?.addEventListener('click', () => showToast('info', 'Cache flush initiated (Simulated).'));

  // Note: The "feature-not-implemented" class on links and buttons is handled globally
  // by the drawer's script, which adds a "Coming Soon" toast.
}
