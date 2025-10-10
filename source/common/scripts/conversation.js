import { routeManager } from '../../main.js';
import { fetchMerchantById } from '../../utils/data-manager.js';

// --- MODULE-LEVEL STATE ---
let isInitialized = false;
let eventListeners = [];

function addManagedEventListener(element, type, listener, options) {
    element.addEventListener(type, listener, options);
    eventListeners.push({ element, type, listener, options });
}

/**
 * Formats a date for the date separator in the chat.
 * Returns "Today", "Yesterday", or a full date string based on context.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string (e.g., "Today", "Yesterday", "September 9, 2025").
 */
function formatDateForSeparator(date) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to midnight for accurate date-only comparison
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (messageDate.getTime() === todayDate.getTime()) return 'Today';
    if (messageDate.getTime() === yesterdayDate.getTime()) return 'Yesterday';

    // For older dates, show the full date
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

/**
 * Loads the conversation header with data for a specific merchant.
 * @param {string} merchantId - The ID of the merchant to load.
 */
async function loadConversationHeader(merchantId) {
    const avatarEl = document.getElementById('conversation-avatar');
    const nameEl = document.getElementById('conversation-name');
    const statusEl = document.getElementById('conversation-status');

    if (!avatarEl || !nameEl || !statusEl) return;

    try {
        const merchant = await fetchMerchantById(merchantId);
        if (!merchant) {
            nameEl.textContent = 'Unknown Merchant';
            statusEl.textContent = 'Offline';
            avatarEl.textContent = '?';
            return;
        }

        nameEl.textContent = merchant.meta.info.name;
        // TODO: Implement real-time status later. For now, use a placeholder.
        statusEl.textContent = 'Tap to see info';

        if (merchant.meta.info.logo) {
            avatarEl.innerHTML = `<img src="${merchant.meta.info.logo}" alt="Logo" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            avatarEl.textContent = merchant.meta.info.name.charAt(0).toUpperCase();
        }

    } catch (error) {
        console.error('Failed to load conversation header data:', error);
        nameEl.textContent = 'Error Loading';
        statusEl.textContent = 'Could not fetch data';
    }
}

// This function will be called by the router when the page is loaded.
export function init(force = false) {
    if (isInitialized && !force) return;
    console.log("Conversation view initialized");

    const conversationScreen = document.querySelector('.conversation-screen');
    
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        addManagedEventListener(backButton, 'click', (e) => {
            e.stopPropagation(); // Prevent the click from bubbling up to the header-info-clickable listener
            // FIX: Use a more reliable method to go back.
            // Check if there's a previous state in history. If not, go to a default view.
            if (window.history.length > 2) { // More than just the base and current page
                window.history.back();
            } else {
                // Fallback for when the user lands directly on the conversation URL
                routeManager.switchView(routeManager.currentRole, 'chat');
            }
        });
    }

    // --- NEW: Load dynamic header data ---
    // Get the merchant ID from the route parameters provided by routeManager
    const merchantId = routeManager.routeParams?.id;
    if (merchantId) {
        loadConversationHeader(merchantId);
    }

    // --- NEW: Add click listener to header info to navigate to merchant profile ---
    const headerInfo = document.getElementById('header-info-clickable');
    if (headerInfo && merchantId) {
        addManagedEventListener(headerInfo, 'click', (e) => {
            console.log(`Navigating to profile for merchant: ${merchantId}`);
            // Navigate to the new merchant profile view
            routeManager.switchView(routeManager.currentRole, `merchant-profile/${merchantId}`);
        });
    }

    // --- FIX for Keyboard Issues on Mobile ---
    // This uses the visualViewport API to correctly handle the on-screen keyboard.
    // It prevents the entire screen from being pushed up and ensures the input bar
    // sits correctly above the keyboard.
    if (window.visualViewport && conversationScreen) {
        const visualViewportResizeHandler = () => {
            // Set the height of the conversation screen to the height of the visible area.
            // This makes the layout stable when the keyboard appears/disappears.
            conversationScreen.style.height = `${window.visualViewport.height}px`;
            // Scroll to the bottom to ensure the input is visible
            window.scrollTo(0, document.body.scrollHeight);
        };

        addManagedEventListener(window.visualViewport, 'resize', visualViewportResizeHandler);

        // Set initial height
        conversationScreen.style.height = `${window.visualViewport.height}px`;
    } else {
        // Fallback for older browsers
        conversationScreen.style.height = '100vh';
    }

    const messages = document.getElementById('message-list');
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');

    const sendMessage = () => {
        const text = msgInput.value.trim();
        if (!text) return;

        const now = new Date();

        // --- NEW: Logic for Date Separator ---
        const lastMessage = messages.querySelector('.message:last-of-type');
        let lastMessageDateStr = null;
        if (lastMessage) {
            lastMessageDateStr = lastMessage.dataset.date; // e.g., "2025-09-09"
        }

        const currentMessageDateStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD" format

        if (lastMessageDateStr !== currentMessageDateStr) {
            const dateSeparator = document.createElement('div');
            dateSeparator.className = 'date-separator';
            const displayDate = formatDateForSeparator(now); // Use the new smart formatter
            dateSeparator.innerHTML = `<span>${displayDate}</span>`;
            messages.appendChild(dateSeparator);
        }
        // --- END NEW ---

        const messageEl = document.createElement('div');
        messageEl.className = 'message sent';
        messageEl.dataset.date = currentMessageDateStr; // Store the date on the element

        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageEl.innerHTML = `<div class="bubble">${text}</div><div class="message-time">${time}</div>`;

        messages.appendChild(messageEl);
        msgInput.value = "";
        messages.scrollTop = messages.scrollHeight;
    }

    const enterKeyPressHandler = (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    };

    if (sendBtn && msgInput && messages) {
        const footer = document.querySelector('.conversation-footer');

        // Use 'mousedown' and preventDefault to avoid the input losing focus,
        // which keeps the keyboard open. This listener is on the whole footer.
        addManagedEventListener(footer, 'mousedown', (e) => {
            // If the mousedown event is on a button or its icon,
            // prevent the default action (taking focus).
            if (e.target.closest('button')) {
                e.preventDefault();
            }
        }, true); // Use capture phase to catch event early.

        // Handle the actual button clicks
        addManagedEventListener(sendBtn, 'click', sendMessage);

        addManagedEventListener(msgInput, 'keypress', enterKeyPressHandler);
    }
    isInitialized = true;
}

// The router will call this function when the view is about to be removed.
export function cleanup() {
    console.log("Conversation view cleaned up");
    eventListeners.forEach(({ element, type, listener, options }) => {
        element.removeEventListener(type, listener, options);
    });
    eventListeners = [];
    isInitialized = false;
}
