document.addEventListener('DOMContentLoaded', function() {
    // Load saved API key
    chrome.storage.sync.get(['geminiApiKey'], function(result) {
        if (result.geminiApiKey) {
            document.getElementById('api-key').value = result.geminiApiKey;
        }
    });

    // Save API key
    document.getElementById('save-settings').addEventListener('click', function() {
        console.log('Saving settings...');
        const geminiApiKey = document.getElementById('api-key').value;
        const youtubeApiKey = document.getElementById('youtube-api-key').value;
        
        chrome.storage.sync.set({
            geminiApiKey: geminiApiKey,
            youtubeApiKey : youtubeApiKey
        }, function() {
            const status = document.getElementById('status-message');
            status.textContent = 'Settings saved!';
            setTimeout(() => {
                status.textContent = '';
            }, 2000);
        });

    });

  
});
