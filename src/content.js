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
                <span class="chat-title">CIPHER_9 TERMINAL</span>
            </div>
            <div class="chat-controls">
                <button id="minimize-chat" class="control-button">−</button>
                <button id="close-chat" class="control-button">×</button>
            </div>
        </div>
        <div class="chat-messages"></div>
        <div class="chat-input">
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
            width: 320px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0, 255, 196, 0.2), 0 0 30px rgba(0, 183, 255, 0.15);
            background: #0f1221;
            font-family: 'JetBrains Mono', monospace;
            z-index: 9999;
            transition: all 0.3s ease;
            border: 1px solid rgba(0, 255, 196, 0.3);
            transform: translate3d(20px, 80px, 0);
            transition: box-shadow 0.3s ease, opacity 0.3s ease;
            will-change: transform;
            left: 0;
            top: 0;
            right: auto;
        }
        
        #ai-chat-widget:hover {
            box-shadow: 0 0 25px rgba(0, 255, 196, 0.3), 0 0 35px rgba(0, 183, 255, 0.2);
        }
        
        .chat-header {
            background: linear-gradient(90deg, #0f1221, #1a1b2e);
            color: #00ffc4;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            border-bottom: 1px solid rgba(0, 255, 196, 0.3);
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
            background: rgba(0, 255, 196, 0.1);
            border: 1px solid rgba(0, 255, 196, 0.3);
            color: #00ffc4;
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
            background: rgba(0, 255, 196, 0.2);
            transform: translateY(-1px);
        }
        
        .chat-messages {
            height: 320px;
            overflow-y: auto;
            padding: 16px;
            background: #0f1221;
            scrollbar-width: thin;
            scrollbar-color: #00b7ff #0f1221;
            background-image: 
                radial-gradient(rgba(0, 183, 255, 0.1) 1px, transparent 1px),
                radial-gradient(rgba(0, 255, 196, 0.05) 1px, transparent 1px);
            background-size: 20px 20px;
            background-position: 0 0, 10px 10px;
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
            margin-bottom: 12px;
            padding: 10px 14px;
            border-radius: 6px;
            max-width: 85%;
            word-break: break-word;
            line-height: 1.4;
            position: relative;
            font-size: 13px;
            font-family: 'Space Mono', monospace;
            animation: fadeIn 0.3s ease;
            border: 1px solid transparent;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
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
        
        .chat-input input::placeholder {
            color: rgba(0, 255, 196, 0.5);
        }
        
        .chat-input input:focus {
            border-color: #00ffc4;
            box-shadow: 0 0 0 2px rgba(0, 255, 196, 0.2);
        }
        
        .chat-input button {
            background: linear-gradient(135deg, #00ffc4, #00b7ff);
            color: #0f1221;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 4px;
            margin-left: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        .chat-input button:hover {
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
            addMessageToChat('system', 'Connection established. Ready to analyze video content.');
            return;
        }

        // Fetch video data and transcript
        chrome.runtime.sendMessage({
            action: 'getYouTubeData',
            videoId: currentVideoId
        }, function (response) {
            console.log('YouTube data response received');
            
            if (response.error) {
                addMessageToChat('system', 'Error: API authentication required. Please configure API keys.');
                return;
            }

            // Use the full context instead of just title/description
            if (response.fullContext) {
                videoTranscript = response.fullContext;
                console.log('Video context set, length:', videoTranscript.length);
                console.log('First 100 chars:', videoTranscript.substring(0, 100) + '...');

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