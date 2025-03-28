console.log('Cipher 9 content script loaded!');

// Global variables to track state
let currentVideoId = '';
let videoTranscript = '';
let isDragging = false;
let offsetX, offsetY;

// Add conversation history tracking
let conversationHistory = [];
const MAX_HISTORY_LENGTH = 6; // Keep last 6 messages (3 exchanges)

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
                <span class="chat-title">CIPHER_9 TERMINAL</span>
            </div>
            <div class="chat-controls">
                <button id="minimize-chat" class="control-button" title="Minimize">−</button>
                <button id="close-chat" class="control-button" title="Close">×</button>
            </div>
        </div>
        <div class="chat-messages"></div>
        <div class="chat-input">
            <button id="summarize-video" class="summarize-button" title="Summarize Video">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="21" y1="6" x2="3" y2="6"></line>
                    <line x1="17" y1="12" x2="3" y2="12"></line>
                    <line x1="13" y1="18" x2="3" y2="18"></line>
                </svg>
            </button>
            <input type="text" id="chat-input" placeholder="$ query --video">
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
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Mono&display=swap');
        
        #ai-chat-widget {
            position: fixed;
            right: 20px;
            top: 80px;
            width: 380px;
            height: 500px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.2), 0 0 30px rgba(0, 255, 0, 0.15);
            background: #000000;
            font-family: 'JetBrains Mono', monospace;
            z-index: 9999;
            transition: all 0.3s ease;
            border: 1px solid rgba(0, 255, 0, 0.3);
            display: flex;
            flex-direction: column;
        }
        
        #ai-chat-widget:hover {
            box-shadow: 0 0 25px rgba(0, 255, 0, 0.3), 0 0 35px rgba(0, 255, 0, 0.2);
        }
        
        .chat-header {
            background: linear-gradient(90deg, #0f1221, #1a1b2e);
            color: #00ffc4;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            border-bottom: 1px solid rgba(0, 255, 0, 0.3);
            position: relative;
            overflow: hidden;
        }
        
        .chat-header::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #00ffc4, #00b7ff);
            z-index: 1;
        }
        
        .chat-header::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(90deg, rgba(0, 255, 196, 0.1) 1px, transparent 1px),
                linear-gradient(rgba(0, 255, 196, 0.1) 1px, transparent 1px);
            background-size: 20px 20px;
            opacity: 0.2;
        }
        
        .chat-drag-handle {
            display: flex;
            align-items: center;
            z-index: 2;
        }
        
        .chat-title {
            font-weight: 600;
            font-size: 14px;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-left: 4px;
            position: relative;
        }
        
        .chat-title::before {
            content: ">";
            margin-right: 6px;
            color: #00b7ff;
        }
        
        .chat-controls {
            display: flex;
            gap: 8px;
            z-index: 2;
        }
        
        .control-button {
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid rgba(0, 255, 0, 0.3);
            color: #00ff00;
            width: 24px;
            height: 24px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            font-family: 'JetBrains Mono', monospace;
        }
        
        .control-button:hover {
            background: rgba(0, 255, 0, 0.2);
            transform: translateY(-1px);
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-height: calc(100% - 120px);
        }
        
        .chat-messages::-webkit-scrollbar {
            width: 6px;
        }
        
        .chat-messages::-webkit-scrollbar-track {
            background: #0f1221;
        }
        
        .chat-messages::-webkit-scrollbar-thumb {
            background-color: rgba(0, 183, 255, 0.5);
            border-radius: 3px;
        }
        
        .message {
            padding: 10px 14px;
            border-radius: 6px;
            max-width: 90%;
            line-height: 1.5;
            font-size: 13px;
            word-wrap: break-word;
        }
        
        .message.user {
            background: rgba(0, 183, 255, 0.15);
            color: #ffffff;
            margin-left: auto;
            border-bottom-right-radius: 0;
            border: 1px solid rgba(0, 183, 255, 0.3);
        }
        
        .message.user::before {
            content: "user@cipher9:~$ ";
            color: #00b7ff;
            font-size: 11px;
            display: block;
            margin-bottom: 4px;
        }
        
        .message.ai {
            background: rgba(0, 255, 196, 0.1);
            color: #e0e0e0;
            border-bottom-left-radius: 0;
            border: 1px solid rgba(0, 255, 196, 0.3);
        }
        
        .message.ai::before {
            content: "ai@cipher9:~$ ";
            color: #00ffc4;
            font-size: 11px;
            display: block;
            margin-bottom: 4px;
        }
        
        .message.system {
            background: rgba(255, 208, 0, 0.1);
            color: #ffd000;
            font-style: italic;
            margin: 8px auto;
            text-align: center;
            max-width: 90%;
            border-radius: 4px;
            border: 1px solid rgba(255, 208, 0, 0.3);
        }
        
        .message.system::before {
            content: "system:~$ ";
            color: #ffd000;
            font-size: 11px;
            display: block;
            margin-bottom: 4px;
            text-align: left;
        }
        
        .chat-input {
            display: flex;
            padding: 12px;
            background: #0f1221;
            border-top: 1px solid rgba(0, 255, 196, 0.3);
            gap: 8px;
            align-items: center;
        }
        
        .summarize-button {
            background: linear-gradient(135deg, #00b7ff, #0077ff);
            color: #ffffff;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            position: relative;
            flex-shrink: 0;
            box-shadow: 0 0 10px rgba(0, 183, 255, 0.3);
        }
        
        .summarize-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 183, 255, 0.5);
        }
        
        .summarize-button:active {
            transform: translateY(0);
        }
        
        .summarize-button::after {
            content: "Summarize";
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: #1a1b2e;
            color: #00ffc4;
            padding: 5px 8px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
            border: 1px solid rgba(0, 255, 196, 0.3);
            z-index: 10;
        }
        
        .summarize-button:hover::after {
            opacity: 1;
        }
        
        .chat-input input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid rgba(0, 255, 196, 0.3);
            border-radius: 4px;
            outline: none;
            font-size: 13px;
            background: rgba(15, 18, 33, 0.8);
            color: #ffffff;
            transition: all 0.2s;
            font-family: 'Space Mono', monospace;
        }
        
        .chat-input button#send-message {
            background: linear-gradient(135deg, #00ffc4, #00b7ff);
            color: #0f1221;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
        }
        
        .chat-input button#send-message:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 255, 196, 0.3);
        }
        
        .typing-indicator {
            display: flex;
            padding: 8px 12px;
            background: rgba(0, 255, 196, 0.1);
            border: 1px solid rgba(0, 255, 196, 0.3);
            border-radius: 4px;
            max-width: 65px;
            margin-bottom: 12px;
        }
        
        .typing-indicator span {
            height: 8px;
            width: 8px;
            background: #00ffc4;
            border-radius: 50%;
            display: inline-block;
            margin: 0 2px;
            animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes typing {
            0% { transform: translateY(0px); opacity: 0.5; }
            50% { transform: translateY(-5px); opacity: 1; }
            100% { transform: translateY(0px); opacity: 0.5; }
        }
        
        #ai-chat-widget.dragging {
            opacity: 0.9;
            transition: none;
            cursor: grabbing;
        }
        
        #summarize-video {
            background: rgba(0, 183, 255, 0.2);
            border: 1px solid rgba(0, 183, 255, 0.4);
        }
        
        #summarize-video:hover {
            background: rgba(0, 183, 255, 0.3);
        }
        
        .tooltip {
            position: absolute;
            background: #1a1b2e;
            color: #00ffc4;
            padding: 5px 8px;
            border-radius: 4px;
            font-size: 11px;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
            border: 1px solid rgba(0, 255, 196, 0.3);
        }
        
        .control-button:hover .tooltip {
            opacity: 1;
        }
        
        /* Add minimize functionality styles */
        #ai-chat-widget.minimized {
            height: 46px !important; /* Header height only */
            overflow: hidden;
        }
        
        #ai-chat-widget.minimized .chat-messages,
        #ai-chat-widget.minimized .chat-input {
            display: none;
        }
        
        /* Rotate minimize button when minimized */
        #ai-chat-widget.minimized #minimize-chat {
            transform: rotate(180deg);
        }
        
        /* Formatted message styles */
        .message.ai p {
            margin-bottom: 10px;
        }
        
        .message.ai p:last-child {
            margin-bottom: 0;
        }
        
        .message.ai .response-heading {
            color: #00ffc4;
            margin-top: 12px;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .message.ai h3.response-heading {
            font-size: 15px;
            border-bottom: 1px solid rgba(0, 255, 196, 0.3);
            padding-bottom: 4px;
        }
        
        .message.ai h4.response-heading {
            font-size: 14px;
        }
        
        .message.ai .bullet-point {
            padding-left: 12px;
            position: relative;
            margin-bottom: 6px;
        }
        
        .message.ai .numbered-point {
            padding-left: 20px;
            position: relative;
            margin-bottom: 6px;
        }
        
        .message.ai b {
            color: #00b7ff;
            font-weight: 600;
        }
        
        /* Add a subtle highlight to code or technical terms */
        .message.ai code {
            background: rgba(0, 255, 196, 0.1);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            border: 1px solid rgba(0, 255, 196, 0.2);
        }
        
        .message-content {
            width: 100%;
        }
        
        /* Fix any existing styles that might be affected */
        .message.ai .message-content p {
            margin-bottom: 10px;
        }
        
        .message.ai .message-content p:last-child {
            margin-bottom: 0;
        }
        
        /* Conversation context indicator */
        .message.user + .message.ai::before,
        .message.ai + .message.user::before {
            content: "";
            position: absolute;
            left: 50%;
            width: 1px;
            height: 20px;
            background: linear-gradient(to bottom, rgba(0, 255, 196, 0.5), rgba(0, 255, 196, 0.1));
            top: -10px;
            z-index: 1;
        }
        
        /* Update message positioning for context lines */
        .message {
            position: relative;
        }
        
        /* Add a subtle indicator for follow-up context */
        .message.user:not(:first-child)::after {
            content: "follow-up";
            position: absolute;
            top: -18px;
            right: 10px;
            font-size: 9px;
            color: rgba(0, 255, 196, 0.7);
            background: rgba(15, 18, 33, 0.8);
            padding: 2px 5px;
            border-radius: 3px;
            opacity: 0.7;
        }
        
        /* Style for beyond-video sections */
        .message.ai p:contains("Beyond the video:") {
            border-left: 2px solid #00b7ff;
            padding-left: 10px;
            margin-top: 12px;
            background: rgba(0, 183, 255, 0.05);
            padding: 8px 10px;
            border-radius: 0 4px 4px 0;
        }
        
        /* Add a subtle indicator for knowledge expansion */
        .message.ai h3.response-heading:contains("Beyond the Video"),
        .message.ai h4.response-heading:contains("Beyond the Video") {
            color: #00b7ff;
            display: flex;
            align-items: center;
        }
        
        .message.ai h3.response-heading:contains("Beyond the Video")::before,
        .message.ai h4.response-heading:contains("Beyond the Video")::before {
            content: "↗";
            margin-right: 6px;
            font-size: 14px;
        }
    `;
    document.head.appendChild(styles);

    // Insert widget into page
    document.body.appendChild(widget);
    console.log('Widget added to page');

    // Set up draggable functionality
    setupDraggable(widget);

    // Setup event listeners
    setupEventListeners();

    // Fetch video data and transcript
    fetchVideoData();

    // Restore minimized state if previously minimized
    chrome.storage.local.get(['chatMinimized'], function(result) {
        if (result.chatMinimized) {
            widget.classList.add('minimized');
            document.getElementById('minimize-chat').textContent = '+';
        }
    });
}

// Make the widget draggable
function setupDraggable(widget) {
    const dragHandle = widget.querySelector('.chat-header');
    let isDragging = false;
    let offsetX, offsetY;
    let lastX, lastY;
    
    // Use requestAnimationFrame for smoother dragging
    let animationFrameId = null;
    
    dragHandle.addEventListener('mousedown', function(e) {
        // Only handle left mouse button
        if (e.button !== 0) return;
        
        isDragging = true;
        
        // Get the current widget position
        const rect = widget.getBoundingClientRect();
        
        // Calculate the offset from the mouse position to the widget corner
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // Set initial position
        lastX = e.clientX;
        lastY = e.clientY;
        
        // Add a dragging class for visual feedback
        widget.classList.add('dragging');
        
        // Prevent text selection during drag
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        // Store the current mouse position
        lastX = e.clientX;
        lastY = e.clientY;
        
        // Use requestAnimationFrame to optimize rendering
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(updatePosition);
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            widget.classList.remove('dragging');
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    });
    
    // Function to update widget position
    function updatePosition() {
        animationFrameId = null;
        
        if (!isDragging) return;
        
        // Calculate new position
        const newLeft = Math.max(0, Math.min(lastX - offsetX, window.innerWidth - widget.offsetWidth));
        const newTop = Math.max(0, Math.min(lastY - offsetY, window.innerHeight - widget.offsetHeight));
        
        // Apply the transform instead of changing top/left for better performance
        widget.style.transform = `translate3d(${newLeft}px, ${newTop}px, 0)`;
        
        // Reset position properties to let transform handle positioning
        widget.style.left = '0';
        widget.style.top = '0';
        widget.style.right = 'auto';
        
        // Request next frame if still dragging
        if (isDragging) {
            animationFrameId = requestAnimationFrame(updatePosition);
        }
    }
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

    minimizeButton.addEventListener('click', function() {
        widget.classList.toggle('minimized');
        
        // Save minimized state
        const isMinimized = widget.classList.contains('minimized');
        chrome.storage.local.set({ 'chatMinimized': isMinimized });
        
        // Update button text based on state
        this.textContent = isMinimized ? '+' : '−';
    });

    closeButton.addEventListener('click', () => {
        widget.style.display = 'none';
    });

    // Add summarize button event listener
    document.getElementById('summarize-video').addEventListener('click', function() {
        summarizeVideo();
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
            console.log('YouTube data response received');
            
            if (response.error) {
                addMessageToChat('system', 'Error fetching video data: ' + response.error);
                return;
            }

            // Use the full context instead of just title/description
            if (response.fullContext) {
                videoTranscript = response.fullContext;
                
                // Log only a preview of the transcript for debugging
                const previewLength = 100;
                console.log('Video context set, total length:', videoTranscript.length);
                console.log('First ' + previewLength + ' chars:', 
                    videoTranscript.substring(0, previewLength) + '...');

                // Show ready message
                addMessageToChat('system', 'Connection established. Ready to analyze video content.');
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

    console.log('Sending message to AI with conversation history:', conversationHistory.length, 'messages');

    // First, verify API key
    chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, function(keyResponse) {
        if (!keyResponse || !keyResponse.apiKey) {
            if (typingIndicator && typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }
            addMessageToChat('system', 'Error: API authentication required. Please configure API keys.');
            return;
        }

        // Send message to background script with conversation history
        chrome.runtime.sendMessage({
            action: 'getAIResponse',
            userMessage: message,
            transcript: videoTranscript,
            videoId: currentVideoId,
            conversationHistory: conversationHistory.slice(0, -1) // Send all but the last message (current user message)
        }, function(response) {
            // Remove typing indicator
            if (typingIndicator && typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }

            if (response.error) {
                console.error('Gemini API Error:', response.error);
                addMessageToChat('system', 'Error: ' + response.error);
            } else if (response.content) {
                addMessageToChat('ai', response.content);
            } else {
                console.error('Unexpected response format:', response);
                addMessageToChat('system', 'Sorry, I couldn\'t generate a response. Please check the console for details.');
            }
        });
    });
}

// Update the addMessageToChat function to track conversation history
function addMessageToChat(sender, message) {
    // Add to conversation history (except system messages)
    if (sender !== 'system') {
        // Add message to history
        conversationHistory.push({
            role: sender === 'user' ? 'user' : 'assistant',
            content: message
        });
        
        // Trim history if it gets too long
        if (conversationHistory.length > MAX_HISTORY_LENGTH) {
            conversationHistory = conversationHistory.slice(conversationHistory.length - MAX_HISTORY_LENGTH);
        }
        
        // Log the current conversation history
        console.log('Conversation history updated:', conversationHistory.length, 'messages');
    }
    
    // Rest of the function remains the same
    const messagesContainer = document.querySelector('.chat-messages');
    const messageElement = document.createElement('div');
    
    messageElement.className = `message ${sender}`;
    
    // Create an inner container for the message content
    const contentContainer = document.createElement('div');
    contentContainer.className = 'message-content';
    
    // Set the HTML content safely
    if (sender === 'ai' && (message.includes('<') && message.includes('>'))) {
        // For AI messages that contain HTML formatting
        contentContainer.innerHTML = message;
    } else {
        // For user messages or system messages, escape HTML
        contentContainer.textContent = message;
    }
    
    // Add the content container to the message element
    messageElement.appendChild(contentContainer);
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    console.log('Added message from', sender, 'with HTML:', sender === 'ai' && message.includes('<'));
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

// Add the summarizeVideo function
function summarizeVideo() {
    // Check if we have video data
    if (!videoTranscript) {
        addMessageToChat('system', 'Error: Video data not loaded yet. Please wait a moment and try again.');
        return;
    }
    
    // Add user message
    addMessageToChat('user', 'Summarize this video for me');
    
    // Add typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = '<span></span><span></span><span></span>';
    document.querySelector('.chat-messages').appendChild(typingIndicator);
    document.querySelector('.chat-messages').scrollTop = document.querySelector('.chat-messages').scrollHeight;
    
    // First, verify API key
    chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, function(keyResponse) {
        if (!keyResponse || !keyResponse.apiKey) {
            if (typingIndicator && typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }
            addMessageToChat('system', 'Error: API authentication required. Please configure API keys.');
            return;
        }
        
        // Send request to background script with structured summary request
        chrome.runtime.sendMessage({
            action: 'getAIResponse',
            userMessage: `Create a structured summary of this video with the following sections:
1. Overview - What is this video about?
2. Key Points - What are the main ideas or concepts?
3. Technical Details - What specific information or techniques were covered?
4. Conclusion - What were the final takeaways?

Format your response with clear headings and bullet points.`,
            transcript: videoTranscript,
            videoId: currentVideoId,
            conversationHistory: conversationHistory.slice(0, -1) // Send all but the last message
        }, function(response) {
            // Remove typing indicator
            if (typingIndicator && typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }
            
            if (response.error) {
                console.error('Gemini API Error:', response.error);
                addMessageToChat('system', 'Error: ' + response.error);
            } else if (response.content) {
                addMessageToChat('ai', response.content);
            } else {
                console.error('Unexpected response format:', response);
                addMessageToChat('system', 'Sorry, I couldn\'t generate a summary. Please check the console for details.');
            }
        });
    });
}

// Add a custom selector for the CSS above
document.addEventListener('DOMContentLoaded', function() {
    // Add a contains selector polyfill for the CSS above
    const style = document.createElement('style');
    style.textContent = `
        /* This will be processed by JavaScript to find elements containing text */
    `;
    document.head.appendChild(style);
    
    // Add a MutationObserver to apply the contains selector functionality
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                // Find all AI message paragraphs
                const aiParagraphs = document.querySelectorAll('.message.ai p');
                aiParagraphs.forEach(function(p) {
                    if (p.textContent.includes('Beyond the video:')) {
                        p.classList.add('beyond-video-section');
                    }
                });
                
                // Find all AI message headings
                const aiHeadings = document.querySelectorAll('.message.ai h3, .message.ai h4');
                aiHeadings.forEach(function(heading) {
                    if (heading.textContent.includes('Beyond the Video')) {
                        heading.classList.add('beyond-video-heading');
                    }
                });
            }
        });
    });
    
    // Start observing the chat messages container
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        observer.observe(chatMessages, { childList: true, subtree: true });
    }
});