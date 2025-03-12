document.addEventListener('DOMContentLoaded', function() {
    // Load saved API keys
    chrome.storage.sync.get(['geminiApiKey', 'youtubeApiKey'], function(result) {
      document.getElementById('geminiApiKey').value = result.geminiApiKey || '';
      document.getElementById('youtubeApiKey').value = result.youtubeApiKey || '';
    });
    
    // Save API keys
    document.getElementById('saveButton').addEventListener('click', function() {
      const saveButton = document.getElementById('saveButton');
      const originalText = saveButton.innerHTML;
      
      // Show loading state
      saveButton.innerHTML = `
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        Saving...
      `;
      saveButton.disabled = true;
      
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
            statusEl.textContent = '✓ Settings saved successfully!';
            statusEl.className = 'status success';
          } else {
            statusEl.textContent = '✗ Error saving settings: ' + response.error;
            statusEl.className = 'status error';
          }
          
          statusEl.style.display = 'block';
          
          // Restore button
          setTimeout(function() {
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
          }, 1000);
          
          // Hide status after delay
          setTimeout(function() {
            statusEl.style.display = 'none';
          }, 3000);
        }
      );
    });
    
    // Add input animations
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
      });
      
      input.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
      });
    });
  });