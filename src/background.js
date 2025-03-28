// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Cipher 9 extension installed');
  // Set up default configuration
  chrome.storage.sync.get(['geminiApiKey', 'youtubeApiKey'], function(result) {
      if (!result.geminiApiKey) {
          chrome.storage.sync.set({ geminiApiKey: '' });
      }
      if (!result.youtubeApiKey) {
          chrome.storage.sync.set({ youtubeApiKey: '' });
      }
  });
});

// Consolidated message listener for all message types
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Get API keys from storage
  if (request.type === 'GET_API_KEY') {
      chrome.storage.sync.get(['geminiApiKey'], function(result) {
          sendResponse({ apiKey: result.geminiApiKey });
      });
      return true; // Required for async response
  }
  
  // Get YouTube data using user's YouTube API key
  else if (request.action === 'getYouTubeData') {
      chrome.storage.sync.get(['youtubeApiKey'], function(result) {
          const apiKey = result.youtubeApiKey;
          if (!apiKey) {
              sendResponse({ error: 'YouTube API key not set' });
              return;
          }

          // Fetch video details
          fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${request.videoId}&key=${apiKey}`)
              .then(response => {
                  if (!response.ok) {
                      throw new Error(`YouTube API error: ${response.status}`);
                  }
                  return response.json();
              })
              .then(data => {
                  const videoInfo = data.items[0].snippet;
                  const fullContext = `
                      Title: ${videoInfo.title}
                      Channel: ${videoInfo.channelTitle}
                      Published: ${videoInfo.publishedAt}
                      Description: ${videoInfo.description}
                  `;
                  
                  sendResponse({ 
                      success: true, 
                      videoData: data,
                      fullContext: fullContext
                  });
              })
              .catch(error => {
                  sendResponse({ error: error.message });
              });
      });
      return true;
  }
  
  // Get AI response using user's Gemini API key
  else if (request.action === 'getAIResponse') {
      chrome.storage.sync.get(['geminiApiKey'], function(result) {
          const apiKey = result.geminiApiKey;
          
          if (!apiKey) {
              sendResponse({ error: 'Gemini API key not set' });
              return;
          }
          
          // Log the actual transcript length
          console.log('Full transcript length:', 
              request.transcript ? request.transcript.length : 0);
          console.log('Conversation history:', 
              request.conversationHistory ? request.conversationHistory.length : 0, 'messages');
          
          // Trim transcript if it's too long (Gemini has token limits)
          // A rough estimate is 4 characters per token, and we want to leave room for the response
          const MAX_TRANSCRIPT_CHARS = 20000; // Approximately 5000 tokens
          let transcript = request.transcript || '';
          
          if (transcript.length > MAX_TRANSCRIPT_CHARS) {
              console.log(`Transcript too long (${transcript.length} chars), trimming to ${MAX_TRANSCRIPT_CHARS} chars`);
              transcript = transcript.substring(0, MAX_TRANSCRIPT_CHARS) + 
                  "\n\n[Note: The transcript was trimmed due to length limitations]";
          }
          
          // Create a more structured prompt with conversation history
          let prompt;
          
          if (request.conversationHistory && request.conversationHistory.length > 0) {
              // This is a follow-up question, include conversation history
              prompt = `
                  You are Cipher 9, an advanced AI assistant for YouTube videos.
                  
                  VIDEO CONTEXT:
                  ${transcript}
                  
                  CONVERSATION HISTORY:
                  ${request.conversationHistory.map(msg => 
                      `${msg.role.toUpperCase()}: ${msg.role === 'assistant' ? 
                          msg.content.replace(/<[^>]*>/g, '') : msg.content}`
                  ).join('\n\n')}
                  
                  CURRENT USER QUERY:
                  ${request.userMessage}
                  
                  RESPONSE GUIDELINES:
                  1. Structure your response with clear sections using markdown formatting
                  2. Use bullet points (•) for lists
                  3. Use bold text for important concepts
                  4. Break your response into logical paragraphs
                  5. Refer to information from previous messages when relevant
                  
                  Provide a detailed and well-structured response that builds on the conversation so far.
              `;
          } else {
              // This is the first question
              prompt = `
                  You are Cipher 9, an advanced AI assistant for YouTube videos.
                  
                  VIDEO CONTEXT:
                  ${transcript}
                  
                  USER QUERY:
                  ${request.userMessage}
                  
                  RESPONSE GUIDELINES:
                  1. Structure your response with clear sections using markdown formatting
                  2. Use bullet points (•) for lists
                  3. Use bold text for important concepts
                  4. Break your response into logical paragraphs
                  5. For summaries, include these sections:
                     - Overview
                     - Key Points
                     - Technical Details (if applicable)
                     - Conclusion
                  
                  Provide a detailed and well-structured response about the video content. Format your answer to be easy to read with proper headings, paragraphs, and bullet points.
              `;
          }
          
          // Make the API request with the potentially trimmed transcript
          fetch(`https://generativelanguage.googleapis.com/v1beta/models/Gemini-2.5-Pro-Experimental-03-25:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  contents: [{
                      parts: [{
                          text: prompt
                      }]
                  }],
                  generationConfig: {
                      temperature: 0.7,
                      maxOutputTokens: 1500,
                      topP: 0.95,
                      topK: 40
                  }
              })
          })
          .then(response => {
              console.log('Gemini API response status:', response.status);
              if (!response.ok) {
                  return response.text().then(text => {
                      console.error('API error details:', text);
                      throw new Error(`Gemini API error (${response.status}): ${text}`);
                  });
              }
              return response.json();
          })
          .then(data => {
              console.log('Gemini API response received');
              
              if (data.candidates && data.candidates.length > 0 && 
                  data.candidates[0].content && 
                  data.candidates[0].content.parts && 
                  data.candidates[0].content.parts.length > 0) {
                  
                  // Get the raw text
                  const rawText = data.candidates[0].content.parts[0].text;
                  
                  // Format the response
                  const formattedText = formatResponse(rawText);
                  
                  sendResponse({ 
                      success: true,
                      content: formattedText,
                      rawContent: rawText // Keep the raw content in case needed
                  });
              } else {
                  console.error('Unexpected response format:', data);
                  throw new Error('Unexpected response format from Gemini API');
              }
          })
          .catch(error => {
              console.error('Gemini API error:', error);
              sendResponse({ 
                  success: false, 
                  error: error.message 
              });
          });
      });
      return true;
  }
  
  // Save API keys
  else if (request.action === 'saveApiKeys') {
      chrome.storage.sync.set({
          geminiApiKey: request.geminiApiKey,
          youtubeApiKey: request.youtubeApiKey
      }, function() {
          if (chrome.runtime.lastError) {
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
              sendResponse({ success: true });
          }
      });
      return true;
  }
});

