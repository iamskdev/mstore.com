/**
 * @file Toast Notification Module
 * Provides a self-contained, modular function to display toast notifications.
 * This module creates its own container and manages toast elements dynamically.
 */

// --- Toast Configuration ---
const toastConfig = {
    // Default messages for common actions
    login: { message: 'Logged in successfully!', icon: 'fas fa-check-circle', type: 'success' },
    logout: { message: 'Logged out successfully.', icon: 'fas fa-info-circle', type: 'info' },
    account: { message: 'Account created successfully!', icon: 'fas fa-user-plus', type: 'success' },
    // Default settings
    defaultDuration: 4000,
    containerId: 'toast-container-main',
    styleId: 'toast-component-styles' // ID for the injected style tag
};

// --- Embedded CSS ---
// All styles are now embedded within the JS module for true portability.
const toastCSS = `
  #toast-container-main {
    position: fixed;
    top: 50px; /* More predictable positioning from the top */
    left: 50%;
    transform: translateX(-50%); /* Center horizontally */
    z-index: 99999;
    display: flex;
    flex-direction: column;
    align-items: center; /* Center toasts horizontally if container is wider */
    gap: 8px;
    width: auto; /* Let content decide width */
    max-width: calc(100vw - 32px); /* But not more than screen width minus some padding */
  }
  .toast {
    display: flex;
    width: 100%; /* Make toast take up the width of its container */
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background-color: var(--bg-secondary, #fff);
    color: var(--text-primary, #333);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border: 1px solid #ccc; /* Default border for all sides */
    border-left-width: 4px; /* Keep the left border thicker */
    gap: 10px;
    font-family: 'Noto Color Emoji', sans-serif;
    font-size: 0.85rem;
    animation: toast-fade-in 0.3s ease-out;
    min-width: 250px;
    overflow: hidden;
  }
  .toast-message-wrapper {
    flex: 1; /* Take available space between icon and close button */
    min-width: 0; /* Crucial for flex-shrink */
    overflow: hidden; /* This is our viewport for the scrolling text */
    margin-right: -2px; /* Space between message and close button */
    
  }
  .toast-message {
    display: block;
    white-space: nowrap; /* Prevent text from wrapping */
    
  }
  .toast-close-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    font-weight: bold;
    cursor: pointer;
    padding: 0; /* Remove padding to reduce gap */
    margin-left: 0px; /* Add a bit of space */
    line-height: 1;
    opacity: 0.6;
    transition: opacity 0.2s ease;
    flex-shrink: 0; /* Prevent close button from shrinking */
  }
  .toast-close-btn:hover {
    opacity: 1;
  }
  .toast-success { border-color: var(--accent-success, #28a745); }
  .toast-error { border-color: var(--accent-danger, #dc3545); }
  .toast-info { border-color: var(--accent-info, #17a2b8); }
  .toast-warning { border-color: var(--accent-warning, #ffc107); }
  .toast i {
    font-size: 1.2rem;
    flex-shrink: 0; /* Prevent icon from shrinking */
  }
  .toast-success i { color: var(--accent-success, #28a745); }
  .toast-error i { color: var(--accent-danger, #dc3545); }
  .toast-info i { color: var(--accent-info, #17a2b8); }
  .toast-warning i { color: var(--accent-warning, #ffc107); }
  @keyframes toast-fade-in { from { opacity: 0; transform: translateX(-100%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes toast-fade-out { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }

  /* Scrolling text animation for long messages */
  .toast.is-scrolling .toast-message {
    animation: scroll-text linear infinite;
  }
  .toast.is-scrolling.paused-start .toast-message { animation-play-state: paused; }
  .toast.is-scrolling:hover .toast-message {
    animation-play-state: paused;
  }
  .toast.is-scrolling .toast-message-wrapper {
    overflow-x: scroll; /* Allow manual horizontal scrolling */
    scrollbar-width: none; /* Hide scrollbar for Firefox */
    -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  }
  @keyframes scroll-text {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); } /* Scroll by half the width (since text is duplicated) */
  }
  .toast-message-duplicate {
    padding-left: 2em; /* Add some space between original and duplicated text */
  }
  /* Hide scrollbar for Webkit browsers (Chrome, Safari) */
  .toast.is-scrolling .toast-message-wrapper::-webkit-scrollbar {
    display: none;
  }
`;

// --- Private Helper Functions ---

/**
 * Ensures the toast container element exists in the DOM.
 * If not, it creates and appends it to the body.
 * @returns {HTMLElement} The toast container element.
 */
