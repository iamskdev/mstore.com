import { showToast } from '../../../utils/toast.js';
import { fetchAllUsers, fetchAllOrders, fetchAllLogs, fetchAllAlerts, fetchAllMerchants } from '../../../utils/data-manager.js';
import { formatCurrency, formatRelativeTime } from '../../../utils/formatters.js';

/** Renders statistical cards with real data. */
function renderStats(users = [], orders = [], merchants = []) {
  const usersEl = document.getElementById('admin-stat-users');
  const merchantsEl = document.getElementById('admin-stat-merchants');
  const orders30dEl = document.getElementById('admin-stat-orders-30d');
  const pendingTasksEl = document.getElementById('admin-stat-pending-tasks');

  if (usersEl) {
    usersEl.textContent = users.length;
  }
  if (merchantsEl) {
    merchantsEl.textContent = merchants.length;
  }
  if (orders30dEl) {
    // Placeholder for now, ideally filter orders by last 30 days
    orders30dEl.textContent = orders.filter(order => {
      const orderDate = new Date(order.meta?.timestamp);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return orderDate >= thirtyDaysAgo;
    }).length;
  }
  if (pendingTasksEl) {
    // Placeholder for now
    pendingTasksEl.textContent = '18'; 
  }
}

/** Renders a doughnut chart for user roles. */
function renderUserRolesChart(users = []) {
  const ctx = document.getElementById('user-roles-chart');
  if (!ctx || typeof Chart === 'undefined') return;

  const roleCounts = users.reduce((acc, user) => {
    // Use primaryRole for simplicity, or fall back to the first role.
    const role = user.meta?.primaryRole || user.meta?.roles?.[0] || 'unknown';
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
          labels: { color: 'var(--text-secondary)' }
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
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
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
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}
/** Renders critical alerts. */
function renderAlerts(alerts = []) {
  const container = document.getElementById('admin-alerts-container');
  if (!container) return;

  // Filter for active, critical alerts
  const criticalAlerts = alerts.filter(alert => alert.meta?.status?.isActive && alert.meta?.priority === 'high');
  
  if (criticalAlerts.length === 0) {
    container.innerHTML = ''; // Clear if no alerts
    return;
  }

  container.innerHTML = criticalAlerts.map(alert => `
    <div class="alert alert-critical">
      <i class="fas fa-skull-crossbones"></i> 
      <strong>${alert.content?.title || 'Alert'}:</strong> ${alert.content?.message || 'No details provided.'}
      <button class="btn-sm feature-not-implemented">Resolve</button>
    </div>
  `).join('');
}

/** Renders the most recent activity logs. */
function renderActivityLog(logs = []) {
  const container = document.getElementById('admin-activity-items'); // Corrected ID
  if (!container) return;

  // Get the 5 most recent logs
  const recentLogs = logs.sort((a, b) => new Date(b.meta.timestamp) - new Date(a.meta.timestamp)).slice(0, 5);

  if (recentLogs.length === 0) {
    container.innerHTML = '<div class="activity-item">No recent activity found.</div>'; // Changed to div
    return;
  }

  container.innerHTML = recentLogs.map(log => `
    <div class="activity-item">
      <span class="activity-time">${formatRelativeTime(new Date(log.meta?.timestamp))}</span>
      <span class="activity-details">${log.details?.email || log.meta?.userId?.slice(0, 8) + '...' || 'Unknown User'} - ${(log.action || 'unknown_action').replace(/_/g, ' ')}</span>
    </div>
  `).join('');
}

export function init() {
  console.log("🚀 Admin Home View Initialized");

  async function loadAdminData() {
    try {
      // Fetch all data in parallel for efficiency
      const [users, orders, logs, alerts, merchants] = await Promise.all([
        fetchAllUsers(true),      // Force a fresh fetch, bypassing cache
        fetchAllOrders(true),     // Force a fresh fetch, bypassing cache
        fetchAllLogs(true),       // Force a fresh fetch, bypassing cache
        fetchAllAlerts(true),     // Force a fresh fetch, bypassing cache
        fetchAllMerchants(true)   // Force a fresh fetch, bypassing cache
      ]);

      // Render all components with the fetched data
      console.log("Fetched Data:", { users, orders, logs, alerts, merchants }); // Add this line
      renderStats(users, orders, merchants);
      renderAlerts(alerts);
      renderUserRolesChart(users);
      renderOrderStatusChart(orders);
      renderSignupsChart();
      renderCategoriesChart();
      renderActivityLog(logs);

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
