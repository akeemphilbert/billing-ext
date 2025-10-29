export default defineBackground(() => {
  console.log('Background script loaded');

  // Create context menu item
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'mark-as-bill',
      title: 'Mark as Bill',
      contexts: ['selection', 'editable'],
      documentUrlPatterns: [
        'https://mail.google.com/*',
        'https://outlook.live.com/*',
        'https://outlook.office.com/*',
        'https://outlook.office365.com/*'
      ]
    });
  });

  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'mark-as-bill' && tab?.id) {
      const selectedText = info.selectionText || '';
      
      // Send message to content script with selected text
      chrome.tabs.sendMessage(tab.id, {
        type: 'MARK_AS_BILL',
        text: selectedText
      }).catch(err => {
        console.error('Failed to send message to content script:', err);
      });
    }
  });
});