// Add this function to background.js
async function fetchYouTubeTranscript(videoId, apiKey) {
    try {
        // First, get the caption tracks
        const captionListResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
        );
        
        if (!captionListResponse.ok) {
            throw new Error(`Failed to fetch captions: ${captionListResponse.status}`);
        }
        
        const captionData = await captionListResponse.json();
        
        if (!captionData.items || captionData.items.length === 0) {
            return "No captions available for this video.";
        }
        
        // Find English captions or use the first available
        let captionId = null;
        const englishCaption = captionData.items.find(
            item => item.snippet.language === 'en'
        );
        
        if (englishCaption) {
            captionId = englishCaption.id;
        } else {
            captionId = captionData.items[0].id;
        }
        
        // Now fetch the actual transcript
        // Note: This requires OAuth 2.0, which is complex for extensions
        // As a workaround, we'll use the video description as context
        
        return "Transcript not available through API. Using video metadata instead.";
    } catch (error) {
        console.error("Error fetching transcript:", error);
        return null;
    }
}

// Update the formatResponse function to ensure valid HTML
function formatResponse(text) {
    // First, escape any HTML that might be in the original text
    // except for our formatting tags
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Now add our formatting
    // Replace plain asterisks with HTML bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<b>$1</b>');
    
    // Convert markdown-style headers to styled headers
    formatted = formatted.replace(/^# (.*?)$/gm, '<h3 class="response-heading">$1</h3>');
    formatted = formatted.replace(/^## (.*?)$/gm, '<h4 class="response-heading">$1</h4>');
    
    // Convert bullet points
    formatted = formatted.replace(/^- (.*?)$/gm, '<div class="bullet-point">• $1</div>');
    formatted = formatted.replace(/^\* (.*?)$/gm, '<div class="bullet-point">• $1</div>');
    
    // Convert numbered lists
    formatted = formatted.replace(/^(\d+)\. (.*?)$/gm, '<div class="numbered-point">$1. $2</div>');
    
    // Add paragraph breaks
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    
    // Wrap in paragraph tags if not already
    if (!formatted.startsWith('<')) {
        formatted = '<p>' + formatted + '</p>';
    }
    
    return formatted;
}