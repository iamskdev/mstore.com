import { viewManager } from '../../main.js';

function init() {
    const loginBtn = document.getElementById('guest-home-login-btn');

    loginBtn?.addEventListener('click', () => {
        // Set the initial tab for the auth form and switch to the account view
        sessionStorage.setItem('initialAuthTab', 'login');
        viewManager.switchView('guest', 'account');
    });
}

export { init };