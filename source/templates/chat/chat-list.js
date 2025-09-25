/**
 * Renders the chat list into a specified container using a provided template HTML string and JSON data.
 * This version uses DOM manipulation for safer and more robust updates.
 */
import { fetchAllMerchants, fetchAllUsers } from '../../utils/data-manager.js';

export async function renderChatList(containerId, templateHtml) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Error: Container with ID "${containerId}" not found.`);
    return;
  }

  try {
    // Fetch all merchants and users, bypassing the cache
    const merchants = await fetchAllMerchants(true);
    const users = await fetchAllUsers();

    // Create maps for efficient lookup
    const merchantMap = new Map(merchants.map(m => [m.meta.merchantId, m]));
    const userMap = new Map(users.map(u => [u.meta.userId, u]));

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = templateHtml;
    const template = tempDiv.querySelector('#chat-list-template');

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
      // Basic validation for merchant object structure
      if (!merchant || !merchant.meta || !merchant.meta.info) {
        console.warn('Skipping merchant with incomplete data:', merchant);
        return; // Skip this iteration if essential data is missing
      }

      const chatItem = document.importNode(template.content, true).firstElementChild;

      chatItem.dataset.id = merchant.meta.merchantId; // Use merchantId as chat ID

      // --- Avatar ---
      const avatarEl = chatItem.querySelector('.chat-avatar');
      if (avatarEl) {
        const logoUrl = merchant.meta.info.logo;
        if (logoUrl) {
          avatarEl.innerHTML = `<img src="${logoUrl}" alt="${merchant.meta.info.name} Logo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
          avatarEl.textContent = merchant.meta.info.name ? merchant.meta.info.name.charAt(0).toUpperCase() : '';
        }
      }

      // --- Avatar Badge (e.g., Verified) ---
      const avatarContainer = chatItem.querySelector('.avatar-container');
      if (avatarContainer && merchant.meta.flags.isVerified) {
        const badgeHTML = `<div class="avatar-badge" style="background-color: var(--accent-secondary);">✓</div>`; // Green check for verified
        avatarContainer.insertAdjacentHTML('beforeend', badgeHTML);
      }

      // --- Chat Info (Business Name) ---
      const merchantNameEl = chatItem.querySelector('.merchant-name');
      if (merchantNameEl) {
        merchantNameEl.textContent = merchant.meta.info.name || 'Unknown Merchant';
      }

      // --- Last Message (Temporary Text) ---
      const lastMessageEl = chatItem.querySelector('.chat-info p');
      if (lastMessageEl) {
        lastMessageEl.textContent = 'Tap to start a new chat'; // Temporary text
      }

      // --- Conditional Attached Tag (Remove for merchant list) ---
      const attachedTagEl = chatItem.querySelector('.attach-tag');
      if (attachedTagEl) attachedTagEl.remove();

      // --- Chat Meta (Time and Unread Count) ---
      const chatMetaEl = chatItem.querySelector('.chat-meta');
      if (chatMetaEl) {
        const chatTimeEl = chatItem.querySelector('.chat-time');
        if (chatTimeEl) {
          chatTimeEl.textContent = ''; // Placeholder for time
        }
        const unreadCountEl = chatItem.querySelector('.unread-count');
        if (unreadCountEl) {
          unreadCountEl.remove(); // Remove unread count as it's chat-specific
        }
      }

      // Add click listener to navigate to the conversation view
      chatItem.addEventListener('click', () => {
        const conversationId = chatItem.dataset.id;
        if (conversationId) {
          // Use the global routeManager to switch views
          // We need to construct the view name with the ID, e.g., 'conversation/some-id'
          // The role can be retrieved from the routeManager's current state.
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
