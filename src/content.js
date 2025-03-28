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
            overflow: hidden;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
            background: #000000;
            font-family: 'JetBrains Mono', monospace;
            z-index: 9999;
            transition: opacity 0.3s ease;
            border: 1px solid #00ff00;
            display: flex;
            flex-direction: column;
            will-change: transform; /* Improve drag performance */
        }
        
        /* Add a class for when dragging to disable transitions */
        #ai-chat-widget.dragging {
            transition: none !important;
        }
        
        #ai-chat-widget.minimized {
            height: 46px !important;
            overflow: hidden;
        }
        
        #ai-chat-widget.minimized .chat-messages,
        #ai-chat-widget.minimized .chat-input {
            display: none;
        }
        
        #ai-chat-widget.minimized #minimize-chat {
            transform: rotate(180deg);
        }
        
        .chat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #000000;
            border-bottom: 1px solid #00ff00;
            cursor: move;
        }
        
        .chat-drag-handle {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            cursor: move;
        }
        
        .chat-title {
            font-size: 14px;
            font-weight: 600;
            color: #00ff00;
            letter-spacing: 1px;
        }
        
        .chat-controls {
            display: flex;
            gap: 8px;
        }
        
        .control-button {
            background: #000000;
            color: #00ff00;
            border: none;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .control-button:hover {
            background: #00ff00;
            color: #000000;
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-height: calc(100% - 120px);
            background: #000000;
        }
        
        .message {
            padding: 10px 14px;
            max-width: 90%;
            line-height: 1.5;
            font-size: 13px;
            word-wrap: break-word;
            position: relative;
            color: #00ff00;
            background: transparent;
            border: none;
        }
        
        .message-content {
            width: 100%;
        }
        
        .message.user {
            align-self: flex-end;
        }
        
        .message.user::before {
            content: "> ";
        }
        
        .message.ai {
            align-self: flex-start;
        }
        
        .message.system {
            align-self: center;
            font-style: italic;
            font-size: 12px;
            opacity: 0.8;
        }
        
        .chat-input {
            display: flex;
            padding: 12px;
            background: #000000;
            border-top: 1px solid #00ff00;
            gap: 8px;
            align-items: center;
        }
        
        .chat-input input {
            flex: 1;
            padding: 10px 14px;
            border: none;
            outline: none;
            font-size: 13px;
            background: #000000;
            color: #00ff00;
            transition: all 0.2s;
            font-family: 'Space Mono', monospace;
        }
        
        .chat-input input:focus {
            box-shadow: none;
        }
        
        .chat-input input::placeholder {
            color: rgba(0, 255, 0, 0.5);
        }
        
        .summarize-button {
            background: #000000;
            color: #00ff00;
            border: none;
            width: 36px;
            height: 36px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            position: relative;
            flex-shrink: 0;
        }
        
        .summarize-button:hover {
            background: #00ff00;
            color: #000000;
        }
        
        .summarize-button:hover svg {
            stroke: #000000;
        }
        
        .summarize-button::after {
            content: "Summarize";
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: #000000;
            color: #00ff00;
            padding: 5px 8px;
            font-size: 11px;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
            border: 1px solid #00ff00;
            z-index: 10;
        }
        
        .summarize-button:hover::after {
            opacity: 1;
        }
        
        .summarize-button svg {
            stroke: #00ff00;
        }
        
        .chat-input button#send-message {
            background: #000000;
            color: #00ff00;
            border: none;
            width: 36px;
            height: 36px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
        }
        
        .chat-input button#send-message:hover {
            background: #00ff00;
            color: #000000;
        }
        
        .chat-input button#send-message:hover svg {
            stroke: #000000;
        }
        
        .chat-input button#send-message svg {
            stroke: #00ff00;
        }
        
        .typing-indicator {
            display: flex;
            align-items: center;
            align-self: flex-start;
            background: transparent;
            padding: 12px 16px;
            gap: 4px;
            border: none;
        }
        
        .typing-indicator span {
            width: 8px;
            height: 8px;
            background: #00ff00;
            display: inline-block;
            opacity: 0.4;
        }
        
        .typing-indicator span:nth-child(1) {
            animation: pulse 1s infinite;
        }
        
        .typing-indicator span:nth-child(2) {
            animation: pulse 1s infinite 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
            animation: pulse 1s infinite 0.4s;
        }
        
        @keyframes pulse {
            0% { opacity: 0.4; }
            50% { opacity: 1; }
            100% { opacity: 0.4; }
        }
        
        /* Message context indicators - simplified */
        .message.user:not(:first-child)::after {
            content: "[follow-up]";
            position: absolute;
            top: -18px;
            right: 10px;
            font-size: 9px;
            color: #00ff00;
            background: #000000;
            padding: 2px 5px;
            opacity: 0.7;
        }
        
        /* Formatted message styles - simplified */
        .message.ai .message-content p {
            margin-bottom: 10px;
            color: #00ff00;
        }
        
        .message.ai .message-content p:last-child {
            margin-bottom: 0;
        }
        
        .message.ai .response-heading {
            color: #00ff00;
            margin-top: 12px;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .message.ai h3.response-heading {
            font-size: 15px;
            border-bottom: 1px solid #00ff00;
            padding-bottom: 4px;
        }
        
        .message.ai h4.response-heading {
            font-size: 14px;
        }
        
        .message.ai .bullet-point {
            padding-left: 12px;
            position: relative;
            margin-bottom: 6px;
            color: #00ff00;
        }
        
        .message.ai .bullet-point::before {
            content: "* ";
            position: absolute;
            left: 0;
        }
        
        .message.ai .numbered-point {
            padding-left: 20px;
            position: relative;
            margin-bottom: 6px;
            color: #00ff00;
        }
        
        .message.ai b {
            color: #00ff00;
            font-weight: 600;
        }
        
        .message.ai code {
            background: transparent;
            padding: 2px 4px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            border: none;
            color: #00ff00;
        }
        
        /* Style for beyond-video sections - simplified */
        .message.ai .beyond-video-section,
        .message.ai p.beyond-video-section {
            border-left: 1px solid #00ff00;
            padding-left: 10px;
            margin-top: 12px;
        }
        
        .message.ai .beyond-video-heading::before {
            content: ">> ";
        }
        
        /* Add a blinking cursor effect to the chat title */
        .chat-title::after {
            content: "_";
            animation: blink 1s infinite;
            font-weight: normal;
        }
        
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
        
        /* Add scanline effect for more retro terminal feel */
        #ai-chat-widget::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                to bottom,
                rgba(0, 0, 0, 0) 0%,
                rgba(0, 0, 0, 0) 50%,
                rgba(0, 0, 0, 0.025) 50%,
                rgba(0, 0, 0, 0) 100%
            );
            background-size: 100% 4px;
            pointer-events: none;
            z-index: 10;
            opacity: 0.15;
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
function setupDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.querySelector('.chat-drag-handle');
    
    if (header) {
        header.onmousedown = dragMouseDown;
    }
    
    function dragMouseDown(e) {
        e.preventDefault();
        // Get the mouse cursor position at startup
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // Add dragging class to disable transitions during drag
        element.classList.add('dragging');
        
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
        e.preventDefault();
        
        // Calculate the new cursor position
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // Use transform instead of top/left for better performance
        const currentTransform = window.getComputedStyle(element).getPropertyValue('transform');
        const matrix = new DOMMatrix(currentTransform === 'none' ? '' : currentTransform);
        
        const newX = matrix.e - pos1;
        const newY = matrix.f - pos2;
        
        // Set the element's new position using transform
        element.style.transform = `translate(${newX}px, ${newY}px)`;
    }
    
    function closeDragElement() {
        // Stop moving when mouse button is released
        document.onmouseup = null;
        document.onmousemove = null;
        
        // Remove dragging class to re-enable transitions
        element.classList.remove('dragging');
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