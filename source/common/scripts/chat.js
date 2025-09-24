import { renderChatList } from '../../templates/chat/chat-list.js';
// Assuming AuthService and Router are globally available or imported elsewhere
// import { AuthService } from '../path/to/auth-service.js';
// import { Router } from '../path/to/router.js';

export async function init() {
  console.log("Chat View Initialized");

  const chatListContainer = document.getElementById('chat-list-container');
  const loginInstructionContainer = document.getElementById('login-instruction');
  const supportChatButton = document.getElementById('chat-support-btn');

  // Placeholder for isLoggedIn check. Replace with actual authentication logic.
  // For now, let's assume it's false for demonstration of the instruction.
  const isLoggedIn = true; // AuthService.isLoggedIn(); 

  if (isLoggedIn) {
    chatListContainer.style.display = ''; // Show chat list
    loginInstructionContainer.style.display = 'none'; // Hide instruction

    try {
      const templateFileResponse = await fetch('./source/templates/chat/chat-list.html');
      if (!templateFileResponse.ok) throw new Error(`Failed to fetch template: ${templateFileResponse.statusText}`);
      let templateText = await templateFileResponse.text();

      // Extract CSS from the template and inject it into the head
      const styleRegex = /<style>([\s\S]*?)<\/style>/;
      const match = templateText.match(styleRegex);
      if (match && match[1]) {
        const styleContent = match[1];
        const styleElement = document.createElement('style');
        styleElement.textContent = styleContent;
        document.head.appendChild(styleElement);
        console.log("Injected chat-list styles into document head.");

        // Remove the style block from the templateText so it's not re-injected with innerHTML
        templateText = templateText.replace(styleRegex, '');
      }

      await renderChatList('chat-list-container', templateText);
    } catch (error) {
      console.error('Error initializing chat view:', error);
      chatListContainer.innerHTML = '<p style="text-align:center; padding:20px; color:red;">Failed to load chat view.</p>';
    }
  } else {
    chatListContainer.style.display = 'none'; // Hide chat list
    loginInstructionContainer.style.display = ''; // Show instruction

    const goToLoginButton = document.getElementById('go-for-auth');
    if (goToLoginButton) {
      goToLoginButton.addEventListener('click', () => {
        console.log('Go to Login button clicked!');
        // Use the global routeManager to navigate to the account view
        if (window.routeManager) {
          window.routeManager.switchView('guest', 'account');
        } else {
          console.error('routeManager not found for navigation.');
          alert('Redirecting to login page...'); // Fallback alert
        }
      });
    }
  }

  // Add event listener for the support chat button (always visible)
  if (supportChatButton) {
    supportChatButton.addEventListener('click', () => {
      console.log('Support Chat button clicked!');
      // TODO: Implement actual chat functionality here
      alert('Opening support chat...');
    });
  }
}
