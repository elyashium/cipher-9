document.addEventListener('DOMContentLoaded', function() {
    // Load saved API keys
    chrome.storage.sync.get(['geminiApiKey', 'youtubeApiKey'], function(result) {
      document.getElementById('geminiApiKey').value = result.geminiApiKey || '';
      document.getElementById('youtubeApiKey').value = result.youtubeApiKey || '';
    });
    
    // Save API keys
    document.getElementById('saveButton').addEventListener('click', function() {
      const geminiApiKey = document.getElementById('geminiApiKey').value.trim();
      const youtubeApiKey = document.getElementById('youtubeApiKey').value.trim();
      
      chrome.runtime.sendMessage(
        {
          action: 'saveApiKeys',
          geminiApiKey: geminiApiKey,
          youtubeApiKey: youtubeApiKey
        },
        function(response) {
          const statusEl = document.getElementById('status');
          
          if (response.success) {
            statusEl.textContent = 'Settings saved successfully!';
            statusEl.className = 'status success';
          } else {
            statusEl.textContent = 'Error saving settings: ' + response.error;
            statusEl.className = 'status error';
          }
          
          statusEl.style.display = 'block';
          
          setTimeout(function() {
            statusEl.style.display = 'none';
          }, 3000);
        }
      );
    });
  });