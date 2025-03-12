console.log('Cipher 9 content script loaded!');

// Global variables to track state
let currentVideoId = '';
let videoTranscript = '';
let isDragging = false;
let offsetX, offsetY;

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
    console.log('Creating chat widget...');
    
    // Get current video ID
    currentVideoId = getYoutubeVideoId(window.location.href);
    console.log('Video ID:', currentVideoId);
    
    if (!currentVideoId) {
        console.log('Not a video page, widget not created');
        return; // Not a video page
    }

    // Check if widget already exists
    if (document.getElementById('ai-chat-widget')) {
        console.log('Widget already exists');
        return;
    }

    console.log('Injecting widget into page');

    const widget = document.createElement('div');
    widget.id = 'ai-chat-widget';
    widget.innerHTML = `
        <div class="chat-header">
            <div class="chat-drag-handle">
                <span class="chat-title">Cipher 9 AI</span>
            </div>
            <div class="chat-controls">
                <button id="minimize-chat" class="control-button">−</button>
                <button id="close-chat" class="control-button">×</button>
            </div>
        </div>
        <div class="chat-messages"></div>
        <div class="chat-input">
            <input type="text" id="chat-input" placeholder="Ask about the video...">
            <button id="send-message">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            </button>
        </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
        #ai-chat-widget {
            position: fixed;
            right: 20px;
            top: 80px;
            width: 320px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            background: #1e1e2e;
            font-family: 'Segoe UI', Roboto, Arial, sans-serif;
            z-index: 9999;
            transition: box-shadow 0.3s ease;
            border: 1px solid rgba(255,255,255,0.1);
        }
        #ai-chat-widget:hover {
            box-shadow: 0 6px 24px rgba(0,0,0,0.4);
        }
        .chat-header {
            background: linear-gradient(135deg, #7b68ee, #3a86ff);
            color: white;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        }
        .chat-drag-handle {
            display: flex;
            align-items: center;
        }
        .chat-title {
            font-weight: 600;
            font-size: 15px;
            margin-left: 4px;
        }
        .chat-controls {
            display: flex;
            gap: 8px;
        }
        .control-button {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .control-button:hover {
            background: rgba(255,255,255,0.3);
        }
        .chat-messages {
            height: 320px;
            overflow-y: auto;
            padding: 16px;
            background: #282a36;
            scrollbar-width: thin;
            scrollbar-color: #44475a #282a36;
        }
        .chat-messages::-webkit-scrollbar {
            width: 6px;
        }
        .chat-messages::-webkit-scrollbar-track {
            background: #282a36;
        }
        .chat-messages::-webkit-scrollbar-thumb {
            background-color: #44475a;
            border-radius: 6px;
        }
        .message {
            margin-bottom: 12px;
            padding: 10px 14px;
            border-radius: 18px;
            max-width: 85%;
            word-break: break-word;
            line-height: 1.4;
            position: relative;
            font-size: 14px;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .message.user {
            background: #3a86ff;
            color: #ffffff;
            margin-left: auto;
            border-bottom-right-radius: 4px;
        }
        .message.ai {
            background: #383a59;
            color: #f8f8f2;
            border: 1px solid rgba(255,255,255,0.1);
            border-bottom-left-radius: 4px;
        }
        .message.system {
            background: #44475a;
            color: #f1fa8c;
            font-style: italic;
            margin: 8px auto;
            text-align: center;
            max-width: 90%;
            border-radius: 8px;
        }
        .chat-input {
            display: flex;
            padding: 12px;
            background: #1e1e2e;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .chat-input input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid #44475a;
            border-radius: 24px;
            outline: none;
            font-size: 14px;
            background: #282a36;
            color: #f8f8f2;
            transition: border 0.2s;
        }
        .chat-input input::placeholder {
            color: #6272a4;
        }
        .chat-input input:focus {
            border-color: #7b68ee;
            box-shadow: 0 0 0 2px rgba(123, 104, 238, 0.2);
        }
        .chat-input button {
            background: #7b68ee;
            color: white;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            margin-left: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .chat-input button:hover {
            background: #6a5acd;
        }
        .typing-indicator {
            display: flex;
            padding: 10px 14px;
            background: #383a59;
            border-radius: 18px;
            max-width: 65px;
            margin-bottom: 12px;
        }
        .typing-indicator span {
            height: 8px;
            width: 8px;
            background: #f8f8f2;
            border-radius: 50%;
            display: inline-block;
            margin: 0 2px;
            animation: typing 1.4s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0px); }
        }
    `;
    document.head.appendChild(styles);

    // Insert widget into page
    document.body.appendChild(widget);
    console.log('Widget added to page');

    // Make widget draggable
    setupDraggable();

    // Setup event listeners
    setupEventListeners();

    // Fetch video data and transcript
    fetchVideoData();
}

