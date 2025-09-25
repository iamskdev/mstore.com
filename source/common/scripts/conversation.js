let sendMessage;
let enterKeyPressHandler;

// This function will be called by the router when the page is loaded.
export function init() {
    console.log("Conversation view initialized");

    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.history.back();
        });
    }

    const messages = document.getElementById('messages');
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');

    sendMessage = () => {
        const text = msgInput.value.trim();
        if (!text) return;

        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const messageEl = document.createElement('div');
        messageEl.className = 'message sent';
        messageEl.innerHTML = `<div class="bubble">${text}</div><div class="message-time">${time}</div>`;

        messages.appendChild(messageEl);
        msgInput.value = "";
        messages.scrollTop = messages.scrollHeight;
    }

    enterKeyPressHandler = (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    };

    if (sendBtn && msgInput && messages) {
        sendBtn.addEventListener('click', sendMessage);
        msgInput.addEventListener('keypress', enterKeyPressHandler);
    }
}

// The router will call this function when the view is about to be removed.
export function cleanup() {
    console.log("Conversation view cleaned up");

    const backButton = document.getElementById('conversation-back-btn');
    if (backButton) {
        // No need to remove this listener if the element itself is removed
    }

    const sendBtn = document.getElementById('sendBtn');
    const msgInput = document.getElementById('msgInput');

    if (sendBtn && msgInput) {
        sendBtn.removeEventListener('click', sendMessage);
        msgInput.removeEventListener('keypress', enterKeyPressHandler);
    }
}
