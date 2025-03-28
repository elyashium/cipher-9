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
          sendResponse({ apiKey: result.geminiApiKey || '' });
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
              .then(async data => {
                  // Try to get transcript (this won't work without OAuth)
                  const transcriptText = await fetchYouTubeTranscript(request.videoId, apiKey);
                  
                  // Combine video data with any transcript info we could get
                  const videoInfo = data.items[0].snippet;
                  const fullContext = `
                      Title: ${videoInfo.title}
                      Channel: ${videoInfo.channelTitle}
                      Published: ${videoInfo.publishedAt}
                      Description: ${videoInfo.description}
                      ${transcriptText ? `\n\nTranscript: ${transcriptText}` : ''}
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
          
          const prompt = `You are an AI assistant for YouTube videos. 
              The user is watching a video with the following transcript: ${request.transcript}.
              The user asked: "${request.userMessage}". 
              Provide a helpful and concise response.`;
          
          // Correct Gemini API endpoint and parameters
          fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'x-goog-api-key': apiKey
              },
              body: JSON.stringify({
                  contents: [{
                      parts: [{
                          text: prompt
                      }]
                  }],
                  generationConfig: {
                      temperature: 0.7
                  }
              })
          })
          .then(response => {
              if (!response.ok) {
                  throw new Error(`Gemini API error: ${response.status}`);
              }
              return response.json();
          })
          .then(data => {
              // Extract the response from Gemini's response format
              if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                  sendResponse({ 
                      success: true,
                      content: data.candidates[0].content.parts[0].text
                  });
              } else {
                  throw new Error('Unexpected response format from Gemini API');
              }
          })
          .catch(error => sendResponse({ 
              success: false, 
              error: error.message 
          }));
      });
      return true;
  }
  
  // Save API keys
  else if (request.action === 'saveApiKeys') {
      chrome.storage.sync.set({
          geminiApiKey: request.geminiApiKey,
          youtubeApiKey: request.youtubeApiKey
      }, function() {
          sendResponse({ success: true, message: 'API keys saved successfully' });
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