// ===== Content Script - Runs on PDF pages =====

// Listen for requests from the side panel (via background)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_PDF_DATA') {
        fetchPdfData(sendResponse);
        return true; // async
    }

    if (msg.type === 'GET_SELECTION') {
        const sel = window.getSelection();
        sendResponse({ text: sel ? sel.toString().trim() : '' });
        return true;
    }
});

// Fetch the PDF data from the current page URL
function fetchPdfData(sendResponse) {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', window.location.href, true);
        xhr.responseType = 'arraybuffer';

        xhr.onload = function () {
            if (xhr.status === 200 || xhr.status === 0) {
                // Convert ArrayBuffer to base64 for message passing
                const bytes = new Uint8Array(xhr.response);
                const chunkSize = 32768;
                let binary = '';
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
                }
                const base64 = btoa(binary);
                sendResponse({ success: true, data: base64 });
            } else {
                sendResponse({ success: false, error: 'HTTP status ' + xhr.status });
            }
        };

        xhr.onerror = function () {
            sendResponse({ success: false, error: 'Network error loading PDF' });
        };

        xhr.send();
    } catch (err) {
        sendResponse({ success: false, error: err.message });
    }
}