// Make the widget draggable
function setupDraggable() {
    const widget = document.getElementById('ai-chat-widget');
    const dragHandle = widget.querySelector('.chat-header');

    dragHandle.addEventListener('mousedown', function(e) {
        isDragging = true;
        
        // Get the current position of the widget
        const rect = widget.getBoundingClientRect();
        
        // Calculate the offset of the mouse pointer from the widget's top-left corner
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // Add a class to indicate dragging state
        widget.classList.add('dragging');
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        // Calculate new position
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        // Apply new position
        widget.style.left = `${x}px`;
        widget.style.top = `${y}px`;
        widget.style.right = 'auto'; // Clear the right property when dragging
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
        widget.classList.remove('dragging');
    });
}

// Set up event listeners for chat functionality
function setupEventListeners() {
    const sendButton = document.querySelector('#send-message');
    const input = document.querySelector('#chat-input');
    const minimizeButton = document.querySelector('#minimize-chat');
    const closeButton = document.querySelector('#close-chat');
    const messagesContainer = document.querySelector('.chat-messages');
    const widget = document.getElementById('ai-chat-widget');

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

    closeButton.addEventListener('click', () => {
        widget.style.display = 'none';
    });
}

// Fetch video data and transcript
function fetchVideoData() {
    console.log('Fetching video data for ID:', currentVideoId);
    
    // Check if API keys are set
    chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, function (response) {
        console.log('API key response:', response);
        
        if (!response || !response.apiKey) {
            addMessageToChat('system', 'Please set up your API keys in the extension options.');
            return;
        }

        // Fetch video data and transcript
        chrome.runtime.sendMessage({
            action: 'getYouTubeData',
            videoId: currentVideoId
        }, function (response) {
            console.log('YouTube data response:', response);
            
            if (response.error) {
                addMessageToChat('system', 'Error fetching video data: ' + response.error);
                return;
            }

            // Process the response to get the transcript
            if (response.videoData && response.videoData.items && response.videoData.items.length > 0) {
                const videoInfo = response.videoData.items[0].snippet;
                videoTranscript = `Title: ${videoInfo.title}\nDescription: ${videoInfo.description}`;
                console.log('Video transcript set:', videoTranscript.substring(0, 100) + '...');

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

    // Add typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = '<span></span><span></span><span></span>';
    document.querySelector('.chat-messages').appendChild(typingIndicator);
    document.querySelector('.chat-messages').scrollTop = document.querySelector('.chat-messages').scrollHeight;

    console.log('Sending message to AI:', message);
    console.log('Video transcript (first 100 chars):', videoTranscript.substring(0, 100) + '...');

    // Send message to background script
    chrome.runtime.sendMessage({
        action: 'getAIResponse',
        userMessage: message,
        transcript: videoTranscript,
        videoId: currentVideoId
    }, function (response) {
        console.log('AI response:', response);
        
        // Remove typing indicator
        if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
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
    console.log('Initializing Cipher 9...');
    try {
        // Wait for YouTube to fully load
        setTimeout(() => {
            createChatWidget();
        }, 2000);
        
        // Also listen for navigation events (YouTube is a SPA)
        setupNavigationListener();
    } catch (error) {
        console.error('Cipher 9 initialization error:', error);
    }
}

// Start the extension
initialize();