function getOrCreateContainer() {
    // Inject the component's CSS into the document's head if it doesn't already exist.
    if (!document.getElementById(toastConfig.styleId)) {
        const styleTag = document.createElement('style');
        styleTag.id = toastConfig.styleId;
        styleTag.textContent = toastCSS;
        document.head.appendChild(styleTag);
    }

    let container = document.getElementById(toastConfig.containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = toastConfig.containerId;
        // The container's styles are now in toast.css, so no inline styles are needed here.
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Creates a single toast element.
 * @param {string} message - The message to display.
 * @param {string} icon - The Font Awesome icon class.
 * @param {string} type - The type of toast (e.g., 'success', 'error', 'info').
 * @returns {HTMLElement} The created toast element.
 */
function createToastElement(message, icon, type) {
    const toast = document.createElement('div');
    // All styling is now handled by classes from toast.css
    toast.className = `toast toast-${type}`; 
    toast.style.animation = 'toast-fade-in 0.3s ease-out';

    toast.innerHTML = `
        <i class="${icon}"></i>
        <div class="toast-message-wrapper">
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close-btn" aria-label="Close">&times;</button>
    `;

    return toast;
}


// --- Public Exported Function ---

/**
 * Displays a toast notification.
 * @param {string} type - The type of toast. Can be a preset key ('login', 'logout', 'account') or a custom type ('success', 'error', 'info', 'warning').
 * @param {string} [message] - A custom message. If provided, it overrides the preset message.
 * @param {number} [duration=4000] - The duration in milliseconds for the toast to be visible.
 */
export function showToast(type, message, duration) {
    const preset = toastConfig[type];
    const finalMessage = message || preset?.message || 'Notification';
    const finalIcon = preset?.icon || (type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-info-circle');
    const finalType = preset?.type || type;
    const finalDuration = duration || toastConfig.defaultDuration;

    const container = getOrCreateContainer();
    const toastElement = createToastElement(finalMessage, finalIcon, finalType);
    container.appendChild(toastElement);

    // --- Scrolling logic for long messages ---
    // We need to check this *after* the element is in the DOM to get its dimensions.
    // Using a microtask ensures layout is calculated before we check dimensions.
    Promise.resolve().then(() => {
        const messageWrapper = toastElement.querySelector('.toast-message-wrapper');
        const messageSpan = toastElement.querySelector('.toast-message');
        
        if (messageSpan && messageWrapper && messageSpan.scrollWidth > messageWrapper.clientWidth + 5) { // Added a small buffer
            toastElement.classList.add('is-scrolling');
            toastElement.classList.add('paused-start'); // Pause at the start

            // Duplicate the text for a seamless loop, hiding the duplicate from screen readers.
            const duplicateSpan = document.createElement('span');
            duplicateSpan.className = 'toast-message-duplicate';
            duplicateSpan.setAttribute('aria-hidden', 'true');
            duplicateSpan.innerHTML = `&nbsp;&nbsp;&nbsp;${finalMessage}`; // Add spacing
            // If the original message is very short, duplicate it multiple times to ensure smooth scrolling
            if (messageSpan.scrollWidth < messageWrapper.clientWidth * 1.5) {
                duplicateSpan.innerHTML += `&nbsp;&nbsp;&nbsp;${finalMessage}`;
            }

            messageSpan.appendChild(duplicateSpan);

            // Make animation duration proportional to text length for consistent speed
            const scrollableWidth = messageSpan.scrollWidth / 2;
            const scrollSpeed = 60; // pixels per second
            const animationDuration = scrollableWidth / scrollSpeed;
            messageSpan.style.animationDuration = `${Math.max(5, animationDuration)}s`; // Min 5s duration

            // After a short delay, unpause the animation to start scrolling
            // This gives the user a moment to read the beginning of the message.
            setTimeout(() => toastElement.classList.remove('paused-start'), 1500); // Pause for 1.5 seconds
        }

        // Add event listeners for manual scrolling (mouse wheel/trackpad)
        messageWrapper.addEventListener('wheel', (e) => {
            messageWrapper.scrollLeft += e.deltaY; // Scroll horizontally with vertical wheel
        }, { passive: true });
    });

    // --- Close Logic ---
    // A single function to handle closing the toast to avoid duplicate code.
    const closeToast = () => {
        toastElement.style.animation = 'toast-fade-out 0.3s ease-in forwards';
        // Use { once: true } to automatically remove the listener after it fires.
        toastElement.addEventListener('animationend', () => toastElement.remove(), { once: true });
    };

    // 1. Automatically close after the specified duration.
    const autoCloseTimeout = setTimeout(closeToast, finalDuration);

    // 2. Allow the user to close it manually by clicking the button.
    const closeButton = toastElement.querySelector('.toast-close-btn');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            clearTimeout(autoCloseTimeout); // Prevent the auto-close from firing
            closeToast(); // Close it immediately
        });
    }
}