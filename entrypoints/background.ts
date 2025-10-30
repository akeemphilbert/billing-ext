import { billService } from '../services/billService';
import { useEventStore } from '../stores/eventStore';
import { db } from '../services/database';

export default defineBackground(() => {
  console.log('Background script loaded');

  // Initialize database and event store
  (async () => {
    try {
      await db.open();
      const eventStore = useEventStore();
      await eventStore.initialize();
      console.log('Background: Database and event store initialized');
    } catch (error) {
      console.error('Background: Failed to initialize database:', error);
    }
  })();

  // Create context menu item
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
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
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'mark-as-bill' && tab?.id) {
      const selectedText = info.selectionText || '';
      
      // Send message to content script with selected text
      browser.tabs.sendMessage(tab.id, {
        type: 'MARK_AS_BILL',
        text: selectedText
      }).catch(err => {
        console.error('Failed to send message to content script:', err);
      });
    }
  });

  // Handle messages from content script to save bills
  browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: (response: any) => void) => {
    if (message.type === 'CREATE_BILL') {
      handleCreateBill(message.billData)
        .then((bill) => {
          sendResponse({ success: true, billId: bill.id });
        })
        .catch((error) => {
          console.error('Background: Failed to create bill:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep message channel open for async response
    }
    return false;
  });

  /**
   * Handle bill creation in extension context (where IndexedDB is accessible)
   */
  async function handleCreateBill(billData: {
    billNo: string;
    supplier: string;
    billDate: string;
    dueDate: string;
    account: string;
    lineDescription: string;
    lineAmount: number;
    terms?: string;
    location?: string;
    memo?: string;
    currency?: string;
  }) {
    console.log('Background: Creating bill with data:', billData);
    
    // Convert date strings to Date objects
    const bill = await billService.createBill({
      ...billData,
      billDate: new Date(billData.billDate),
      dueDate: new Date(billData.dueDate),
    });
    
    console.log('Background: Bill created successfully:', bill.id);
    
    // Notify any open popups that a bill was created
    try {
      // Try to send message to popup if it's open
      browser.runtime.sendMessage({
        type: 'BILL_CREATED',
        billId: bill.id
      }).catch(() => {
        // Popup might not be open, ignore error
      });
    } catch (error) {
      // Ignore - popup might not be open
    }
    
    return bill;
  }
});


