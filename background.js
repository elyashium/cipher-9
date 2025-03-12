chrome.runtime.onInstalled.addListener(() => {
    console.log('Cipher 9 extension installed');
});

//request: Contains the message sent from the content script, including any data or type information.
// sender: Provides information about the message sender.
// sendResponse: A function used to send a response back to the sender.
// Listen for messages from content script


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_API_KEY') {
        chrome.storage.sync.get(['geminiApiKey'], function(result) {
            sendResponse({ apiKey: result.geminiApiKey });
        });
        return true; // Required for async response
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getAIResponse') {
      const API_KEY = process.env.API_KEY; // Use environment variable
      const prompt = `You are an AI assistant for YouTube videos. 
        The user is watching a video with the following transcript: ${request.transcript}.
        The user asked: "${request.userMessage}". 
        Provide a helpful and concise response.`;
  
      fetch('https://api.gemini.com/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "gemini-2.0",
          messages: [{role: "user", content: prompt}],
          temperature: 0.7
        })
      })
      .then(response => response.json())
      .then(data => sendResponse(data.choices[0].message.content))
      .catch(error => sendResponse({error: error.message}));
      
      return true; // Keep message channel open
    }
  });