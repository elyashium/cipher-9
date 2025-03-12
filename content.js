// Global variables to track state
let currentVideoId = '';
let videoTranscript = '';

// Function to extract video ID from YouTube URL
function getYoutubeVideoId(url) {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
        if (urlObj.pathname === '/watch') {
            return urlObj.searchParams.get('v');
        }
    }
    return null;
}

// Create and inject chat widget
function createChatWidget() {
    // Get current video ID
    currentVideoId = getYoutubeVideoId(window.location.href);
    if (!currentVideoId) return; // Not a video page

    // Check if widget already exists
    if (document.getElementById('ai-chat-widget')) return;

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

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
        #ai-chat-widget {
            width: 300px;
            border: 1px solid #ccc;
            border-radius: 8px;
            overflow: hidden;
            margin-top: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            background: white;
        }
        .chat-header {
            background: #4285f4;
            color: white;
            padding: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .chat-header h3 {
            margin: 0;
            font-size: 16px;
        }
        .chat-header button {
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
        }
        .chat-messages {
            height: 300px;
            overflow-y: auto;
            padding: 10px;
        }
        .message {
            margin-bottom: 10px;
            padding: 8px 12px;
            border-radius: 18px;
            max-width: 80%;
            word-break: break-word;
        }
        .message.user {
            background: #e1f5fe;
            margin-left: auto;
            text-align: right;
        }
        .message.ai {
            background: #f1f1f1;
        }
        .message.system {
            background: #fff8e1;
            font-style: italic;
        }
        .chat-input {
            display: flex;
            padding: 10px;
            border-top: 1px solid #eee;
        }
        .chat-input input {
            flex: 1;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px 0 0 4px;
        }
        .chat-input button {
            background: #4285f4;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 0 4px 4px 0;
            cursor: pointer;
        }
    `;
    document.head.appendChild(styles);

    // Insert widget next to video
    const videoContainer = document.querySelector('#primary-inner');
    if (videoContainer) {
        videoContainer.appendChild(widget);

        // Setup event listeners
        setupEventListeners();

        // Fetch video data and transcript
        fetchVideoData();
    }
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
        document.querySelector('.chat-input').style.display =
            document.querySelector('.chat-input').style.display === 'none' ? 'flex' : 'none';
        minimizeButton.textContent =
            minimizeButton.textContent === '−' ? '+' : '−';
    });
}

// Fetch video data and transcript
function fetchVideoData() {
    // Check if API keys are set
    chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, function (response) {
        if (!response || !response.apiKey) {
            addMessageToChat('system', 'Please set up your API keys in the extension options.');
            return;
        }

        // Fetch video data and transcript
        chrome.runtime.sendMessage({
            action: 'getYouTubeData',
            videoId: currentVideoId
        }, function (response) {
            if (response.error) {
                addMessageToChat('system', 'Error fetching video data: ' + response.error);
                return;
            }

            // Process the response to get the transcript
            if (response.videoData && response.videoData.items && response.videoData.items.length > 0) {
                const videoInfo = response.videoData.items[0].snippet;
                videoTranscript = `Title: ${videoInfo.title}\nDescription: ${videoInfo.description}`;

                // Show ready message
                addMessageToChat('system', 'Ready to answer questions about this video!');
            } else {
                addMessageToChat('system', 'Could not retrieve video information.');
            }
        });
    });
}

// Handle sending messages
async function sendMessage() {
    const input = document.querySelector('#chat-input');
    const message = input.value.trim();
    if (!message) return;

    addMessageToChat('user', message);
    input.value = '';

    // Add loading message
    const loadingElement = addMessageToChat('system', 'Thinking...');

    // Send message to background script
    chrome.runtime.sendMessage({
        action: 'getAIResponse',
        userMessage: message,
        transcript: videoTranscript,
        videoId: currentVideoId
    }, function (response) {
        // Remove loading message
        if (loadingElement && loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
        }

        if (response.error) {
            addMessageToChat('system', 'Error: ' + response.error);
        } else if (response.content) {
            addMessageToChat('ai', response.content);
        } else {
            addMessageToChat('system', 'Sorry, I couldn\'t generate a response.');
        }
    });
}

// Add message to chat (returns the element for potential removal)
function addMessageToChat(type, text) {
    const messagesContainer = document.querySelector('.chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return messageDiv;
}

// Handle YouTube SPA navigation
function setupNavigationListener() {
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;

            // Check if this is a YouTube video page
            const videoId = getYoutubeVideoId(url);
            if (videoId) {
                // Remove existing chat widget if it exists
                const existingWidget = document.getElementById('ai-chat-widget');
                if (existingWidget) {
                    existingWidget.parentNode.removeChild(existingWidget);
                }

                // Reset state
                currentVideoId = '';
                videoTranscript = '';

                // Create new widget after a short delay to let YouTube render
                setTimeout(createChatWidget, 1500);
            }
        }
    }).observe(document, { subtree: true, childList: true });
}

// Initialize when YouTube video page loads
function initialize() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createChatWidget();
            setupNavigationListener();
        });
    } else {
        createChatWidget();
        setupNavigationListener();
    }
}

// Start the extension
initialize();