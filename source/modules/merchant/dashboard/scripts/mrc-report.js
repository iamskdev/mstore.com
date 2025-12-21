// Initialize reports functionality
function initReports() {
    console.log('Initializing reports functionality...');

    // DOM Elements - query after content is loaded
    const reportItems = document.querySelectorAll('.mrc-report-entry');

    // Direct report generation on clicks
    reportItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const title = item.querySelector('.mrc-report-entry-title').textContent;
            const category = item.closest('.mrc-report-category-card').dataset.category;
            generateReport(title, category);
        });
    });

    console.log(`Reports initialized with ${reportItems.length} report items`);
}

// Redirect to report generation page
function generateReport(title, category) {
    console.log(`Redirecting to "${title}" report page from category: ${category}`);

    // Show redirect message
    alert(`Report Feature - Coming Soon\n\n📊 Report: ${title}\n📁 Category: ${category}\n\nThis report generation feature is currently under development and will be available in an upcoming release.\n\nFeatures planned for implementation:\n• Custom date range selection\n• Multiple export formats (PDF, Excel, CSV)\n• Advanced filtering options\n• Report download functionality\n\nThank you for your patience!`);

    // Here you would redirect to the new report generation page
    // window.location.href = `report-generator.html?title=${encodeURIComponent(title)}&category=${category}`;
}

// Export initialization function to global scope
window.initReports = initReports;

// Export for module use
export { initReports, generateReport };