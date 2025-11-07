import { fetchAllMerchants, fetchAllUsers, waitForData } from '../../utils/data-manager.js';
import { AuthService } from '../../firebase/auth/auth.js';
import { buildCloudinaryUrl } from '../../api/cloudinary.js';

// --- MODULE-LEVEL STATE ---
let isInitialized = false;
let eventListeners = [];

/**
 * Renders the chat list into the container.
 * This logic was moved from chat-list.js to simplify the view's structure.
 */
async function renderChatList() {
  const container = document.getElementById('chat-list-container');
  const template = document.getElementById('chat-list-template');

  if (!container || !template) {
    console.error('Error: Chat list container or template not found in chat.html.');
    return;
  }

  try {
    // Data is now pre-loaded by the router, so we can fetch from cache.
    const merchants = await fetchAllMerchants();
    const users = await fetchAllUsers();

    // Create maps for efficient lookup
    const merchantMap = new Map(merchants.map(m => [m.meta.merchantId, m]));
    const userMap = new Map(users.map(u => [u.meta.userId, u]));

    // Clear the container before rendering new items
    container.innerHTML = '';

    // Handle case where no merchants are found
    if (!merchants || merchants.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding:20px;">No contacts available to chat with.</p>';
      console.warn("No merchants found to display in the chat list.");
      return;
    }

    // Iterate through merchants to display them as chatable entities
    merchants.forEach((merchant) => {
      if (!merchant?.info) {
        console.warn('Skipping merchant with incomplete data:', merchant);
        return;
      }

      const chatItem = document.importNode(template.content, true).firstElementChild;
      chatItem.dataset.id = merchant.meta.merchantId;

      // --- Avatar ---
      const avatarEl = chatItem.querySelector('.chat-avatar');
      if (avatarEl) {
        const logoUrl = merchant.info.logo;
        if (logoUrl) {
          avatarEl.innerHTML = `<img src="${buildCloudinaryUrl(logoUrl)}" alt="${merchant.info.name} Logo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
          avatarEl.textContent = merchant.info.name ? merchant.info.name.charAt(0).toUpperCase() : '';
        }
      }

      // --- Avatar Badge (e.g., Verified) ---
      const avatarContainer = chatItem.querySelector('.avatar-container');
      if (avatarContainer && merchant.meta.flags.isVerified) {
        const badgeHTML = `<div class="avatar-badge" style="background-color: var(--accent-secondary);">✓</div>`;
        avatarContainer.insertAdjacentHTML('beforeend', badgeHTML);
      }

      // --- Chat Info (Business Name) ---
      const merchantNameEl = chatItem.querySelector('.merchant-name');
      if (merchantNameEl) merchantNameEl.textContent = merchant.info.name || 'Unknown Merchant';

      // --- Last Message (Temporary Text) ---
      const lastMessageEl = chatItem.querySelector('.chat-info p');
      if (lastMessageEl) lastMessageEl.textContent = 'Tap to start a new chat';

      // --- Chat Meta (Time and Unread Count) ---
      const chatTimeEl = chatItem.querySelector('.chat-time');
      if (chatTimeEl) chatTimeEl.textContent = ''; // Placeholder for time

      // Add click listener to navigate to the conversation view
      addManagedEventListener(chatItem, 'click', () => {
        const conversationId = chatItem.dataset.id;
        if (conversationId) {
          const currentRole = window.routeManager.currentRole || 'guest';
          window.routeManager.switchView(currentRole, `conversation/${conversationId}`);
        }
      });

      container.appendChild(chatItem);
    });

  } catch (error) {
    console.error('Error rendering chat list:', error);
    container.innerHTML = '<p style="text-align:center; padding:20px; color:red;">Could not load merchants for chat.</p>';
  }
}

function addManagedEventListener(element, type, listener) {
    element.addEventListener(type, listener);
    eventListeners.push({ element, type, listener });
}

export async function init(force = false) {
  if (isInitialized && !force) return;
  console.log("Chat View Initialized");

  const chatListContainer = document.getElementById('chat-list-container');
  const loginInstructionContainer = document.getElementById('login-instruction');
  const supportChatButton = document.getElementById('chat-support-btn');

  // Use the actual AuthService to check if the user is logged in.
  if (AuthService.isLoggedIn()) {
    chatListContainer.style.display = ''; // Show chat list
    loginInstructionContainer.style.display = 'none'; // Hide instruction

    try {
      // FIX: Wait for essential data to be ready before rendering.
      // This prevents a race condition on fast navigation after login.
      await waitForData(['merchants', 'users']);
      await renderChatList(); // Now render the list
    } catch (error) {
      console.error('Error initializing chat view:', error);
      chatListContainer.innerHTML = '<p style="text-align:center; padding:20px; color:red;">Failed to load chat view.</p>';
    }
  } else {
    chatListContainer.style.display = 'none'; // Hide chat list
    loginInstructionContainer.style.display = 'flex'; // Show instruction using flex

    const goToLoginButton = document.getElementById('go-for-auth');
    if (goToLoginButton) {
      addManagedEventListener(goToLoginButton, 'click', () => {
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
    addManagedEventListener(supportChatButton, 'click', () => {
      console.log('Support Chat button clicked!');
      // FIX: Use custom alert for placeholder action
      window.showCustomAlert({
        title: 'Chat Support',
        message: 'This feature is under development and will be available soon.',
        buttons: [
          {
            text: 'Got It',
            class: 'primary',
            onClick: () => window.hideCustomAlert()
          }
        ]
      });
    });
  }
  isInitialized = true;
}

export function cleanup() {
    console.log("Cleaning up chat view listeners.");
    eventListeners.forEach(({ element, type, listener }) => {
        element.removeEventListener(type, listener);
    });
    eventListeners = [];
    isInitialized = false;
}
