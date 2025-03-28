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
          
          // Trim transcript if it's too long (Gemini has token limits)
          // A rough estimate is 4 characters per token, and we want to leave room for the response
          const MAX_TRANSCRIPT_CHARS = 20000; // Approximately 5000 tokens
          let transcript = request.transcript || '';
          
          if (transcript.length > MAX_TRANSCRIPT_CHARS) {
              console.log(`Transcript too long (${transcript.length} chars), trimming to ${MAX_TRANSCRIPT_CHARS} chars`);
              transcript = transcript.substring(0, MAX_TRANSCRIPT_CHARS) + 
                  "\n\n[Note: The transcript was trimmed due to length limitations]";
          }
          
          // Create a more structured prompt
          const prompt = `
              You are Cipher 9, an advanced AI assistant for YouTube videos.
              
              VIDEO CONTEXT:
              ${transcript}
              
              USER QUERY:
              ${request.userMessage}
              
              Provide a detailed and comprehensive response about the video content. Don't be afraid to go into depth when explaining complex topics from the video. Include specific details, examples, and explanations from the video when relevant.
              
              If the user is asking for a summary, provide a well-structured summary with:
              - Main topic and purpose of the video
              - Key points and concepts covered
              - Important details and examples
              - Conclusions or takeaways
              
              Format your response with appropriate paragraphs, bullet points, or sections when it improves readability.
          `;
          
          // Make the API request with the potentially trimmed transcript
          fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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
                      maxOutputTokens: 3500,
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
                  
                  sendResponse({ 
                      success: true,
                      content: data.candidates[0].content.parts[0].text
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