document.addEventListener('DOMContentLoaded', function() {
    // Load saved API keys
    chrome.storage.sync.get(['geminiApiKey', 'youtubeApiKey'], function(result) {
        if (result.geminiApiKey) {
            document.getElementById('gemini-api-key').value = result.geminiApiKey;
        }
        if (result.youtubeApiKey) {
            document.getElementById('youtube-api-key').value = result.youtubeApiKey;
        }
    });

    // Save API keys
    document.getElementById('save-settings').addEventListener('click', function() {
        const geminiApiKey = document.getElementById('gemini-api-key').value;
        const youtubeApiKey = document.getElementById('youtube-api-key').value;
        
        chrome.storage.sync.set({
            geminiApiKey: geminiApiKey,
            youtubeApiKey: youtubeApiKey
        }, function() {
            const status = document.getElementById('status-message');
            status.textContent = 'Settings saved!';
            setTimeout(() => {
                status.textContent = '';
            }, 2000);
        });
    });
});
