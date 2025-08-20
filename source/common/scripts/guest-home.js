import { viewManager } from '../../main.js';

function init() {
    const exploreBtn = document.getElementById('guest-home-explore-btn');
    const loginBtn = document.getElementById('guest-home-login-btn');

    exploreBtn?.addEventListener('click', () => {
        // Switch to the explore view for guests
        viewManager.switchView('guest', 'explore');
    });

    loginBtn?.addEventListener('click', () => {
        // Set the initial tab for the auth form and switch to the account view
        sessionStorage.setItem('initialAuthTab', 'login');
        viewManager.switchView('guest', 'account');
    });
}

export { init };