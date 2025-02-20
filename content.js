// Create and inject chat widget
function createChatWidget() {
    const widget = document.createElement('div');
    widget.id = 'ai-chat-widget';
    widget.innerHTML = `
        <div class="chat-header">
            <h3>Cipher 9 AI Chat</h3>
            <button id="minimize-chat">−</button>
        </div>
        <div class="chat-messages"></div>
        <div class="chat-input">
            <input type="text" id="chat-input" placeholder="Ask about the video...">
            <button id="send-message">Send</button>
        </div>
    `;

    // Insert widget next to video
    const videoContainer = document.querySelector('#primary-inner');
    if (videoContainer) {
        videoContainer.appendChild(widget);
    }

    setupEventListeners();
}

// Set up event listeners for chat functionality
function setupEventListeners() {
    const sendButton = document.querySelector('#send-message');
    const input = document.querySelector('#chat-input');
    const minimizeButton = document.querySelector('#minimize-chat');
    const messagesContainer = document.querySelector('.chat-messages');

    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    minimizeButton.addEventListener('click', () => {
        messagesContainer.style.display = 
            messagesContainer.style.display === 'none' ? 'block' : 'none';
        minimizeButton.textContent = 
            minimizeButton.textContent === '−' ? '+' : '−';
    });
}

// Handle sending messages
async function sendMessage() {
    const input = document.querySelector('#chat-input');
    const message = input.value.trim();
    if (!message) return;

    addMessageToChat('user', message);
    input.value = '';

    // Get API key and make request to Gemini
    try {
        const response = await chrome.runtime.sendMessage({type: 'GET_API_KEY'});
        if (!response.apiKey) {
            addMessageToChat('ai', 'Please set your Gemini API key in the extension settings.');
            return;
        }

        // TODO: Implement Gemini API call here
        // For now, just show a placeholder response
        setTimeout(() => {
            addMessageToChat('ai', 'This is a placeholder response. Gemini API integration coming soon!');
        }, 1000);
    } catch (error) {
        addMessageToChat('ai', 'Error: Could not process your request.');
    }
}

// Add message to chat
function addMessageToChat(type, text) {
    const messagesContainer = document.querySelector('.chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Initialize when YouTube video page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createChatWidget);
} else {
    createChatWidget();
}