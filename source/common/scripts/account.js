export function init() {
    // Simple interaction for menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function () {
            this.style.backgroundColor = 'rgba(255, 123, 0, 0.2)';
            setTimeout(() => {
                this.style.backgroundColor = '';
            }, 300);
        });
    });

    // Add animation to feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', function () {
            this.style.transform = 'scale(0.97)';
            setTimeout(() => {
                this.style.transform = '';
            }, 300);
        });
    });

    // Profile image click handler
    document.querySelector('.profile-image').addEventListener('click', function () {
        alert('Profile image clicked! Would you like to change your profile picture?');
    });

    // Profile name click handler
    document.querySelector('.profile-name').addEventListener('click', function () {
        alert('Profile options would appear here');
    });

    // Action buttons click handler
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const btnText = this.textContent.trim();
            alert(`You clicked: ${btnText}`);
        });
    });
}