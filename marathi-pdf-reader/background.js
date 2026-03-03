// ===== Background Service Worker =====

// Open side panel when the extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Message relay between content script and side panel
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Side panel asks for the current tab info
    if (msg.type === 'GET_ACTIVE_TAB') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                sendResponse({ url: tabs[0].url, tabId: tabs[0].id, title: tabs[0].title });
            } else {
                sendResponse({ url: null });
            }
        });
        return true; // async
    }

    // Side panel asks content script to fetch the PDF data
    if (msg.type === 'FETCH_PDF_VIA_CONTENT') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PDF_DATA' }, (response) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        sendResponse(response);
                    }
                });
            } else {
                sendResponse({ success: false, error: 'No active tab' });
            }
        });
        return true;
    }

    // Side panel asks content script for selected text
    if (msg.type === 'GET_SELECTION_FROM_TAB') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_SELECTION' }, (response) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ text: '' });
                    } else {
                        sendResponse(response || { text: '' });
                    }
                });
            } else {
                sendResponse({ text: '' });
            }
        });
        return true;
    }
});
