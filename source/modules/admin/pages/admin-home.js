import { showToast } from '../../../utils/toast.js';
import { fetchAllUsers, fetchAllOrders, fetchAllLogs, fetchAllAlerts } from '../../../utils/data-manager.js';
import { formatCurrency, formatRelativeTime } from '../../../utils/formatters.js';

/** Renders statistical cards with real data. */
function renderStats(users = [], orders = []) {
  const revenueEl = document.getElementById('admin-stat-revenue');
  const usersEl = document.getElementById('admin-stat-users');
  const ordersEl = document.getElementById('admin-stat-orders');

  if (revenueEl) {
    // This is a simplified calculation. A real-world scenario would be more complex.
    const totalRevenue = orders.reduce((sum, order) => sum + (order.summary?.total || 0), 0);
    revenueEl.textContent = formatCurrency(totalRevenue);
  }
  if (usersEl) {
    usersEl.textContent = users.length;
  }
  if (ordersEl) {
    ordersEl.textContent = orders.length;
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
  const tbody = document.getElementById('admin-log-table-body');
  if (!tbody) return;

  // Get the 5 most recent logs
  const recentLogs = logs.sort((a, b) => new Date(b.meta.timestamp) - new Date(a.meta.timestamp)).slice(0, 5);

  if (recentLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3">No recent activity found.</td></tr>';
    return;
  }

  tbody.innerHTML = recentLogs.map(log => `
    <tr>
      <td>${formatRelativeTime(new Date(log.meta?.timestamp))}</td>
      <td>${log.details?.email || log.meta?.userId?.slice(0, 8) + '...' || 'Unknown User'}</td>
      <td>${(log.action || 'unknown_action').replace(/_/g, ' ')}</td>
    </tr>
  `).join('');
}

export function init() {
  console.log("🚀 Admin Home View Initialized");

  async function loadAdminData() {
    try {
      // Fetch all data in parallel for efficiency
      const [users, orders, logs, alerts] = await Promise.all([
        fetchAllUsers(true),      // Force a fresh fetch, bypassing cache
        fetchAllOrders(true),     // Force a fresh fetch, bypassing cache
        fetchAllLogs(true),       // Force a fresh fetch, bypassing cache
        fetchAllAlerts(true)      // Force a fresh fetch, bypassing cache
      ]);

      // Render all components with the fetched data
      renderStats(users, orders);
      renderAlerts(alerts);
      renderUserRolesChart(users);
      renderOrderStatusChart(orders);
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